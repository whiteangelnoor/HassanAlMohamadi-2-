import { formatOffset, localToUtc } from '../src/time/tz';

// 4005 wall times converted by Python's zoneinfo from the same tz release
// (fold=0: first occurrence when repeated, pre-jump offset when skipped).
const samples: [
  string,
  number,
  number,
  number,
  number,
  number,
  number,
][] = require('./fixtures/tz-samples.json');

test('matches Python zoneinfo on random historical samples', () => {
  const failures = samples.filter(
    ([zone, year, month, day, hour, minute, expected]) => {
      const r = localToUtc({ year, month, day, hour, minute }, zone, null);
      return r.utcSeconds !== expected;
    },
  );
  expect(failures).toEqual([]);
});

test('Baghdad summer time 1990 is +04:00', () => {
  const r = localToUtc(
    { year: 1990, month: 6, day: 15, hour: 12, minute: 0 },
    'Asia/Baghdad',
    44.4,
  );
  expect(formatOffset(r.offsetSeconds)).toBe('+04:00');
  expect(r.dst).toBe(true);
  expect(r.utc).toMatchObject({ hour: 8, minute: 0 });
});

test('before standard time the birthplace longitude sets the clock', () => {
  // Mosul, 1885 (Baghdad adopted its city mean time in 1890): LMT of
  // 43.1189 E is +02:52:29.
  const r = localToUtc(
    { year: 1885, month: 1, day: 1, hour: 12, minute: 0 },
    'Asia/Baghdad',
    43.1189,
  );
  expect(r.lmt).toBe(true);
  expect(formatOffset(r.offsetSeconds)).toBe('+02:52:29');
});

test('flags repeated and skipped clock times', () => {
  const repeated = localToUtc(
    { year: 2021, month: 11, day: 7, hour: 1, minute: 30 },
    'America/New_York',
    -74,
  );
  expect(repeated.ambiguous).toBe(true);
  expect(formatOffset(repeated.offsetSeconds)).toBe('-04:00');
  const skipped = localToUtc(
    { year: 2021, month: 3, day: 14, hour: 2, minute: 30 },
    'America/New_York',
    -74,
  );
  expect(skipped.nonexistent).toBe(true);
});
