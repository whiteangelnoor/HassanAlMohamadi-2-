// JSI glue between React Native and AstroCore. AGPL-3.0-or-later.
#include "NativeAstroEngine.h"

#include "astrocore/AstroCore.h"

namespace facebook::react {

NativeAstroEngine::NativeAstroEngine(std::shared_ptr<CallInvoker> jsInvoker)
    : NativeAstroEngineCxxSpec(std::move(jsInvoker)) {}

std::string NativeAstroEngine::initialize(jsi::Runtime&, std::string req) {
  return astrocore::initialize(req);
}
std::string NativeAstroEngine::calcChart(jsi::Runtime&, std::string req) {
  return astrocore::calcChart(req);
}
std::string NativeAstroEngine::calcSeries(jsi::Runtime&, std::string req) {
  return astrocore::calcSeries(req);
}
std::string NativeAstroEngine::calcFixedStars(jsi::Runtime&, std::string req) {
  return astrocore::calcFixedStars(req);
}
std::string NativeAstroEngine::listHouseSystems(jsi::Runtime&) {
  return astrocore::listHouseSystems();
}
std::string NativeAstroEngine::listAyanamsas(jsi::Runtime&) {
  return astrocore::listAyanamsas();
}
void NativeAstroEngine::shutdown(jsi::Runtime&) { astrocore::shutdown(); }

}  // namespace facebook::react
