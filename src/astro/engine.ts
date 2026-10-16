// Typed access to the native astrology engine. AGPL-3.0-or-later.
// Screens import from here, never from the raw spec.

import Native from '../../specs/NativeAstroEngine';

// ---------- request types ----------------------------------------------------

export type BodyKey =
  | 'sun' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn'
  | 'uranus' | 'neptune' | 'pluto'
  | 'meanNode' | 'trueNode' | 'meanLilith' | 'oscLilith'
  | 'chiron' | 'pholus' | 'ceres' | 'pallas' | 'juno' | 'vesta'
  | `ast:${number}`;

/** Swiss Ephemeris house-system codes, e.g. 'P' Placidus, 'K' Koch, 'W' Whole Sign. */
export type HouseSystemCode = string;

export interface UtcTime {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  second?: number;
}

/** Either civil UTC (recommended) or a Julian Day in UT1. */
export type TimeInput = {utc: UtcTime} | {jdUt: number};

export interface GeoLocation {
  lat: number; // north positive
  lon: number; // east positive
  altitude?: number; // metres, used only for topocentric
}

export interface ZodiacSetting {
  type: 'tropical' | 'sidereal';
  ayanamsa?: number; // id from listAyanamsas(); default Lahiri (1)
}

export interface CommonOptions {
  zodiac?: ZodiacSetting;
  topocentric?: boolean;
  /** Default true: fail instead of silently using the lower-precision fallback. */
  strictEphemerisFiles?: boolean;
}

export interface ChartRequest extends CommonOptions {
  time: TimeInput;
  location?: GeoLocation; // omit for a houseless chart
  houseSystem?: HouseSystemCode;
  bodies?: BodyKey[];
}

export interface SeriesRequest extends CommonOptions {
  startJdUt: number;
  endJdUt: number;
  stepDays: number;
  bodies: BodyKey[];
  location?: GeoLocation;
}

export interface FixedStarsRequest extends CommonOptions {
  time: TimeInput;
  names: string[];
  location?: GeoLocation;
}

// ---------- response types ---------------------------------------------------

export interface SignPosition {
  index: number; // 0 = Aries ... 11 = Pisces
  degree: number; // 0..30 within the sign
}

export interface BodyPosition {
  key: BodyKey;
  id: number;
  lon: number;
  lat: number;
  dist: number;
  lonSpeed: number;
  latSpeed: number;
  distSpeed: number;
  ra: number;
  dec: number;
  decSpeed: number;
  retrograde: boolean;
  sign: SignPosition;
  /** 1.0 .. 12.999; integer part is the house. Present when a location was given. */
  housePosition?: number;
}

export interface Houses {
  system: string;
  systemName: string;
  cusps: number[]; // 12 values (36 for Gauquelin 'G')
  asc: number;
  mc: number;
  armc: number;
  vertex: number;
  equatorialAsc: number;
  coAscKoch: number;
  coAscMunkasey: number;
  polarAsc: number;
  /** True when the system cannot work at this latitude and Porphyry was used. */
  fallbackUsed: boolean;
}

export interface ChartResult {
  jdUt: number;
  jdTt: number;
  deltaTSeconds: number;
  obliquity: number;
  nutationLon: number;
  bodies: BodyPosition[];
  houses?: Houses;
  ayanamsa?: {id: number; name: string; value: number};
  warnings: string[];
}

export interface SeriesResult {
  startJdUt: number;
  stepDays: number;
  series: Record<string, {lon: number[]; lonSpeed: number[]}>;
  warnings: string[];
}

export interface FixedStar {
  query: string;
  name: string;
  lon: number;
  lat: number;
  magnitude: number;
  sign: SignPosition;
}

// ---------- errors -----------------------------------------------------------

export class AstroEngineError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'AstroEngineError';
  }
}

function unwrap<T>(raw: string): T {
  const parsed = JSON.parse(raw);
  if (!parsed.ok) {
    throw new AstroEngineError(parsed.error?.code ?? 'UNKNOWN', parsed.error?.message ?? '');
  }
  return parsed as T;
}

// ---------- public API -------------------------------------------------------

export interface InitResult {
  version: string;
  ephePath: string;
  filesOk: boolean;
}

export const AstroEngine = {
  /** Must be called once with a real filesystem directory holding the .se1 files. */
  initialize(ephePath: string): InitResult {
    const r = unwrap<InitResult>(Native.initialize(JSON.stringify({ephePath})));
    if (!r.filesOk) {
      throw new AstroEngineError('EPHEMERIS_FILES', `ephemeris files not readable at ${ephePath}`);
    }
    return r;
  },

  chart(req: ChartRequest): ChartResult {
    return unwrap<ChartResult>(Native.calcChart(JSON.stringify(req)));
  },

  series(req: SeriesRequest): SeriesResult {
    return unwrap<SeriesResult>(Native.calcSeries(JSON.stringify(req)));
  },

  fixedStars(req: FixedStarsRequest): {jdUt: number; stars: FixedStar[]; warnings: string[]} {
    return unwrap(Native.calcFixedStars(JSON.stringify(req)));
  },

  houseSystems(): {code: string; name: string}[] {
    return unwrap<{houseSystems: {code: string; name: string}[]}>(Native.listHouseSystems())
      .houseSystems;
  },

  ayanamsas(): {id: number; name: string}[] {
    return unwrap<{ayanamsas: {id: number; name: string}[]}>(Native.listAyanamsas()).ayanamsas;
  },

  shutdown(): void {
    Native.shutdown();
  },
};
