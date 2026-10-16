// The spiritual sign (البرج الروحاني) by abjad: the values of the person's
// name and the mother's name are added, twelve is taken away as often as it
// goes, and the remainder counts the signs from Aries (0 = Pisces).
// Eastern (Mashriqi) abjad values. AGPL-3.0-or-later.

const VALUES: Record<string, number> = {
  ا: 1,
  أ: 1,
  إ: 1,
  آ: 1,
  ء: 1,
  ٱ: 1,
  ب: 2,
  ج: 3,
  د: 4,
  ه: 5,
  و: 6,
  ؤ: 6,
  ز: 7,
  ح: 8,
  ط: 9,
  ي: 10,
  ى: 10,
  ئ: 10,
  ك: 20,
  ل: 30,
  م: 40,
  ن: 50,
  س: 60,
  ع: 70,
  ف: 80,
  ص: 90,
  ق: 100,
  ر: 200,
  ش: 300,
  ت: 400,
  ث: 500,
  خ: 600,
  ذ: 700,
  ض: 800,
  ظ: 900,
  غ: 1000,
};

export interface AbjadOptions {
  /** Taa marbuta (ة) counted as haa (5) or as taa (400). */
  taaMarbuta: 5 | 400;
}

export interface AbjadLetter {
  letter: string;
  value: number;
}

/** Letter values of a name; diacritics, spaces and tatweel are ignored. */
export function abjadLetters(name: string, o: AbjadOptions): AbjadLetter[] {
  const out: AbjadLetter[] = [];
  for (const ch of name) {
    if (ch === 'ة') {
      out.push({ letter: ch, value: o.taaMarbuta });
    } else if (VALUES[ch] !== undefined) {
      out.push({ letter: ch, value: VALUES[ch] });
    }
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
    ch => ch !== 'ة' && VALUES[ch] === undefined && !ignorable.test(ch),
  );
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
