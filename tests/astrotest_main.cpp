#include <cstdio>
#include <string>
#include "AstroCore.h"
int main(int argc,char**argv){
  using namespace astrocore;
  printf("%s\n", initialize(std::string("{\"ephePath\":\"")+argv[1]+"\"}").c_str());
  printf("%s\n", calcChart(argv[2]).c_str());
  return 0;
}
