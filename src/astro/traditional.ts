// Aspects, Arabic parts (lots) and essential dignities, computed from an
// engine chart. Pure functions, no native code. AGPL-3.0-or-later.
//
// Conventions (documented so results can be checked against any textbook):
// - Aspects: the five Ptolemaic aspects (and four minor ones if enabled);
//   default orbs 8° conjunction and opposition, 7° trine and square, 5°
//   sextile, adjustable in the settings; 2° more when the Sun or Moon is
//   involved.
// - Sect: day chart when the Sun is above the horizon, whatever the house
//   system.
// - Lots: Hermetic lots of Paulus Alexandrinus plus father and mother, each
//   reversed by night as in al-Biruni's Tafhim.
// - Dignities: domicile, exaltation, Dorothean triplicity (day, night,
//   participating), Egyptian terms, Chaldean faces; detriment and fall.
//   Scores as in Lilly: +5 +4 +3 (sect triplicity ruler) +2 +1, -5 detriment,
//   -4 fall, -5 peregrine (no essential dignity at all).

import { BodyKey, BodyPosition, ChartResult } from './engine';

export type Planet =
  | 'sun'
  | 'moon'
  | 'mercury'
  | 'venus'
  | 'mars'
  | 'jupiter'
  | 'saturn';

const norm = (x: number) => ((x % 360) + 360) % 360;
const signOf = (lon: number) => Math.floor(norm(lon) / 30);
const degreeInSign = (lon: number) => norm(lon) % 30;

// ---------- sect -------------------------------------------------------------

export function isDayChart(chart: ChartResult): boolean {
  const sun = chart.bodies.find(b => b.key === 'sun');
  if (!sun) {
    throw new Error('chart has no Sun');
  }
  if (!chart.houses) {
    throw new Error('sect needs a chart with houses');
  }
  // The ecliptic crosses the horizon at the Ascendant and the Descendant, and
  // the Sun stays on the ecliptic, so it is above the horizon exactly when it
  // lies on the Midheaven side of that axis. Unlike house positions, this does
  // not depend on the house system.
  return norm(sun.lon - chart.houses.asc) >= 180;
}

// ---------- aspects ----------------------------------------------------------

export type AspectKind =
  | 'semisextile'
  | 'semisquare'
  | 'quincunx'
  | 'sesquiquadrate'
  | 'conjunction'
  | 'sextile'
  | 'square'
  | 'trine'
  | 'opposition';

const MAJOR: { kind: AspectKind; angle: number }[] = [
  { kind: 'conjunction', angle: 0 },
  { kind: 'sextile', angle: 60 },
  { kind: 'square', angle: 90 },
  { kind: 'trine', angle: 120 },
  { kind: 'opposition', angle: 180 },
];
const MINOR: { kind: AspectKind; angle: number }[] = [
  { kind: 'semisextile', angle: 30 },
  { kind: 'semisquare', angle: 45 },
  { kind: 'sesquiquadrate', angle: 135 },
  { kind: 'quincunx', angle: 150 },
];

/** Orbs and minor aspects, from the user's settings. */
export interface AspectSettings {
  orbs: Record<string, number>;
  minor: boolean;
}
let aspectSettings: AspectSettings = {
  orbs: { conjunction: 8, opposition: 8, trine: 7, square: 7, sextile: 5 },
  minor: false,
};
export function setAspectSettings(s: AspectSettings) {
  aspectSettings = s;
}
function activeAspects() {
  const list = aspectSettings.minor ? [...MAJOR, ...MINOR] : MAJOR;
  return list.map(a => ({ ...a, orb: aspectSettings.orbs[a.kind] ?? 0 }));
}
const LUMINARY_BONUS = 2;

export interface AspectPoint {
  key: BodyKey | 'asc' | 'mc';
  lon: number;
  speed: number | null; // degrees per day; null for the angles
}

export interface Aspect {
  a: AspectPoint['key'];
  b: AspectPoint['key'];
  kind: AspectKind;
  orb: number; // degrees from exact
  /** null when one side is an angle (no meaningful motion here). */
  applying: boolean | null;
}

function separation(a: number, b: number): number {
  const d = Math.abs(norm(a) - norm(b));
  return d > 180 ? 360 - d : d;
}

export function aspectPoints(chart: ChartResult): AspectPoint[] {
  const pts: AspectPoint[] = chart.bodies.map(b => ({
    key: b.key,
    lon: b.lon,
    speed: b.lonSpeed,
  }));
  if (chart.houses) {
    pts.push({ key: 'asc', lon: chart.houses.asc, speed: null });
    pts.push({ key: 'mc', lon: chart.houses.mc, speed: null });
  }
  return pts;
}

export function findAspects(points: AspectPoint[]): Aspect[] {
  const out: Aspect[] = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const p = points[i];
      const q = points[j];
      if (p.speed === null && q.speed === null) {
        continue; // Ascendant-Midheaven is not an aspect
      }
      const sep = separation(p.lon, q.lon);
      const luminary = [p.key, q.key].some(k => k === 'sun' || k === 'moon');
      for (const asp of activeAspects()) {
        const orb = Math.abs(sep - asp.angle);
        if (orb <= asp.orb + (luminary ? LUMINARY_BONUS : 0)) {
          let applying: boolean | null = null;
          if (p.speed !== null && q.speed !== null) {
            const dt = 1 / 1440; // one minute
            const later = Math.abs(
              separation(p.lon + p.speed * dt, q.lon + q.speed * dt) -
                asp.angle,
            );
            applying = later < orb;
          }
          out.push({ a: p.key, b: q.key, kind: asp.kind, orb, applying });
          break;
        }
      }
    }
  }
  return out.sort((x, y) => x.orb - y.orb);
}

// ---------- lots ---------------------------------------------------------------

export type LotKey =
  | 'fortune'
  | 'spirit'
  | 'eros'
  | 'necessity'
  | 'courage'
  | 'victory'
  | 'nemesis'
  | 'father'
  | 'mother';

export interface Lot {
  key: LotKey;
  lon: number;
  /** "Asc + A - B" actually used, after the night reversal. */
  formula: [string, string];
}

export function computeLots(chart: ChartResult): Lot[] {
  if (!chart.houses) {
    throw new Error('lots need a chart with houses');
  }
  const asc = chart.houses.asc;
  const lon = (k: BodyKey) => {
    const b = chart.bodies.find(x => x.key === k);
    if (!b) {
      throw new Error(`lots need ${k} in the chart`);
    }
    return b.lon;
  };
  const day = isDayChart(chart);
  const pts: Record<string, number> = {
    sun: lon('sun'),
    moon: lon('moon'),
    mercury: lon('mercury'),
    venus: lon('venus'),
    mars: lon('mars'),
    jupiter: lon('jupiter'),
    saturn: lon('saturn'),
  };
  // Asc + plus - minus by day; swapped by night.
  const make = (key: LotKey, plus: string, minus: string): Lot => {
    const [p, m] = day ? [plus, minus] : [minus, plus];
    return { key, lon: norm(asc + pts[p] - pts[m]), formula: [p, m] };
  };
  const fortune = make('fortune', 'moon', 'sun');
  const spirit = make('spirit', 'sun', 'moon');
  pts.fortune = fortune.lon;
  pts.spirit = spirit.lon;
  return [
    fortune,
    spirit,
    make('eros', 'venus', 'spirit'),
    make('necessity', 'fortune', 'mercury'),
    make('courage', 'fortune', 'mars'),
    make('victory', 'jupiter', 'spirit'),
    make('nemesis', 'fortune', 'saturn'),
    make('father', 'saturn', 'sun'),
    make('mother', 'moon', 'venus'),
  ];
}

// ---------- essential dignities ---------------------------------------------

export const PLANETS: Planet[] = [
  'sun',
  'moon',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
];

const DOMICILE: Planet[] = [
  'mars',
  'venus',
  'mercury',
  'moon',
  'sun',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'saturn',
  'jupiter',
];

const EXALTATION: Record<Planet, { sign: number; degree: number }> = {
  sun: { sign: 0, degree: 19 },
  moon: { sign: 1, degree: 3 },
  mercury: { sign: 5, degree: 15 },
  venus: { sign: 11, degree: 27 },
  mars: { sign: 9, degree: 28 },
  jupiter: { sign: 3, degree: 15 },
  saturn: { sign: 6, degree: 21 },
};

// Dorothean triplicity rulers [day, night, participating] by element
// (fire, earth, air, water = sign % 4).
const TRIPLICITY: [Planet, Planet, Planet][] = [
  ['sun', 'jupiter', 'saturn'],
  ['venus', 'moon', 'mars'],
  ['saturn', 'mercury', 'jupiter'],
  ['venus', 'mars', 'moon'],
];

// Egyptian terms: [ruler, end degree] for each sign.
const TERMS: [Planet, number][][] = [
  [
    ['jupiter', 6],
    ['venus', 12],
    ['mercury', 20],
    ['mars', 25],
    ['saturn', 30],
  ],
  [
    ['venus', 8],
    ['mercury', 14],
    ['jupiter', 22],
    ['saturn', 27],
    ['mars', 30],
  ],
  [
    ['mercury', 6],
    ['jupiter', 12],
    ['venus', 17],
    ['mars', 24],
    ['saturn', 30],
  ],
  [
    ['mars', 7],
    ['venus', 13],
    ['mercury', 19],
    ['jupiter', 26],
    ['saturn', 30],
  ],
  [
    ['jupiter', 6],
    ['venus', 11],
    ['saturn', 18],
    ['mercury', 24],
    ['mars', 30],
  ],
  [
    ['mercury', 7],
    ['venus', 17],
    ['jupiter', 21],
    ['mars', 28],
    ['saturn', 30],
  ],
  [
    ['saturn', 6],
    ['mercury', 14],
    ['jupiter', 21],
    ['venus', 28],
    ['mars', 30],
  ],
  [
    ['mars', 7],
    ['venus', 11],
    ['mercury', 19],
    ['jupiter', 24],
    ['saturn', 30],
  ],
  [
    ['jupiter', 12],
    ['venus', 17],
    ['mercury', 21],
    ['saturn', 26],
    ['mars', 30],
  ],
  [
    ['mercury', 7],
    ['jupiter', 14],
    ['venus', 22],
    ['saturn', 26],
    ['mars', 30],
  ],
  [
    ['mercury', 7],
    ['venus', 13],
    ['jupiter', 20],
    ['mars', 25],
    ['saturn', 30],
  ],
  [
    ['venus', 12],
    ['jupiter', 16],
    ['mercury', 19],
    ['mars', 28],
    ['saturn', 30],
  ],
];

const CHALDEAN: Planet[] = [
  'mars',
  'sun',
  'venus',
  'mercury',
  'moon',
  'saturn',
  'jupiter',
];

export interface SignRulers {
  domicile: Planet;
  exaltation: Planet | null;
  triplicity: [Planet, Planet, Planet];
  term: Planet;
  face: Planet;
}

/** Who rules a given ecliptic longitude, by every essential dignity. */
export function rulersAt(lon: number): SignRulers {
  const sign = signOf(lon);
  const deg = degreeInSign(lon);
  const exaltation = PLANETS.find(p => EXALTATION[p].sign === sign) ?? null;
  const term = TERMS[sign].find(([, end]) => deg < end)![0];
  const face = CHALDEAN[(sign * 3 + Math.floor(deg / 10)) % 7];
  return {
    domicile: DOMICILE[sign],
    exaltation,
    triplicity: TRIPLICITY[sign % 4],
    term,
    face,
  };
}

export type DignityKind =
  | 'domicile'
  | 'exaltation'
  | 'triplicity'
  | 'term'
  | 'face'
  | 'detriment'
  | 'fall'
  | 'peregrine';

const SCORE: Record<DignityKind, number> = {
  domicile: 5,
  exaltation: 4,
  triplicity: 3,
  term: 2,
  face: 1,
  detriment: -5,
  fall: -4,
  peregrine: -5,
};

export interface PlanetDignity {
  planet: Planet;
  lon: number;
  dignities: DignityKind[];
  score: number;
}

export function planetDignity(
  planet: Planet,
  lon: number,
  day: boolean,
): PlanetDignity {
  const sign = signOf(lon);
  const r = rulersAt(lon);
  const d: DignityKind[] = [];
  if (r.domicile === planet) {
    d.push('domicile');
  }
  if (r.exaltation === planet) {
    d.push('exaltation');
  }
  if (r.triplicity[day ? 0 : 1] === planet) {
    d.push('triplicity');
  }
  if (r.term === planet) {
    d.push('term');
  }
  if (r.face === planet) {
    d.push('face');
  }
  // A planet in one of its own triplicities by the other sect, or as
  // participating ruler, is not peregrine even though it scores nothing.
  const anyDignity = d.length > 0 || r.triplicity.includes(planet);
  if (DOMICILE[(sign + 6) % 12] === planet) {
    d.push('detriment');
  }
  if (EXALTATION[planet].sign === (sign + 6) % 12) {
    d.push('fall');
  }
  if (!anyDignity) {
    d.push('peregrine');
  }
  return {
    planet,
    lon,
    dignities: d,
    score: d.reduce((s, k) => s + SCORE[k], 0),
  };
}

export function chartDignities(chart: ChartResult): PlanetDignity[] {
  const day = isDayChart(chart);
  return PLANETS.flatMap(p => {
    const b: BodyPosition | undefined = chart.bodies.find(x => x.key === p);
    return b ? [planetDignity(p, b.lon, day)] : [];
  });
}
