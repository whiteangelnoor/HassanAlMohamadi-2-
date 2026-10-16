jest.mock('../specs/NativeAstroEngine', () => ({}));

import {
  ascFromMc,
  firdaria,
  profection,
  TROPICAL_YEAR,
} from '../src/astro/predictive';

// Baghdad, 1990-06-15 08:00 UTC, computed by the engine.
const chart = require('./fixtures/chart-baghdad-1990.json');

test('Ascendant from Midheaven matches the engine', () => {
  const asc = ascFromMc(chart.houses.mc, chart.obliquity, 33.3406);
  expect(Math.abs(asc - chart.houses.asc)).toBeLessThan(0.01);
});

test('profection moves one sign a year from the Ascendant', () => {
  // Ascendant in Virgo (sign 5).
  expect(profection(161, 0)).toMatchObject({
    sign: 5,
    lord: 'mercury',
    house: 1,
  });
  expect(profection(161, 1.5)).toMatchObject({
    sign: 6,
    lord: 'venus',
    house: 2,
  });
  expect(profection(161, 12.2)).toMatchObject({ sign: 5, house: 1 });
});

test('firdaria: 75-year cycle, seven sub-periods in Chaldean order', () => {
  const day = firdaria(0, true, 1);
  expect(day.map(p => p.lord)).toEqual([
    'sun',
    'venus',
    'mercury',
    'moon',
    'saturn',
    'jupiter',
    'mars',
    'northNode',
    'southNode',
  ]);
  expect(day[day.length - 1].endJd / TROPICAL_YEAR).toBeCloseTo(75);
  expect(day[0].sub.map(s => s.lord)).toEqual([
    'sun',
    'venus',
    'mercury',
    'moon',
    'saturn',
    'jupiter',
    'mars',
  ]);
  expect(day[7].sub).toEqual([]);
  expect(firdaria(0, false, 1)[0].lord).toBe('moon');
});
