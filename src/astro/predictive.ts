// Predictive techniques: transits, secondary progressions, returns, annual
// profections and firdaria. AGPL-3.0-or-later.
//
// Conventions:
// - Transits to natal: Sun to Pluto (the Moon moves too fast for a yearly
//   list) against the natal planets, nodes, Chiron, Ascendant and Midheaven.
// - Secondary progressions: one day after birth for each tropical year of
//   life (365.24219 days). Progressed Midheaven by solar arc in longitude;
//   progressed Ascendant from that Midheaven at the birth latitude.
// - Profections: one sign per year from the natal Ascendant sign; the lord of
//   the year is the domicile ruler of that sign.
// - Firdaria: the sequence of Abu Ma'shar, nodes at the end for day and night
//   births. Each planetary period is split in seven equal parts ruled in
//   Chaldean order starting with its own lord; the nodes have no sub-periods.

import { AstroEngine, BodyKey, ChartResult } from './engine';
import { aspectHits, AspectHit, fixedTrack, tracks } from './events';
import { Planet } from './traditional';

export const TROPICAL_YEAR = 365.24219;
const norm = (x: number) => ((x % 360) + 360) % 360;
const rad = Math.PI / 180;

// ---------- transits -----------------------------------------------------------

export const TRANSIT_BODIES: BodyKey[] = [
  'sun',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
];

/** Natal points a transit can aspect: every body in the chart plus the angles. */
export function natalPoints(
  natal: ChartResult,
): { key: string; lon: number }[] {
  const pts = natal.bodies.map(b => ({ key: b.key as string, lon: b.lon }));
  if (natal.houses) {
    pts.push(
      { key: 'asc', lon: natal.houses.asc },
      { key: 'mc', lon: natal.houses.mc },
    );
  }
  return pts;
}

/** Exact transit-to-natal aspects in [startJd, endJd], sorted by time. */
export function upcomingTransits(
  natal: ChartResult,
  startJd: number,
  endJd: number,
): AspectHit[] {
  const t = tracks(TRANSIT_BODIES, startJd, endJd);
  const hits: AspectHit[] = [];
  for (const body of TRANSIT_BODIES) {
    for (const p of natalPoints(natal)) {
      hits.push(
        ...aspectHits(t[body], body, fixedTrack(p.lon, t[body]), p.key),
      );
    }
  }
  return hits
    .filter(h => h.jd >= startJd && h.jd <= endJd)
    .sort((a, b) => a.jd - b.jd);
}

// ---------- secondary progressions -------------------------------------------

/** Ascendant from the Midheaven longitude, obliquity and geographic latitude. */
export function ascFromMc(mc: number, obliquity: number, lat: number): number {
  const e = obliquity * rad;
  // Right ascension of the Midheaven, in the same quadrant as the MC.
  const ramc = Math.atan2(Math.sin(mc * rad) * Math.cos(e), Math.cos(mc * rad));
  const asc = Math.atan2(
    Math.cos(ramc),
    -(Math.sin(ramc) * Math.cos(e) + Math.tan(lat * rad) * Math.sin(e)),
  );
  return norm(asc / rad);
}

export interface Progressed {
  jdUt: number; // the progressed date
  ageYears: number;
  chart: ChartResult; // planets at the progressed date (no houses)
  mc: number;
  asc: number;
}

export function secondaryProgressions(
  natal: ChartResult,
  lat: number,
  targetJd: number,
  bodies: BodyKey[],
): Progressed {
  const ageYears = (targetJd - natal.jdUt) / TROPICAL_YEAR;
  const jdUt = natal.jdUt + ageYears;
  const chart = AstroEngine.chart({ time: { jdUt }, bodies });
  const natalSun = natal.bodies.find(b => b.key === 'sun')!.lon;
  const progSun = chart.bodies.find(b => b.key === 'sun')!.lon;
  const arc = norm(progSun - natalSun);
  const mc = norm((natal.houses?.mc ?? 0) + arc);
  return {
    jdUt,
    ageYears,
    chart,
    mc,
    asc: ascFromMc(mc, chart.obliquity, lat),
  };
}

// ---------- profections ----------------------------------------------------------

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

export function profection(
  natalAsc: number,
  ageYears: number,
): { sign: number; lord: Planet; house: number } {
  const years = Math.floor(ageYears);
  const sign = (Math.floor(norm(natalAsc) / 30) + years) % 12;
  return { sign, lord: DOMICILE[sign], house: (years % 12) + 1 };
}

// ---------- firdaria ---------------------------------------------------------------

export type FirdarLord = Planet | 'northNode' | 'southNode';

const DAY_ORDER: [FirdarLord, number][] = [
  ['sun', 10],
  ['venus', 8],
  ['mercury', 13],
  ['moon', 9],
  ['saturn', 11],
  ['jupiter', 12],
  ['mars', 7],
  ['northNode', 3],
  ['southNode', 2],
];
const NIGHT_ORDER: [FirdarLord, number][] = [
  ['moon', 9],
  ['saturn', 11],
  ['jupiter', 12],
  ['mars', 7],
  ['sun', 10],
  ['venus', 8],
  ['mercury', 13],
  ['northNode', 3],
  ['southNode', 2],
];
const CHALDEAN: Planet[] = [
  'saturn',
  'jupiter',
  'mars',
  'sun',
  'venus',
  'mercury',
  'moon',
];

export interface FirdarPeriod {
  lord: FirdarLord;
  startJd: number;
  endJd: number;
  sub: { lord: Planet; startJd: number; endJd: number }[];
}

/** Firdaria from birth for 75 years, then the cycle repeats. */
export function firdaria(
  birthJd: number,
  day: boolean,
  cycles = 2,
): FirdarPeriod[] {
  const out: FirdarPeriod[] = [];
  let t = birthJd;
  for (let c = 0; c < cycles; c++) {
    for (const [lord, years] of day ? DAY_ORDER : NIGHT_ORDER) {
      const len = years * TROPICAL_YEAR;
      const sub: FirdarPeriod['sub'] = [];
      if (lord !== 'northNode' && lord !== 'southNode') {
        const first = CHALDEAN.indexOf(lord);
        for (let k = 0; k < 7; k++) {
          sub.push({
            lord: CHALDEAN[(first + k) % 7],
            startJd: t + (len * k) / 7,
            endJd: t + (len * (k + 1)) / 7,
          });
        }
      }
      out.push({ lord, startJd: t, endJd: t + len, sub });
      t += len;
    }
  }
  return out;
}

// ---------- aspects between two charts -------------------------------------------

export interface CrossAspect {
  a: string; // key in the moving chart
  b: string; // natal point
  kind: 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';
  orb: number;
  applying: boolean;
}

const CROSS_ASPECTS: [CrossAspect['kind'], number][] = [
  ['conjunction', 0],
  ['sextile', 60],
  ['square', 90],
  ['trine', 120],
  ['opposition', 180],
];

/** Aspects from a moving chart (transits, progressions) to natal points. */
export function crossAspects(
  moving: ChartResult,
  natal: ChartResult,
  orb: number,
): CrossAspect[] {
  const out: CrossAspect[] = [];
  const separation = (x: number, y: number) => {
    const d = Math.abs(norm(x) - norm(y));
    return d > 180 ? 360 - d : d;
  };
  for (const m of moving.bodies) {
    for (const p of natalPoints(natal)) {
      const sep = separation(m.lon, p.lon);
      for (const [kind, angle] of CROSS_ASPECTS) {
        const o = Math.abs(sep - angle);
        if (o <= orb) {
          const later = Math.abs(
            separation(m.lon + m.lonSpeed / 1440, p.lon) - angle,
          );
          out.push({ a: m.key, b: p.key, kind, orb: o, applying: later < o });
          break;
        }
      }
    }
  }
  return out.sort((x, y) => x.orb - y.orb);
}
