// Geomancy (علم الرمل): sixteen lines of points give four mothers; the
// daughters, nieces, the asker, the one asked about, the balance and the
// outcome follow by fixed rules and fill the sixteen houses, after «الفلك
// المشحون في علم الرمل المصون». AGPL-3.0-or-later.
//
// A figure is four rows from the head down, each 1 (a single point, odd) or
// 2 (two points, even). Adding two figures row by row: equal rows give 2,
// unequal give 1.

export type Row = 1 | 2;
export type Figure = [Row, Row, Row, Row];

export type Nature = 'سعد' | 'نحس' | 'ممتزج' | 'ممتزج سعيد' | 'ممتزج نحس';

export interface FigureInfo {
  name: string;
  /** Latin name in the European books, for whoever wants to compare. */
  latin: string;
  planet: string;
  nature: Nature;
  /** The sign of the figure (الفلك المشحون، ص٦٠). */
  sign: string;
  /** The element of the figure, by its letter (ص٣٨). */
  element: 'نار' | 'هواء' | 'ماء' | 'تراب';
  meaning: string;
}

const key = (f: Figure) => f.join('');

/**
 * The sixteen figures, by their rows from the head down. Names, planets
 * (تسكين الكواكب ص٤٤), natures (ص٤٣), signs (ص٦٠) and elements after «الفلك
 * المشحون في علم الرمل المصون».
 */
export const FIGURES: Record<string, FigureInfo> = {
  '1111': {
    name: 'الطريق',
    latin: 'Via',
    planet: 'القمر',
    nature: 'ممتزج سعيد',
    sign: 'السرطان',
    element: 'ماء',
    meaning:
      'حركة وسفر وتغيّر؛ حسن لما يُراد له المضي، ضعيف لما يُراد له الثبات.',
  },
  '2222': {
    name: 'الجماعة',
    latin: 'Populus',
    planet: 'عطارد',
    nature: 'ممتزج',
    sign: 'العذراء',
    element: 'نار',
    meaning:
      'جمع من الناس وكثرة؛ يتبع ما يجاوره، فهو مع السعد سعد ومع النحس نحس.',
  },
  '2112': {
    name: 'الاجتماع',
    latin: 'Conjunctio',
    planet: 'عطارد',
    nature: 'ممتزج سعيد',
    sign: 'الجوزاء',
    element: 'هواء',
    meaning: 'لقاء واتفاق وجمع شمل؛ حسن للصلح والشراكة واسترداد المفقود.',
  },
  '1221': {
    name: 'العقلة',
    latin: 'Carcer',
    planet: 'زحل',
    nature: 'ممتزج نحس',
    sign: 'الدلو',
    element: 'تراب',
    meaning: 'حبس وتقييد وتأخير؛ حسن لما يُراد له الثبات فقط.',
  },
  '2211': {
    name: 'النصرة الداخلة',
    latin: 'Fortuna Major',
    planet: 'الزهرة',
    nature: 'سعد',
    sign: 'الثور',
    element: 'تراب',
    meaning: 'نصر عظيم وظفر ثابت ورفعة؛ من أسعد الأشكال.',
  },
  '1122': {
    name: 'النصرة الخارجة',
    latin: 'Fortuna Minor',
    planet: 'الشمس',
    nature: 'سعد',
    sign: 'الأسد',
    element: 'نار',
    meaning: 'نصر وعون لكنه سريع الزوال؛ حسن لما يُراد له السرعة.',
  },
  '2121': {
    name: 'القبض الداخل',
    latin: 'Acquisitio',
    planet: 'الشمس',
    nature: 'سعد',
    sign: 'الأسد',
    element: 'هواء',
    meaning: 'كسب وربح وحصول على المطلوب.',
  },
  '1212': {
    name: 'القبض الخارج',
    latin: 'Amissio',
    planet: 'الرأس',
    nature: 'نحس',
    sign: 'الجوزاء',
    element: 'ماء',
    meaning: 'خسارة وذهاب ما في اليد؛ حسن لما يُراد زواله كالمرض والهم.',
  },
  '1222': {
    name: 'الأحيان',
    latin: 'Laetitia',
    planet: 'المشتري',
    nature: 'سعد',
    sign: 'القوس',
    element: 'نار',
    meaning: 'فرح وسرور وصحة وبشارة.',
  },
  '2221': {
    name: 'الأنكيس',
    latin: 'Tristitia',
    planet: 'زحل',
    nature: 'نحس',
    sign: 'الجدي',
    element: 'تراب',
    meaning: 'حزن وهمّ وانخفاض؛ حسن للبناء والأمور الثابتة فقط.',
  },
  '1121': {
    name: 'الجودلة',
    latin: 'Puer',
    planet: 'المريخ',
    nature: 'ممتزج سعيد',
    sign: 'الحمل',
    element: 'نار',
    meaning: 'اندفاع وقوة وتسرع؛ حسن للخصومة والمنافسة، ضعيف للصلح.',
  },
  '1211': {
    name: 'نقي الخد',
    latin: 'Puella',
    planet: 'الزهرة',
    nature: 'ممتزج نحس',
    sign: 'الميزان',
    element: 'تراب',
    meaning: 'لطف وجمال ولين؛ يميل مع ما يجاوره، ولا يُعتمد عليه وحده.',
  },
  '2122': {
    name: 'الحمرة',
    latin: 'Rubeus',
    planet: 'المريخ',
    nature: 'نحس',
    sign: 'العقرب',
    element: 'هواء',
    meaning: 'غضب وشدة وفتنة؛ يُحذر فيه.',
  },
  '2212': {
    name: 'البياض',
    latin: 'Albus',
    planet: 'القمر',
    nature: 'سعد',
    sign: 'السرطان',
    element: 'ماء',
    meaning: 'صفاء وسلام وحكمة؛ حسن للتجارة والعلم والصلح.',
  },
  '2111': {
    name: 'العتبة الداخلة',
    latin: 'Caput Draconis',
    planet: 'المشتري',
    nature: 'سعد',
    sign: 'الحوت',
    element: 'هواء',
    meaning: 'وتُسمّى راية الفرح: دخول وبداية حسنة؛ حسن لابتداء الأمور.',
  },
  '1112': {
    name: 'العتبة الخارجة',
    latin: 'Cauda Draconis',
    planet: 'الذنب',
    nature: 'نحس',
    sign: 'القوس',
    element: 'ماء',
    meaning: 'خروج ونهاية؛ حسن لما يُراد الخلاص منه، سيئ للبدايات.',
  },
};

/**
 * By the head and foot rows (ص٣٣): odd and odd منقلب, even and even ثابت,
 * even head and odd foot داخل, odd head and even foot خارج.
 */
export function figureKind(f: Figure): 'منقلب' | 'ثابت' | 'داخل' | 'خارج' {
  if (f[0] === 1) {
    return f[3] === 1 ? 'منقلب' : 'خارج';
  }
  return f[3] === 2 ? 'ثابت' : 'داخل';
}

/** The sixteen houses, as the book names them (ص٢٧). */
export const RAML_HOUSES = [
  'الحياة',
  'الكسب',
  'الإخاء',
  'الوالد',
  'البنون',
  'السقم',
  'الفراش',
  'القبر',
  'الرحيل',
  'العز',
  'الرجاء',
  'الضد',
  'السائل',
  'المسؤول',
  'الميزان',
  'العاقبة',
];

export function figureInfo(f: Figure): FigureInfo {
  return FIGURES[key(f)];
}

/** A line of points: an odd count gives one point, an even count two. */
export const fromCount = (n: number): Row => (n % 2 === 1 ? 1 : 2);

export function add(a: Figure, b: Figure): Figure {
  return a.map((r, i) => (r === b[i] ? 2 : 1)) as Figure;
}

export interface Shield {
  mothers: Figure[];
  daughters: Figure[];
  nieces: Figure[];
  /** 13 = 9 + 10, the asker. */
  rightWitness: Figure;
  /** 14 = 11 + 12, the one asked about. */
  leftWitness: Figure;
  /** 15 = 13 + 14, the balance (الميزان). */
  judge: Figure;
  /** 16 = 15 + 1, the outcome (العاقبة). */
  outcome: Figure;
  /** All sixteen figures as the sixteen houses. */
  houses: Figure[];
}

/** The whole figure from sixteen counts of points (mother one first). */
export function castShield(counts: number[]): Shield {
  if (counts.length !== 16) {
    throw new Error('sixteen lines are needed');
  }
  const rows = counts.map(fromCount);
  const mothers: Figure[] = [0, 1, 2, 3].map(
    m => rows.slice(m * 4, m * 4 + 4) as Figure,
  );
  // Daughter k takes row k of each mother in turn.
  const daughters: Figure[] = [0, 1, 2, 3].map(
    k => mothers.map(m => m[k]) as Figure,
  );
  const nieces = [
    add(mothers[0], mothers[1]),
    add(mothers[2], mothers[3]),
    add(daughters[0], daughters[1]),
    add(daughters[2], daughters[3]),
  ];
  const rightWitness = add(nieces[0], nieces[1]);
  const leftWitness = add(nieces[2], nieces[3]);
  const judge = add(rightWitness, leftWitness);
  const outcome = add(judge, mothers[0]);
  return {
    mothers,
    daughters,
    nieces,
    rightWitness,
    leftWitness,
    judge,
    outcome,
    houses: [
      ...mothers,
      ...daughters,
      ...nieces,
      rightWitness,
      leftWitness,
      judge,
      outcome,
    ],
  };
}

export const points = (f: Figure) => f.reduce<number>((s, r) => s + r, 0);

export interface RamlAnswer {
  verdict: 'yes' | 'no' | 'doubt';
  headline: string;
  lines: string[];
}

const leaning = (n: Nature) =>
  n === 'سعد' || n === 'ممتزج سعيد'
    ? 1
    : n === 'نحس' || n === 'ممتزج نحس'
    ? -1
    : 0;

/** Is the figure somewhere among the sixteen houses? */
const inShield = (s: Shield, f: Figure) =>
  s.houses.some(h => key(h) === key(f));

/** Houses of the planet's figures where they are exalted and in fall (ص٦٥). */
const DIGNITY: Record<string, [number, number]> = {
  المشتري: [4, 12],
  الزهرة: [12, 4],
  الشمس: [1, 7],
  المريخ: [2, 8],
  زحل: [7, 1],
  عطارد: [6, 12],
  القمر: [2, 8],
  الرأس: [2, 8],
  الذنب: [2, 8],
};

/**
 * The judgment after the general rules of «الفلك المشحون» (ص٨٩–٩١):
 * - the cast is true when (3+5)+(11+15) is found in the shield;
 * - when the mothers are all fixed or all outgoing the intent was unsettled
 *   and the cast is left for another time;
 * - the end of the matter is (1+12)+(8+9): fortunate, unfortunate or mixed;
 * - the question is the asker's own when (1+7)+(3+14) is in the shield;
 * then the figure in the house of the matter, its nature and dignity there.
 */
export function judgeShield(s: Shield, house: number): RamlAnswer {
  const h = (n: number) => s.houses[n - 1];
  const lines: string[] = [];

  const kinds = s.mothers.map(figureKind);
  if (kinds.every(k => k === 'ثابت') || kinds.every(k => k === 'خارج')) {
    return {
      verdict: 'doubt',
      headline: 'النية مضطربة: اترك الضرب إلى وقت آخر.',
      lines: [
        `الأمهات الأربع كلها ${
          kinds[0] === 'ثابت' ? 'ثوابت' : 'خوارج'
        }، وهذا عند أهل الرمل علامة اضطراب نية السائل، فيُترك الرمل إلى وقت آخر، وقيل إلى ثمانية أيام.`,
      ],
    };
  }

  const truth = add(add(h(3), h(5)), add(h(11), h(15)));
  const isTrue = inShield(s, truth);
  lines.push(
    isTrue
      ? `الرمل صادق: الشكل الخارج من الثالث والخامس مع الحادي عشر والخامس عشر هو «${
          figureInfo(truth).name
        }»، وهو موجود في التخت.`
      : `الرمل ضعيف الصدق: الشكل الخارج من الثالث والخامس مع الحادي عشر والخامس عشر هو «${
          figureInfo(truth).name
        }»، وليس في التخت.`,
  );

  const end = add(add(h(1), h(12)), add(h(8), h(9)));
  const E = figureInfo(end);
  lines.push(
    `عاقبة الحاجة (الأول والثاني عشر مع الثامن والتاسع): «${E.name}»، وهو ${E.nature}.`,
  );

  const own = add(add(h(1), h(7)), add(h(3), h(14)));
  lines.push(
    inShield(s, own)
      ? 'السؤال يخص السائل نفسه.'
      : 'السؤال يخص غير السائل، أو أن السائل يسأل عن أمر غيره.',
  );

  let score = leaning(E.nature) * 2;

  if (house !== 1) {
    const T = figureInfo(h(house));
    lines.push(
      `في بيت ${RAML_HOUSES[house - 1]} (البيت ${house}) «${T.name}»، وهو ${
        T.nature
      }: ${T.meaning}`,
    );
    score += leaning(T.nature);
    const d = DIGNITY[T.planet];
    if (d && d[0] === house) {
      lines.push(`و«${T.name}» من أشكال ${T.planet}، وهو هنا في شرفه، فيقوى.`);
      score += 1;
    } else if (d && d[1] === house) {
      lines.push(`و«${T.name}» من أشكال ${T.planet}، وهو هنا في هبوطه، فيضعف.`);
      score -= 1;
    }
    if (key(h(house)) === key(h(1))) {
      lines.push('شكل الطالع نفسه في بيت المسألة: الأمر يأتي إلى السائل.');
      score += 1;
    }
  }

  const O = figureInfo(s.outcome);
  lines.push(`السادس عشر، بيت العاقبة الكبرى: «${O.name}» (${O.nature}).`);
  score += leaning(O.nature);

  let verdict: RamlAnswer['verdict'] =
    score >= 2 ? 'yes' : score <= -2 ? 'no' : 'doubt';
  if (!isTrue && verdict !== 'doubt') {
    verdict = 'doubt';
  }
  return {
    verdict,
    headline: !isTrue
      ? 'الرمل ضعيف الصدق في هذا الضرب؛ لا يُبنى عليه حكم، فأعد الضرب في وقت آخر.'
      : verdict === 'yes'
      ? 'الاستخارة تدل على الخير والإقدام.'
      : verdict === 'no'
      ? 'الاستخارة تدل على الترك وعدم الإقدام.'
      : 'الاستخارة متوقفة؛ لا ترجيح واضح، فالتأني أولى.',
    lines,
  };
}

/** Sixteen random line counts, as many points as a hand would strike. */
export function randomCounts(rand: () => number = Math.random): number[] {
  return Array.from({ length: 16 }, () => 4 + Math.floor(rand() * 13));
}
