// A full reading of a horary chart: beyond yes or no, what the chart says of
// the querent, the matter, the people around it, the place, the end and the
// time, each line with the rule it rests on. After the Arabic books and
// Lilly, who follows them. AGPL-3.0-or-later.

import { HoraryJudgment, NowAspect, PlanetState } from './horary';
import { Planet } from './traditional';

export type MatterKind = 'lost' | 'theft' | 'sick' | 'return' | 'pregnancy';

export interface ReadingSection {
  title: string;
  lines: string[];
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

/** A significator placed in a house: where the matter or person stands. */
const IN_HOUSE: string[] = [
  'عند السائل نفسه وقريب منه',
  'في المال وما يُملك',
  'عند الإخوة أو الجيران، أو في طريق قريب',
  'في البيت والأرض، أو مستور مخبوء',
  'في موضع فرح ولهو، أو عند الأولاد',
  'في مرض أو تعب أو خدمة',
  'عند الآخرين: شريك أو خصم أو طرف ثانٍ',
  'في خوف أو خسارة، أو في مال الغير',
  'في سفر بعيد، أو عند أهل العلم والدين',
  'في العلن، عند أصحاب السلطة أو في العمل',
  'عند الأصدقاء وفي موضع رجاء',
  'في خفاء أو حبس أو حزن',
];

/** Who a planet stands for, by the houses it rules. */
const PEOPLE: string[] = [
  'السائل نفسه',
  'المال أو من يعين بالمال',
  'أخ أو قريب أو جار',
  'الأب أو أهل البيت',
  'الأولاد أو الحبيب',
  'عامل أو مرؤوس، أو المرض',
  'الشريك أو الزوج أو الخصم',
  'أهل الشريك أو صاحب دين',
  'عالم أو رجل دين أو بعيد مسافر',
  'مدير أو صاحب سلطة، أو الأم',
  'صديق أو داعم',
  'عدو خفي',
];

/** Where a thing is, by the sign of its significator. */
const SIGN_PLACE: string[] = [
  'في موضع مرتفع أو قرب السقف، أو قرب مصدر حرارة',
  'في موضع منخفض قرب الأرض، مظلم، أو تحت شيء',
  'في خزانة أو صندوق أو داخل جدار، أو بين الكتب والأوراق',
  'قرب الماء: المطبخ أو الحمّام أو المغسلة',
  'قرب النار أو الموقد أو مصدر حرارة وضوء',
  'في جرّارة أو خزانة أو رف، أو بين الكتب والأوراق',
  'في غرفة علوية أو غرفة نوم، قرب صندوق أو مرآة',
  'في موضع رطب: الحمّام أو المطبخ أو قرب المجاري',
  'في غرفة علوية أو قرب النار، أو في موضع مرتفع',
  'في موضع منخفض مظلم قرب الأرض أو العتبة، أو في زاوية',
  'في موضع مرتفع أو قرب السقف أو النافذة',
  'قرب الماء أو في موضع رطب، أو مع أشياء مختلطة',
];

const DIRECTION = ['الشرق', 'الجنوب', 'الغرب', 'الشمال']; // fire, earth, air, water

const ELEMENT_TEMPER = [
  'حادّ المزاج متحمس',
  'صبور عملي',
  'اجتماعي كثير الكلام',
  'عاطفي حساس',
];

const PERSON: Record<Planet, string> = {
  saturn:
    'كبير السن أو يبدو أكبر من عمره، نحيل داكن البشرة، جادّ كتوم بطيء كثير الهم',
  jupiter: 'ممتلئ معتدل الطول، بشوش الوجه كريم، صاحب علم أو دين أو مكانة',
  mars: 'قوي البنية، في وجهه حمرة أو أثر جرح، جريء سريع الغضب',
  sun: 'مهيب واثق كريم، فيه شيء من الكبر، صاحب منصب أو وجاهة',
  venus: 'حسن الوجه لطيف، يحب الزينة والفرح والناس',
  mercury: 'نحيل سريع الحركة والكلام، ذكي، شاب أو يبدو شاباً',
  moon: 'مستدير الوجه فاتح البشرة، متقلب المزاج كثير التنقل',
};

const BENEFIC: Planet[] = ['jupiter', 'venus'];
const MALEFIC: Planet[] = ['saturn', 'mars'];

const ANGULAR_DISTANCE = {
  angular: 'قريب جداً، في الموضع نفسه أو حوله',
  succedent: 'قريب، غير بعيد عن الموضع',
  cadent: 'بعيد نسبياً، أو متنقل',
};

export interface ReadingNames {
  planet: (p: Planet) => string;
  aspect: (k: NowAspect['kind']) => string;
}

export function horaryReading(
  j: HoraryJudgment,
  kind: MatterKind | undefined,
  personMatter: boolean,
  n: ReadingNames,
): ReadingSection[] {
  const N = n.planet;
  const S = j.states;
  const A = j.querent;
  const B = j.quesited;
  const out: ReadingSection[] = [];

  const ruled = (p: Planet) =>
    j.lords.map((l, i) => (l === p ? i : -1)).filter(i => i >= 0);
  const whoIs = (p: Planet) => {
    const hs = ruled(p);
    return hs.length
      ? hs.map(h => `${PEOPLE[h]} (صاحب البيت ${h + 1})`).join(' أو ')
      : 'عامل خارجي';
  };
  const condition = (s: PlanetState): string => {
    const d = s.dignities;
    const parts: string[] = [];
    if (d.includes('domicile') || d.includes('exaltation')) {
      parts.push('قوي قادر على أمره');
    } else if (d.includes('detriment') || d.includes('fall')) {
      parts.push('ضعيف في حال سيئة');
    } else if (d.includes('peregrine')) {
      parts.push('بلا سند، متردد');
    } else {
      parts.push('متوسط الحال');
    }
    if (s.retrograde) {
      parts.push('راجع: يعود عن رأيه أو يتراجع');
    }
    if (s.sun === 'combust') {
      parts.push('محترق: خائف أو مقهور أو مستور');
    } else if (s.sun === 'beams') {
      parts.push('تحت الشعاع: أمره غير ظاهر');
    } else if (s.sun === 'cazimi') {
      parts.push('في قلب الشمس: في أحسن حال');
    }
    return parts.join('، ');
  };
  const where = (s: PlanetState) =>
    `${N(s.planet)} في ${SIGNS[signOf(s.lon)]} في البيت ${s.house}`;
  const aspectsOf = (p: Planet) =>
    j.aspectsNow.filter(x => x.a === p || x.b === p);
  const other = (x: NowAspect, p: Planet) => (x.a === p ? x.b : x.a);

  // The story told by the Moon.
  const story: string[] = [];
  if (j.moonLast) {
    const p = j.moonLast.b;
    story.push(
      `ما مضى: انفصل القمر عن ${N(p)} ${n.aspect(
        j.moonLast.kind,
      )}، فقد جرى قريباً أمر يخص ${whoIs(p)}. (القمر ينفصل عما مضى.)`,
    );
  }
  if (j.moonNext) {
    const p = j.moonNext.b;
    const tone = BENEFIC.includes(p)
      ? 'وهو سعد، فالقادم خير'
      : MALEFIC.includes(p)
      ? 'وهو نحس، فالقادم فيه عسر'
      : 'وطبعه بحسب حاله';
    story.push(
      `ما سيأتي: يتصل القمر بـ${N(p)} ${n.aspect(
        j.moonNext.kind,
      )}، ${tone}، ويأتي من جهة ${whoIs(p)}. (القمر يتصل بما سيأتي.)`,
    );
  } else {
    story.push(
      'القمر خالي السير لا يتصل بشيء قبل خروجه من برجه: لا جديد يأتي في الأمر قريباً.',
    );
  }
  out.push({ title: 'قصة الأمر من القمر', lines: story });

  // The querent.
  out.push({
    title: 'حال السائل',
    lines: [
      `دليل السائل ${where(A)}: ${IN_HOUSE[A.house - 1]}.`,
      `حاله: ${condition(A)}.`,
      `القمر، شريك السائل، في ${SIGNS[signOf(j.moon.lon)]} في البيت ${
        j.moon.house
      }: ${condition(j.moon)}.`,
    ],
  });

  // The matter.
  const matterLines = [
    `دليل المسألة ${where(B)}: ${IN_HOUSE[B.house - 1]}.`,
    `حاله: ${condition(B)}.`,
  ];
  if (B.house === 1) {
    matterLines.push('صاحب المسألة في بيت السائل: الأمر يأتي إليه بنفسه.');
  }
  if (A.house === j.house) {
    matterLines.push(
      'صاحب السائل في بيت المسألة: السائل منشغل بالأمر ساعٍ إليه.',
    );
  }
  out.push({ title: 'حال المسألة', lines: matterLines });

  // Who seeks whom.
  const seek: string[] = [];
  if (j.perfection) {
    const faster = Math.abs(A.speed) >= Math.abs(B.speed) ? A : B;
    seek.push(
      faster === A
        ? 'السائل هو الطالب الساعي: دليله أسرع ويتصل بدليل المسألة.'
        : 'الأمر هو الذي يأتي إلى السائل: دليل المسألة أسرع ويتصل بدليل السائل.',
    );
  }
  if (j.reception === 'mutual') {
    seek.push('كل طرف يريد الآخر (قبول متبادل).');
  } else if (j.reception === 'matterReceives') {
    seek.push(
      'الطرف الآخر يرحّب بالسائل ويريده (صاحب المسألة يقبل صاحب السائل).',
    );
  } else if (j.reception === 'querentReceives') {
    seek.push(
      'السائل يريد الأمر أكثر مما يريده الأمر (صاحب السائل يقبل صاحب المسألة).',
    );
  }
  if (seek.length) {
    out.push({ title: 'من يطلب من', lines: seek });
  }

  // Helpers and hinderers.
  const people: string[] = [];
  for (const sig of [A.planet, B.planet]) {
    for (const x of aspectsOf(sig)) {
      const c = other(x, sig);
      if (c === A.planet || c === B.planet) {
        continue;
      }
      const hard = x.kind === 'square' || x.kind === 'opposition';
      if (BENEFIC.includes(c) && !hard) {
        people.push(
          `${N(c)} ينظر إلى ${N(sig)} ${n.aspect(x.kind)} ${
            x.applying ? 'متصلاً' : 'منفصلاً'
          }: عون من ${whoIs(c)}${x.applying ? '' : ' (مضى)'}.`,
        );
      } else if (MALEFIC.includes(c) && (hard || x.kind === 'conjunction')) {
        people.push(
          `${N(c)} ينظر إلى ${N(sig)} ${n.aspect(x.kind)} ${
            x.applying ? 'متصلاً' : 'منفصلاً'
          }: أذى أو عائق من ${whoIs(c)}${x.applying ? '' : ' (مضى)'}.`,
        );
      }
    }
  }
  if (j.translation) {
    people.push(
      `${N(j.translation)} ينقل بين الطرفين: الوسيط ${whoIs(j.translation)}.`,
    );
  }
  if (j.collection) {
    people.push(
      `${N(j.collection)} يجمع الطرفين: يتم بتدخل ${whoIs(j.collection)}.`,
    );
  }
  if (j.prohibition) {
    people.push(
      `${N(j.prohibition.a)} يعترض: المانع ${whoIs(j.prohibition.a)}.`,
    );
  }
  if (people.length) {
    out.push({ title: 'من يعين ومن يعيق', lines: people });
  }

  // Description of the person asked about.
  if (personMatter) {
    out.push({
      title: 'صفة الشخص المسؤول عنه',
      lines: [
        `بحسب ${N(B.planet)} دليله: ${PERSON[B.planet]}.`,
        `وبحسب برجه ${SIGNS[signOf(B.lon)]}: ${
          ELEMENT_TEMPER[signOf(B.lon) % 4]
        }.`,
        `وحاله الآن: ${condition(B)}.`,
      ],
    });
  }

  // Place and direction of the matter.
  const sb = signOf(B.lon);
  out.push({
    title: 'المكان والجهة',
    lines: [
      `بحسب برج دليل المسألة (${SIGNS[sb]}): ${SIGN_PLACE[sb]}.`,
      `الجهة: ${DIRECTION[sb % 4]}، والمسافة: ${
        ANGULAR_DISTANCE[B.angularity]
      } (دليله ${
        B.angularity === 'angular'
          ? 'في وتد'
          : B.angularity === 'succedent'
          ? 'في بيت مائل'
          : 'في بيت زائل'
      }).`,
    ],
  });

  // Matter-specific chapters.
  if (kind === 'lost' || kind === 'theft') {
    out.push(lostChapter(j, kind, n, whoIs));
  } else if (kind === 'sick') {
    out.push(sickChapter(j, n));
  } else if (kind === 'return') {
    out.push(returnChapter(j, n));
  } else if (kind === 'pregnancy') {
    out.push(pregnancyChapter(j, n));
  }

  // The end of the matter: the fourth house.
  const end4 = j.lords[3];
  const in4 = (Object.values(S) as PlanetState[]).filter(s => s.house === 4);
  const endLines = [
    `صاحب البيت الرابع (عاقبة الأمر) ${N(end4)}: ${condition(S[end4])}.`,
  ];
  for (const s of in4) {
    endLines.push(
      `${N(s.planet)} في البيت الرابع: ${
        BENEFIC.includes(s.planet)
          ? 'عاقبة حسنة'
          : MALEFIC.includes(s.planet)
          ? 'عاقبة فيها همّ'
          : 'يلوّن العاقبة بطبعه'
      }.`,
    );
  }
  out.push({ title: 'عاقبة الأمر', lines: endLines });

  // The Lot of Fortune.
  out.push({
    title: 'سهم السعادة',
    lines: [
      `في البيت ${j.fortune.house}: الخير والمكسب للسائل ${
        IN_HOUSE[j.fortune.house - 1]
      }.`,
    ],
  });

  return out;
}

function lostChapter(
  j: HoraryJudgment,
  kind: 'lost' | 'theft',
  n: ReadingNames,
  whoIs: (p: Planet) => string,
): ReadingSection {
  const N = n.planet;
  const S = j.states;
  const lord2 = j.lords[1];
  const lord7 = j.lords[6];
  const ascLord = j.lords[0];
  const s2 = S[lord2];
  const lines: string[] = [];

  // Lost or stolen.
  const thief: string[] = [];
  if (s2.house === 7) {
    thief.push(`صاحب الثاني (${N(lord2)}) في البيت السابع`);
  }
  if (S[lord7].house === 2) {
    thief.push(`صاحب السابع (${N(lord7)}) في البيت الثاني`);
  }
  if (
    lord7 !== lord2 &&
    j.aspectsNow.some(
      x => (x.a === lord7 && x.b === lord2) || (x.a === lord2 && x.b === lord7),
    )
  ) {
    thief.push(`صاحب السابع ينظر إلى صاحب الثاني`);
  }
  const mislaid: string[] = [];
  if ([1, 2, 4].includes(s2.house)) {
    mislaid.push(`صاحب الثاني في البيت ${s2.house}`);
  }
  if ([1, 2, 4].includes(j.moon.house)) {
    mislaid.push(`القمر في البيت ${j.moon.house}`);
  }
  if (S.mercury.retrograde) {
    mislaid.push('عطارد (الذاكرة) راجع');
  }
  if (thief.length > mislaid.length) {
    lines.push(
      `الأرجح أنه سُرق أو أخذه أحد: ${thief.join('، ')}. والآخذ ${whoIs(
        lord7,
      )}.`,
    );
    const t = S[lord7];
    lines.push(
      `صفة الآخذ (من ${N(lord7)} في ${SIGNS[signOf(t.lon)]}): ${
        PERSON[lord7]
      }، ${ELEMENT_TEMPER[signOf(t.lon) % 4]}.`,
    );
    lines.push(
      [1, 2, 4].includes(t.house)
        ? 'دليل الآخذ في بيت السائل أو قربه: من أهل البيت أو المقربين.'
        : t.house === 3
        ? 'دليل الآخذ في الثالث: قريب أو جار.'
        : 'دليل الآخذ بعيد عن بيت السائل: من خارج البيت.',
    );
  } else {
    lines.push(
      `لم يُسرق على الأرجح، بل وُضع ونُسي: ${
        mislaid.length ? mislaid.join('، ') : 'لا شاهد على السرقة'
      }.`,
    );
  }

  // Inside or outside.
  const stolen = thief.length > mislaid.length;
  lines.push(
    s2.angularity === 'angular' || j.moon.angularity === 'angular'
      ? stolen
        ? 'والشيء ما زال قريباً لم يبعد (الدليل في وتد).'
        : 'هو داخل البيت أو في المكان نفسه (الدليل في وتد).'
      : s2.angularity === 'succedent'
      ? 'هو قريب من البيت وليس بعيداً (الدليل في بيت مائل).'
      : 'هو بعيد عن البيت أو متنقل (الدليل في بيت زائل).',
  );
  const sp = signOf(s2.lon);
  const sm = signOf(j.moon.lon);
  lines.push(
    `موضعه بحسب صاحب الثاني (${SIGNS[sp]}): ${SIGN_PLACE[sp]}؛ وبحسب القمر (${
      SIGNS[sm]
    }): ${SIGN_PLACE[sm]}. جهته ${DIRECTION[sp % 4]}.`,
  );

  // Found or not.
  const found: string[] = [];
  const notFound: string[] = [];
  const applies = (a: Planet, b: Planet) =>
    j.aspectsNow.some(
      x => x.applying && ((x.a === a && x.b === b) || (x.a === b && x.b === a)),
    );
  if (applies('moon', ascLord)) {
    found.push('القمر يتصل بصاحب الطالع');
  }
  if (lord2 !== 'moon' && applies('moon', lord2)) {
    found.push('القمر يتصل بصاحب الثاني');
  }
  if (lord2 !== ascLord && applies(lord2, ascLord)) {
    found.push('صاحب الثاني يتصل بصاحب الطالع');
  }
  if (applies('moon', 'sun')) {
    found.push('القمر يتصل بالشمس التي تكشف المخبوء');
  }
  if (BENEFIC.some(b => S[b].house === 2)) {
    found.push('سعد في البيت الثاني');
  }
  if ([1, 2, 4].includes(j.fortune.house)) {
    found.push(`سهم السعادة في البيت ${j.fortune.house}`);
  }
  if (s2.sun === 'combust') {
    notFound.push('صاحب الثاني محترق');
  }
  if ([8, 12].includes(s2.house)) {
    notFound.push(`صاحب الثاني في البيت ${s2.house}`);
  }
  if (found.length > notFound.length) {
    lines.push(`يُعثر عليه بإذن الله: ${found.join('، ')}.`);
  } else if (notFound.length) {
    lines.push(`يصعب العثور عليه: ${notFound.join('، ')}.`);
  } else {
    lines.push('لا شاهد قوي على العثور عليه ولا على فقده.');
  }
  return {
    title: kind === 'theft' ? 'باب المسروق' : 'باب الشيء الضائع',
    lines,
  };
}

function sickChapter(j: HoraryJudgment, n: ReadingNames): ReadingSection {
  const N = n.planet;
  const S = j.states;
  const asc = S[j.lords[0]];
  const ill = S[j.lords[5]];
  const death = j.lords[7];
  const lines: string[] = [];
  const score = (s: PlanetState) =>
    (s.dignities.includes('domicile') || s.dignities.includes('exaltation')
      ? 2
      : 0) -
    (s.dignities.includes('detriment') || s.dignities.includes('fall')
      ? 2
      : 0) -
    (s.retrograde ? 1 : 0) -
    (s.sun === 'combust' ? 2 : 0) +
    (s.angularity === 'angular' ? 1 : s.angularity === 'cadent' ? -1 : 0);
  lines.push(
    score(asc) >= score(ill)
      ? `صاحب الطالع (${N(asc.planet)}) أقوى من صاحب السادس (${N(
          ill.planet,
        )}): المريض أقوى من المرض.`
      : `صاحب السادس (${N(ill.planet)}) أقوى من صاحب الطالع (${N(
          asc.planet,
        )}): المرض غالب، فيُعتنى بالعلاج.`,
  );
  const toDeath = j.aspectsNow.some(
    x =>
      x.applying &&
      ((x.a === asc.planet && x.b === death) ||
        (x.b === asc.planet && x.a === death) ||
        (x.a === 'moon' && x.b === death)),
  );
  if (toDeath && death !== asc.planet) {
    lines.push(
      `صاحب الطالع أو القمر يتصل بصاحب الثامن (${N(
        death,
      )}): المرض شديد، ويُحتاط له.`,
    );
  }
  if (j.moonNext && BENEFIC.includes(j.moonNext.b)) {
    lines.push('القمر يتصل بسعد: شاهد على التحسن والشفاء.');
  } else if (j.moonNext && MALEFIC.includes(j.moonNext.b)) {
    lines.push('القمر يتصل بنحس: شاهد على اشتداد المرض قبل الفرج.');
  }
  if (MALEFIC.some(m => S[m].house === 1)) {
    lines.push('نحس في الطالع: ضعف في البدن.');
  }
  return { title: 'باب المرض', lines };
}

function returnChapter(j: HoraryJudgment, n: ReadingNames): ReadingSection {
  const N = n.planet;
  const B = j.quesited;
  const ascLord = j.lords[0];
  const yes: string[] = [];
  const no: string[] = [];
  if (B.retrograde) {
    yes.push(`دليل الغائب (${N(B.planet)}) راجع: يرجع من طريقه`);
  }
  if (
    j.aspectsNow.some(
      x =>
        x.applying &&
        ((x.a === B.planet && x.b === ascLord) ||
          (x.b === B.planet && x.a === ascLord)),
    )
  ) {
    yes.push('دليل الغائب يتصل بصاحب الطالع');
  }
  if ([1, 4].includes(B.house)) {
    yes.push(`دليل الغائب في البيت ${B.house}: في طريقه إلى البيت`);
  }
  if ([9, 3].includes(B.house) && !B.retrograde) {
    no.push(`دليل الغائب في البيت ${B.house} سائر: ما زال في سفره`);
  }
  if (B.sun === 'combust') {
    no.push('دليل الغائب محترق: محبوس عن العودة أو في ضيق');
  }
  const lines =
    yes.length >= no.length && yes.length > 0
      ? [
          `يعود: ${yes.join('، ')}.`,
          ...(no.length ? [`مع: ${no.join('، ')}.`] : []),
        ]
      : no.length
      ? [`لا يعود قريباً: ${no.join('، ')}.`]
      : ['لا شاهد صريح على العودة ولا على البقاء؛ يُنظر في الحكم العام أعلاه.'];
  return { title: 'باب عودة الغائب', lines };
}

function pregnancyChapter(j: HoraryJudgment, n: ReadingNames): ReadingSection {
  const N = n.planet;
  const S = j.states;
  const lord5 = j.lords[4];
  const ascLord = j.lords[0];
  const FRUITFUL = [3, 7, 11]; // Cancer, Scorpio, Pisces
  const BARREN = [2, 4, 5]; // Gemini, Leo, Virgo
  const yes: string[] = [];
  const no: string[] = [];
  const ascSign = signOf(j.chart.houses!.asc);
  const fifthSign = signOf(j.chart.houses!.cusps[4]);
  const moonSign = signOf(j.moon.lon);
  for (const [name, sg] of [
    ['الطالع', ascSign],
    ['البيت الخامس', fifthSign],
    ['القمر', moonSign],
  ] as [string, number][]) {
    if (FRUITFUL.includes(sg)) {
      yes.push(`${name} في ${SIGNS[sg]} وهو برج ولود`);
    } else if (BARREN.includes(sg)) {
      no.push(`${name} في ${SIGNS[sg]} وهو برج عقيم`);
    }
  }
  if (BENEFIC.some(b => [1, 5].includes(S[b].house))) {
    yes.push('سعد في الطالع أو الخامس');
  }
  if (
    lord5 !== ascLord &&
    j.aspectsNow.some(
      x =>
        x.applying &&
        ((x.a === lord5 && x.b === ascLord) ||
          (x.b === lord5 && x.a === ascLord)),
    )
  ) {
    yes.push(`صاحب الخامس (${N(lord5)}) يتصل بصاحب الطالع`);
  }
  if (S[lord5].angularity === 'angular') {
    yes.push('صاحب الخامس في وتد');
  }
  return {
    title: 'باب الحمل',
    lines:
      yes.length > no.length
        ? [
            `الشواهد مع الحمل: ${yes.join('، ')}.`,
            ...(no.length ? [`وضده: ${no.join('، ')}.`] : []),
          ]
        : [
            `الشواهد لا تؤيد الحمل: ${
              no.length ? no.join('، ') : 'لا شاهد صريح معه'
            }.`,
            ...(yes.length ? [`ومعه: ${yes.join('، ')}.`] : []),
          ],
  };
}
