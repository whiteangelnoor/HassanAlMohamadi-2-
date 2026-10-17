import { castShield, randomCounts, Figure } from '../src/spiritual/raml';
import { RULES_4 } from '../src/spiritual/ramlRules4';

const rule = (id: string) => RULES_4.find(r => r.id === id)!;

/** Counts from four mother patterns written head to foot ('1' odd). */
const fromMothers = (...ms: string[]) =>
  castShield(ms.flatMap(m => [...m].map(c => (c === '1' ? 5 : 6))));

/** A shield whose houses are given directly (for branch tests). */
function shieldOf(houses: string[]) {
  const s = castShield(randomCounts(() => 0.3));
  s.houses = houses.map(x => [...x].map(Number) as Figure);
  return s;
}

test('every chapter answers every cast', () => {
  let r = 11;
  const rand = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  const ids = new Set(RULES_4.map(x => x.id));
  expect(ids.size).toBe(RULES_4.length);
  for (const x of RULES_4) {
    expect(x.id.startsWith('b4-')).toBe(true);
    expect(x.title.length).toBeGreaterThan(5);
  }
  for (let i = 0; i < 200; i++) {
    const s = castShield(randomCounts(rand));
    for (const x of RULES_4) {
      const a = x.judge(s);
      expect(a.headline.length).toBeGreaterThan(3);
      expect(['yes', 'no', 'doubt', 'info']).toContain(a.verdict);
      expect(a.lines.length).toBeGreaterThan(0);
      expect(a.lines.join(' ')).not.toMatch(/undefined|NaN/);
    }
  }
});

// The book's example (ص٢٩) gives known houses to test against.
const book = fromMothers('1222', '1211', '1122', '1112');

test('do the two meet: the water row of 9 + 11', () => {
  // 9 = 2211, 11 = 1122 → 1111 (water open).
  expect(rule('b4-meet').judge(book).verdict).toBe('yes');
  const s = shieldOf(Array(16).fill('2222'));
  // 9 + 11 = 2222 + 2222 = 2222, water closed.
  expect(rule('b4-meet').judge(s).verdict).toBe('no');
});

test('contact: the ascendant repeated in the fifth only', () => {
  const hs = Array(16).fill('2222');
  hs[0] = '1121';
  hs[4] = '1121';
  const a = rule('b4-contact').judge(shieldOf(hs));
  expect(a.verdict).toBe('yes');
  expect(a.lines.join(' ')).toContain('نظر من غير اجتماع');
  hs[4] = '2222';
  expect(rule('b4-contact').judge(shieldOf(hs)).verdict).toBe('no');
});

test('lawful: 11 + 13 in odd houses, then even', () => {
  const hs = Array(16).fill('1111');
  hs[10] = '2121';
  hs[12] = '2121'; // 11 + 13 = 2222
  hs[2] = '2222';
  expect(rule('b4-lawful').judge(shieldOf(hs)).verdict).toBe('yes');
  hs[2] = '1111';
  hs[3] = '2222';
  expect(rule('b4-lawful').judge(shieldOf(hs)).verdict).toBe('no');
  hs[2] = '2222';
  expect(rule('b4-lawful').judge(shieldOf(hs)).headline).toContain(
    'تبدأ حلالاً',
  );
});

test('meeting place: 4 + 8 found in the ninth', () => {
  const hs = Array(16).fill('1111');
  hs[3] = '1212';
  hs[7] = '1212'; // → 2222
  hs[8] = '2222';
  expect(rule('b4-place').judge(shieldOf(hs)).headline).toContain('خارج البلد');
});

test('balance: an unfortunate figure in 15 means no meeting', () => {
  const hs = Array(16).fill('1111');
  hs[14] = '2221'; // الأنكيس
  expect(rule('b4-balance').judge(shieldOf(hs)).verdict).toBe('no');
  hs[14] = '2211'; // النصرة الداخلة, fortunate and entering
  const a = rule('b4-balance').judge(shieldOf(hs));
  expect(a.headline).toBe('يحصل اللقاء.');
  expect(a.lines.join(' ')).toContain('راغباً');
});

test('relations follow the flipped-row figures', () => {
  const hs = Array(16).fill('2212');
  hs[0] = '1111';
  hs[12] = '2111'; // 1 + 13 = 1222 الأحيان, not in the shield
  const a = rule('b4-relations').judge(shieldOf(hs));
  expect(a.lines[0]).toContain('«الأحيان» غير موجود');
});

test('duration: the book example, earth 11 → nine years, Monday', () => {
  // Eleven open earth rows, fewer of the others.
  const hs = Array(16).fill('2222');
  for (let i = 0; i < 11; i++) {
    hs[i] = '2221';
  }
  const a = rule('b4-span').judge(shieldOf(hs));
  expect(a.headline).toBe('المدة 9 سنين.');
  const why = a.lines.join(' ');
  expect(why).toContain('121');
  expect(why).toContain('الشهر 1 من السنة 10');
  expect(why).toContain('يوم الإثنين');
});

test('duration ties: air is stronger than fire', () => {
  const hs = Array(16).fill('2222');
  for (let i = 0; i < 4; i++) {
    hs[i] = '1122';
  }
  const a = rule('b4-span').judge(shieldOf(hs));
  expect(a.lines[1]).toContain('والأغلب الهواء');
  // 4 × 4 = 16, by twelves → 4 weeks.
  expect(a.headline).toBe('المدة 4 أسابيع.');
});

test('the need: open air squared, by nines', () => {
  const hs = Array(16).fill('2222');
  hs[0] = '2122';
  hs[1] = '2122'; // two open air rows → 4 → house 4
  hs[3] = '1222'; // الأحيان, Jupiter
  const a = rule('b4-need-time').judge(shieldOf(hs));
  expect(a.headline).toBe('أقربها يوم الخميس، وأبعدها شهر.');
});

test('yasar and description', () => {
  const hs = Array(16).fill('1111');
  hs[7] = '1222';
  hs[8] = '2222'; // → 1222 الأحيان, fortunate
  expect(rule('b4-yasar').judge(shieldOf(hs)).verdict).toBe('yes');
  const all = Array(16).fill('1222'); // fire open everywhere
  expect(rule('b4-describe').judge(shieldOf(all)).headline).toContain(
    'الأحيان',
  );
});
