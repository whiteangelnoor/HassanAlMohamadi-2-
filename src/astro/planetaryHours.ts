// Planetary (spiritual) hours, الساعات الكوكبية. AGPL-3.0-or-later.
//
// Daylight, sunrise to sunset, and night, sunset to the next sunrise, are
// each divided into twelve equal hours. The first hour after sunrise belongs
// to the ruler of the weekday (Sunday the Sun, Monday the Moon, Tuesday Mars,
// Wednesday Mercury, Thursday Jupiter, Friday Venus, Saturday Saturn); the
// hours then follow the Chaldean order Saturn, Jupiter, Mars, Sun, Venus,
// Mercury, Moon. The 25th hour falls to the next day's ruler, as it must.

import { sunrise, sunset } from './sun';
import { Planet } from './traditional';

export const CHALDEAN: Planet[] = [
  'saturn',
  'jupiter',
  'mars',
  'sun',
  'venus',
  'mercury',
  'moon',
];

/** Ruler of a weekday, Sunday = 0. */
export const DAY_RULERS: Planet[] = [
  'sun',
  'moon',
  'mars',
  'mercury',
  'jupiter',
  'venus',
  'saturn',
];

export interface PlanetaryHour {
  index: number; // 1..24; 1..12 by day, 13..24 by night
  day: boolean;
  ruler: Planet;
  startJd: number;
  endJd: number;
}

export interface PlanetaryDay {
  weekday: number; // 0 = Sunday
  ruler: Planet;
  sunrise: number;
  sunset: number;
  nextSunrise: number;
  dayHourMinutes: number;
  nightHourMinutes: number;
  hours: PlanetaryHour[];
}

/** The planetary hours of a civil date (y, m 1..12, d) at a place. */
export function planetaryDay(
  y: number,
  m: number,
  d: number,
  lat: number,
  lon: number,
): PlanetaryDay | null {
  const day = Date.UTC(y, m - 1, d);
  const rise = sunrise(day, lat, lon);
  const set = sunset(day, lat, lon);
  const next = sunrise(day + 86400000, lat, lon);
  if (rise === null || set === null || next === null) {
    return null;
  }
  const weekday = new Date(day).getUTCDay();
  const first = CHALDEAN.indexOf(DAY_RULERS[weekday]);
  const dayLen = (set - rise) / 12;
  const nightLen = (next - set) / 12;
  const hours: PlanetaryHour[] = [];
  for (let k = 0; k < 24; k++) {
    const isDay = k < 12;
    const startJd = isDay ? rise + k * dayLen : set + (k - 12) * nightLen;
    hours.push({
      index: k + 1,
      day: isDay,
      ruler: CHALDEAN[(first + k) % 7],
      startJd,
      endJd: startJd + (isDay ? dayLen : nightLen),
    });
  }
  return {
    weekday,
    ruler: DAY_RULERS[weekday],
    sunrise: rise,
    sunset: set,
    nextSunrise: next,
    dayHourMinutes: dayLen * 1440,
    nightHourMinutes: nightLen * 1440,
    hours,
  };
}
