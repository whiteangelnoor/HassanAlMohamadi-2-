// Codegen spec for the C++ Turbo Native Module. AGPL-3.0-or-later.
// The file name must start with "Native" or Codegen ignores it.
import {TurboModule, TurboModuleRegistry} from 'react-native';

export interface Spec extends TurboModule {
  readonly initialize: (requestJson: string) => string;
  readonly calcChart: (requestJson: string) => string;
  readonly calcSeries: (requestJson: string) => string;
  readonly calcFixedStars: (requestJson: string) => string;
  readonly calcEclipses: (requestJson: string) => string;
  readonly listHouseSystems: () => string;
  readonly listAyanamsas: () => string;
  readonly shutdown: () => void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeAstroEngine');
