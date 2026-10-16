// Date and time display in the phone's own time zone. AGPL-3.0-or-later.

import { dateFromJd } from '../astro/events';

export const MONTHS = [
  'كانون الثاني',
  'شباط',
  'آذار',
  'نيسان',
  'أيار',
  'حزيران',
  'تموز',
  'آب',
  'أيلول',
  'تشرين الأول',
  'تشرين الثاني',
  'كانون الأول',
];

const pad = (n: number) => String(n).padStart(2, '0');

export function formatDay(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "12 تشرين الثاني 2026 · 14:05" in local time. */
export function formatJd(jd: number): string {
  const d = dateFromJd(jd);
  return `${formatDay(d)} · ${formatTime(d)}`;
}

export function monthTitle(year: number, month: number): string {
  return `${MONTHS[month]} ${year}`;
}

/** Key for grouping by local calendar day. */
export function dayKey(jd: number): string {
  const d = dateFromJd(jd);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
