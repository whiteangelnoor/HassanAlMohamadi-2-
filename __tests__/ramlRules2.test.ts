import { castShield, randomCounts } from '../src/spiritual/raml';
import { RULES_2 } from '../src/spiritual/ramlRules2';

const rule = (id: string) => RULES_2.find(r => r.id === id)!;

/** A cast from four mothers written head to foot, e.g. '1222'. */
const fromMothers = (...ms: string[]) =>
  castShield(ms.flatMap(m => [...m].map(Number)));

// The worked example of the book (ص٢٩): الأحيان، نقي الخد، النصرة الخارجة،
// العتبة الخارجة.
const book = fromMothers('1222', '1211', '1122', '1112');
// Four times الجماعة: every house is الجماعة.
const still = fromMothers('2222', '2222', '2222', '2222');

test('every chapter answers for any cast', () => {
  let r = 11;
  const rand = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  const ids = new Set(RULES_2.map(x => x.id));
  expect(ids.size).toBe(RULES_2.length);
  expect(new Set(RULES_2.map(x => x.title)).size).toBe(RULES_2.length);
  for (let i = 0; i < 200; i++) {
    const s = castShield(randomCounts(rand));
    for (const x of RULES_2) {
      const a = x.judge(s);
      expect(a.headline.length).toBeGreaterThan(3);
      expect(['yes', 'no', 'doubt', 'info']).toContain(a.verdict);
      expect(a.lines.length).toBeGreaterThan(0);
      expect(a.lines.join(' ')).not.toContain('undefined');
    }
  }
});

test('the book example, chapter by chapter', () => {
  // 7+10 = القبض الداخل + البياض = العتبة الداخلة, entering (ص١٣٦).
  expect(rule('b2-need-person').judge(book).verdict).toBe('yes');
  // نقي الخد is in the cast: the theft is real (ص١٧٤).
  expect(rule('b2-theft-real').judge(book).verdict).toBe('yes');
  // Third النصرة الخارجة and fourth العتبة الخارجة, both outgoing (ص١٧٨).
  expect(rule('b2-left-town').judge(book).headline).toContain('خارج البلد');
  // Fourth outgoing: the thief is not among the suspects (ص١٨٠).
  expect(rule('b2-thief-present').judge(book).verdict).toBe('no');
  // Eighth الحمرة, fixed (ص١٧٩).
  expect(rule('b2-stolen-state').judge(book).headline).toContain('متحير');
  // Ascendant الأحيان, outgoing: the news is false; 36 by eights leaves 4.
  const rumor = rule('b2-rumor').judge(book);
  expect(rumor.verdict).toBe('no');
  expect(rumor.lines.join(' ')).toContain('36');
  // 13 الأنكيس (unfortunate), 14 الجودلة (mixed fortunate) (ص١٥١).
  expect(rule('b2-right').judge(book).verdict).toBe('no');
  // 1 الأحيان fortunate outgoing against 7 القبض الداخل fortunate entering.
  expect(rule('b2-court').judge(book).verdict).toBe('no');
  // Ninth النصرة الداخلة: the other side wins (ص١٥٤).
  expect(rule('b2-winner').judge(book).verdict).toBe('no');
  // The seventh القبض الداخل appears once: one thief (ص١٧٧).
  expect(rule('b2-thieves').judge(book).headline).toBe('السارق واحد.');
  // (1+7)+15 = الأنكيس, first in house 12: the north (ص١٨٠).
  expect(rule('b2-theft-direction').judge(book).headline).toContain('الشمال');
  // 1+10 = القبض الخارج, not in the cast.
  expect(rule('b2-prison-whose').judge(book).headline).toContain('لا يبيّن');
});

test('a cast of الجماعة only', () => {
  expect(rule('b2-theft-real').judge(still).verdict).toBe('no');
  expect(rule('b2-thieves').judge(still).headline).toBe('عدد السارقين 16.');
  expect(rule('b2-keep').judge(still).verdict).toBe('no');
  expect(rule('b2-join').judge(still).verdict).toBe('doubt');
  expect(rule('b2-part').judge(still).headline).toContain('على حاله');
  expect(rule('b2-left-town').judge(still).verdict).toBe('no');
  expect(rule('b2-theft-town').judge(still).verdict).toBe('yes');
  // Fixed angles: the ruler stays (ص١٧٠).
  expect(rule('b2-ruler').judge(still).headline).toContain('ثابت');
});
