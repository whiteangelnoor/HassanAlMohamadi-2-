jest.mock('../specs/NativeAstroEngine', () => ({}));

import { CHALDEAN, DAY_RULERS } from '../src/astro/planetaryHours';
import { abjadValue, spiritualSign } from '../src/spiritual/abjad';

const o = { taaMarbuta: 5 as const };

test('abjad values', () => {
  expect(abjadValue('محمد', o)).toBe(92);
  expect(abjadValue('علي', o)).toBe(110);
  expect(abjadValue('فاطمة', o)).toBe(80 + 1 + 9 + 40 + 5);
  expect(abjadValue('فاطمة', { taaMarbuta: 400 })).toBe(80 + 1 + 9 + 40 + 400);
  expect(abjadValue('عَلِيّ', o)).toBe(110); // diacritics ignored
});

test('spiritual sign: remainder 1 is Aries, 0 is Pisces', () => {
  // محمد 92 + علي 110 = 202 = 16 x 12 + 10 -> Capricorn (10th sign).
  expect(spiritualSign('محمد', 'علي', o)).toMatchObject({
    total: 202,
    remainder: 10,
    sign: 9,
  });
  // ا (1) alone -> Aries; 12 -> Pisces.
  expect(spiritualSign('ا', '', o).sign).toBe(0);
  expect(spiritualSign('يب', '', o).sign).toBe(11);
});

test('planetary day rulers follow the Chaldean order', () => {
  for (let w = 0; w < 7; w++) {
    const first = CHALDEAN.indexOf(DAY_RULERS[w]);
    // The 25th hour after sunrise belongs to the next day's ruler.
    expect(CHALDEAN[(first + 24) % 7]).toBe(DAY_RULERS[(w + 1) % 7]);
  }
});
