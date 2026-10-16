jest.mock('../specs/NativeAstroEngine', () => ({}));

import { CHALDEAN, DAY_RULERS } from '../src/astro/planetaryHours';
import {
  abjadLetters,
  abjadValue,
  nameNature,
  natureLabel,
  spiritualSign,
} from '../src/spiritual/abjad';

const m = { system: 'mashriqi' as const, taaMarbuta: 5 as const };
const g = { system: 'maghribi' as const, taaMarbuta: 5 as const };

test('Mashriqi abjad values', () => {
  expect(abjadValue('محمد', m)).toBe(92);
  expect(abjadValue('علي', m)).toBe(110);
  expect(abjadValue('فاطمة', m)).toBe(80 + 1 + 9 + 40 + 5);
  expect(abjadValue('فاطمة', { ...m, taaMarbuta: 400 })).toBe(
    80 + 1 + 9 + 40 + 400,
  );
  expect(abjadValue('عَلِيّ', m)).toBe(110); // diacritics ignored
  expect(abjadValue('سصشضظغ', m)).toBe(60 + 90 + 300 + 800 + 900 + 1000);
});

test('Maghribi abjad values differ for six letters', () => {
  expect(abjadValue('ص', g)).toBe(60);
  expect(abjadValue('ض', g)).toBe(90);
  expect(abjadValue('س', g)).toBe(300);
  expect(abjadValue('ظ', g)).toBe(800);
  expect(abjadValue('غ', g)).toBe(900);
  expect(abjadValue('ش', g)).toBe(1000);
  expect(abjadValue('محمد', g)).toBe(92);
});

test('letter natures follow the table (أ ب ج د = 7 ... ذ ض ظ غ = 1)', () => {
  const t = (s: string) =>
    abjadLetters(s, m).map(l => `${l.element}${l.strength}`);
  expect(t('ابجد')).toEqual(['fire7', 'earth7', 'air7', 'water7']);
  expect(t('هوزح')).toEqual(['fire6', 'earth6', 'air6', 'water6']);
  expect(t('ذضظغ')).toEqual(['fire1', 'earth1', 'air1', 'water1']);
  expect(t('شتثخ')).toEqual(['fire2', 'earth2', 'air2', 'water2']);
});

test('nature of a name: حسن is watery, ties are mixed', () => {
  const h = nameNature('حسن', m);
  expect(h.totals).toEqual({ fire: 0, earth: 4, air: 4, water: 6 });
  expect(natureLabel(h)).toBe('مائي');
  // Two letters of one nature add up: محمد = fire 4+4, water 6+7.
  const mh = nameNature('محمد', m);
  expect(mh.totals).toEqual({ fire: 8, earth: 0, air: 0, water: 13 });
  expect(natureLabel(nameNature('اب', m))).toBe('ممتزج (ناري وترابي)');
});

test('spiritual sign: remainder 1 is Aries, 0 is Pisces', () => {
  expect(spiritualSign('محمد', 'علي', m)).toMatchObject({
    total: 202,
    remainder: 10,
    sign: 9,
  });
  expect(spiritualSign('ا', '', m).sign).toBe(0);
  expect(spiritualSign('يب', '', m).sign).toBe(11);
});

test('planetary day rulers follow the Chaldean order', () => {
  for (let w = 0; w < 7; w++) {
    const first = CHALDEAN.indexOf(DAY_RULERS[w]);
    expect(CHALDEAN[(first + 24) % 7]).toBe(DAY_RULERS[(w + 1) % 7]);
  }
});
