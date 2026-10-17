// Geomancy (علم الرمل): sixteen lines of points give four mothers; the
// daughters, nieces, two witnesses and the judge follow by fixed rules, and
// the first twelve figures fill the twelve houses. AGPL-3.0-or-later.
//
// A figure is four rows from the head down, each 1 (a single point, odd) or
// 2 (two points, even). Adding two figures row by row: equal rows give 2,
// unequal give 1.

export type Row = 1 | 2;
export type Figure = [Row, Row, Row, Row];

export interface FigureInfo {
  name: string;
  /** Latin name in the European books, for whoever wants to compare. */
  latin: string;
  planet: string;
  nature: 'سعد' | 'نحس' | 'ممتزج';
  meaning: string;
}

const key = (f: Figure) => f.join('');

/** The sixteen figures, by their rows from the head down. */
export const FIGURES: Record<string, FigureInfo> = {
  '1111': {
    name: 'الطريق',
    latin: 'Via',
    planet: 'القمر',
    nature: 'ممتزج',
    meaning:
      'حركة وسفر وتغيّر؛ حسن لما يُراد له المضي، ضعيف لما يُراد له الثبات.',
  },
  '2222': {
    name: 'الجماعة',
    latin: 'Populus',
    planet: 'القمر',
    nature: 'ممتزج',
    meaning:
      'جمع من الناس وكثرة؛ يتبع ما يجاوره، فهو مع السعد سعد ومع النحس نحس.',
  },
  '2112': {
    name: 'الاجتماع',
    latin: 'Conjunctio',
    planet: 'عطارد',
    nature: 'ممتزج',
    meaning: 'لقاء واتفاق وجمع شمل؛ حسن للصلح والشراكة واسترداد المفقود.',
  },
  '1221': {
    name: 'العقلة',
    latin: 'Carcer',
    planet: 'زحل',
    nature: 'نحس',
    meaning: 'حبس وتقييد وتأخير؛ حسن لما يُراد له الثبات فقط.',
  },
  '2211': {
    name: 'النصرة الداخلة',
    latin: 'Fortuna Major',
    planet: 'الشمس',
    nature: 'سعد',
    meaning: 'نصر عظيم وظفر ثابت ورفعة؛ من أسعد الأشكال.',
  },
  '1122': {
    name: 'النصرة الخارجة',
    latin: 'Fortuna Minor',
    planet: 'الشمس',
    nature: 'سعد',
    meaning: 'نصر وعون لكنه سريع الزوال؛ حسن لما يُراد له السرعة.',
  },
  '2121': {
    name: 'القبض الداخل',
    latin: 'Acquisitio',
    planet: 'المشتري',
    nature: 'سعد',
    meaning: 'كسب وربح وحصول على المطلوب.',
  },
  '1212': {
    name: 'القبض الخارج',
    latin: 'Amissio',
    planet: 'الزهرة',
    nature: 'نحس',
    meaning: 'خسارة وذهاب ما في اليد؛ حسن لما يُراد زواله كالمرض والهم.',
  },
  '1222': {
    name: 'اللحيان',
    latin: 'Laetitia',
    planet: 'المشتري',
    nature: 'سعد',
    meaning: 'فرح وسرور وصحة وبشارة.',
  },
  '2221': {
    name: 'الأنكيس',
    latin: 'Tristitia',
    planet: 'زحل',
    nature: 'نحس',
    meaning: 'حزن وهمّ وانخفاض؛ حسن للبناء والأمور الثابتة فقط.',
  },
  '1121': {
    name: 'الكوسج',
    latin: 'Puer',
    planet: 'المريخ',
    nature: 'ممتزج',
    meaning: 'اندفاع وقتال وتسرع؛ حسن للخصومة والمنافسة، ضعيف للصلح.',
  },
  '1211': {
    name: 'نقي الخد',
    latin: 'Puella',
    planet: 'الزهرة',
    nature: 'سعد',
    meaning: 'لطف وجمال ومحبة؛ حسن للزواج والصلح والأمور الهادئة.',
  },
  '2122': {
    name: 'الحمرة',
    latin: 'Rubeus',
    planet: 'المريخ',
    nature: 'نحس',
    meaning: 'غضب وشدة وفتنة؛ يُحذر فيه.',
  },
  '2212': {
    name: 'البياض',
    latin: 'Albus',
    planet: 'عطارد',
    nature: 'سعد',
    meaning: 'صفاء وسلام وحكمة؛ حسن للتجارة والعلم والصلح.',
  },
  '2111': {
    name: 'العتبة الداخلة',
    latin: 'Caput Draconis',
    planet: 'رأس الجوزهر',
    nature: 'سعد',
    meaning: 'دخول وبداية حسنة؛ حسن لابتداء الأمور.',
  },
  '1112': {
    name: 'العتبة الخارجة',
    latin: 'Cauda Draconis',
    planet: 'ذنب الجوزهر',
    nature: 'نحس',
    meaning: 'خروج ونهاية؛ حسن لما يُراد الخلاص منه، سيئ للبدايات.',
  },
};

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
  rightWitness: Figure;
  leftWitness: Figure;
  judge: Figure;
  /** The first twelve figures as the twelve houses. */
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
  return {
    mothers,
    daughters,
    nieces,
    rightWitness,
    leftWitness,
    judge,
    houses: [...mothers, ...daughters, ...nieces],
  };
}

export const points = (f: Figure) => f.reduce<number>((s, r) => s + r, 0);

export interface RamlAnswer {
  verdict: 'yes' | 'no' | 'doubt';
  headline: string;
  lines: string[];
}

const good = (f: Figure) => figureInfo(f).nature === 'سعد';
const bad = (f: Figure) => figureInfo(f).nature === 'نحس';

/**
 * The judgment: the judge first, then the witnesses (the right for the
 * querent and what has passed, the left for the matter and what comes),
 * then whether the figure of the first house passes to the house of the
 * matter (by occupation, or by conjunction in a neighbouring house).
 */
export function judgeShield(s: Shield, house: number): RamlAnswer {
  const J = figureInfo(s.judge);
  const R = figureInfo(s.rightWitness);
  const L = figureInfo(s.leftWitness);
  const lines: string[] = [];
  let score = good(s.judge) ? 2 : bad(s.judge) ? -2 : 0;
  lines.push(`الحاكم «${J.name}» (${J.nature}): ${J.meaning}`);
  lines.push(
    `الشاهد الأيمن «${R.name}» لجانب السائل وما مضى، والشاهد الأيسر «${L.name}» لجانب المسألة وما سيأتي.`,
  );
  const wit =
    (good(s.rightWitness) ? 1 : bad(s.rightWitness) ? -1 : 0) +
    (good(s.leftWitness) ? 1 : bad(s.leftWitness) ? -1 : 0);
  score += wit;
  if (good(s.leftWitness) && !good(s.rightWitness)) {
    lines.push('البداية عسيرة والعاقبة أحسن.');
  } else if (bad(s.leftWitness) && !bad(s.rightWitness)) {
    lines.push('البداية حسنة لكن العاقبة فيها عسر.');
  }
  const first = key(s.houses[0]);
  const target = s.houses[house - 1];
  if (house !== 1) {
    const neighbours = [house - 1, house + 1]
      .map(h => ((h - 1 + 12) % 12) + 1)
      .filter(h => h !== 1);
    if (key(target) === first) {
      lines.push(
        `شكل الطالع نفسه في بيت المسألة: الأمر يأتي إلى السائل مباشرة.`,
      );
      score += 2;
    } else if (neighbours.some(h => key(s.houses[h - 1]) === first)) {
      lines.push('شكل الطالع يجاور بيت المسألة: يتم الأمر بالسعي.');
      score += 1;
    } else {
      lines.push('شكل الطالع لا ينتقل إلى بيت المسألة.');
    }
    const T = figureInfo(target);
    lines.push(`في بيت المسألة «${T.name}» (${T.nature}): ${T.meaning}`);
    score += good(target) ? 1 : bad(target) ? -1 : 0;
  }
  const verdict: RamlAnswer['verdict'] =
    score >= 2 ? 'yes' : score <= -2 ? 'no' : 'doubt';
  return {
    verdict,
    headline:
      verdict === 'yes'
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
