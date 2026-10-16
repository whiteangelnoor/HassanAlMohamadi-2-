// Hijri dates. AGPL-3.0-or-later.
//
// The Umm al-Qura calendar (Saudi official) when the phone's Intl supports
// it; otherwise the arithmetic (tabular) Islamic calendar, which can differ
// by a day. Either may differ by a day from local moon sighting.

export const HIJRI_MONTHS = [
  'محرّم',
  'صفر',
  'ربيع الأول',
  'ربيع الآخر',
  'جمادى الأولى',
  'جمادى الآخرة',
  'رجب',
  'شعبان',
  'رمضان',
  'شوّال',
  'ذو القعدة',
  'ذو الحجة',
];

export interface HijriDate {
  year: number;
  month: number; // 1..12
  day: number;
  source: 'umalqura' | 'tabular';
}

let formatter: Intl.DateTimeFormat | null | undefined;

function umalqura(): Intl.DateTimeFormat | null {
  if (formatter === undefined) {
    try {
      const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      });
      // Check the calendar was really applied: 1 Jan 2000 = 24/9/1420.
      const p = parts(f, new Date(Date.UTC(2000, 0, 1, 12)));
      formatter =
        p && p.year === 1420 && p.month === 9 && p.day === 24 ? f : null;
    } catch {
      formatter = null;
    }
  }
  return formatter;
}

function parts(f: Intl.DateTimeFormat, d: Date) {
  try {
    const out: Record<string, number> = {};
    for (const p of f.formatToParts(d)) {
      if (p.type === 'year' || p.type === 'month' || p.type === 'day') {
        out[p.type] = parseInt(p.value, 10);
      }
    }
    return out.year && out.month && out.day
      ? { year: out.year, month: out.month, day: out.day }
      : null;
  } catch {
    return null;
  }
}

/** Tabular Islamic calendar (civil epoch, 16 July 622 Julian). */
function tabular(y: number, m: number, d: number): HijriDate {
  // Julian Day Number of the Gregorian date.
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  const jdn =
    d +
    Math.floor((153 * mm + 2) / 5) +
    365 * yy +
    Math.floor(yy / 4) -
    Math.floor(yy / 100) +
    Math.floor(yy / 400) -
    32045;
  const days = jdn - 1948440 + 10632;
  const n = Math.floor((days - 1) / 10631);
  const r = days - 10631 * n + 354;
  const j =
    Math.floor((10985 - r) / 5316) * Math.floor((50 * r) / 17719) +
    Math.floor(r / 5670) * Math.floor((43 * r) / 15238);
  const rr =
    r -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const month = Math.floor((24 * rr) / 709);
  const day = rr - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;
  return { year, month, day, source: 'tabular' };
}

/** Hijri date of a civil (Gregorian) date. */
export function toHijri(y: number, m: number, d: number): HijriDate {
  const f = umalqura();
  if (f) {
    const p = parts(f, new Date(Date.UTC(y, m - 1, d, 12)));
    if (p) {
      return { ...p, source: 'umalqura' };
    }
  }
  return tabular(y, m, d);
}
