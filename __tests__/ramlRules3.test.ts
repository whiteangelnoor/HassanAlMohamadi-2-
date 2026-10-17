import { castShield, randomCounts } from '../src/spiritual/raml';
import { RULES_3 } from '../src/spiritual/ramlRules3';

const rows = (f: string) => [...f].map(c => (c === '1' ? 1 : 2));
const cast = (...mothers: string[]) => castShield(mothers.flatMap(rows));
const rule = (id: string) => RULES_3.find(r => r.id === id)!;

// The worked shield of «الفلك المشحون» (ص٢٩): houses 1–16 are
// 1222 1211 1122 1112 | 1111 2211 2121 2122 | 2211 2212 1122 2221 |
// 2221 1121 1122 2122.
const book = cast('1222', '1211', '1122', '1112');

test('every chapter answers every cast', () => {
  let r = 11;
  const rand = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  const ids = new Set(RULES_3.map(x => x.id));
  expect(ids.size).toBe(RULES_3.length);
  expect(new Set(RULES_3.map(x => x.title)).size).toBe(RULES_3.length);
  for (let i = 0; i < 200; i++) {
    const s = castShield(randomCounts(rand));
    for (const x of RULES_3) {
      const a = x.judge(s);
      expect(a.headline.length).toBeGreaterThan(3);
      expect(['yes', 'no', 'doubt', 'info']).toContain(a.verdict);
      expect(a.lines.every(l => !l.includes('undefined'))).toBe(true);
    }
  }
});

test('the book shield is the one of p29', () => {
  expect(book.houses.map(f => f.join('')).join(' ')).toBe(
    '1222 1211 1122 1112 1111 2211 2121 2122 2211 2212 1122 2221 2221 1121 1122 2122',
  );
});

test('suspects: the kind of the 4th decides the half (p181)', () => {
  // 4th العتبة الخارجة, outgoing: the other half.
  expect(rule('b3-thief-half').judge(book).headline).toContain('الآخر');
  // 4th العتبة الداخلة, entering: the half intended first.
  const s = cast('1111', '2222', '1111', '2111');
  expect(rule('b3-thief-half').judge(s).headline).toContain('نويته أولاً');
});

test('the lost thing: (1+4)+13 entering and fortunate returns easily (p194)', () => {
  // 1222+1112 = 2112, + 2221 = 2111 العتبة الداخلة.
  const a = rule('b3-lost-back').judge(book);
  expect(a.verdict).toBe('yes');
  expect(a.headline).toContain('بسهولة');
});

test('still in town: (1+5) not in the shield means he left (p206)', () => {
  // 1222+1111 = 2111, not among the sixteen.
  expect(rule('b3-absent-in-town').judge(book).verdict).toBe('no');
  // Mothers all الطريق: every house is الطريق or الجماعة, (1+5) = الجماعة.
  const s = cast('1111', '1111', '1111', '1111');
  expect(rule('b3-absent-in-town').judge(s).verdict).toBe('yes');
});

test('the thief: 7th and 9th both female give a woman (p184)', () => {
  // 7th القبض الداخل, 9th النصرة الداخلة.
  expect(rule('b3-thief-gender').judge(book).headline).toBe('السارق امرأة.');
  // الطريق in the 7th: a man without doubt.
  const s = cast('1111', '1111', '1111', '1111');
  expect(rule('b3-thief-gender').judge(s).headline).toContain('بلا شك');
});

test('contest: equal even remainders, the one asked about wins (p195)', () => {
  // 6·7·5 = 210 → 6; 7·6·7 = 294 → 6.
  const a = rule('b3-stray-contest').judge(book);
  expect(a.verdict).toBe('no');
  expect(a.lines[0]).toContain('6');
  expect(a.lines[1]).toContain('6');
});

test('the traveller: (1+3)+(7+9) fixed means arrived (p197)', () => {
  // 2122 + 2112 = 2212 البياض, fixed.
  const a = rule('b3-arrived').judge(book);
  expect(a.verdict).toBe('yes');
  expect(a.headline).toContain('وصل');
});

test('buried: two of the three signs say yes (p185)', () => {
  // القبض الداخل in the shield; 1st outgoing; 4+15 = 2212 fixed.
  const a = rule('b3-buried-exists').judge(book);
  expect(a.verdict).toBe('yes');
  expect(a.headline).toContain('2 من 3');
});

test('stay or move: equal ends and mixed angles give no preference (p197)', () => {
  expect(rule('b3-move-or-stay').judge(book).verdict).toBe('doubt');
});

test('when: (8+9) absent from the shield means he does not come (p205)', () => {
  // 2122 + 2211 = 2112, not in the shield.
  expect(rule('b3-absent-when').judge(book).headline).toBe('لا يأتي.');
});

test('the second shield from houses 1,4,5,6 (p207)', () => {
  const a = rule('b3-absent-soon').judge(book);
  expect(a.lines[1]).toMatch(/داخل|خارج|ثابت|منقلب/);
});
