// Hijri dates. AGPL-3.0-or-later.
//
// Lunar Hijri, chosen in the settings:
// - 'umalqura': the Saudi official Umm al-Qura calendar (from the phone's
//   Intl when it has it, otherwise the arithmetic calendar);
// - 'civil': the arithmetic (tabular) calendar, civil epoch;
// - 'astronomical': the arithmetic calendar, astronomical epoch (one day
//   ahead of 'civil').
// Calendars that follow moon sighting (Najaf, Tehran's lunar calendar...)
// have no formula; the user shifts the result by -2..+2 days instead.
//
// Solar Hijri ('persian'), the official calendar of Iran: the year starts on
// the day of the March equinox if it falls before noon Tehran time (UTC+3:30),
// otherwise the next day. The equinox comes from the engine.

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

export const PERSIAN_MONTHS = [
  'فروردين',
  'أرديبهشت',
  'خرداد',
  'تير',
  'مرداد',
  'شهريور',
  'مهر',
  'آبان',
  'آذر',
  'دي',
  'بهمن',
  'إسفند',
];

export type HijriKind = 'umalqura' | 'civil' | 'astronomical' | 'persian';

export const HIJRI_KIND_NAMES: Record<HijriKind, string> = {
  umalqura: 'أم القرى',
  civil: 'الهجري الحسابي',
  astronomical: 'الهجري الحسابي الفلكي',
  persian: 'الهجري الشمسي (إيران)',
};

export interface HijriDate {
  year: number;
  month: number; // 1..12
  day: number;
  source: 'umalqura' | 'tabular' | 'persian';
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

/** Gregorian date shifted by whole days. */
function shift(
  y: number,
  m: number,
  d: number,
  days: number,
): [number, number, number] {
  const t = new Date(Date.UTC(y, m - 1, d + days, 12));
  return [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()];
}

/** Lunar Hijri date of a Gregorian date (`kind` other than 'persian'). */
export function toHijri(
  y: number,
  m: number,
  d: number,
  kind: Exclude<HijriKind, 'persian'> = 'umalqura',
  offsetDays = 0,
): HijriDate {
  const [yy, mm, dd] = shift(y, m, d, offsetDays);
  if (kind === 'umalqura') {
    const f = umalqura();
    if (f) {
      const p = parts(f, new Date(Date.UTC(yy, mm - 1, dd, 12)));
      if (p) {
        return { ...p, source: 'umalqura' };
      }
    }
    return tabular(yy, mm, dd);
  }
  if (kind === 'astronomical') {
    return tabular(...shift(yy, mm, dd, 1));
  }
  return tabular(yy, mm, dd);
}

// ---------- solar Hijri ----------------------------------------------------------

/** Finds the March equinox (UT, JD) of a Gregorian year; supplied by the app. */
export type EquinoxFinder = (gregorianYear: number) => number;

const nowruzCache = new Map<number, number>();

/** Gregorian date (UTC midnight, ms) of 1 Farvardin in a Gregorian year. */
function nowruz(gYear: number, equinox: EquinoxFinder): number {
  let v = nowruzCache.get(gYear);
  if (v === undefined) {
    const jd = equinox(gYear);
    // Tehran standard time, UTC+3:30.
    const tehran = new Date((jd - 2440587.5) * 86400000 + 3.5 * 3600000);
    const day = Date.UTC(
      tehran.getUTCFullYear(),
      tehran.getUTCMonth(),
      tehran.getUTCDate(),
    );
    v = tehran.getUTCHours() < 12 ? day : day + 86400000;
    nowruzCache.set(gYear, v);
  }
  return v;
}

export function toPersian(
  y: number,
  m: number,
  d: number,
  equinox: EquinoxFinder,
): HijriDate {
  const t = Date.UTC(y, m - 1, d);
  let start = nowruz(y, equinox);
  let year = y - 621;
  if (t < start) {
    start = nowruz(y - 1, equinox);
    year -= 1;
  }
  const doy = Math.round((t - start) / 86400000);
  const month =
    doy < 186 ? Math.floor(doy / 31) + 1 : 7 + Math.floor((doy - 186) / 30);
  const day = doy < 186 ? (doy % 31) + 1 : ((doy - 186) % 30) + 1;
  return { year, month, day, source: 'persian' };
}
