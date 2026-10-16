// AstroCore — chart calculation engine over the Swiss Ephemeris.
// Pure C++17, no React Native dependency, so it can be unit-tested on desktop.
//
// License: AGPL-3.0-or-later (required because it links the Swiss Ephemeris
// under its AGPL option). Swiss Ephemeris © Astrodienst AG, authors
// Dieter Koch and Alois Treindl.
//
// All public functions take and return JSON strings. This keeps the JS bridge
// small and stable, and the payloads are tiny compared to the work done.
// Every call is serialized with a mutex because the Swiss Ephemeris keeps
// global state (ephemeris path, sidereal mode, topocentric position).

#pragma once

#include <string>

namespace astrocore {

// {"ephePath": "/abs/dir"}  ->  {"ok":true,"version":"2.10.03","ephePath":"..."}
std::string initialize(const std::string& requestJson);

// Full chart: positions (+ houses when a location is given).
// See README for the request/response schema.
std::string calcChart(const std::string& requestJson);

// Many instants in one native call (transit scans, ephemeris tables,
// station/ingress search). Returns compact arrays.
std::string calcSeries(const std::string& requestJson);

// Fixed stars by name, e.g. ["Regulus","Spica","Algol"].
std::string calcFixedStars(const std::string& requestJson);

// Static catalogues for settings screens.
std::string listHouseSystems();
std::string listAyanamsas();

// Release open ephemeris files.
void shutdown();

}  // namespace astrocore
