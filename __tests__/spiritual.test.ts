jest.mock('../specs/NativeAstroEngine', () => ({}));

import { CHALDEAN, DAY_RULERS } from '../src/astro/planetaryHours';
import {
  abjadLetters,
  abjadValue,
  cosmicNumber,
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

test('cosmic number: حسن is 118, 1+1+8 = 10, 1+0 = 1', () => {
  expect(abjadValue('حسن', m)).toBe(118);
  expect(cosmicNumber(118)).toBe(1);
  expect(cosmicNumber(9)).toBe(9);
  expect(cosmicNumber(99)).toBe(9);
  expect(cosmicNumber(0)).toBe(0);
});

test('every lunar mansion has its traits', () => {
  const { MANSIONS } = require('../src/astro/mansions');
  const { MANSION_TRAITS } = require('../src/astro/mansionTraits');
  expect(MANSION_TRAITS).toHaveLength(MANSIONS.length);
  for (const t of MANSION_TRAITS) {
    expect(t.good || t.avoid).toBeTruthy();
  }
});

test('compatibility of natures', () => {
  const { elementRelation, natureRelation } = require('../src/spiritual/abjad');
  expect(elementRelation('fire', 'air')).toBe('agree');
  expect(elementRelation('water', 'earth')).toBe('agree');
  expect(elementRelation('fire', 'water')).toBe('oppose');
  expect(elementRelation('earth', 'air')).toBe('oppose');
  expect(elementRelation('fire', 'earth')).toBe('moderate');
  expect(elementRelation('water', 'air')).toBe('moderate');
  expect(natureRelation(['fire', 'water'], ['air'])).toBe('agree');
  expect(natureRelation([], ['air'])).toBeNull();
});

test('horary topics: chapters point at listed matters, no duplicates', () => {
  const { HOUSE_MATTERS, MATTER_KIND } = require('../src/astro/horaryTopics');
  const all: string[] = HOUSE_MATTERS.flatMap((h: any) => h.matters);
  expect(new Set(all).size).toBe(all.length);
  for (const k of Object.keys(MATTER_KIND)) {
    expect(all).toContain(k);
  }
  expect(HOUSE_MATTERS.map((h: any) => h.house)).toEqual([
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
  ]);
});

test('readings: twelve texts each, dignities named where they fall', () => {
  const R = require('../src/astro/readings');
  const { SUN_IN, MOON_IN, ASC_IN } = R;
  const { planetDignity } = require('../src/astro/traditional');
  for (const list of [
    SUN_IN,
    MOON_IN,
    ASC_IN,
    R.MERCURY_IN,
    R.VENUS_IN,
    R.MARS_IN,
    R.JUPITER_IN,
    R.SATURN_IN,
  ]) {
    expect(list).toHaveLength(12);
    expect(new Set(list).size).toBe(12);
  }
  const WORD: Record<string, string> = {
    domicile: 'في بيت',
    exaltation: 'في شرف',
    detriment: 'في وبال',
    fall: 'في هبوط',
  };
  for (const [planet, list] of [
    ['sun', SUN_IN],
    ['moon', MOON_IN],
    ['mercury', R.MERCURY_IN],
    ['venus', R.VENUS_IN],
    ['mars', R.MARS_IN],
    ['jupiter', R.JUPITER_IN],
    ['saturn', R.SATURN_IN],
  ] as [string, string[]][]) {
    for (let s = 0; s < 12; s++) {
      const d = planetDignity(planet, s * 30 + 15, true).dignities;
      for (const k of Object.keys(WORD)) {
        expect(list[s].includes(WORD[k])).toBe(d.includes(k));
      }
    }
  }
});

test('readings in houses: twelve distinct texts for each of the seven', () => {
  const { IN_HOUSE } = require('../src/astro/readings');
  const seven = [
    'sun',
    'moon',
    'mercury',
    'venus',
    'mars',
    'jupiter',
    'saturn',
  ];
  expect(Object.keys(IN_HOUSE).sort()).toEqual([...seven].sort());
  const all: string[] = [];
  for (const p of seven) {
    expect(IN_HOUSE[p]).toHaveLength(12);
    all.push(...IN_HOUSE[p]);
  }
  expect(new Set(all).size).toBe(84);
});

test('aspect readings: every pair of the seven, only aspects that can occur', () => {
  const {
    ASPECT_READINGS,
    SEVEN_ORDER,
    aspectReading,
  } = require('../src/astro/readings');
  const keys: string[] = [];
  for (let i = 0; i < 7; i++) {
    for (let k = i + 1; k < 7; k++) {
      keys.push(`${SEVEN_ORDER[i]}-${SEVEN_ORDER[k]}`);
    }
  }
  expect(Object.keys(ASPECT_READINGS).sort()).toEqual(keys.sort());
  // Mercury and Venus keep close to the Sun and to each other.
  expect(ASPECT_READINGS['sun-mercury'].soft).toBeUndefined();
  expect(ASPECT_READINGS['sun-venus'].hard).toBeUndefined();
  expect(ASPECT_READINGS['mercury-venus'].hard).toBeUndefined();
  let count = 0;
  for (const k of keys) {
    const t = ASPECT_READINGS[k];
    count += [t.conj, t.soft, t.hard].filter(Boolean).length;
  }
  expect(count).toBe(58);
  // Order of the pair does not matter; minor aspects have no text.
  expect(aspectReading('saturn', 'sun', 'square')).toBe(
    ASPECT_READINGS['sun-saturn'].hard,
  );
  expect(aspectReading('sun', 'saturn', 'quincunx')).toBeNull();
  expect(aspectReading('sun', 'uranus', 'trine')).toBeNull();
});
