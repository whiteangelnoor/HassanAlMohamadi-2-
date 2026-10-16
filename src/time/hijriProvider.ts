// The Hijri calendar chosen in the settings, as one date function for a
// month view. AGPL-3.0-or-later.

import { HijriDate, toHijri } from './hijri';
import {
  monthStarts,
  SIGHTING_CITIES,
  SightingKey,
  sightedHijri,
} from './hijriSighting';

export type HijriChoice = 'umalqura' | SightingKey;

export const HIJRI_CHOICES: {
  key: HijriChoice;
  label: string;
  name: string;
}[] = [
  {
    key: 'umalqura',
    label: 'أم القرى',
    name: 'تقويم أم القرى (الرسمي السعودي)',
  },
  {
    key: 'karachi',
    label: 'كراتشي',
    name: 'رؤية الهلال في كراتشي (حساب فلكي)',
  },
  {
    key: 'tehran',
    label: 'الجيوفيزياء',
    name: 'رؤية الهلال في طهران، معهد الجيوفيزياء (حساب فلكي)',
  },
  { key: 'qom', label: 'قم', name: 'رؤية الهلال في قم (حساب فلكي)' },
];

export interface HijriSetting {
  choice: HijriChoice;
  /** Whole days added to the result, -2..+2, to match local sighting. */
  offset: number;
}

export interface HijriForMonth {
  date: (y: number, m: number, d: number) => HijriDate;
  /** Why the result fell back to the arithmetic calendar, if it did. */
  note: string | null;
}

/**
 * Date function for civil dates around a month (year, month 1..12). For the
 * sighting calendars the month starts are computed once for the window.
 * Any fallback is reported in `note`, never hidden.
 */
export function hijriForMonth(
  s: HijriSetting,
  year: number,
  month: number,
): HijriForMonth {
  const shift = (y: number, m: number, d: number): [number, number, number] => {
    const t = new Date(Date.UTC(y, m - 1, d + s.offset));
    return [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()];
  };
  if (s.choice === 'umalqura') {
    const probe = toHijri(year, month, 1, 'umalqura');
    return {
      date: (y, m, d) => toHijri(...shift(y, m, d), 'umalqura'),
      note:
        probe.source === 'umalqura'
          ? null
          : 'تقويم أم القرى غير متوفر في هاتفك، فاستُخدم الهجري الحسابي وقد يختلف يوماً.',
    };
  }
  let starts: number[] = [];
  let note: string | null = null;
  try {
    starts = monthStarts(
      Date.UTC(year, month - 1, 1) - 3 * 86400000,
      Date.UTC(year, month, 1) + 3 * 86400000,
      SIGHTING_CITIES[s.choice],
    );
  } catch (e) {
    note = `تعذّر حساب رؤية الهلال (${String(e)})، فاستُخدم الهجري الحسابي.`;
  }
  return {
    date: (y, m, d) => {
      const [yy, mm, dd] = shift(y, m, d);
      return sightedHijri(yy, mm, dd, starts) ?? toHijri(yy, mm, dd, 'civil');
    },
    note,
  };
}
