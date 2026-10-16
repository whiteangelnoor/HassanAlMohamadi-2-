jest.mock('../specs/NativeAstroEngine', () => ({}));

import { MANSIONS, mansionOf } from '../src/astro/mansions';
import { toHijri } from '../src/time/hijri';

test('28 mansions, al-Sharatan first, Batn al-Hut last', () => {
  expect(MANSIONS).toHaveLength(28);
  expect(mansionOf(0)).toBe(0);
  expect(mansionOf(12.85)).toBe(0);
  expect(mansionOf(12.86)).toBe(1);
  expect(mansionOf(359.9)).toBe(27);
  expect(mansionOf(-1)).toBe(27);
});

test('Umm al-Qura dates', () => {
  expect(toHijri(2026, 10, 16)).toMatchObject({ year: 1448, month: 5, day: 5 });
  expect(toHijri(2000, 1, 1)).toMatchObject({ year: 1420, month: 9, day: 24 });
});

test('the tabular fallback stays within two days of Umm al-Qura', () => {
  // Force the arithmetic calendar by comparing against the module internals:
  // convert both ways through day counts.
  const { toHijri: h } = jest.requireActual('../src/time/hijri');
  const realIntl = Intl.DateTimeFormat;
  let maxDiff = 0;
  const umq: [number, number, number][] = [];
  for (let k = 0; k < 400; k++) {
    const d = new Date(Date.UTC(1950, 0, 1) + k * 73 * 86400000);
    const x = h(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    umq.push([x.year, x.month, x.day]);
  }
  jest.isolateModules(() => {
    (Intl as any).DateTimeFormat = function () {
      throw new Error('no Intl');
    };
    try {
      const { toHijri: t } = require('../src/time/hijri');
      for (let k = 0; k < 400; k++) {
        const d = new Date(Date.UTC(1950, 0, 1) + k * 73 * 86400000);
        const x = t(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
        expect(x.source).toBe('tabular');
        // Days since the Hijri epoch, roughly, for both.
        const n = (y: number, m: number, dd: number) =>
          (y - 1) * 354.367 + (m - 1) * 29.53 + dd;
        maxDiff = Math.max(
          maxDiff,
          Math.abs(n(x.year, x.month, x.day) - n(...umq[k])),
        );
      }
    } finally {
      (Intl as any).DateTimeFormat = realIntl;
    }
  });
  expect(maxDiff).toBeLessThan(2.6);
});
