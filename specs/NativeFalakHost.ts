// Codegen spec for the app's own Android services: small persistent storage
// and printing an HTML page (the system dialog offers "Save as PDF").
// AGPL-3.0-or-later.
import { TurboModule, TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  readonly getItem: (key: string) => string | null;
  readonly setItem: (key: string, value: string) => void;
  readonly removeItem: (key: string) => void;
  readonly printHtml: (html: string, jobName: string) => Promise<void>;
}

export default TurboModuleRegistry.get<Spec>('FalakHost');
