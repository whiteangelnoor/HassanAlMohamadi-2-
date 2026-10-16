// Persistent app data: saved charts and settings, kept by the native
// FalakHost module in SharedPreferences. Without the module (older APK, Jest)
// everything still works for the session, in memory. AGPL-3.0-or-later.

import Host from '../specs/NativeFalakHost';

const memory = new Map<string, string>();

function read(key: string): string | null {
  try {
    return Host ? Host.getItem(key) : memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

function write(key: string, value: string) {
  memory.set(key, value);
  try {
    Host?.setItem(key, value);
  } catch {
    // keep the in-memory copy
  }
}

function readJson<T>(key: string, fallback: T): T {
  const raw = read(key);
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export const persistent = Host !== null;

// ---------- settings ------------------------------------------------------------

export interface Settings {
  houseSystem: string;
  zodiac: { type: 'tropical' | 'sidereal'; ayanamsa: number };
  /** Orb in degrees per aspect kind (major and minor). */
  orbs: Record<string, number>;
  minorAspects: boolean;
  /** Lunar mansions: equal from tropical 0° Aries, or tied to the stars. */
  mansions: 'tropical' | 'stars';
  /** Hijri calendar and a manual correction in days. */
  hijri: { choice: 'umalqura' | 'karachi' | 'tehran' | 'qom'; offset: number };
  /** City for the spiritual hours; null = Baghdad. */
  place: SavedPlace | null;
  /** Optional points shown in charts. */
  points: { trueNode: boolean; chiron: boolean; meanLilith: boolean };
}

export const DEFAULT_SETTINGS: Settings = {
  houseSystem: 'P',
  zodiac: { type: 'tropical', ayanamsa: 1 },
  orbs: {
    conjunction: 8,
    opposition: 8,
    trine: 7,
    square: 7,
    sextile: 5,
    quincunx: 3,
    semisextile: 2,
    semisquare: 2,
    sesquiquadrate: 2,
  },
  minorAspects: false,
  mansions: 'tropical',
  hijri: { choice: 'umalqura', offset: 0 },
  place: null,
  points: { trueNode: true, chiron: true, meanLilith: false },
};

export function loadSettings(): Settings {
  const s = readJson<Partial<Settings>>('settings', {});
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    zodiac: { ...DEFAULT_SETTINGS.zodiac, ...s.zodiac },
    orbs: { ...DEFAULT_SETTINGS.orbs, ...s.orbs },
    points: { ...DEFAULT_SETTINGS.points, ...s.points },
    hijri: { ...DEFAULT_SETTINGS.hijri, ...s.hijri },
  };
}

export function saveSettings(s: Settings) {
  write('settings', JSON.stringify(s));
}

// ---------- saved charts ----------------------------------------------------------

export interface SavedPlace {
  name: string;
  country: string; // display name
  lat: number;
  lon: number;
  timeZone: string;
}

export interface SavedChart {
  id: string;
  name: string;
  local: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
  };
  timeUnknown: boolean;
  place: SavedPlace;
  savedAt: number;
}

export function loadCharts(): SavedChart[] {
  return readJson<SavedChart[]>('charts', []);
}

export function saveChart(c: Omit<SavedChart, 'id' | 'savedAt'>): SavedChart {
  const all = loadCharts();
  const entry: SavedChart = {
    ...c,
    id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
    savedAt: Date.now(),
  };
  write('charts', JSON.stringify([entry, ...all]));
  return entry;
}

export function deleteChart(id: string) {
  write('charts', JSON.stringify(loadCharts().filter(c => c.id !== id)));
}

// ---------- printing ------------------------------------------------------------------

/** Opens the system print dialog ("Save as PDF") for an HTML page. */
export async function printHtml(html: string, jobName: string): Promise<void> {
  if (!Host) {
    throw new Error('التصدير يحتاج النسخة الأحدث من التطبيق.');
  }
  await Host.printHtml(html, jobName);
}
