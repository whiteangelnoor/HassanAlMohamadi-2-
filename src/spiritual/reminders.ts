// Reminders for chosen planetary hours over the coming days, handed to the
// phone's alarm service. AGPL-3.0-or-later.

import { dateFromJd, J1970 } from '../astro/events';
import { planetaryDay } from '../astro/planetaryHours';
import { Planet } from '../astro/traditional';
import { SavedPlace } from '../store';
import { formatTime } from '../ui/dates';
import { POINT_NAMES } from '../ui/theme';
import { HOUR_TRAITS } from './hourTraits';

export interface Reminder {
  at: number; // ms since 1970
  title: string;
  body: string;
}

const DAY_MS = 86400000;
const msFromJd = (jd: number) => (jd - J1970) * DAY_MS;

/**
 * One reminder per chosen hour starting after `fromMs` (lead minutes early),
 * over the planetary days of the next `days` civil dates at the place. The
 * day before is included for its night hours, which run past midnight.
 */
export function hourReminders(
  planets: Planet[],
  leadMinutes: number,
  place: SavedPlace,
  fromMs: number,
  days: number,
): Reminder[] {
  if (planets.length === 0) {
    return [];
  }
  const out: Reminder[] = [];
  const start = new Date(fromMs);
  for (let k = -1; k < days; k++) {
    const d = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + k,
    );
    const day = planetaryDay(
      d.getFullYear(),
      d.getMonth() + 1,
      d.getDate(),
      place.lat,
      place.lon,
    );
    if (!day) {
      continue;
    }
    for (const h of day.hours) {
      if (!planets.includes(h.ruler)) {
        continue;
      }
      const at = msFromJd(h.startJd) - leadMinutes * 60000;
      if (at <= fromMs) {
        continue;
      }
      const name = POINT_NAMES[h.ruler];
      out.push({
        at: Math.round(at),
        title: leadMinutes
          ? `ساعة ${name} بعد ${leadMinutes} دقائق`
          : `بدأت ساعة ${name}`,
        body: `من ${formatTime(dateFromJd(h.startJd))} إلى ${formatTime(
          dateFromJd(h.endJd),
        )} · ${place.name}\nتصلح لـ: ${HOUR_TRAITS[h.ruler].good}`,
      });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}
