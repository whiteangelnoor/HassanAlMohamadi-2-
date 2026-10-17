import {
  castShield,
  Figure,
  randomCounts,
  Shield,
} from '../src/spiritual/raml';
import { h, housesOf, name, points } from '../src/spiritual/ramlKit';
import { RULES_5 } from '../src/spiritual/ramlRules5';

const rule = (id: string) => RULES_5.find(r => r.id === id)!;
const fig = (p: string) => [...p].map(c => (c === '1' ? 1 : 2)) as Figure;
const cast = (...mothers: string[]) => castShield(mothers.flatMap(m => fig(m)));

/** The first cast over all 65536 mothers that meets the test. */
function find(test: (s: Shield) => boolean): Shield {
  for (let i = 0; i < 65536; i++) {
    const rows = Array.from(
      { length: 16 },
      (_, b) => (Math.floor(i / 2 ** b) % 2) + 1,
    );
    const s = castShield(rows);
    if (test(s)) {
      return s;
    }
  }
  throw new Error('no cast found');
}

// The book's worked example (ص٢٩): 1 الأحيان … 7 القبض الداخل, 8 الحمرة,
// 10 البياض, 12 الأنكيس, 16 الحمرة.
const book = cast('1222', '1211', '1122', '1112');

test('every rule answers 200 random casts', () => {
  let r = 11;
  const rand = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  const ids = new Set(RULES_5.map(x => x.id));
  expect(ids.size).toBe(RULES_5.length);
  expect(new Set(RULES_5.map(x => x.title)).size).toBe(RULES_5.length);
  for (let i = 0; i < 200; i++) {
    const s = castShield(randomCounts(rand));
    for (const x of RULES_5) {
      const a = x.judge(s);
      expect(a.headline.length).toBeGreaterThan(5);
      expect(['yes', 'no', 'doubt', 'info']).toContain(a.verdict);
      expect(a.lines.length).toBeGreaterThan(0);
      expect(a.headline + a.lines.join('')).not.toMatch(/undefined|NaN/);
    }
  }
});

test('the book example: who goes, thieves, look, office, dispute', () => {
  // الأحيان has 7 points, القبض الداخل 6: the asker goes.
  expect(points(h(book, 1))).toBe(7);
  expect(rule('b5-goes').judge(book).headline).toContain('السائل هو الذي يذهب');
  // الحمرة is present; القبض الداخل in the 7th stands once.
  expect(rule('b5-thieves').judge(book).headline).toBe('السارق واحد.');
  // القبض الداخل in the 7th is not among the nine described.
  expect(rule('b5-thief-look').judge(book).headline).toContain('لم يذكر');
  // Angles: الأحيان، العتبة الخارجة، القبض الداخل، البياض: three good.
  expect(rule('b5-office').judge(book).verdict).toBe('yes');
  // Seeker الاجتماع and sought النصرة الخارجة have two open rows each.
  const w = rule('b5-winner').judge(book);
  expect(w.verdict).toBe('doubt');
  expect(w.lines[0]).toContain('الاجتماع');
  expect(w.lines[1]).toContain('النصرة الخارجة');
  // The 7th does not repeat.
  expect(rule('b5-return').judge(book).verdict).toBe('doubt');
});

test('thieves: no sign means no theft; count follows the 7th', () => {
  const none = find(s =>
    s.houses.every(
      f =>
        !['الحمرة', 'نقي الخد', 'العتبة الخارجة', 'القبض الخارج'].includes(
          name(f),
        ),
    ),
  );
  const a = rule('b5-thieves').judge(none);
  expect(a.verdict).toBe('no');
  expect(a.headline).toBe('لم تقع سرقة.');
  const many = find(
    s =>
      housesOf(s, h(s, 7)).length === 3 &&
      s.houses.some(f => name(f) === 'الحمرة'),
  );
  expect(rule('b5-thieves').judge(many).headline).toBe('عدد السرّاق 3.');
});

test('the thing returns or is lost by where the 7th repeats', () => {
  const lost = find(s => {
    const at = housesOf(s, h(s, 7)).filter(n => n !== 7);
    return at.length === 1 && at[0] === 8;
  });
  expect(rule('b5-return').judge(lost).verdict).toBe('no');
  const back = find(s => {
    const at = housesOf(s, h(s, 7)).filter(n => n !== 7);
    return at.length === 1 && at[0] === 6;
  });
  const a = rule('b5-return').judge(back);
  expect(a.verdict).toBe('yes');
  expect(a.headline).toContain('عاجلاً');
});

test('office: all angles fortunate is stable, all unfortunate is not', () => {
  const good = new Set(['سعد', 'ممتزج سعيد']);
  const bad = new Set(['نحس', 'ممتزج نحس']);
  const { nature } = require('../src/spiritual/ramlKit');
  const allGood = find(s =>
    [1, 4, 7, 10].every(n => good.has(nature(h(s, n)))),
  );
  expect(rule('b5-office').judge(allGood).verdict).toBe('yes');
  const allBad = find(s => [1, 4, 7, 10].every(n => bad.has(nature(h(s, n)))));
  expect(rule('b5-office').judge(allBad).verdict).toBe('no');
});

test('who goes: equal points are left open', () => {
  const eq = find(s => points(h(s, 1)) === points(h(s, 7)));
  expect(rule('b5-goes').judge(eq).verdict).toBe('doubt');
  const sought = find(s => points(h(s, 7)) > points(h(s, 1)));
  expect(rule('b5-goes').judge(sought).headline).toContain('يأتي إلى السائل');
});

test('the sick: whole elements heal, never a word of death', () => {
  for (let i = 0; i < 65536; i += 97) {
    const rows = Array.from(
      { length: 16 },
      (_, b) => (Math.floor(i / 2 ** b) % 2) + 1,
    );
    const a = rule('b5-sick').judge(castShield(rows));
    expect(a.headline + a.lines.join('')).not.toMatch(/موت|يموت|الموت/);
    // Each element is counted out of ten, an even number.
    for (const l of a.lines.slice(1, 5)) {
      expect(Number(l.match(/: (\d+) من/)![1]) % 2).toBe(0);
    }
  }
  // All four mothers الطريق: the new shield is الطريق and الجماعة only.
  const whole = find(s => {
    const a = rule('b5-sick').judge(s);
    return a.lines.slice(1, 5).every(l => l.includes(': 10 من'));
  });
  expect(rule('b5-sick').judge(whole).verdict).toBe('yes');
});

test('the prisoner: a fortunate outgoing figure in the 12th frees him', () => {
  const free = find(s => name(h(s, 12)) === 'الأحيان');
  const a = rule('b5-prisoner').judge(free);
  expect(a.verdict).toBe('yes');
  expect(a.lines.join(' ')).toContain('سعد خارج');
  // Neither the 4th nor the 12th purely fortunate, and nothing frees him.
  expect(rule('b5-prisoner').judge(book).verdict).toBe('no');
});

test('hidden things: four quarter figures and the air of them', () => {
  const a = rule('b5-hidden').judge(book);
  expect(a.verdict).toBe('info');
  expect(a.lines).toHaveLength(5);
  expect(a.lines[0]).toContain('الشرق');
});
