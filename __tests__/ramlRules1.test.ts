import {
  castShield,
  Figure,
  randomCounts,
  Shield,
} from '../src/spiritual/raml';
import { RAML_FIELDS } from '../src/spiritual/ramlKit';
import { RULES_1 } from '../src/spiritual/ramlRules1';

const rule = (id: string) => {
  const r = RULES_1.find(x => x.id === id);
  if (!r) {
    throw new Error(id);
  }
  return r;
};

/** A shield from four mother patterns such as '1222'. */
const shieldOf = (...mothers: string[]): Shield =>
  castShield(mothers.flatMap(m => [...m].map(c => (c === '1' ? 1 : 2))));

/** Find a cast (over every choice of mothers) that satisfies a condition. */
function findCast(ok: (s: Shield) => boolean): Shield {
  const all: string[] = [];
  for (let i = 0; i < 16; i++) {
    all.push(
      [8, 4, 2, 1].map(b => (Math.floor(i / b) % 2 ? '2' : '1')).join(''),
    );
  }
  for (const a of all) {
    for (const b of all) {
      for (const c of all) {
        for (const d of all) {
          const s = shieldOf(a, b, c, d);
          if (ok(s)) {
            return s;
          }
        }
      }
    }
  }
  throw new Error('no cast found');
}

const k = (f: Figure) => f.join('');

test('every rule answers every cast', () => {
  const ids = new Set(RULES_1.map(r => r.id));
  expect(ids.size).toBe(RULES_1.length);
  expect(new Set(RULES_1.map(r => r.title)).size).toBe(RULES_1.length);
  let r = 7;
  const rand = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < 200; i++) {
    const s = castShield(randomCounts(rand));
    for (const rule1 of RULES_1) {
      expect(RAML_FIELDS).toContain(rule1.field);
      expect(rule1.id.startsWith('b1-')).toBe(true);
      const a = rule1.judge(s);
      expect(['yes', 'no', 'doubt', 'info']).toContain(a.verdict);
      expect(a.headline.length).toBeGreaterThan(2);
      expect(a.lines.length).toBeGreaterThan(0);
      expect(a.headline + a.lines.join('')).not.toMatch(/undefined|NaN/);
    }
  }
});

test('the book worked example (ص٢٩) through the rules', () => {
  // Mothers الأحيان، نقي الخد، النصرة الخارجة، العتبة الخارجة.
  const s = shieldOf('1222', '1211', '1122', '1112');
  // House 3 is النصرة الخارجة, fortunate: the couple agree (ص٩٢).
  expect(rule('b1-agree3').judge(s).verdict).toBe('yes');
  // House 1 is الأحيان: the friend is with you as you are with him (ص١١٥).
  expect(rule('b1-friend-loves').judge(s).headline).toContain('هو معك');
  // House 1 الأحيان for debts: hard to collect (ص١٢٠).
  expect(rule('b1-debt-paid').judge(s).verdict).toBe('no');
});

test('pregnancy: points of houses 1–6 cast off nines (ص١٠٨)', () => {
  const s = findCast(x => !['2122'].includes(k(x.houses[4])));
  const total = s.houses
    .slice(0, 6)
    .reduce((a, f) => a + f[0] + f[1] + f[2] + f[3], 0);
  const rem = total % 9 === 0 ? 9 : total % 9;
  expect(rule('b1-pregnant').judge(s).verdict).toBe(
    rem % 2 === 0 ? 'yes' : 'no',
  );
  const red = findCast(x => k(x.houses[4]) === '2122');
  expect(rule('b1-pregnant').judge(red).verdict).toBe('doubt');
});

test('baby sex: 1+6 odd is a boy, even a girl (ص١١٢)', () => {
  // 1 = الطريق 1111, 6 = 2+? — build mothers so that 1+6 is known.
  const s = shieldOf('1111', '2222', '2112', '1221');
  const six = s.houses[5];
  const r = s.houses[0].map((x, i) => (x === six[i] ? 2 : 1));
  const odd = r.reduce((a, b) => a + b, 0) % 2 === 1;
  expect(rule('b1-baby-sex').judge(s).headline).toBe(odd ? 'ذكر.' : 'أنثى.');
});

test('money: the book example of the tenth القبض الخارج (ص١٢٩)', () => {
  // The tenth القبض الخارج is 6 by بزدح; in the book the sixth is الجماعة,
  // all closed, so nothing leaves the hand.
  const s = findCast(
    x => k(x.houses[9]) === '1212' && k(x.houses[5]) === '2222',
  );
  expect(rule('b1-money-out').judge(s).headline).toContain('لا يخرج');
  // When the sixth is النصرة الداخلة 2211: water 100 + earth 1000.
  const t = findCast(
    x => k(x.houses[9]) === '1212' && k(x.houses[5]) === '2211',
  );
  expect(rule('b1-money-out').judge(t).headline).toContain('1100');
});

test('work: the book example النصرة الداخلة in house 1 (ص١٢٨)', () => {
  // When the count lands on house 1 holding النصرة الداخلة, its four
  // flips are نقي الخد، العتبة الداخلة، الأنكيس، البياض.
  const s = findCast(x => {
    if (k(x.houses[0]) !== '2211') {
      return false;
    }
    const n = [1, 2, 4, 5, 10, 11, 15].reduce(
      (a, h) => a + x.houses[h - 1].filter(r => r === 1).length,
      0,
    );
    return n % 12 === 1;
  });
  const a = rule('b1-post-lasts').judge(s);
  expect(a.lines.join(' ')).toContain('«نقي الخد»');
  expect(a.lines.join(' ')).toContain('«الأنكيس»');
  expect(a.verdict).toBe('yes');
});

test('trade or craft by the kind of 2+10 (ص١٢٣)', () => {
  const s = findCast(x => {
    const r = x.houses[1].map((v, i) => (v === x.houses[9][i] ? 2 : 1));
    return r[0] === 2 && r[3] === 2;
  });
  expect(rule('b1-trade-craft').judge(s).headline).toBe('الصنعة خير لك.');
  const t = findCast(x => {
    const r = x.houses[1].map((v, i) => (v === x.houses[9][i] ? 2 : 1));
    return r[0] === 1 && r[3] === 2;
  });
  expect(rule('b1-trade-craft').judge(t).headline).toBe('التجارة خير لك.');
});

test('prices: الطريق in both 4 and 5 means they fall (ص١٢٥)', () => {
  const s = findCast(
    x => k(x.houses[3]) === '1111' && k(x.houses[4]) === '2121',
  );
  expect(rule('b1-prices').judge(s).headline).toBe('تنخفض الأسعار.');
  const t = findCast(
    x => k(x.houses[3]) === '2221' && k(x.houses[4]) === '2122',
  );
  expect(rule('b1-prices').judge(t).headline).toBe('ترتفع الأسعار.');
});

test('money source: all points cast off sevens (ص١٣٢)', () => {
  const s = shieldOf('1111', '1111', '1111', '1111');
  const total = s.houses.reduce((a, f) => a + f[0] + f[1] + f[2] + f[3], 0);
  const r = total % 7 === 0 ? 7 : total % 7;
  const T = [
    '',
    'السلطان',
    'النساء',
    'القرابة',
    'سفر',
    'ميراث',
    'تجارة',
    'حلال',
  ];
  expect(rule('b1-money-source').judge(s).headline).toContain(T[r]);
});

test('secret kept when 14 and 15 are both fixed (ص١٢٢)', () => {
  const s = findCast(x => {
    const f = (n: number) => x.houses[n - 1];
    return f(14)[0] === 2 && f(14)[3] === 2 && f(15)[0] === 2 && f(15)[3] === 2;
  });
  expect(rule('b1-secret').judge(s).verdict).toBe('yes');
});

test('offspring: العقلة in the first house gives children (ص١١٥)', () => {
  const s = findCast(x => k(x.houses[0]) === '1221');
  expect(rule('b1-offspring').judge(s).verdict).toBe('yes');
});
