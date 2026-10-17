// Shared tools for the question chapters of «الفلك المشحون في علم الرمل
// المصون»: reading houses, combining figures, where a figure repeats, its
// kind, points, number and the flipped rows (النظر والنطق والاتصال
// والانفصال). AGPL-3.0-or-later.

import {
  add,
  Figure,
  figureInfo,
  figureKind,
  Nature,
  Shield,
} from './raml';

export type Verdict = 'yes' | 'no' | 'doubt' | 'info';

export interface RuleAnswer {
  verdict: Verdict;
  headline: string;
  lines: string[];
}

export type RamlField =
  | 'النفس والحال'
  | 'المال والتجارة'
  | 'الزواج'
  | 'الحمل والأولاد'
  | 'الأصحاب والمحبة'
  | 'الديون والودائع'
  | 'المرض'
  | 'السجن'
  | 'السرقة والضائع'
  | 'الغائب والسفر'
  | 'العمل والولاية'
  | 'الأعداء والخصومة'
  | 'الطالب والمطلوب'
  | 'المدة والعدد';

export const RAML_FIELDS: RamlField[] = [
  'النفس والحال',
  'المال والتجارة',
  'الزواج',
  'الحمل والأولاد',
  'الأصحاب والمحبة',
  'الديون والودائع',
  'المرض',
  'السجن',
  'السرقة والضائع',
  'الغائب والسفر',
  'العمل والولاية',
  'الأعداء والخصومة',
  'الطالب والمطلوب',
  'المدة والعدد',
];

/** One chapter of the book, as a question the user can pick. */
export interface BookRule {
  /** Stable id, e.g. 'pregnant'. */
  id: string;
  field: RamlField;
  /** The question as the user sees it, short and plain. */
  title: string;
  /** Printed page in the book. */
  page: number;
  judge(s: Shield): RuleAnswer;
}

export const key = (f: Figure) => f.join('');

/** The figure in house n (1–16). */
export const h = (s: Shield, n: number): Figure => s.houses[n - 1];

/** Combine two or more figures (ضرب/جمع). */
export function sum(...fs: Figure[]): Figure {
  return fs.reduce((a, b) => add(a, b));
}

/** Combine the figures of the given houses, in order. */
export const sumOf = (s: Shield, ...houses: number[]) =>
  sum(...houses.map(n => h(s, n)));

export const name = (f: Figure) => figureInfo(f).name;
export const nature = (f: Figure): Nature => figureInfo(f).nature;
export const kind = figureKind;

export const isGood = (f: Figure) => {
  const n = nature(f);
  return n === 'سعد' || n === 'ممتزج سعيد';
};
export const isBad = (f: Figure) => {
  const n = nature(f);
  return n === 'نحس' || n === 'ممتزج نحس';
};
/** Purely fortunate or unfortunate, not mixed. */
export const isPureGood = (f: Figure) => nature(f) === 'سعد';
export const isPureBad = (f: Figure) => nature(f) === 'نحس';

/** Is the figure one of these names? */
export const isOneOf = (f: Figure, names: string[]) => names.includes(name(f));

/** The houses (1–16) where the figure stands, in order. */
export function housesOf(s: Shield, f: Figure): number[] {
  const out: number[] = [];
  s.houses.forEach((x, i) => {
    if (key(x) === key(f)) {
      out.push(i + 1);
    }
  });
  return out;
}

/** Other houses where the figure of house n repeats. */
export const repeatsOf = (s: Shield, n: number) =>
  housesOf(s, h(s, n)).filter(x => x !== n);

/** Is the figure found anywhere among the sixteen houses? */
export const inShield = (s: Shield, f: Figure) => housesOf(s, f).length > 0;

/** Points of a figure: a single row 1, a double row 2 (4 to 8). */
export const points = (f: Figure) => f.reduce<number>((a, r) => a + r, 0);
/** Odd figures are male, even female (ص١١٢). */
export const isOdd = (f: Figure) => points(f) % 2 === 1;

/** The book's fixed order (ص٣٦): الجودلة 1 … الجماعة 16. */
export const BOOK_ORDER = [
  '1121',
  '1222',
  '2111',
  '2212',
  '1211',
  '1112',
  '2122',
  '2221',
  '1122',
  '1221',
  '2112',
  '2211',
  '1111',
  '1212',
  '2121',
  '2222',
];

/** Position 1–16 in the book's order. */
export const orderOf = (f: Figure) => BOOK_ORDER.indexOf(key(f)) + 1;

/** The figure's number: triangular by its order (الجودلة 1، الأحيان 3 … 136). */
export const numberOf = (f: Figure) => {
  const n = orderOf(f);
  return (n * (n + 1)) / 2;
};

export const ROWS = ['النار', 'الهواء', 'الماء', 'التراب'] as const;

/** Flip one row (0 fire … 3 earth). */
export function flip(f: Figure, row: number): Figure {
  return f.map((r, i) => (i === row ? (r === 1 ? 2 : 1) : r)) as Figure;
}

/** Sight, speech, contact, separation: the figure with row 0–3 flipped. */
export const nadhar = (f: Figure) => flip(f, 0);
export const nutq = (f: Figure) => flip(f, 1);
export const ittisal = (f: Figure) => flip(f, 2);
export const infisal = (f: Figure) => flip(f, 3);

/** A row is «open» when it is a single point. */
export const isOpen = (f: Figure, row: number) => f[row] === 1;

/** A new figure from one row (0–3) of each of four houses, in order. */
export const layer = (s: Shield, row: number, houses: number[]): Figure =>
  houses.map(n => h(s, n)[row]) as Figure;

/** Total points of a row over the sixteen houses. */
export const rowTotal = (s: Shield, row: number) =>
  s.houses.reduce((a, f) => a + f[row], 0);

/** Angles (الأوتاد). */
export const ANGLES = [1, 4, 7, 10];

/** Plain verdict line from a figure's nature. */
export function natureVerdict(f: Figure): Verdict {
  return isGood(f) ? 'yes' : isBad(f) ? 'no' : 'doubt';
}

/** «الشكل «X» (طبعه)». */
export const shown = (f: Figure) => `«${name(f)}» (${nature(f)})`;
