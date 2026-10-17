// The answer to a horary question in plain words: one verdict, then a short
// connected account that keeps to the question asked, the time, and the
// astrological evidence kept apart for whoever wants it. Each kind of
// question has its own logic (in illness, for one, the querent joining the
// sickness is no "yes"). After the Arabic books and Lilly. AGPL-3.0-or-later.

import { HoraryJudgment, Join, PlanetState } from './horary';
import { Planet } from './traditional';

export type MatterKind =
  | 'lost'
  | 'theft'
  | 'sick'
  | 'return'
  | 'pregnancy'
  | 'contest'
  | 'marriage'
  | 'jobGet'
  | 'jobStay'
  | 'sale'
  | 'travel';

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
    case 'contest':
      return { ...base, ...contest(j, n) };
    case 'marriage':
      return {
        ...base,
        ...marriage(j, n),
        person: describePerson(j.quesited),
      };
    case 'jobGet':
      return { ...base, ...general(j, n, 'الأمر الوظيفي', false) };
    case 'jobStay':
      return { ...base, ...jobStay(j, n) };
    case 'sale':
      return { ...base, ...sale(j, n) };
    case 'travel':
      return { ...base, ...travel(j, n) };
    default:
      return {
        ...base,
        ...general(j, n),
        person: personMatter ? describePerson(j.quesited) : null,
      };
  }
}

// ---------- general questions -------------------------------------------------

function general(
  j: HoraryJudgment,
  n: AnswerNames,
  nounOverride?: string,
  otherParty = true,
) {
  const self = j.subject === 1;
  const noun =
    nounOverride ?? (self ? HOUSE_NOUN[j.house - 1] : 'الأمر المسؤول عنه');
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
      ? self
        ? 'موقفك الآن ضعيف، وفيه ضغط أو قلة حيلة.'
        : 'حال من تسأل عنه ضعيف الآن، وفيه ضغط أو قلة حيلة.'
      : strong(A)
      ? self
        ? 'موقفك قوي، ولك قدرة على التأثير في الأمر.'
        : 'حال من تسأل عنه قوي، وله قدرة على أمره.'
      : A.retrograde
      ? self
        ? 'وفي موقفك تردد أو ميل إلى التراجع.'
        : 'وفيه تردد أو ميل إلى التراجع.'
      : self
      ? 'موقفك متوسط، لا ضعف ظاهر ولا قوة كبيرة.'
      : 'حال من تسأل عنه متوسط.',
  );
  if (A.house === j.house) {
    p.push(
      self
        ? 'والأمر يشغلك كثيراً وأنت ساعٍ إليه.'
        : 'والأمر يشغله كثيراً وهو ساعٍ إليه.',
    );
  }
  p.push(
    !otherParty
      ? weak(B)
        ? 'والأمر نفسه يمر بظرف صعب.'
        : strong(B)
        ? 'والأمر نفسه في حال جيدة.'
        : B.retrograde
        ? 'والأمر متأخر أو متعثر.'
        : 'والأمر نفسه في حال عادية.'
      : weak(B)
      ? 'والطرف الآخر أو الأمر نفسه يمر بظرف صعب.'
      : strong(B)
      ? 'والطرف الآخر أو الأمر نفسه في حال جيدة.'
      : B.retrograde
      ? 'والطرف الآخر متردد أو متأخر أو يعود عن موقفه.'
      : 'والطرف الآخر في حال عادية.',
  );
  if (j.reception === 'mutual') {
    p.push('وبين الطرفين رغبة متبادلة.');
  } else if (j.reception === 'matterReceives') {
    p.push(
      self ? 'والطرف الآخر يرحّب بك ويريدك.' : 'والطرف الآخر يرحّب به ويريده.',
    );
  } else if (j.reception === 'querentReceives') {
    p.push(
      self
        ? 'ورغبتك في الأمر أكبر من رغبة الطرف الآخر فيه.'
        : 'ورغبته في الأمر أكبر من رغبة الطرف الآخر فيه.',
    );
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
  const ascLord = j.relLords[0];
  const illLord = j.relLords[5];
  const deathLord = j.relLords[7];
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
  const ascLord = j.relLords[0];
  const lord2 = j.relLords[1];
  const lord7 = j.relLords[6];
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
  const ascLord = j.relLords[0];
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
  const ascLord = j.relLords[0];
  const lord5 = j.relLords[4];
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

// ---------- contests and lawsuits -------------------------------------------------

const houseFrom = (j: HoraryJudgment, h: number) =>
  ((j.subject - 1 + h - 1) % 12) + 1;
const planetsIn = (j: HoraryJudgment, house: number) =>
  (Object.values(j.states) as PlanetState[]).filter(s => s.house === house);

function contest(j: HoraryJudgment, n: AnswerNames) {
  const A = j.querent;
  const B = j.quesited; // lord of the seventh: the opponent
  const h1 = houseFrom(j, 1);
  const h7 = houseFrom(j, 7);
  const judgeLord = j.relLords[9];
  const p: string[] = [];
  let score = power(A) - power(B);
  p.push(
    score > 0
      ? 'جانبك أقوى من جانب الخصم.'
      : score < 0
      ? 'جانب الخصم أقوى في الوقت الحاضر.'
      : 'الطرفان متقاربان في القوة.',
  );
  const side = (h: number) =>
    planetsIn(j, h).reduce(
      (acc, s) =>
        acc +
        (BENEFIC.includes(s.planet) ? 1 : MALEFIC.includes(s.planet) ? -1 : 0),
      0,
    );
  const help = side(h1) - side(h7);
  if (help > 0) {
    p.push('ومعك عون وسند.');
  } else if (help < 0) {
    p.push('وللخصم عون أو لك عائق.');
  }
  score += help;
  if (B.house === h1) {
    p.push('والخصم يأتي إليك ويخضع لك.');
    score += 2;
  }
  if (A.house === h7) {
    p.push('وأنت تذهب إلى الخصم وتلين له.');
    score -= 2;
  }
  if (judgeLord !== A.planet && judgeLord !== B.planet) {
    const toA = j.joinOf(judgeLord, A.planet);
    const toB = j.joinOf(judgeLord, B.planet);
    if (toA && !toB) {
      p.push('والحاكم أو صاحب الأمر يميل إليك.');
      score += 1;
    } else if (toB && !toA) {
      p.push('والحاكم أو صاحب الأمر يميل إلى الخصم.');
      score -= 1;
    }
  }
  if (j.perfection && j.reception) {
    return {
      verdict: 'doubt' as const,
      headline: 'يميل الأمر إلى الصلح بين الطرفين.',
      paragraphs: p,
      when: `يُتوقع الصلح نحو ${n.date(j.perfection.jd)}.`,
    };
  }
  const verdict: HoraryAnswer['verdict'] =
    score >= 2 ? 'yes' : score <= -2 ? 'no' : 'doubt';
  return {
    verdict,
    headline:
      verdict === 'yes'
        ? 'الغلبة لك.'
        : verdict === 'no'
        ? 'الغلبة للخصم.'
        : 'الطرفان متكافئان، والأمر غير محسوم.',
    paragraphs: p,
    when: j.perfection ? `يُحسم الأمر نحو ${n.date(j.perfection.jd)}.` : null,
  };
}

// ---------- marriage -----------------------------------------------------------------

function marriage(j: HoraryJudgment, n: AnswerNames) {
  const g = general(j, n, 'الزواج');
  const p = [...g.paragraphs];
  const fixed = (s: PlanetState) => signOf(s.lon) % 3 === 1;
  if (j.perfection) {
    const soft = ['conjunction', 'trine', 'sextile'].includes(
      j.perfection.kind,
    );
    if (soft && fixed(j.querent) && fixed(j.quesited)) {
      p.push('والدلائل في بروج ثابتة: زواج يدوم.');
    } else if (!soft) {
      p.push('وفي الاتصال شدّة: يكون في الزواج خلاف يحتاج إلى صبر.');
    }
  }
  if (planetsIn(j, houseFrom(j, 7)).some(s => MALEFIC.includes(s.planet))) {
    p.push('وفي بيت الزواج ما يدل على خصام أو تعب.');
  }
  return { ...g, paragraphs: p };
}

// ---------- staying in work --------------------------------------------------------

function jobStay(j: HoraryJudgment, _n: AnswerNames) {
  const A = j.querent;
  const work = j.relLords[9];
  const p: string[] = [];
  let score = 0;
  if (A.house === houseFrom(j, 10)) {
    p.push('أنت متمكن في عملك.');
    score += 2;
  }
  if (A.planet !== work && j.joinOf(A.planet, work)) {
    p.push('وأنت متجه إلى عملك ومتعلق به.');
    score += 1;
  }
  const leaving = j.aspectsNow.some(
    x =>
      !x.applying &&
      ((x.a === A.planet && x.b === work) ||
        (x.b === A.planet && x.a === work)),
  );
  if (leaving) {
    p.push('وفي الخريطة انفصال عن العمل.');
    score -= 2;
  }
  const deg = norm(A.lon) % 30;
  if (deg > 28 && !A.retrograde) {
    p.push('ودليلك على وشك الخروج من برجه: تغيير قريب في وضعك.');
    score -= 1;
  }
  if (A.retrograde) {
    p.push('وفيك ميل إلى الرجوع عن هذا العمل.');
    score -= 1;
  }
  if (strong(j.states[work])) {
    p.push('والعمل نفسه في حال جيدة.');
  } else if (weak(j.states[work])) {
    p.push('والعمل نفسه يمر بظرف صعب.');
  }
  const verdict: HoraryAnswer['verdict'] =
    score >= 1 ? 'yes' : score <= -2 ? 'no' : 'doubt';
  return {
    verdict,
    headline:
      verdict === 'yes'
        ? 'تبقى في عملك.'
        : verdict === 'no'
        ? 'الأرجح أنك تترك هذا العمل.'
        : 'البقاء في العمل غير محسوم.',
    paragraphs: p,
    when: null,
  };
}

// ---------- buying and selling ------------------------------------------------------

function sale(j: HoraryJudgment, n: AnswerNames) {
  const seller = j.relLords[6];
  const buyer = j.relLords[0] === seller ? 'moon' : j.relLords[0];
  const item = j.quesited;
  const deal = buyer !== seller ? j.joinOf(buyer, seller) : null;
  const p: string[] = [];
  p.push(
    deal
      ? `يلتقي الطرفان ${EASE[deal.kind].replace(/^(و|لكن )/, '')}.`
      : 'لا يلتقي البائع والمشتري على اتفاق في هذه المرحلة.',
  );
  p.push(
    weak(item)
      ? 'وفي الشيء المبيع عيب أو نقص ينبغي فحصه.'
      : strong(item)
      ? 'والشيء المبيع جيد.'
      : 'والشيء المبيع عادي.',
  );
  if (j.house === houseFrom(j, 4)) {
    const price = j.states[j.relLords[9]];
    p.push(
      strong(price)
        ? 'والسعر مرتفع أو في حدّه الأعلى.'
        : weak(price)
        ? 'ويمكن الحصول عليه بسعر أقل.'
        : 'والسعر معتدل.',
    );
  }
  return {
    verdict: (deal ? 'yes' : 'no') as HoraryAnswer['verdict'],
    headline: deal ? 'تتم الصفقة.' : 'لا تتم الصفقة الآن.',
    paragraphs: p,
    when: deal ? `تتم نحو ${n.date(deal.jd)}.` : null,
  };
}

// ---------- travel -------------------------------------------------------------------

function travel(j: HoraryJudgment, n: AnswerNames) {
  const g = general(j, n, 'السفر', false);
  const p = [...g.paragraphs];
  const inTravel = planetsIn(j, j.house);
  let safety = 0;
  if (inTravel.some(s => BENEFIC.includes(s.planet))) {
    safety++;
  }
  if (inTravel.some(s => MALEFIC.includes(s.planet))) {
    safety--;
  }
  if (weak(j.quesited)) {
    safety--;
  } else if (strong(j.quesited)) {
    safety++;
  }
  if (j.moonNext && MALEFIC.includes(j.moonNext.b)) {
    safety--;
  }
  if (g.verdict !== 'no') {
    p.push(
      safety > 0
        ? 'والسفر سالم مريح، وفيه فائدة.'
        : safety < 0
        ? 'وفي الطريق تعب أو عائق، فيُحتاط له.'
        : 'والطريق عادي.',
    );
  }
  return { ...g, paragraphs: p };
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
