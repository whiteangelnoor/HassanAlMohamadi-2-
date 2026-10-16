// Desktop bridge for the Jest tests: runs one engine call and prints the JSON
// reply, so the TypeScript event searches can be checked against the real
// engine. Usage: engine_cli <ephe-dir> <chart|series|stars|eclipses> '<request json>'
// AGPL-3.0-or-later.
#include <cstdio>
#include <string>

#include "AstroCore.h"

int main(int argc, char** argv) {
  if (argc != 4) {
    fprintf(stderr, "usage: %s <ephe-dir> <chart|series|stars|eclipses> <json>\n", argv[0]);
    return 2;
  }
  using namespace astrocore;
  initialize(std::string("{\"ephePath\":\"") + argv[1] + "\"}");
  const std::string method = argv[2];
  std::string out;
  if (method == "chart") out = calcChart(argv[3]);
  else if (method == "series") out = calcSeries(argv[3]);
  else if (method == "stars") out = calcFixedStars(argv[3]);
  else if (method == "eclipses") out = calcEclipses(argv[3]);
  else return 2;
  fputs(out.c_str(), stdout);
  return 0;
}
