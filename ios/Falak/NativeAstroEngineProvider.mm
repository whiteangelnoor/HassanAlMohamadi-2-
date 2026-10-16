// AGPL-3.0-or-later.
#import "NativeAstroEngineProvider.h"
#import <ReactCommon/CallInvoker.h>
#import <ReactCommon/TurboModule.h>
#import "NativeAstroEngine.h"

@implementation NativeAstroEngineProvider

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeAstroEngine>(params.jsInvoker);
}

@end
