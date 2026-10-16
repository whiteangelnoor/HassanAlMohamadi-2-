// The finder of suitable times (الاختيارات): stretches where the planetary
// hour belongs to a planet that suits the purpose, the Moon stands in a
// mansion that suits it, and the Moon is not void of course (it still has an
// exact aspect to make with one of the seven planets before it leaves its
// sign). AGPL-3.0-or-later.

import { BodyKey } from '../astro/engine';
import {
  aspectHits,
  crossings,
  fixedTrack,
  ingresses,
  lonAt,
  tracks,
} from '../astro/events';
import {
  MANSION_WIDTH,
  MansionMethod,
  mansionOf,
  moonTrack,
} from '../astro/mansions';
import { planetaryDay } from '../astro/planetaryHours';
import { Planet } from '../astro/traditional';

export interface Purpose {
  key: string;
  label: string;
  planets: Planet[];
  /** Mansion indices, al-Sharatan = 0. */
  mansions: number[];
}

// From the hour and mansion tables of the app (hourTraits, mansionTraits).
export const PURPOSES: Purpose[] = [
  {
    key: 'marriage',
    label: 'الزواج والخطبة',
    planets: ['venus', 'jupiter'],
    mansions: [12, 13, 23, 27],
  },
  {
    key: 'love',
    label: 'المحبة والصلح',
    planets: ['venus', 'jupiter'],
    mansions: [5, 7, 9, 16, 23, 25],
  },
  {
    key: 'travel',
    label: 'السفر',
    planets: ['moon', 'mercury'],
    mansions: [0, 7, 10, 12, 19, 27],
  },
  {
    key: 'trade',
    label: 'التجارة والبيع والشراء',
    planets: ['mercury', 'jupiter'],
    mansions: [2, 6, 10, 12, 23, 26, 27],
  },
  {
    key: 'gain',
    label: 'طلب الرزق والكسب',
    planets: ['jupiter', 'sun'],
    mansions: [6, 14, 20, 26],
  },
  {
    key: 'learning',
    label: 'العلم والكتابة',
    planets: ['mercury'],
    mansions: [2, 4],
  },
  {
    key: 'nobles',
    label: 'لقاء الكبراء وطلب الحوائج',
    planets: ['sun', 'jupiter'],
    mansions: [4, 9],
  },
  {
    key: 'healing',
    label: 'العلاج والدواء',
    planets: ['jupiter', 'sun'],
    mansions: [0, 13, 21, 22, 26],
  },
  {
    key: 'building',
    label: 'البناء',
    planets: ['jupiter', 'saturn'],
    mansions: [9, 16, 20, 24],
  },
  {
    key: 'planting',
    label: 'الزرع والغرس',
    planets: ['venus', 'moon'],
    mansions: [1, 6, 11, 12, 20, 26],
  },
];

export interface Window {
  startJd: number;
  endJd: number;
  ruler: Planet;
  mansion: number;
}

interface Span {
  a: number;
  b: number;
}

const SEVEN: BodyKey[] = [
  'sun',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
];

/**
 * Void-of-course stretches of the Moon between startJd and endJd: from its
 * last exact aspect to one of the seven planets in a sign until it enters
 * the next sign. Signs in the zodiac of the engine's defaults.
 */
export function voidSpans(startJd: number, endJd: number): Span[] {
  const t = tracks(['moon', ...SEVEN], startJd - 3, endJd + 3, 1);
  const hits = SEVEN.flatMap(p => aspectHits(t.moon, 'moon', t[p], p))
    .map(h => h.jd)
    .sort((x, y) => x - y);
  const signs = ingresses(t.moon, 'moon').map(i => i.jd);
  const out: Span[] = [];
  for (let k = 1; k < signs.length; k++) {
    const inSign = hits.filter(j => j > signs[k - 1] && j < signs[k]);
    const from = inSign.length ? inSign[inSign.length - 1] : signs[k - 1];
    if (signs[k] > startJd && from < endJd) {
      out.push({ a: from, b: signs[k] });
    }
  }
  return out;
}

/** Stretches with the Moon in one mansion, in the method's frame. */
function mansionSpans(
  method: MansionMethod,
  startJd: number,
  endJd: number,
): (Span & { mansion: number })[] {
  const moon = moonTrack(method, startJd, endJd);
  const bounds = Array.from({ length: 28 }, (_, i) => i * MANSION_WIDTH);
  const cuts = crossings(moon, fixedTrack(0, moon), bounds)
    .map(c => c.jd)
    .filter(j => j > startJd && j < endJd);
  const edges = [startJd, ...cuts, endJd];
  const out: (Span & { mansion: number })[] = [];
  for (let i = 0; i + 1 < edges.length; i++) {
    const mid = (edges[i] + edges[i + 1]) / 2;
    out.push({
      a: edges[i],
      b: edges[i + 1],
      mansion: mansionOf(lonAt(moon, mid)),
    });
  }
  return out;
}

function subtract(s: Span, holes: Span[]): Span[] {
  let parts = [s];
  for (const h of holes) {
    parts = parts.flatMap(p =>
      h.b <= p.a || h.a >= p.b
        ? [p]
        : [
            ...(h.a > p.a ? [{ a: p.a, b: h.a }] : []),
            ...(h.b < p.b ? [{ a: h.b, b: p.b }] : []),
          ],
    );
  }
  return parts;
}

/**
 * Suitable windows for a purpose from `fromJd` over the planetary days of
 * the next `days` civil dates (local) at a place; pieces shorter than
 * `minMinutes` are left out.
 */
export function findWindows(
  purpose: Purpose,
  place: { lat: number; lon: number },
  method: MansionMethod,
  fromJd: number,
  days: number,
  minMinutes = 10,
): Window[] {
  const fromDate = new Date((fromJd - 2440587.5) * 86400000);
  const hours = [];
  for (let k = -1; k < days; k++) {
    const d = new Date(
      fromDate.getFullYear(),
      fromDate.getMonth(),
      fromDate.getDate() + k,
    );
    const p = planetaryDay(
      d.getFullYear(),
      d.getMonth() + 1,
      d.getDate(),
      place.lat,
      place.lon,
    );
    if (p) {
      hours.push(
        ...p.hours.filter(
          h => purpose.planets.includes(h.ruler) && h.endJd > fromJd,
        ),
      );
    }
  }
  if (hours.length === 0) {
    return [];
  }
  const start = Math.min(...hours.map(h => h.startJd));
  const end = Math.max(...hours.map(h => h.endJd));
  const mansions = mansionSpans(method, start, end).filter(m =>
    purpose.mansions.includes(m.mansion),
  );
  const voids = voidSpans(start, end);
  const out: Window[] = [];
  for (const h of hours) {
    for (const m of mansions) {
      const a = Math.max(h.startJd, m.a, fromJd);
      const b = Math.min(h.endJd, m.b);
      if (b <= a) {
        continue;
      }
      for (const p of subtract({ a, b }, voids)) {
        if ((p.b - p.a) * 1440 >= minMinutes) {
          out.push({
            startJd: p.a,
            endJd: p.b,
            ruler: h.ruler,
            mansion: m.mansion,
          });
        }
      }
    }
  }
  return out.sort((x, y) => x.startJd - y.startJd);
}
