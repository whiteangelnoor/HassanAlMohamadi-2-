// Lunar Hijri months that follow crescent sighting, predicted
// astronomically for a reference city. AGPL-3.0-or-later.
//
// Criterion: at sunset in the city on an evening after the conjunction, the
// month begins the next day if the Moon stands at least 5° above the horizon
// (topocentric) and at least 8° from the Sun (the 5°/8° criterion of the
// 1978 Istanbul conference). If neither of the next two evenings qualifies,
// the month begins on the third day. This predicts sighting; the official
// announcement can differ by a day, which the user can correct.

import { AstroEngine } from '../astro/engine';
import { crossings, J1970, tracks } from '../astro/events';
import { HijriDate, toHijri } from './hijri';

export interface SightingCity {
  name: string;
  lat: number;
  lon: number;
}

export const SIGHTING_CITIES = {
  karachi: { name: 'كراتشي', lat: 24.8607, lon: 67.0011 },
  tehran: { name: 'طهران (معهد الجيوفيزياء)', lat: 35.6892, lon: 51.389 },
  qom: { name: 'قم', lat: 34.6416, lon: 50.8746 },
} satisfies Record<string, SightingCity>;

export type SightingKey = keyof typeof SIGHTING_CITIES;

const rad = Math.PI / 180;
const DAY_MS = 86400000;
const TROPICAL = { zodiac: { type: 'tropical' as const } };

function sky(jd: number, city: SightingCity) {
  const c = AstroEngine.chart({
    ...TROPICAL,
    topocentric: true,
    time: { jdUt: jd },
    location: { lat: city.lat, lon: city.lon },
    houseSystem: 'P',
    bodies: ['sun', 'moon'],
  });
  const armc = c.houses!.armc;
  const alt = (ra: number, dec: number) => {
    const h = (armc - ra) * rad;
    const s =
      Math.sin(city.lat * rad) * Math.sin(dec * rad) +
      Math.cos(city.lat * rad) * Math.cos(dec * rad) * Math.cos(h);
    return Math.asin(s) / rad;
  };
  const [sun, moon] = c.bodies;
  const cosE =
    Math.sin(sun.dec * rad) * Math.sin(moon.dec * rad) +
    Math.cos(sun.dec * rad) *
      Math.cos(moon.dec * rad) *
      Math.cos((sun.ra - moon.ra) * rad);
  return {
    sunAlt: alt(sun.ra, sun.dec),
    moonAlt: alt(moon.ra, moon.dec),
    elongation: Math.acos(Math.min(1, Math.max(-1, cosE))) / rad,
  };
}

/** Sunset (Sun's upper limb, -0.833°) on a civil date in the city, as JD. */
export function sunset(dayStartMs: number, city: SightingCity): number {
  // Local apparent noon, roughly, then search the six to ten hours after it.
  const noon = (dayStartMs - city.lon * 240000 + 12 * 3600000) / DAY_MS + J1970;
  let lo = noon + 1 / 24;
  let hi = noon + 10 / 24;
  for (let i = 0; i < 22; i++) {
    const mid = (lo + hi) / 2;
    if (sky(mid, city).sunAlt > -0.833) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}

/** UTC midnight (ms) of the civil date at the city's mean local time. */
function cityDay(jd: number, city: SightingCity): number {
  const local = (jd - J1970) * DAY_MS + city.lon * 240000;
  return Math.floor(local / DAY_MS) * DAY_MS;
}

/** First days of the lunar months (UTC ms of the civil date) in a window. */
export function monthStarts(
  fromMs: number,
  toMs: number,
  city: SightingCity,
): number[] {
  const from = fromMs / DAY_MS + J1970 - 35;
  const to = toMs / DAY_MS + J1970 + 5;
  const t = tracks(['moon', 'sun'], from, to, 1, TROPICAL);
  const conj = crossings(t.moon, t.sun, [0]).map(c => c.jd);
  const starts: number[] = [];
  for (const c of conj) {
    let day = cityDay(c, city);
    let start = day + 3 * DAY_MS;
    for (let k = 0; k < 2; k++, day += DAY_MS) {
      const ss = sunset(day, city);
      if (ss <= c) {
        continue; // conjunction after this sunset: no crescent yet
      }
      const s = sky(ss, city);
      if (s.moonAlt >= 5 && s.elongation >= 8) {
        start = day + DAY_MS;
        break;
      }
      start = day + 2 * DAY_MS;
    }
    starts.push(start);
  }
  return starts;
}

/** Hijri date of a civil date under the sighting prediction for a city. */
export function sightedHijri(
  y: number,
  m: number,
  d: number,
  starts: number[],
): HijriDate | null {
  const t = Date.UTC(y, m - 1, d);
  let start: number | undefined;
  for (const s of starts) {
    if (s <= t) {
      start = s;
    }
  }
  if (start === undefined) {
    return null;
  }
  // Name the month after the arithmetic calendar half-way through it.
  const mid = new Date(start + 14 * DAY_MS);
  const ref = toHijri(
    mid.getUTCFullYear(),
    mid.getUTCMonth() + 1,
    mid.getUTCDate(),
    'civil',
  );
  return {
    year: ref.year,
    month: ref.month,
    day: Math.round((t - start) / DAY_MS) + 1,
    source: 'tabular',
  };
}
