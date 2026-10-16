// Abjad (حساب الجُمَّل): letter values, the spiritual sign, and the nature
// (طبع) of a name from its letters. AGPL-3.0-or-later.
//
// Values: Eastern (Mashriqi) or Western (Maghribi) abjad.
// Spiritual sign: the values of the name and the mother's name are added,
// twelve is taken away as often as it goes, and the remainder counts the
// signs from Aries (0 = Pisces).
// Nature of a name: the letters in abjad order are dealt in fours to fire,
// earth, air and water, the first four with strength 7, the next four 6, and
// so on down to 1 (أ ب ج د = 7, ه و ز ح = 6, ... ذ ض ظ غ = 1). The strengths
// of the name's letters are summed per element; the highest sum is the
// name's nature (equal highest sums: a mixed nature).

export type AbjadSystem = 'mashriqi' | 'maghribi';
export type Element = 'fire' | 'earth' | 'air' | 'water';
export const ELEMENTS: Element[] = ['fire', 'earth', 'air', 'water'];
export const ELEMENT_NAMES: Record<Element, string> = {
  fire: 'ناري',
  earth: 'ترابي',
  air: 'هوائي',
  water: 'مائي',
};

// The 28 letters in abjad order for each system, with their values.
const ORDER: Record<AbjadSystem, string> = {
  mashriqi: 'ابجدهوزحطيكلمنسعفصقرشتثخذضظغ',
  maghribi: 'ابجدهوزحطيكلمنصعفضقرستثخذظغش',
};
const VALUES = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300,
  400, 500, 600, 700, 800, 900, 1000,
];

// Letter forms reduced to their base letter.
const BASE: Record<string, string> = {
  أ: 'ا',
  إ: 'ا',
  آ: 'ا',
  ء: 'ا',
  ٱ: 'ا',
  ى: 'ي',
  ئ: 'ي',
  ؤ: 'و',
};

export interface AbjadOptions {
  system: AbjadSystem;
  /** Taa marbuta (ة) counted as haa (5) or as taa (400). */
  taaMarbuta: 5 | 400;
}

export interface AbjadLetter {
  letter: string; // as written
  value: number;
  element: Element;
  strength: number; // 7..1
}

function base(ch: string, o: AbjadOptions): string | null {
  if (ch === 'ة') {
    return o.taaMarbuta === 5 ? 'ه' : 'ت';
  }
  const b = BASE[ch] ?? ch;
  return ORDER[o.system].includes(b) ? b : null;
}

/** Letters of a name with value, element and strength; marks ignored. */
export function abjadLetters(name: string, o: AbjadOptions): AbjadLetter[] {
  const out: AbjadLetter[] = [];
  for (const ch of name) {
    const b = base(ch, o);
    if (b === null) {
      continue;
    }
    const i = ORDER[o.system].indexOf(b);
    out.push({
      letter: ch,
      value: VALUES[i],
      element: ELEMENTS[i % 4],
      strength: 7 - Math.floor(i / 4),
    });
  }
  return out;
}

export function abjadValue(name: string, o: AbjadOptions): number {
  return abjadLetters(name, o).reduce((s, l) => s + l.value, 0);
}

/** Letters that are neither Arabic letters nor ignorable marks. */
export function unknownLetters(name: string): string[] {
  const ignorable = /[\sً-ْٰـ]/;
  return [...name].filter(
    ch =>
      !ignorable.test(ch) &&
      base(ch, { system: 'mashriqi', taaMarbuta: 5 }) === null,
  );
}

export interface NameNature {
  totals: Record<Element, number>;
  /** The winning element(s); more than one when the highest sums are equal. */
  winners: Element[];
  letters: AbjadLetter[];
}

export function nameNature(name: string, o: AbjadOptions): NameNature {
  const letters = abjadLetters(name, o);
  const totals: Record<Element, number> = {
    fire: 0,
    earth: 0,
    air: 0,
    water: 0,
  };
  for (const l of letters) {
    totals[l.element] += l.strength;
  }
  const max = Math.max(...ELEMENTS.map(e => totals[e]));
  const winners = max > 0 ? ELEMENTS.filter(e => totals[e] === max) : [];
  return { totals, winners, letters };
}

export function natureLabel(n: NameNature): string {
  if (n.winners.length === 0) {
    return '—';
  }
  return n.winners.length === 1
    ? ELEMENT_NAMES[n.winners[0]]
    : `ممتزج (${n.winners.map(w => ELEMENT_NAMES[w]).join(' و')})`;
}

export interface SpiritualSign {
  nameValue: number;
  motherValue: number;
  total: number;
  remainder: number; // 0..11
  sign: number; // 0 = Aries .. 11 = Pisces
}

export function spiritualSign(
  name: string,
  mother: string,
  o: AbjadOptions,
): SpiritualSign {
  const nameValue = abjadValue(name, o);
  const motherValue = abjadValue(mother, o);
  const total = nameValue + motherValue;
  const remainder = total % 12;
  return {
    nameValue,
    motherValue,
    total,
    remainder,
    sign: (remainder + 11) % 12,
  };
}

/** The cosmic number: digits added repeatedly down to one digit (118 → 10 → 1). */
export function cosmicNumber(n: number): number {
  while (n > 9) {
    n = [...String(n)].reduce((s, d) => s + Number(d), 0);
  }
  return n;
}

// ---------- compatibility of two natures ------------------------------------------

export type Relation = 'agree' | 'moderate' | 'oppose';
export const RELATION_NAMES: Record<Relation, string> = {
  agree: 'متوافقان',
  moderate: 'معتدلان',
  oppose: 'متنافران',
};

/**
 * Fire and air (both hot) agree, as do earth and water (both cold), and any
 * element with itself; fire and water, and air and earth, are opposite in
 * both qualities; the rest share one quality and are moderate.
 */
export function elementRelation(a: Element, b: Element): Relation {
  if (a === b) {
    return 'agree';
  }
  const pair = [a, b].sort().join('-');
  if (pair === 'air-fire' || pair === 'earth-water') {
    return 'agree';
  }
  if (pair === 'fire-water' || pair === 'air-earth') {
    return 'oppose';
  }
  return 'moderate';
}

/** For mixed natures, the best relation among their elements. */
export function natureRelation(a: Element[], b: Element[]): Relation | null {
  if (a.length === 0 || b.length === 0) {
    return null;
  }
  const rank: Relation[] = ['agree', 'moderate', 'oppose'];
  let best = 2;
  for (const x of a) {
    for (const y of b) {
      best = Math.min(best, rank.indexOf(elementRelation(x, y)));
    }
  }
  return rank[best];
}
