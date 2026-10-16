// JSI glue between React Native and AstroCore. AGPL-3.0-or-later.
#pragma once

#include <AppSpecsJSI.h>

#include <memory>
#include <string>

namespace facebook::react {

class NativeAstroEngine : public NativeAstroEngineCxxSpec<NativeAstroEngine> {
 public:
  explicit NativeAstroEngine(std::shared_ptr<CallInvoker> jsInvoker);

  std::string initialize(jsi::Runtime& rt, std::string requestJson);
  std::string calcChart(jsi::Runtime& rt, std::string requestJson);
  std::string calcSeries(jsi::Runtime& rt, std::string requestJson);
  std::string calcFixedStars(jsi::Runtime& rt, std::string requestJson);
  std::string listHouseSystems(jsi::Runtime& rt);
  std::string listAyanamsas(jsi::Runtime& rt);
  void shutdown(jsi::Runtime& rt);
};

}  // namespace facebook::react
