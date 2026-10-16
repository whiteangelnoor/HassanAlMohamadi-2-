#include <cstdio>
#include <string>
#include "AstroCore.h"
using namespace astrocore;
int main(int, char** argv){
  initialize(std::string("{\"ephePath\":\"")+argv[1]+"\"}");
  puts(calcChart(R"({"time":{"utc":{"year":1750,"month":1,"day":1}},"bodies":["sun"]})").c_str());
  puts(calcChart(R"({"time":{"utc":{"year":1750,"month":1,"day":1}},"bodies":["sun"],"strictEphemerisFiles":false})").c_str());
  puts(calcChart(R"({"time":{"utc":{"year":2000,"month":1,"day":1}},"location":{"lat":70.0,"lon":25.0},"houseSystem":"P","bodies":["sun"]})").substr(0,0).c_str());
  std::string polar = calcChart(R"({"time":{"utc":{"year":2000,"month":1,"day":1}},"location":{"lat":70.0,"lon":25.0},"houseSystem":"P","bodies":["sun"]})");
  printf("polar warnings: %s\n", polar.substr(polar.find("\"warnings\"")).c_str());
  std::string s = calcSeries(R"({"startJdUt":2461330.5,"endJdUt":2461340.5,"stepDays":1,"bodies":["mercury"]})");
  printf("series: %.300s\n", s.c_str());
  puts(calcFixedStars(R"({"time":{"utc":{"year":2026,"month":10,"day":16}},"names":["Regulus","Spica","Algol"]})").c_str());
  std::string hs = listHouseSystems(); printf("houses: %.400s\n", hs.c_str());
  std::string ay = listAyanamsas(); printf("ayanamsas count/sample: %.200s\n", ay.c_str());
}
