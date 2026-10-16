// The answer to a horary question in plain words: one verdict, then a short
// connected account that keeps to the question asked, the time, and the
// astrological evidence kept apart for whoever wants it. Each kind of
// question has its own logic (in illness, for one, the querent joining the
// sickness is no "yes"). After the Arabic books and Lilly. AGPL-3.0-or-later.

import { HoraryJudgment, Join, PlanetState } from './horary';
import { Planet } from './traditional';

export type MatterKind = 'lost' | 'theft' | 'sick' | 'return' | 'pregnancy';

export interface HoraryAnswer {
  verdict: 'yes' | 'no' | 'doubt';
  headline: string;
  paragraphs: string[];
  when: string | null;
  /** Where a lost thing or an absent person is. */
  place: string | null;
  /** What the person asked about is like. */
  person: string | null;
  caution: string | null;
  /** The technical evidence, planet by planet. */
  evidence: string[];
}

export interface AnswerNames {
  planet: (p: Planet) => string;
  date: (jd: number) => string;
}

const SIGNS = [
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
const norm = (x: number) => ((x % 360) + 360) % 360;
const signOf = (lon: number) => Math.floor(norm(lon) / 30);

/** What the matter of each house is called in the answer. */
export const HOUSE_NOUN = [
  'أمرك',
  'المال',
  'الأمر مع القريب',
  'أمر البيت',
  'الأمر',
  'الأمر',
  'الأمر مع الطرف الآخر',
  'هذا المال',
  'السفر أو الدراسة',
  'العمل أو المنصب',
  'الأمنية',
  'الأمر الخفي',
];

const SIGN_PLACE = [
  'في موضع مرتفع أو قرب السقف، أو قرب مصدر حرارة',
  'في موضع منخفض قريب من الأرض، تحت شيء أو في مكان مظلم',
  'في خزانة أو صندوق، أو بين الكتب والأوراق',
  'قرب الماء: المطبخ أو الحمّام أو المغسلة',
  'قرب مصدر حرارة أو ضوء',
  'في جرّارة أو خزانة أو على رف، أو بين الأوراق',
  'في غرفة النوم أو غرفة علوية، قرب صندوق أو مرآة',
  'في موضع رطب كالحمّام أو المطبخ',
  'في موضع مرتفع أو غرفة علوية',
  'في موضع منخفض مظلم قرب الأرض أو العتبة، أو في زاوية',
  'في موضع مرتفع أو قرب النافذة',
  'قرب الماء أو في موضع رطب، أو مختلطاً بأشياء أخرى',
];
const DIRECTION = ['الشرقية', 'الجنوبية', 'الغربية', 'الشمالية'];

const PERSON: Record<Planet, string> = {
  saturn: 'جادّ كتوم، يبدو أكبر من عمره، نحيل، كثير الهمّ',
  jupiter: 'بشوش كريم، ممتلئ الجسم، صاحب علم أو مكانة',
  mars: 'قوي جريء، سريع الغضب، في وجهه حمرة أو أثر جرح',
  sun: 'واثق مهيب، كريم، فيه شيء من الاعتداد بالنفس',
  venus: 'لطيف حسن المظهر، يحب الزينة والناس',
  mercury: 'ذكي سريع الكلام والحركة، نحيل، شابّ الملامح',
  moon: 'مستدير الوجه، متقلب المزاج، كثير التنقل',
};
const TEMPER = ['حادّ الطبع', 'صبور عملي', 'اجتماعي كثير الكلام', 'عاطفي حساس'];

const BENEFIC: Planet[] = ['jupiter', 'venus'];
const MALEFIC: Planet[] = ['saturn', 'mars'];

const strong = (s: PlanetState) =>
  s.dignities.includes('domicile') || s.dignities.includes('exaltation');
const weak = (s: PlanetState) =>
  s.dignities.includes('detriment') ||
  s.dignities.includes('fall') ||
  s.sun === 'combust';
const power = (s: PlanetState) =>
  (strong(s) ? 2 : 0) -
  (weak(s) ? 2 : 0) -
  (s.retrograde ? 1 : 0) +
  (s.angularity === 'angular' ? 1 : s.angularity === 'cadent' ? -1 : 0);

const EASE: Record<Join['kind'], string> = {
  conjunction: 'ويتم مباشرة وبقوة',
  trine: 'ويتم بسهولة ودون عناء',
  sextile: 'ويتم بيسر مع شيء من السعي',
  square: 'لكن بعد تعب وعقبات',
  opposition: 'لكن مع خلاف أو ندم بعده',
};

export function horaryAnswer(
  j: HoraryJudgment,
  kind: MatterKind | undefined,
  personMatter: boolean,
  n: AnswerNames,
): HoraryAnswer {
  const evidence = buildEvidence(j, n);
  const caution = j.considerations.length
    ? 'تنبيه: في الخريطة ما يدعو إلى الحذر في الحكم. ' +
      j.considerations.join(' ')
    : null;
  const base = { evidence, caution, place: null, person: null };
  switch (kind) {
    case 'sick':
      return { ...base, ...sick(j, n) };
    case 'lost':
    case 'theft':
      return { ...base, ...lost(j, n, kind) };
    case 'return':
      return { ...base, ...absent(j, n) };
    case 'pregnancy':
      return { ...base, ...pregnancy(j, n) };
    default:
      return {
        ...base,
        ...general(j, n),
        person: personMatter ? describePerson(j.quesited) : null,
      };
  }
}

// ---------- general questions -------------------------------------------------

function general(j: HoraryJudgment, n: AnswerNames) {
  const noun = HOUSE_NOUN[j.house - 1];
  const A = j.querent;
  const B = j.quesited;
  const p: string[] = [];
  let verdict: HoraryAnswer['verdict'] = j.outcome;
  let headline: string;

  if (j.perfection && !j.prohibition) {
    headline = `نعم، يتم ${noun}، ${EASE[j.perfection.kind]}.`;
  } else if (j.perfection && j.prohibition) {
    headline = `يقترب ${noun} من التمام، لكن يعترضه عائق قبل أن يكتمل.`;
    p.push(
      'هناك طرف أو ظرف يدخل على الأمر قبل اكتماله، فقد يقطعه أو يغيّر مساره عمّا تتوقع.',
    );
  } else if (j.translation) {
    headline = `يتم ${noun} بواسطة شخص يتوسط فيه.`;
    p.push('لا يتم الأمر مباشرة، بل يحتاج إلى وسيط ينقله بين الطرفين.');
  } else if (j.collection) {
    headline = `يتم ${noun} بتدخل طرف ثالث له شأن.`;
    p.push('يجتمع الطرفان عند شخص أو جهة أقوى منهما، وعلى يده يتم الأمر.');
  } else {
    headline = `لا تدل الخريطة على حصول ${noun} في هذه المرحلة.`;
    verdict = 'no';
  }

  p.push(
    weak(A)
      ? 'موقفك الآن ضعيف، وفيه ضغط أو قلة حيلة.'
      : strong(A)
      ? 'موقفك قوي، ولك قدرة على التأثير في الأمر.'
      : A.retrograde
      ? 'وفي موقفك تردد أو ميل إلى التراجع.'
      : 'موقفك متوسط، لا ضعف ظاهر ولا قوة كبيرة.',
  );
  if (A.house === j.house) {
    p.push('والأمر يشغلك كثيراً وأنت ساعٍ إليه.');
  }
  p.push(
    weak(B)
      ? 'والطرف الآخر أو الأمر نفسه يمر بظرف صعب.'
      : strong(B)
      ? 'والطرف الآخر أو الأمر نفسه في حال جيدة.'
      : B.retrograde
      ? 'والطرف الآخر متردد أو متأخر أو يعود عن موقفه.'
      : 'والطرف الآخر في حال عادية.',
  );
  if (j.reception === 'mutual') {
    p.push('وبينكما رغبة متبادلة.');
  } else if (j.reception === 'matterReceives') {
    p.push('والطرف الآخر يرحّب بك ويريدك.');
  } else if (j.reception === 'querentReceives') {
    p.push('ورغبتك في الأمر أكبر من رغبة الطرف الآخر فيه.');
  }
  if (j.moonNext) {
    if (BENEFIC.includes(j.moonNext.b)) {
      p.push('والقادم في المسألة يميل إلى الخير.');
    } else if (MALEFIC.includes(j.moonNext.b)) {
      p.push('والقادم في المسألة فيه شيء من العسر.');
    }
  } else {
    p.push('ولا يُتوقع جديد في الأمر قريباً.');
    if (verdict === 'yes') {
      verdict = 'doubt';
    }
  }

  const when =
    j.perfection && !j.prohibition
      ? `يتضح الأمر نحو ${n.date(j.perfection.jd)}.`
      : null;
  return { verdict, headline, paragraphs: p, when };
}

function describePerson(s: PlanetState): string {
  return `${PERSON[s.planet]}، ${TEMPER[signOf(s.lon) % 4]}.`;
}

// ---------- illness ---------------------------------------------------------------

function sick(j: HoraryJudgment, n: AnswerNames) {
  const ascLord = j.lords[0];
  const illLord = j.lords[5];
  const deathLord = j.lords[7];
  const A = j.states[ascLord];
  const I = j.states[illLord];
  const p: string[] = [];
  let score = 0;

  const bodyVsIllness = power(A) - power(I);
  if (bodyVsIllness >= 1) {
    p.push('البدن أقوى من المرض، وهذا أهم شواهد الشفاء.');
    score += 2;
  } else if (bodyVsIllness <= -1) {
    p.push('المرض أقوى من البدن في الوقت الحاضر، فيحتاج إلى عناية وصبر.');
    score -= 2;
  } else {
    p.push('البدن والمرض متقاربان في القوة.');
  }
  if (ascLord !== illLord && j.joinOf(ascLord, illLord)) {
    p.push('والمرض ملازم بعض الوقت قبل أن ينصرف.');
    score -= 1;
  }
  if (deathLord !== ascLord) {
    const grave = j.joinOf(ascLord, deathLord) ?? j.joinOf('moon', deathLord);
    if (grave && (MALEFIC.includes(deathLord) || weak(j.states[deathLord]))) {
      p.push('وفي الخريطة ما يدل على شدة في المرض، فلا يُهمل.');
      score -= 2;
    }
  }
  let when: string | null = null;
  if (j.moonNext && BENEFIC.includes(j.moonNext.b)) {
    p.push('والقادم يميل إلى التحسن.');
    when = `يبدأ التحسن نحو ${n.date(j.moonNext.jd)}.`;
    score += 1;
  } else if (j.moonNext && MALEFIC.includes(j.moonNext.b)) {
    p.push('وقد يشتد المرض قليلاً قبل أن يخف.');
    score -= 1;
  }
  const verdict: HoraryAnswer['verdict'] =
    score >= 1 ? 'yes' : score <= -2 ? 'no' : 'doubt';
  const headline =
    verdict === 'yes'
      ? 'يُرجى الشفاء.'
      : verdict === 'no'
      ? 'المرض شديد ويحتاج إلى عناية طبية جادة.'
      : 'الشفاء ممكن لكنه يحتاج وقتاً وعناية.';
  p.push('وهذا كله لا يغني عن مراجعة الطبيب.');
  return { verdict, headline, paragraphs: p, when };
}

// ---------- lost and stolen things --------------------------------------------------

function lost(j: HoraryJudgment, n: AnswerNames, kind: 'lost' | 'theft') {
  const S = j.states;
  const ascLord = j.lords[0];
  const lord2 = j.lords[1];
  const lord7 = j.lords[6];
  const T = S[lord2];
  const p: string[] = [];

  let taken = 0;
  if (T.house === 7) {
    taken++;
  }
  if (S[lord7].house === 2) {
    taken++;
  }
  if (lord7 !== lord2 && j.joinOf(lord7, lord2)) {
    taken++;
  }
  let mislaid = 0;
  if ([1, 2, 4].includes(T.house)) {
    mislaid++;
  }
  if ([1, 2, 4].includes(j.moon.house)) {
    mislaid++;
  }
  if (S.mercury.retrograde) {
    mislaid++;
  }
  const stolen = kind === 'theft' ? taken >= mislaid : taken > mislaid;

  const near =
    T.angularity === 'angular' || j.moon.angularity === 'angular'
      ? 'inside'
      : T.angularity === 'succedent'
      ? 'near'
      : 'far';

  const finds: Join[] = [];
  for (const [a, b] of [
    ['moon', ascLord],
    ['moon', lord2],
    [lord2, ascLord],
    ['moon', 'sun'],
  ] as [Planet, Planet][]) {
    const jn = j.joinOf(a, b);
    if (jn) {
      finds.push(jn);
    }
  }
  let foundScore = finds.length;
  if (BENEFIC.some(b => S[b].house === 2)) {
    foundScore++;
  }
  if ([1, 2, 4].includes(j.fortune.house)) {
    foundScore++;
  }
  if (T.sun === 'combust') {
    foundScore -= 2;
  }
  if ([8, 12].includes(T.house)) {
    foundScore -= 1;
  }

  const verdict: HoraryAnswer['verdict'] =
    foundScore >= 2 ? 'yes' : foundScore <= 0 ? 'no' : 'doubt';
  const found =
    verdict === 'yes'
      ? 'وسيُعثر عليه'
      : verdict === 'no'
      ? 'ويصعب العثور عليه'
      : 'والعثور عليه ممكن مع البحث';
  const headline = stolen
    ? `الأرجح أنه أُخذ ولم يضع، ${found}.`
    : near === 'inside'
    ? `لم يُسرق، وهو داخل البيت، ${found}.`
    : `لم يُسرق على الأرجح، ${found}.`;

  if (!stolen) {
    p.push(
      S.mercury.retrograde
        ? 'الأقرب أنه وُضع في مكان ثم نُسي موضعه.'
        : 'لا دلالة على سرقة؛ الأقرب أنه وُضع في غير موضعه المعتاد.',
    );
  } else {
    const t = S[lord7];
    p.push(
      [1, 2, 4].includes(t.house)
        ? 'والآخذ قريب: من أهل البيت أو ممن يدخلونه.'
        : t.house === 3
        ? 'والآخذ من الأقارب أو الجيران.'
        : 'والآخذ من خارج البيت.',
    );
    p.push(`وصفته: ${describePerson(t)}`);
  }
  p.push(
    near === 'inside'
      ? 'وهو قريب جداً، في المكان نفسه أو حوله.'
      : near === 'near'
      ? 'وهو غير بعيد عن البيت.'
      : 'وقد يكون بعيداً عن البيت أو انتقل من مكانه.',
  );

  const s1 = signOf(T.lon);
  const s2 = signOf(j.moon.lon);
  const place =
    s1 === s2
      ? `${SIGN_PLACE[s1]}، في الجهة ${DIRECTION[s1 % 4]} من البيت.`
      : `${SIGN_PLACE[s1]}؛ أو ${SIGN_PLACE[s2]}. والأرجح في الجهة ${
          DIRECTION[s1 % 4]
        } من البيت.`;

  const first = finds.sort((x, y) => x.jd - y.jd)[0];
  const when =
    verdict !== 'no' && first
      ? `يُرجى العثور عليه نحو ${n.date(first.jd)}.`
      : null;
  return { verdict, headline, paragraphs: p, when, place };
}

// ---------- the absent ---------------------------------------------------------------

function absent(j: HoraryJudgment, n: AnswerNames) {
  const B = j.quesited;
  const ascLord = j.lords[0];
  const p: string[] = [];
  let score = 0;
  const toAsc = B.planet !== ascLord ? j.joinOf(B.planet, ascLord) : null;
  if (toAsc) {
    p.push('الغائب متجه إليك.');
    score += 2;
  }
  if (B.retrograde) {
    p.push('وهو راجع عن طريقه، وهذا من أقوى شواهد العودة.');
    score += 2;
  }
  if ([1, 4].includes(B.house)) {
    p.push('وهو قريب، كأنه في طريقه إلى البيت.');
    score += 1;
  }
  if ([3, 9].includes(B.house) && !B.retrograde) {
    p.push('وما زال منشغلاً بسفره أو بأمر بعيد.');
    score -= 1;
  }
  if (B.sun === 'combust') {
    p.push('وهو في ضيق أو مقيّد عن الحركة.');
    score -= 1;
  }
  if (B.sun !== 'combust') {
    p.push(
      weak(B)
        ? 'وحاله ليست على ما يرام.'
        : strong(B)
        ? 'وحاله جيدة.'
        : 'وحاله عادية.',
    );
  }
  const verdict: HoraryAnswer['verdict'] =
    score >= 2 ? 'yes' : score <= 0 ? 'no' : 'doubt';
  const headline =
    verdict === 'yes'
      ? 'يعود الغائب.'
      : verdict === 'no'
      ? 'لا تدل الخريطة على عودته قريباً.'
      : 'عودته ممكنة لكنها غير مؤكدة.';
  const when = toAsc ? `تُرجى عودته نحو ${n.date(toAsc.jd)}.` : null;
  const place = `هو الآن في الجهة ${DIRECTION[signOf(B.lon) % 4]}.`;
  return { verdict, headline, paragraphs: p, when, place };
}

// ---------- pregnancy ------------------------------------------------------------------

function pregnancy(j: HoraryJudgment, n: AnswerNames) {
  const S = j.states;
  const ascLord = j.lords[0];
  const lord5 = j.lords[4];
  const FRUITFUL = [3, 7, 11];
  const BARREN = [2, 4, 5];
  let score = 0;
  for (const sg of [
    signOf(j.chart.houses!.asc),
    signOf(j.chart.houses!.cusps[4]),
    signOf(j.moon.lon),
  ]) {
    score += FRUITFUL.includes(sg) ? 1 : BARREN.includes(sg) ? -1 : 0;
  }
  if (BENEFIC.some(b => [1, 5].includes(S[b].house))) {
    score += 1;
  }
  const join = lord5 !== ascLord ? j.joinOf(lord5, ascLord) : null;
  if (join) {
    score += 2;
  }
  if (S[lord5].angularity === 'angular') {
    score += 1;
  }
  const verdict: HoraryAnswer['verdict'] =
    score >= 2 ? 'yes' : score <= -1 ? 'no' : 'doubt';
  const headline =
    verdict === 'yes'
      ? 'الشواهد مع الحمل.'
      : verdict === 'no'
      ? 'الشواهد لا تؤيد الحمل الآن.'
      : 'الأمر غير محسوم، والشواهد متقاربة.';
  const p = [
    score >= 2
      ? 'الطالع والبيت الخامس يشهدان بالخصب.'
      : score <= -1
      ? 'علامات الخصب في الخريطة ضعيفة.'
      : 'في الخريطة علامات خصب وعلامات ضدها.',
  ];
  const when = join ? `يتضح الأمر نحو ${n.date(join.jd)}.` : null;
  return { verdict, headline, paragraphs: p, when };
}

// ---------- the evidence, for whoever wants it ----------------------------------------

function buildEvidence(j: HoraryJudgment, n: AnswerNames): string[] {
  const N = n.planet;
  const where = (s: PlanetState) =>
    `${N(s.planet)} في ${SIGNS[signOf(s.lon)]}، البيت ${s.house}`;
  const out = [
    `دليل السائل: ${where(j.querent)}${
      j.sameLord ? ' (القمر، لأن صاحب الطالع هو صاحب المسألة)' : ''
    }.`,
    `دليل المسألة (صاحب البيت ${j.house}): ${where(j.quesited)}.`,
    `القمر: ${where(j.moon)}.`,
    ...j.testimonies.map(
      t => `${t.weight > 0 ? '✓' : t.weight < 0 ? '✗' : '•'} ${t.text}`,
    ),
  ];
  if (j.timing) {
    out.push(j.timing);
  }
  return out;
}
