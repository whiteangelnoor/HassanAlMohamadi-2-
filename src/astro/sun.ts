// Sunrise and sunset from the engine: the Sun's altitude from its right
// ascension and declination and the local sidereal time (ARMC). Upper limb
// on the horizon with standard refraction: -0.833°. AGPL-3.0-or-later.

import { AstroEngine } from './engine';
import { J1970 } from './events';

const rad = Math.PI / 180;
const DAY_MS = 86400000;
const HORIZON = -0.833;

export function sunAltitude(jd: number, lat: number, lon: number): number {
  const c = AstroEngine.chart({
    zodiac: { type: 'tropical' },
    time: { jdUt: jd },
    location: { lat, lon },
    houseSystem: 'P',
    bodies: ['sun'],
  });
  const s = c.bodies[0];
  const h = (c.houses!.armc - s.ra) * rad;
  return (
    Math.asin(
      Math.sin(lat * rad) * Math.sin(s.dec * rad) +
        Math.cos(lat * rad) * Math.cos(s.dec * rad) * Math.cos(h),
    ) / rad
  );
}

/** JD of local mean noon of a civil date (UTC midnight in ms) at a longitude. */
function meanNoon(dayStartMs: number, lon: number): number {
  return (dayStartMs - lon * 240000 + 12 * 3600000) / DAY_MS + J1970;
}

function bisect(lo: number, hi: number, f: (jd: number) => boolean): number {
  for (let i = 0; i < 22; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid)) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}

/** Sunrise on a civil date (given as UTC midnight, ms) at a place; null if none. */
export function sunrise(
  dayStartMs: number,
  lat: number,
  lon: number,
): number | null {
  const noon = meanNoon(dayStartMs, lon);
  if (
    sunAltitude(noon, lat, lon) < HORIZON ||
    sunAltitude(noon - 0.5, lat, lon) > HORIZON
  ) {
    return null; // polar night or midnight sun
  }
  return bisect(noon - 0.5, noon, jd => sunAltitude(jd, lat, lon) < HORIZON);
}

/** Sunset on a civil date at a place; null if none. */
export function sunset(
  dayStartMs: number,
  lat: number,
  lon: number,
): number | null {
  const noon = meanNoon(dayStartMs, lon);
  if (
    sunAltitude(noon, lat, lon) < HORIZON ||
    sunAltitude(noon + 0.5, lat, lon) > HORIZON
  ) {
    return null;
  }
  return bisect(noon, noon + 0.5, jd => sunAltitude(jd, lat, lon) > HORIZON);
}
