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
  { key: 'meanLilith', name: 'ليليث' },
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

export const POINT_NAMES: Record<string, string> = {
  ...Object.fromEntries(BODIES.map(b => [b.key, b.name])),
  asc: 'الطالع',
  mc: 'وسط السماء',
};

export const ASPECT_NAMES: Record<string, string> = {
  conjunction: 'اقتران',
  sextile: 'تسديس',
  square: 'تربيع',
  trine: 'تثليث',
  opposition: 'مقابلة',
  semisextile: 'نصف تسديس',
  semisquare: 'نصف تربيع',
  sesquiquadrate: 'تربيع ونصف',
  quincunx: 'عدم توافق',
};

export const LOT_NAMES: Record<string, string> = {
  fortune: 'سهم السعادة',
  spirit: 'سهم الغيب',
  eros: 'سهم المحبة',
  necessity: 'سهم الضرورة',
  courage: 'سهم الشجاعة',
  victory: 'سهم الظفر',
  nemesis: 'سهم العقاب',
  father: 'سهم الأب',
  mother: 'سهم الأم',
  // formula terms
  ...Object.fromEntries(BODIES.map(b => [b.key, b.name])),
};

export const DIGNITY_NAMES: Record<string, string> = {
  domicile: 'بيت',
  exaltation: 'شرف',
  triplicity: 'مثلثة',
  term: 'حد',
  face: 'وجه',
  detriment: 'وبال',
  fall: 'هبوط',
  peregrine: 'غريب',
};

/** Body list for charts, following the optional points in the settings. */
export function chartBodies(points: {
  trueNode: boolean;
  chiron: boolean;
  meanLilith: boolean;
}): BodyKey[] {
  return BODIES.map(b => b.key).filter(
    k =>
      (k !== 'trueNode' || points.trueNode) &&
      (k !== 'chiron' || points.chiron) &&
      (k !== 'meanLilith' || points.meanLilith),
  );
}

/** IBM Plex Sans Arabic, registered natively under this family name. */
export const FONT = 'Plex';
