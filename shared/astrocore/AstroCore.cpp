// AstroCore implementation. AGPL-3.0-or-later. See AstroCore.h.

#include "AstroCore.h"

#include <cmath>
#include <mutex>
#include <string>
#include <vector>

#include "json.hpp"
#include "../swisseph/swephexp.h"

using nlohmann::json;

namespace astrocore {
namespace {

std::mutex gMutex;
bool gInitialized = false;
std::string gEphePath;

// ---------- helpers ----------------------------------------------------------

json errorJson(const std::string& code, const std::string& message) {
  return json{{"ok", false}, {"error", {{"code", code}, {"message", message}}}};
}

// Bodies a caller can request by name. Asteroids by number use "ast:<n>".
struct BodyDef {
  const char* key;
  int id;
};

const BodyDef kBodies[] = {
    {"sun", SE_SUN},           {"moon", SE_MOON},
    {"mercury", SE_MERCURY},   {"venus", SE_VENUS},
    {"mars", SE_MARS},         {"jupiter", SE_JUPITER},
    {"saturn", SE_SATURN},     {"uranus", SE_URANUS},
    {"neptune", SE_NEPTUNE},   {"pluto", SE_PLUTO},
    {"meanNode", SE_MEAN_NODE}, {"trueNode", SE_TRUE_NODE},
    {"meanLilith", SE_MEAN_APOG}, {"oscLilith", SE_OSCU_APOG},
    {"chiron", SE_CHIRON},     {"pholus", SE_PHOLUS},
    {"ceres", SE_CERES},       {"pallas", SE_PALLAS},
    {"juno", SE_JUNO},         {"vesta", SE_VESTA},
};

bool resolveBody(const std::string& key, int& idOut) {
  for (const auto& b : kBodies) {
    if (key == b.key) {
      idOut = b.id;
      return true;
    }
  }
  if (key.rfind("ast:", 0) == 0) {
    try {
      long n = std::stol(key.substr(4));
      if (n > 0) {
        idOut = static_cast<int>(SE_AST_OFFSET + n);
        return true;
      }
    } catch (...) {
    }
  }
  return false;
}

const std::vector<std::string>& defaultBodies() {
  static const std::vector<std::string> v = {
      "sun",    "moon",     "mercury",  "venus",    "mars",
      "jupiter", "saturn",  "uranus",   "neptune",  "pluto",
      "trueNode", "meanLilith", "chiron"};
  return v;
}

// Calculation settings shared by chart / series / stars.
struct Settings {
  bool sidereal = false;
  int ayanamsa = SE_SIDM_FAGAN_BRADLEY;
  bool topocentric = false;
  bool strictFiles = true;  // refuse Moshier fallback when files are missing
  int32 baseFlags = SEFLG_SWIEPH | SEFLG_SPEED;
};

Settings readSettings(const json& req) {
  Settings s;
  if (req.contains("zodiac")) {
    const auto& z = req["zodiac"];
    s.sidereal = z.value("type", std::string("tropical")) == "sidereal";
    s.ayanamsa = z.value("ayanamsa", static_cast<int>(SE_SIDM_LAHIRI));
  }
  s.topocentric = req.value("topocentric", false);
  s.strictFiles = req.value("strictEphemerisFiles", true);
  return s;
}

int32 zodiacFlags(const Settings& s, bool forceTropical) {
  int32 f = s.baseFlags;
  if (s.topocentric) f |= SEFLG_TOPOCTR;
  if (s.sidereal && !forceTropical) f |= SEFLG_SIDEREAL;
  return f;
}

void applyGlobalState(const Settings& s, const json& location) {
  if (s.sidereal) swe_set_sid_mode(s.ayanamsa, 0, 0);
  if (s.topocentric && !location.is_null()) {
    swe_set_topo(location.value("lon", 0.0), location.value("lat", 0.0),
                 location.value("altitude", 0.0));
  }
}

// Resolves the instant. Accepts {"utc":{y,m,d,h,mi,s}} or {"jdUt":...}.
// UTC goes through swe_utc_to_jd, which applies leap seconds and Delta T.
bool resolveTime(const json& t, double& jdUt, double& jdTt, std::string& err) {
  char serr[AS_MAXCH] = {0};
  if (t.contains("jdUt")) {
    jdUt = t["jdUt"].get<double>();
    jdTt = jdUt + swe_deltat_ex(jdUt, SEFLG_SWIEPH, serr);
    return true;
  }
  if (!t.contains("utc")) {
    err = "time.utc or time.jdUt is required";
    return false;
  }
  const auto& u = t["utc"];
  double dret[2];
  int32 rc = swe_utc_to_jd(u.at("year").get<int>(), u.at("month").get<int>(),
                           u.at("day").get<int>(), u.value("hour", 0),
                           u.value("minute", 0), u.value("second", 0.0),
                           SE_GREG_CAL, dret, serr);
  if (rc == ERR) {
    err = serr;
    return false;
  }
  jdTt = dret[0];
  jdUt = dret[1];
  return true;
}

// Checks which ephemeris actually served the request.
bool ephemerisOk(int32 retFlags, const Settings& s, json& warnings,
                 const std::string& what, std::string& err) {
  if (retFlags & SEFLG_SWIEPH) return true;
  std::string msg = what + ": Swiss Ephemeris files not found, Moshier used";
  if (s.strictFiles) {
    err = msg;
    return false;
  }
  warnings.push_back(msg);
  return true;
}

json signOf(double lon) {
  int sign = static_cast<int>(std::floor(lon / 30.0)) % 12;
  return json{{"index", sign}, {"degree", lon - sign * 30.0}};
}

// ---------- house systems ----------------------------------------------------

// "E" is an alias of "A" (equal), so it is omitted.
const char kHouseSystems[] = "PKORCAWBVXHTMUYDGIiFLNQSJ";

bool validHouseSystem(char h) {
  for (const char* p = kHouseSystems; *p; ++p)
    if (*p == h) return true;
  return false;
}

}  // namespace

// ============================================================================

std::string initialize(const std::string& requestJson) {
  std::lock_guard<std::mutex> lock(gMutex);
  json req = json::parse(requestJson, nullptr, false);
  if (req.is_discarded()) return errorJson("BAD_JSON", "invalid request").dump();

  gEphePath = req.value("ephePath", std::string());
  if (gEphePath.empty())
    return errorJson("NO_PATH", "ephePath is required").dump();

  swe_set_ephe_path(gEphePath.c_str());
  gInitialized = true;

  // Probe: confirm that the main files are actually readable.
  char serr[AS_MAXCH] = {0};
  double xx[6];
  int32 rf = swe_calc_ut(2451545.0, SE_MOON, SEFLG_SWIEPH, xx, serr);
  bool filesOk = (rf != ERR) && (rf & SEFLG_SWIEPH);

  char ver[AS_MAXCH];
  swe_version(ver);
  return json{{"ok", true},
              {"version", ver},
              {"ephePath", gEphePath},
              {"filesOk", filesOk}}
      .dump();
}

std::string calcChart(const std::string& requestJson) {
  std::lock_guard<std::mutex> lock(gMutex);
  if (!gInitialized) return errorJson("NOT_INITIALIZED", "call initialize first").dump();

  json req = json::parse(requestJson, nullptr, false);
  if (req.is_discarded()) return errorJson("BAD_JSON", "invalid request").dump();

  Settings s = readSettings(req);
  json location = req.contains("location") ? req["location"] : json();
  if (s.topocentric && location.is_null())
    return errorJson("NO_LOCATION", "topocentric requires a location").dump();

  double jdUt, jdTt;
  std::string err;
  if (!resolveTime(req.value("time", json::object()), jdUt, jdTt, err))
    return errorJson("BAD_TIME", err).dump();

  applyGlobalState(s, location);
  const int32 fz = zodiacFlags(s, false);
  const int32 ftrop = zodiacFlags(s, true);
  json warnings = json::array();
  char serr[AS_MAXCH];

  // Obliquity & nutation (needed for house positions).
  double nut[6];
  serr[0] = 0;
  swe_calc_ut(jdUt, SE_ECL_NUT, SEFLG_SWIEPH, nut, serr);
  const double eps = nut[0];

  // ----- houses -----
  json houses;
  double armc = 0;
  bool haveHouses = false;
  if (!location.is_null()) {
    std::string hs = req.value("houseSystem", std::string("P"));
    char hsys = hs.empty() ? 'P' : hs[0];
    if (!validHouseSystem(hsys))
      return errorJson("BAD_HOUSE_SYSTEM", "unknown house system").dump();

    const double lat = location.at("lat").get<double>();
    const double lon = location.at("lon").get<double>();
    double cusps[37] = {0}, ascmc[10] = {0}, cuspSpeed[37] = {0}, ascmcSpeed[10] = {0};
    serr[0] = 0;
    int32 hflags = s.sidereal ? SEFLG_SIDEREAL : 0;
    int rc = swe_houses_ex2(jdUt, hflags, lat, lon, hsys, cusps, ascmc,
                            cuspSpeed, ascmcSpeed, serr);
    // Placidus/Koch fail inside the polar circles: Swiss Ephemeris falls back
    // to Porphyry and returns ERR. We report it instead of hiding it.
    if (rc == ERR) warnings.push_back(std::string("houses: ") + serr);

    const int n = (hsys == 'G') ? 36 : 12;
    json cuspArr = json::array();
    for (int i = 1; i <= n; ++i) cuspArr.push_back(cusps[i]);

    armc = ascmc[2];
    haveHouses = true;
    houses = json{{"system", std::string(1, hsys)},
                  {"systemName", swe_house_name(hsys)},
                  {"cusps", cuspArr},
                  {"asc", ascmc[0]},
                  {"mc", ascmc[1]},
                  {"armc", ascmc[2]},
                  {"vertex", ascmc[3]},
                  {"equatorialAsc", ascmc[4]},
                  {"coAscKoch", ascmc[5]},
                  {"coAscMunkasey", ascmc[6]},
                  {"polarAsc", ascmc[7]},
                  {"fallbackUsed", rc == ERR}};
  }

  // ----- bodies -----
  std::vector<std::string> keys;
  if (req.contains("bodies") && req["bodies"].is_array()) {
    for (const auto& b : req["bodies"]) keys.push_back(b.get<std::string>());
  } else {
    keys = defaultBodies();
  }

  json bodies = json::array();
  for (const auto& key : keys) {
    int ipl;
    if (!resolveBody(key, ipl)) {
      warnings.push_back("unknown body: " + key);
      continue;
    }
    double xx[6], eq[6], trop[6];
    serr[0] = 0;
    int32 rf = swe_calc_ut(jdUt, ipl, fz, xx, serr);
    if (rf == ERR) {
      warnings.push_back(key + ": " + serr);
      continue;
    }
    if (!ephemerisOk(rf, s, warnings, key, err))
      return errorJson("EPHEMERIS_FILES", err).dump();

    serr[0] = 0;
    swe_calc_ut(jdUt, ipl, ftrop | SEFLG_EQUATORIAL, eq, serr);

    json b{{"key", key},
           {"id", ipl},
           {"lon", xx[0]},
           {"lat", xx[1]},
           {"dist", xx[2]},
           {"lonSpeed", xx[3]},
           {"latSpeed", xx[4]},
           {"distSpeed", xx[5]},
           {"ra", eq[0]},
           {"dec", eq[1]},
           {"decSpeed", eq[4]},
           {"retrograde", xx[3] < 0},
           {"sign", signOf(xx[0])}};

    if (haveHouses) {
      // House position must use the tropical ecliptic frame of ARMC/eps.
      serr[0] = 0;
      swe_calc_ut(jdUt, ipl, ftrop, trop, serr);
      double xpin[2] = {trop[0], trop[1]};
      const char hsys = houses["system"].get<std::string>()[0];
      serr[0] = 0;
      b["housePosition"] = swe_house_pos(armc, location["lat"].get<double>(),
                                         eps, hsys, xpin, serr);
    }
    bodies.push_back(b);
  }

  json out{{"ok", true},
           {"jdUt", jdUt},
           {"jdTt", jdTt},
           {"deltaTSeconds", (jdTt - jdUt) * 86400.0},
           {"obliquity", eps},
           {"nutationLon", nut[2]},
           {"bodies", bodies},
           {"warnings", warnings}};
  if (haveHouses) out["houses"] = houses;
  if (s.sidereal) {
    double aya = 0;
    serr[0] = 0;
    swe_get_ayanamsa_ex_ut(jdUt, SEFLG_SWIEPH, &aya, serr);
    out["ayanamsa"] = {{"id", s.ayanamsa},
                       {"name", swe_get_ayanamsa_name(s.ayanamsa)},
                       {"value", aya}};
  }
  return out.dump();
}

std::string calcSeries(const std::string& requestJson) {
  std::lock_guard<std::mutex> lock(gMutex);
  if (!gInitialized) return errorJson("NOT_INITIALIZED", "call initialize first").dump();

  json req = json::parse(requestJson, nullptr, false);
  if (req.is_discarded()) return errorJson("BAD_JSON", "invalid request").dump();

  Settings s = readSettings(req);
  json location = req.contains("location") ? req["location"] : json();
  applyGlobalState(s, location);
  const int32 fz = zodiacFlags(s, false);

  const double start = req.at("startJdUt").get<double>();
  const double end = req.at("endJdUt").get<double>();
  const double step = req.at("stepDays").get<double>();
  if (step <= 0 || end < start || (end - start) / step > 200000)
    return errorJson("BAD_RANGE", "invalid range or too many steps").dump();

  std::vector<std::string> keys;
  for (const auto& b : req.at("bodies")) keys.push_back(b.get<std::string>());

  json warnings = json::array();
  std::string err;
  json series = json::object();
  char serr[AS_MAXCH];

  for (const auto& key : keys) {
    int ipl;
    if (!resolveBody(key, ipl)) {
      warnings.push_back("unknown body: " + key);
      continue;
    }
    json lon = json::array(), speed = json::array();
    bool checked = false;
    for (double jd = start; jd <= end + 1e-9; jd += step) {
      double xx[6];
      serr[0] = 0;
      int32 rf = swe_calc_ut(jd, ipl, fz, xx, serr);
      if (rf == ERR) return errorJson("CALC", key + ": " + serr).dump();
      if (!checked) {
        if (!ephemerisOk(rf, s, warnings, key, err))
          return errorJson("EPHEMERIS_FILES", err).dump();
        checked = true;
      }
      lon.push_back(xx[0]);
      speed.push_back(xx[3]);
    }
    series[key] = {{"lon", lon}, {"lonSpeed", speed}};
  }
  return json{{"ok", true},
              {"startJdUt", start},
              {"stepDays", step},
              {"series", series},
              {"warnings", warnings}}
      .dump();
}

std::string calcFixedStars(const std::string& requestJson) {
  std::lock_guard<std::mutex> lock(gMutex);
  if (!gInitialized) return errorJson("NOT_INITIALIZED", "call initialize first").dump();

  json req = json::parse(requestJson, nullptr, false);
  if (req.is_discarded()) return errorJson("BAD_JSON", "invalid request").dump();

  Settings s = readSettings(req);
  json location = req.contains("location") ? req["location"] : json();
  double jdUt, jdTt;
  std::string err;
  if (!resolveTime(req.value("time", json::object()), jdUt, jdTt, err))
    return errorJson("BAD_TIME", err).dump();
  applyGlobalState(s, location);
  const int32 fz = zodiacFlags(s, false);

  json stars = json::array(), warnings = json::array();
  char serr[AS_MAXCH];
  for (const auto& n : req.at("names")) {
    char name[SE_MAX_STNAME * 2 + 1] = {0};
    std::string nm = n.get<std::string>();
    nm.copy(name, sizeof(name) - 1);
    double xx[6], mag = 0;
    serr[0] = 0;
    if (swe_fixstar2_ut(name, jdUt, fz, xx, serr) == ERR) {
      warnings.push_back(nm + ": " + serr);
      continue;
    }
    swe_fixstar2_mag(name, &mag, serr);
    stars.push_back({{"query", nm},
                     {"name", std::string(name)},
                     {"lon", xx[0]},
                     {"lat", xx[1]},
                     {"magnitude", mag},
                     {"sign", signOf(xx[0])}});
  }
  return json{{"ok", true}, {"jdUt", jdUt}, {"stars", stars}, {"warnings", warnings}}
      .dump();
}

std::string listHouseSystems() {
  std::lock_guard<std::mutex> lock(gMutex);
  json arr = json::array();
  for (const char* p = kHouseSystems; *p; ++p)
    arr.push_back({{"code", std::string(1, *p)}, {"name", swe_house_name(*p)}});
  return json{{"ok", true}, {"houseSystems", arr}}.dump();
}

std::string listAyanamsas() {
  std::lock_guard<std::mutex> lock(gMutex);
  json arr = json::array();
  for (int i = 0; i < SE_NSIDM_PREDEF; ++i) {
    const char* n = swe_get_ayanamsa_name(i);
    if (n && *n) arr.push_back({{"id", i}, {"name", n}});
  }
  return json{{"ok", true}, {"ayanamsas", arr}}.dump();
}

void shutdown() {
  std::lock_guard<std::mutex> lock(gMutex);
  swe_close();
  gInitialized = false;
}

}  // namespace astrocore
