// Exact times of astrological events, found by sampling the engine once per
// day and interpolating between samples. AGPL-3.0-or-later.
//
// Each sample has a longitude and a daily speed, so the path between two
// samples is a cubic Hermite curve. For the planets and the Moon over one day
// this matches the engine to well under a minute of time (checked against
// direct engine calls in __tests__/events.engine.test.ts). Stations, where the
// speed itself crosses zero, are refined with direct engine calls instead.

import { AstroEngine, BodyKey } from './engine';

export const J1970 = 2440587.5;
export const jdFromDate = (d: Date) => d.getTime() / 86400000 + J1970;
export const dateFromJd = (jd: number) => new Date((jd - J1970) * 86400000);

const norm = (x: number) => ((x % 360) + 360) % 360;
const wrap180 = (x: number) => {
  const y = norm(x);
  return y > 180 ? y - 360 : y;
};

/** Longitudes unwrapped into a continuous curve, with daily speeds. */
export interface Track {
  start: number; // JD of the first sample
  step: number; // days between samples
  lon: number[];
  speed: number[];
}

export function tracks(
  bodies: BodyKey[],
  startJd: number,
  endJd: number,
  step = 1,
): Record<string, Track> {
  const r = AstroEngine.series({
    startJdUt: startJd,
    endJdUt: endJd,
    stepDays: step,
    bodies,
  });
  const out: Record<string, Track> = {};
  for (const key of bodies) {
    const s = r.series[key];
    if (!s) {
      continue;
    }
    const lon = s.lon.slice();
    for (let i = 1; i < lon.length; i++) {
      lon[i] = lon[i - 1] + wrap180(lon[i] - lon[i - 1]);
    }
    out[key] = { start: startJd, step, lon, speed: s.lonSpeed.slice() };
  }
  return out;
}

/** A constant point (a natal position) as a track that never moves. */
export function fixedTrack(lon: number, like: Track): Track {
  const n = like.lon.length;
  return {
    start: like.start,
    step: like.step,
    lon: new Array(n).fill(lon),
    speed: new Array(n).fill(0),
  };
}

function hermite(
  p0: number,
  m0: number,
  p1: number,
  m1: number,
  h: number,
  u: number,
): number {
  const u2 = u * u;
  const u3 = u2 * u;
  return (
    (2 * u3 - 3 * u2 + 1) * p0 +
    (u3 - 2 * u2 + u) * h * m0 +
    (-2 * u3 + 3 * u2) * p1 +
    (u3 - u2) * h * m1
  );
}

export interface Crossing {
  jd: number;
  /** Direction of a - b at the crossing: +1 increasing, -1 decreasing. */
  direction: 1 | -1;
}

/**
 * Times when (a - b) passes through target (mod 360), for tracks sampled on
 * the same grid. Targets are in degrees, e.g. [0, 90, 180, 270].
 */
export function crossings(
  a: Track,
  b: Track,
  targets: number[],
): (Crossing & { target: number })[] {
  const out: (Crossing & { target: number })[] = [];
  const h = a.step;
  const n = Math.min(a.lon.length, b.lon.length);
  for (let i = 0; i + 1 < n; i++) {
    const d0 = a.lon[i] - b.lon[i];
    const d1 = a.lon[i + 1] - b.lon[i + 1];
    const m0 = a.speed[i] - b.speed[i];
    const m1 = a.speed[i + 1] - b.speed[i + 1];
    const lo = Math.min(d0, d1);
    const hi = Math.max(d0, d1);
    for (const t of targets) {
      // Every value t + 360k inside [lo, hi].
      let k = Math.ceil((lo - t) / 360);
      for (let v = t + 360 * k; v <= hi; k++, v = t + 360 * k) {
        if (v === d0 && i > 0) {
          continue; // counted at the end of the previous interval
        }
        let u0 = 0;
        let u1 = 1;
        const f = (u: number) => hermite(d0, m0, d1, m1, h, u) - v;
        const f0 = f(0);
        for (let it = 0; it < 40; it++) {
          const mid = (u0 + u1) / 2;
          if (f(mid) * f0 > 0) {
            u0 = mid;
          } else {
            u1 = mid;
          }
        }
        const u = (u0 + u1) / 2;
        out.push({
          jd: a.start + (i + u) * h,
          target: t,
          direction: d1 > d0 ? 1 : -1,
        });
      }
    }
  }
  return out.sort((x, y) => x.jd - y.jd);
}

// ---------- events built on crossings -----------------------------------------

export type AspectKind =
  | 'conjunction'
  | 'sextile'
  | 'square'
  | 'trine'
  | 'opposition';
const ASPECT_TARGETS: { kind: AspectKind; targets: number[] }[] = [
  { kind: 'conjunction', targets: [0] },
  { kind: 'sextile', targets: [60, 300] },
  { kind: 'square', targets: [90, 270] },
  { kind: 'trine', targets: [120, 240] },
  { kind: 'opposition', targets: [180] },
];

export interface AspectHit {
  jd: number;
  a: string; // moving body
  b: string; // other body or natal point
  kind: AspectKind;
  retrograde: boolean; // the moving body at that moment
}

function speedAt(t: Track, jd: number): number {
  const x = (jd - t.start) / t.step;
  const i = Math.min(Math.max(Math.floor(x), 0), t.speed.length - 2);
  const u = x - i;
  return t.speed[i] * (1 - u) + t.speed[i + 1] * u;
}

/** Exact aspects between a moving track and another track or fixed point. */
export function aspectHits(
  a: Track,
  aKey: string,
  b: Track,
  bKey: string,
): AspectHit[] {
  const hits: AspectHit[] = [];
  for (const { kind, targets } of ASPECT_TARGETS) {
    for (const c of crossings(a, b, targets)) {
      hits.push({
        jd: c.jd,
        a: aKey,
        b: bKey,
        kind,
        retrograde: speedAt(a, c.jd) < 0,
      });
    }
  }
  return hits;
}

export interface Ingress {
  jd: number;
  body: string;
  sign: number; // sign entered, 0 = Aries
  retrograde: boolean;
}

export function ingresses(t: Track, body: string): Ingress[] {
  const zero = fixedTrack(0, t);
  const targets = Array.from({ length: 12 }, (_, i) => i * 30);
  return crossings(t, zero, targets).map(c => {
    const retro = c.direction < 0;
    // Moving backwards across a boundary enters the sign below it.
    const sign = retro ? (c.target / 30 + 11) % 12 : c.target / 30;
    return { jd: c.jd, body, sign, retrograde: retro };
  });
}

export type Phase = 'new' | 'firstQuarter' | 'full' | 'lastQuarter';

export function moonPhases(
  moon: Track,
  sun: Track,
): { jd: number; phase: Phase }[] {
  const names: Record<number, Phase> = {
    0: 'new',
    90: 'firstQuarter',
    180: 'full',
    270: 'lastQuarter',
  };
  return crossings(moon, sun, [0, 90, 180, 270]).map(c => ({
    jd: c.jd,
    phase: names[c.target],
  }));
}

export interface Station {
  jd: number;
  body: string;
  /** 'retrograde' when the planet turns backwards, 'direct' when it resumes. */
  kind: 'retrograde' | 'direct';
  lon: number;
}

/** Stations, located by the sign change of the sampled speed and refined with the engine. */
export function stations(t: Track, body: BodyKey): Station[] {
  const out: Station[] = [];
  for (let i = 0; i + 1 < t.speed.length; i++) {
    const s0 = t.speed[i];
    const s1 = t.speed[i + 1];
    if (s0 === 0 || s0 * s1 >= 0) {
      continue;
    }
    let lo = t.start + i * t.step;
    let hi = lo + t.step;
    let lon = t.lon[i];
    for (let it = 0; it < 18; it++) {
      const mid = (lo + hi) / 2;
      const b = AstroEngine.chart({ time: { jdUt: mid }, bodies: [body] })
        .bodies[0];
      lon = b.lon;
      if (b.lonSpeed * s0 > 0) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    out.push({
      jd: (lo + hi) / 2,
      body,
      kind: s0 > 0 ? 'retrograde' : 'direct',
      lon: norm(lon),
    });
  }
  return out;
}

/** Exact moment `body` returns to `lon`, searched in [startJd, endJd]. */
export function returnTime(
  body: BodyKey,
  lon: number,
  startJd: number,
  endJd: number,
): number | null {
  const t = tracks([body], startJd, endJd)[body];
  const hits = crossings(t, fixedTrack(lon, t), [0]).filter(
    c => c.direction > 0,
  );
  if (hits.length === 0) {
    return null;
  }
  // Polish with the engine: a few Newton steps on the exact longitude.
  let jd = hits[0].jd;
  for (let it = 0; it < 4; it++) {
    const b = AstroEngine.chart({ time: { jdUt: jd }, bodies: [body] })
      .bodies[0];
    jd -= wrap180(b.lon - lon) / b.lonSpeed;
  }
  return jd;
}
