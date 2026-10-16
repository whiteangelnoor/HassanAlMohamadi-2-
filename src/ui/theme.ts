// Colors and Arabic labels shared by the screens. AGPL-3.0-or-later.
import { BodyKey } from '../astro/engine';

export const colors = {
  navy: '#0B1530',
  navyRaised: '#14213F',
  navyInput: '#0F1A38',
  line: '#24335A',
  text: '#E8ECF5',
  muted: '#8E9AB8',
  gold: '#C9A54C',
  goldText: '#0B1530',
  error: '#E07A6F',
};

export const SIGNS = [
  'الحمل',
  'الثور',
  'الجوزاء',
  'السرطان',
  'الأسد',
  'العذراء',
  'الميزان',
  'العقرب',
  'القوس',
  'الجدي',
  'الدلو',
  'الحوت',
];

export const BODIES: { key: BodyKey; name: string }[] = [
  { key: 'sun', name: 'الشمس' },
  { key: 'moon', name: 'القمر' },
  { key: 'mercury', name: 'عطارد' },
  { key: 'venus', name: 'الزهرة' },
  { key: 'mars', name: 'المريخ' },
  { key: 'jupiter', name: 'المشتري' },
  { key: 'saturn', name: 'زحل' },
  { key: 'uranus', name: 'أورانوس' },
  { key: 'neptune', name: 'نبتون' },
  { key: 'pluto', name: 'بلوتو' },
  { key: 'trueNode', name: 'العقدة الشمالية' },
  { key: 'chiron', name: 'كيرون' },
];

/** 23.24 -> "23° 14′" */
export function formatDegree(degree: number): string {
  const totalMinutes = Math.floor(degree * 60 + 1e-9);
  const d = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${d}° ${String(m).padStart(2, '0')}′`;
}

export function formatLongitude(lon: number): string {
  const x = ((lon % 360) + 360) % 360;
  return `${formatDegree(x % 30)} ${SIGNS[Math.floor(x / 30)]}`;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function formatDateTime(t: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}): string {
  return `${t.year}/${pad(t.month)}/${pad(t.day)}  ${pad(t.hour)}:${pad(
    t.minute,
  )}`;
}
