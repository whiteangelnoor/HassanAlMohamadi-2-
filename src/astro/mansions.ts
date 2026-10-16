// The 28 lunar mansions (منازل القمر). AGPL-3.0-or-later.
//
// Each mansion is 1/28 of the zodiac, 12°51′26″, starting with al-Sharatan.
// Two ways to place them, chosen in the settings:
// - 'tropical': from 0° Aries of the tropical zodiac, the reckoning of the
//   later Arabic books of judgements (Ghayat al-Hakim) and of the West.
// - 'stars': from 0° Aries of the sidereal zodiac (Lahiri), so each mansion
//   keeps its stars: the Pleiades fall in al-Thurayya, Aldebaran in
//   al-Dabaran, Regulus in al-Jabhah, Antares in al-Qalb.

import { CommonOptions } from './engine';
import { crossings, fixedTrack, lonAt, Track, tracks } from './events';

export type MansionMethod = 'tropical' | 'stars';

export const MANSION_WIDTH = 360 / 28;

export const MANSIONS = [
  'الشرطان',
  'البطين',
  'الثريا',
  'الدبران',
  'الهقعة',
  'الهنعة',
  'الذراع',
  'النثرة',
  'الطرف',
  'الجبهة',
  'الزبرة',
  'الصرفة',
  'العوّاء',
  'السماك',
  'الغفر',
  'الزبانى',
  'الإكليل',
  'القلب',
  'الشولة',
  'النعائم',
  'البلدة',
  'سعد الذابح',
  'سعد بلع',
  'سعد السعود',
  'سعد الأخبية',
  'الفرغ المقدّم',
  'الفرغ المؤخّر',
  'بطن الحوت',
];

const norm = (x: number) => ((x % 360) + 360) % 360;

export function mansionOptions(method: MansionMethod): CommonOptions {
  return method === 'stars'
    ? { zodiac: { type: 'sidereal', ayanamsa: 1 } }
    : { zodiac: { type: 'tropical' } };
}

/** Index 0..27 of the mansion holding a longitude in the method's frame. */
export function mansionOf(lon: number): number {
  return Math.floor(norm(lon) / MANSION_WIDTH) % 28;
}

export interface MansionDay {
  /** Local midnight that starts the day, as a JD. */
  startJd: number;
  /** Mansion at the start of the day. */
  first: number;
  /** Mansions entered during the day, with the moment of entry. */
  entries: { mansion: number; jd: number }[];
}

/** Moon track for the window, in the frame of the chosen method. */
export function moonTrack(
  method: MansionMethod,
  startJd: number,
  endJd: number,
): Track {
  return tracks(['moon'], startJd - 1, endJd + 1, 1, mansionOptions(method))
    .moon;
}

/**
 * The Moon's mansions for consecutive days. `dayStarts` are the JDs of each
 * local midnight plus the one ending the last day.
 */
export function mansionDays(moon: Track, dayStarts: number[]): MansionDay[] {
  const boundaries = Array.from({ length: 28 }, (_, i) => i * MANSION_WIDTH);
  const changes = crossings(moon, fixedTrack(0, moon), boundaries).map(c => ({
    jd: c.jd,
    // Moving forward across a boundary enters the mansion that starts there.
    mansion:
      c.direction > 0
        ? Math.round(c.target / MANSION_WIDTH) % 28
        : (Math.round(c.target / MANSION_WIDTH) + 27) % 28,
  }));
  const days: MansionDay[] = [];
  for (let i = 0; i + 1 < dayStarts.length; i++) {
    const a = dayStarts[i];
    const b = dayStarts[i + 1];
    days.push({
      startJd: a,
      first: mansionOf(lonAt(moon, a)),
      entries: changes.filter(c => c.jd >= a && c.jd < b),
    });
  }
  return days;
}
