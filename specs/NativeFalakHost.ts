// Codegen spec for the app's own Android services: small persistent storage
// printing an HTML page (the system dialog offers "Save as PDF"), and
// reminders at given times through the alarm service.
// AGPL-3.0-or-later.
import { TurboModule, TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  readonly getItem: (key: string) => string | null;
  readonly setItem: (key: string, value: string) => void;
  readonly removeItem: (key: string) => void;
  readonly printHtml: (html: string, jobName: string) => Promise<void>;
  /** Replaces the pending reminders: a JSON array of {at (ms), title, body}. */
  readonly scheduleReminders: (json: string) => void;
  /** Whether the phone lets the app wake at an exact minute. */
  readonly exactAlarmsAllowed: () => boolean;
  /** Opens the system page that allows exact alarms for the app. */
  readonly openExactAlarmSettings: () => void;
}

export default TurboModuleRegistry.get<Spec>('FalakHost');
