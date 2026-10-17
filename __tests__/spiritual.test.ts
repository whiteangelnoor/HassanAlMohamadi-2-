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

test('geomancy: sixteen figures, the shield follows its rules', () => {
  const {
    FIGURES,
    castShield,
    add,
    points,
    randomCounts,
  } = require('../src/spiritual/raml');
  // Every one of the sixteen patterns is named once.
  const all: string[] = [];
  for (const a of [1, 2])
    for (const b of [1, 2])
      for (const c of [1, 2])
        for (const d of [1, 2]) all.push(`${a}${b}${c}${d}`);
  expect(Object.keys(FIGURES).sort()).toEqual(all.sort());
  expect(new Set(Object.values(FIGURES).map((f: any) => f.name)).size).toBe(16);
  // Odd counts give one point: lines 1..16 = 5,6,7,8 ... make known mothers.
  const s = castShield([
    5,
    5,
    5,
    5, // mother 1: 1111 الطريق
    6,
    6,
    6,
    6, // mother 2: 2222 الجماعة
    6,
    5,
    5,
    6, // mother 3: 2112
    5,
    6,
    6,
    5, // mother 4: 1221
  ]);
  expect(s.mothers.map((m: number[]) => m.join(''))).toEqual([
    '1111',
    '2222',
    '2112',
    '1221',
  ]);
  // Daughter 1 = first rows of the mothers.
  expect(s.daughters[0].join('')).toBe('1221');
  expect(add([1, 1, 1, 1], [2, 2, 2, 2]).join('')).toBe('1111');
  expect(add([1, 2, 1, 2], [1, 2, 2, 1]).join('')).toBe('2211');
  expect(s.houses).toHaveLength(16);
  // The worked example of «الفلك المشحون» (ص٢٩): mothers الأحيان، نقي الخد،
  // النصرة الخارجة، العتبة الخارجة give 13 الأنكيس، 14 الجودلة، 15 النصرة
  // الخارجة (even) and 16 الحمرة.
  const odd = (f: string) => [...f].map(c => (c === '1' ? 1 : 2));
  const book = castShield([
    ...odd('1222'),
    ...odd('1211'),
    ...odd('1122'),
    ...odd('1112'),
  ]);
  expect(book.daughters.map((f: number[]) => f.join(''))).toEqual([
    '1111',
    '2211',
    '2121',
    '2122',
  ]);
  expect(book.nieces.map((f: number[]) => f.join(''))).toEqual([
    '2211',
    '2212',
    '1122',
    '2221',
  ]);
  expect(book.houses.slice(12).map((f: number[]) => f.join(''))).toEqual([
    '2221',
    '1121',
    '1122',
    '2122',
  ]);
  const { figureKind, judgeShield } = require('../src/spiritual/raml');
  expect(figureKind([1, 1, 2, 1])).toBe('منقلب');
  expect(figureKind([2, 1, 1, 2])).toBe('ثابت');
  expect(figureKind([2, 2, 1, 1])).toBe('داخل');
  expect(figureKind([1, 2, 2, 2])).toBe('خارج');
  // Mothers all fixed: the cast is left for another time.
  const fixed = castShield([
    ...odd('2222'),
    ...odd('2112'),
    ...odd('2122'),
    ...odd('2212'),
  ]);
  expect(judgeShield(fixed, 7).headline).toContain('اترك');
  expect(judgeShield(book, 7).lines.join(' ')).toContain('عاقبة الحاجة');
  // The judge always has an even number of points, over many casts.
  for (let i = 0; i < 200; i++) {
    const r = castShield(randomCounts());
    expect(points(r.judge) % 2).toBe(0);
    expect(r.judge.join('')).toBe(add(r.rightWitness, r.leftWitness).join(''));
  }
});

test('قرعة الضمير: sixteen sections, four handfuls make one figure', () => {
  const {
    QURA,
    castQura,
    quraEntry,
    randomHandfuls,
  } = require('../src/spiritual/qura');
  const { FIGURES } = require('../src/spiritual/raml');
  expect(Object.keys(QURA).sort()).toEqual(Object.keys(FIGURES).sort());
  // The manuscript's names match the book's.
  for (const k of Object.keys(QURA)) {
    expect(QURA[k].name).toBe(FIGURES[k].name);
  }
  expect(QURA['1121'].name).toBe('الجودلة');
  // Odd handfuls leave one, even leave two.
  expect(castQura([9, 10, 13, 7]).join('')).toBe('1211');
  expect(quraEntry(castQura([9, 10, 13, 7])).name).toBe('نقي الخد');
  for (let i = 0; i < 100; i++) {
    expect(
      quraEntry(castQura(randomHandfuls())).judgment.length,
    ).toBeGreaterThan(20);
  }
});

test('قرعة الأسئلة: sixteen answers for each of the sixteen figures', () => {
  const { LOT_QUESTIONS, LOT_ANSWERS } = require('../src/spiritual/qura16');
  const { FIGURES } = require('../src/spiritual/raml');
  expect(LOT_QUESTIONS).toHaveLength(16);
  expect(Object.keys(LOT_ANSWERS).sort()).toEqual(Object.keys(FIGURES).sort());
  for (const k of Object.keys(LOT_ANSWERS)) {
    expect(LOT_ANSWERS[k]).toHaveLength(16);
    for (const a of LOT_ANSWERS[k]) {
      expect(a.length).toBeGreaterThan(3);
      // No answer foretells a death.
      expect(a).not.toMatch(/يموت|الموت|دار البقاء|الرحيل من الدنيا|موته/);
    }
  }
  // The table of letters runs in a cycle: الطريق answers question 1 from
  // the table of ا, and the twelfth question asks about the child.
  expect(LOT_ANSWERS['1111'][0]).toContain('تناله قريباً');
  expect(LOT_ANSWERS['1111'][11]).toContain('ابناً');
});

test('إخراج الضمير: the asker, the mind and both together', () => {
  const { RULES_6 } = require('../src/spiritual/ramlRules6');
  const { castShield, randomCounts } = require('../src/spiritual/raml');
  let r = 3;
  const rand = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < 200; i++) {
    const a = RULES_6[0].judge(castShield(randomCounts(rand)));
    expect(a.verdict).toBe('info');
    expect(a.headline.length).toBeGreaterThan(10);
    expect(a.lines).toHaveLength(3);
  }
});
