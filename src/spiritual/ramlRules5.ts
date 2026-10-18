// Question chapters of «الفلك المشحون» from printed pages 304–317: the sick,
// the prisoner, hidden things, thieves, office, the dispute, what returns
// and who goes to whom. AGPL-3.0-or-later.

import { castShield, Figure, RAML_HOUSES, Shield } from './raml';
import {
  ANGLES,
  BookRule,
  h,
  housesOf,
  inShield,
  isBad,
  isGood,
  isOdd,
  isOneOf,
  isPureGood,
  kind,
  layer,
  name,
  points,
  repeatsOf,
  ROWS,
  RuleAnswer,
  shown,
  sum,
} from './ramlKit';

/** «البيت n (اسمه)». */
const hn = (n: number) => `البيت ${n} (${RAML_HOUSES[n - 1]})`;

/** A shield from four given mothers. */
const shieldOf = (mothers: Figure[]) =>
  castShield(mothers.flatMap(f => [...f]));

/** Single rows of one element over houses 1–15. */
const openCount = (s: Shield, row: number) =>
  s.houses.slice(0, 15).filter(f => f[row] === 1).length;

const ELEMENT_STATE: Record<number, string> = {
  10: 'سليم',
  8: 'مضعضع',
  6: 'مخلخل يُرجى صلاحه',
  4: 'ناقص',
  2: 'ناقص جداً',
  0: 'معدوم',
};

/**
 * The sick (ص٣٠٤–٣٠٥): the fire, air, water and earth of the mothers make
 * four new mothers; each element of the new shield, counted over houses
 * 1–15, is whole at ten.
 */
function sick(s: Shield): RuleAnswer {
  const fresh = shieldOf(ROWS.map((_, r) => layer(s, r, [1, 2, 3, 4])));
  const c = ROWS.map((_, r) => openCount(fresh, r));
  const lines = [
    'أُخذت نار الأمهات الأربع وهواؤها وماؤها وترابها فصارت أمهات جديدة، ووُلّد منها تخت، ثم عُدّت النقاط المفردة لكل عنصر من البيت الأول إلى الخامس عشر، وتمامها عشرة.',
    ...ROWS.map((r, i) => `${r}: ${c[i]} من عشرة، ${ELEMENT_STATE[c[i]]}.`),
  ];
  const weak = ROWS.filter((_, i) => c[i] < 5);
  if (weak.length) {
    lines.push(`العلّة من جهة طبع ${weak.join(' و')}.`);
  }
  const [fire, air, water, earth] = c;
  if (c.every(x => x === 10)) {
    return {
      verdict: 'yes',
      headline: 'العناصر كلها سليمة: المريض يُشفى بإذن الله.',
      lines,
    };
  }
  if (air === 10 && water === 10) {
    return {
      verdict: 'yes',
      headline: 'الهواء والماء كاملان: المريض يُشفى بإذن الله.',
      lines,
    };
  }
  if (fire < 10 && earth === 10 && air === 10 && water === 10) {
    return {
      verdict: 'yes',
      headline: 'النار وحدها ناقصة: العافية تأتي بعد مدة طويلة.',
      lines,
    };
  }
  if (c.filter(x => x <= 2).length >= 2) {
    return {
      verdict: 'doubt',
      headline: 'الحال شديدة، والأمر بيد الله، فالعناية بالطبيب أولى.',
      lines,
    };
  }
  if (c.every(x => x >= 6)) {
    return {
      verdict: 'doubt',
      headline: 'في العناصر خلل يسير: يُرجى للمريض الصحة.',
      lines,
    };
  }
  return {
    verdict: 'doubt',
    headline: 'في العناصر نقص: الشفاء بطيء ولا يكون إلا بعد مدة.',
    lines,
  };
}

const goodOut = (f: Figure) => isPureGood(f) && kind(f) === 'خارج';
const badOut = (f: Figure) => isBad(f) && kind(f) === 'خارج';

/** The prisoner (ص٣٠٥–٣٠٧): houses 1, 4, 12 and 15, the repeats of the 12th, and (12+3)+(4+1). */
function prisoner(s: Shield): RuleAnswer {
  const lines = [
    `الطالع ${shown(h(s, 1))}، و${hn(4)} ${shown(h(s, 4))}، و${hn(
      12,
    )} وهو بيت المسجون ${shown(h(s, 12))}، و${hn(15)} ${shown(h(s, 15))}.`,
  ];
  const twelve = h(s, 12);
  const rep = repeatsOf(s, 12);
  const out: string[] = [];
  let release: 'out' | 'stay' | 'hard' | null = null;

  if (
    name(h(s, 1)) === 'الطريق' &&
    name(h(s, 4)) === 'الحمرة' &&
    name(twelve) === 'الأنكيس' &&
    isBad(h(s, 15))
  ) {
    release = 'hard';
    lines.push(
      'الطريق في الطالع، والحمرة في الرابع، والأنكيس في الثاني عشر، والميزان نحس: يخرج لكن ما بعد خروجه شديد.',
    );
  }
  const still = ['الاجتماع', 'الطريق', 'العقلة'];
  if (
    !release &&
    [13, 14, 15].every(n => isOneOf(h(s, n), still)) &&
    isOneOf(h(s, 6), [...still, 'الأنكيس', 'القبض الداخل'])
  ) {
    release = 'stay';
    lines.push(
      'السائل والمسؤول والميزان من الاجتماع والطريق والعقلة، وفي السادس ما يشهد لها: حبس طويل شديد.',
    );
  }
  if (goodOut(h(s, 4)) && goodOut(twelve) && isGood(h(s, 15))) {
    out.push('الرابع والثاني عشر سعيدان خارجان ووافقهما الميزان: يخرج سريعاً.');
  }
  if (goodOut(twelve)) {
    out.push('في بيت المسجون سعد خارج: يخرج عاجلاً بخير وسلامة.');
  }
  if (
    (badOut(twelve) && rep.some(n => [3, 5, 9].includes(n))) ||
    (isGood(twelve) && rep.includes(10))
  ) {
    out.push(
      `شكل بيت المسجون تكرر في البيت ${rep
        .filter(n => [3, 5, 9, 10].includes(n))
        .join(' و')}: يخرج باختياره.`,
    );
  }
  for (const n of [2, 10]) {
    const f = h(s, n);
    const at = housesOf(s, f).filter(x => [3, 4, 5, 9].includes(x));
    if (badOut(f) && at.length) {
      out.push(
        `شكل البيت ${n} «${name(f)}» نحس خارج وتكرر في البيت ${at.join(
          ' و',
        )}: ينفتح له باب الحبس فيخرج.`,
      );
      break;
    }
  }
  lines.push(...out);
  if (rep.includes(11)) {
    lines.push('وتكرر شكل بيت المسجون في الحادي عشر: يُكرم ويُنعم عليه.');
  }
  if (!release) {
    if (out.length) {
      release = 'out';
    } else if (!isPureGood(h(s, 4)) && !isPureGood(twelve)) {
      release = 'stay';
      lines.push('الرابع والثاني عشر ليس فيهما سعد خالص: يطول بقاؤه في الحبس.');
    }
  }
  const end = sum(sum(twelve, h(s, 3)), sum(h(s, 4), h(s, 1)));
  lines.push(
    `عاقبته (الثاني عشر والثالث مع الرابع والأول): ${shown(end)}، ${
      isGood(end) ? 'إلى خير' : isBad(end) ? 'إلى شر' : 'بين ذلك'
    }.`,
  );
  if (release === 'out') {
    return { verdict: 'yes', headline: 'المسجون يخرج من حبسه.', lines };
  }
  if (release === 'hard') {
    return {
      verdict: 'doubt',
      headline: 'يخرج من الحبس، لكن العاقبة بعد خروجه شديدة.',
      lines,
    };
  }
  if (release === 'stay') {
    return { verdict: 'no', headline: 'يطول بقاء المسجون في حبسه.', lines };
  }
  return {
    verdict: 'doubt',
    headline: 'لا دلالة واضحة على الخروج ولا على طول الحبس.',
    lines,
  };
}

/** The four quarters of the shield and their houses (ص٣٠٧). */
const QUARTERS = [
  { dir: 'الشرق', row: 0, houses: [1, 2, 9, 13] },
  { dir: 'الشمال', row: 3, houses: [3, 10, 11, 15] },
  { dir: 'الجنوب', row: 2, houses: [4, 5, 6, 16] },
  { dir: 'الغرب', row: 1, houses: [7, 8, 12, 14] },
];

const quarterOf = (n: number) => QUARTERS.find(q => q.houses.includes(n))!.dir;

/** Hidden things and theft (ص٣٠٧–٣٠٨): four figures of the quarters and the air of them. */
function hidden(s: Shield): RuleAnswer {
  const four = QUARTERS.map(q => layer(s, q.row, q.houses));
  const lines = QUARTERS.map((q, i) => {
    const at = housesOf(s, four[i]);
    return `شكل ${q.dir} (من ${ROWS[q.row]} البيوت ${q.houses.join(
      ' و',
    )}) «${name(four[i])}»: ${
      at.length
        ? `حاضر في البيت ${at.join(' و')}، ربع ${quarterOf(at[0])}`
        : 'غائب عن التخت'
    }.`;
  });
  const present = four.filter(f => inShield(s, f)).length;
  const air = four.map(f => f[1]) as Figure;
  const airAt = housesOf(s, air);
  lines.push(
    airAt.length
      ? `والشكل الخارج من هواء الأربعة «${name(air)}» في البيت ${
          airAt[0]
        }، فالشيء في جهة ${quarterOf(airAt[0])}.`
      : `والشكل الخارج من هواء الأربعة «${name(
          air,
        )}» غائب عن التخت: فُقد المطلوب، أو نُبش من موضعه.`,
  );
  const where = airAt.length ? ` في جهة ${quarterOf(airAt[0])}` : '';
  if (present === 4) {
    return {
      verdict: 'info',
      headline: `الشيء حاضر في المكان${where}، والآخذ بين الحاضرين.`,
      lines,
    };
  }
  if (present === 0) {
    return {
      verdict: 'info',
      headline: 'ليس الشيء في المكان، والمتهم غائب عن الحاضرين.',
      lines,
    };
  }
  return {
    verdict: 'info',
    headline: `بعض الدلائل حاضرة وبعضها غائب، والكتاب لا يحكم في هذه الحال إلا بالجهة${
      where ? `: ${where.trim()}` : ''
    }.`,
    lines,
  };
}

const THEFT_SIGNS = ['الحمرة', 'نقي الخد', 'العتبة الخارجة', 'القبض الخارج'];

/** Number of thieves (ص٣٠٨): the theft needs one of the four signs; the 7th's repeats count them. */
function thieves(s: Shield): RuleAnswer {
  const signs = THEFT_SIGNS.filter(n => s.houses.some(f => name(f) === n));
  if (!signs.length) {
    return {
      verdict: 'no',
      headline: 'لم تقع سرقة.',
      lines: [
        'لم يظهر في التخت شيء من الحمرة ولا نقي الخد ولا العتبة الخارجة ولا القبض الخارج، وهي علامات السرقة.',
      ],
    };
  }
  const n = housesOf(s, h(s, 7)).length;
  return {
    verdict: 'info',
    headline: n === 1 ? 'السارق واحد.' : `عدد السرّاق ${n}.`,
    lines: [
      `ظهر في التخت من علامات السرقة: ${signs.join('، ')}.`,
      `شكل ${hn(7)} «${name(h(s, 7))}» ورد في التخت ${n} ${
        n === 1 ? 'مرة' : 'مرات'
      }، وبعدده يكون السرّاق.`,
    ],
  };
}

/** Male (odd) and female (even) figures over the sixteen houses. */
function sexes(s: Shield) {
  const male = s.houses.filter(isOdd).length;
  return { male, female: 16 - male };
}

const LOOKS: Record<string, string> = {
  الطريق:
    'رجل طويل القامة، عاقل، من أهل العلم أو القلم، لا يُظن به ذلك؛ أبيض مشرب بحمرة، طويل اليدين والرجلين.',
  'النصرة الخارجة':
    'رجل جليل القدر، شريف، له صلة بأهل السلطان، معجب بنفسه؛ أبيض مشرب بحمرة، طويل الشعر، لا يُتّهم عادة.',
  'النصرة الداخلة':
    'امرأة معتدلة القامة، مليحة الوجه، صغيرة الرأس والفم، سمراء أو صفراء، في إحدى رجليها أثر.',
  الجودلة:
    'صفراء أو شقراء اللون، معتدلة، طويلة الشعر، لطيفة اليدين والرجلين، تميل إلى اللهو.',
  'نقي الخد':
    'مليح الوجه، أصفر مائل إلى الحمرة، خفيف شعر الوجه، صغير الرأس، قصير اليدين، في إحدى رجليه شامة.',
  الحمرة:
    'شديد الطبع، كثير الكلام، عالي الصوت، غليظ الشفتين، سيئ المعاشرة؛ وفي جسده علامة أو أثر.',
  البياض:
    'مربوع، أبيض، كثير الحياء، واسع العينين، مدوّر الوجه، صاحب رأي وتدبير، طويل الشعر، في بدنه أثر.',
  'القبض الخارج':
    'كبير في السن، أصفر اللون، في عينه زرقة أو حمرة، كريه المنظر، وقيل منحني الظهر يابس الجلد.',
};

/** The thief's sex and look (ص٣١٠–٣١٣): the figure of the 7th, and which sex rules the shield. */
function thiefLook(s: Shield): RuleAnswer {
  const f = h(s, 7);
  const n = name(f);
  const { male, female } = sexes(s);
  const lines = [
    `شكل ${hn(
      7,
    )} «${n}». وفي التخت ${male} أشكال مذكّرة (فردية النقاط) و${female} مؤنثة (زوجية).`,
  ];
  const more = male > female ? 'male' : female > male ? 'female' : 'equal';
  let sex: string;
  switch (n) {
    case 'الطريق':
    case 'النصرة الخارجة':
      sex = 'رجل';
      break;
    case 'النصرة الداخلة':
      sex = more === 'male' ? 'رجل' : 'امرأة';
      break;
    case 'الجودلة':
      sex = more === 'male' ? 'صبي في الغالب' : 'امرأة';
      break;
    case 'نقي الخد':
      sex = more === 'female' ? 'امرأة' : 'رجل';
      break;
    case 'البياض':
      sex = more === 'female' ? 'امرأة' : 'رجل';
      break;
    case 'الحمرة':
      sex =
        more === 'equal'
          ? 'لا يُعرف أذكر هو أم أنثى، فالأشكال متساوية'
          : more === 'male'
          ? 'رجل'
          : 'امرأة';
      break;
    case 'القبض الخارج':
      sex = more === 'female' ? 'عجوز' : 'شيخ';
      break;
    default:
      return {
        verdict: 'info',
        headline: `الشكل السابع «${n}»، والكتاب لم يذكر صفة السارق فيه.`,
        lines: [
          ...lines,
          'ذكر الكتاب صفة السارق لتسعة أشكال فقط في البيت السابع.',
        ],
      };
  }
  lines.push(`صفته: ${LOOKS[n]}`);
  lines.push(
    `وعدد السرّاق بعدد ورود هذا الشكل في التخت: ${housesOf(s, f).length}.`,
  );
  return { verdict: 'info', headline: `الآخذ ${sex}.`, lines };
}

/** Office, ruler and residence (ص٣١٤–٣١٥): the four angles and the two thresholds. */
function office(s: Shield): RuleAnswer {
  const fs = ANGLES.map(n => h(s, n));
  const lines = [
    `الأوتاد: ${ANGLES.map(n => `${hn(n)} ${shown(h(s, n))}`).join('، ')}.`,
  ];
  const good = fs.filter(isGood).length;
  const bad = fs.filter(isBad).length;
  const inner = inShield(s, [2, 1, 1, 1]);
  const outer = inShield(s, [1, 1, 1, 2]);
  if (good === 4) {
    lines.push(
      inner
        ? 'الأوتاد كلها سعيدة، والعتبة الداخلة حاضرة في التخت تشهد لها.'
        : 'الأوتاد كلها سعيدة.',
    );
    return {
      verdict: 'yes',
      headline: 'الولاية أو السكن ثابت ويدوم.',
      lines,
    };
  }
  if (bad === 4) {
    const fast = fs.every(f => kind(f) === 'خارج') && outer;
    if (fast) {
      lines.push(
        'الأوتاد كلها نحسة خارجة، والعتبة الخارجة حاضرة في التخت تشهد لها.',
      );
    } else {
      lines.push('الأوتاد كلها نحسة.');
    }
    return {
      verdict: 'no',
      headline: fast
        ? 'لا ثبات: تنقضي الولاية أو السكن بسرعة.'
        : 'لا ثبات: يتغير الأمر عن قريب.',
      lines,
    };
  }
  lines.push(`الأوتاد مختلطة: ${good} سعيدة و${bad} نحسة، فيُحكم بالأقوى.`);
  if (good > bad) {
    return {
      verdict: 'yes',
      headline: 'يغلب الثبات، والعاقبة متوسطة.',
      lines,
    };
  }
  if (bad > good) {
    return {
      verdict: 'no',
      headline: 'يغلب التغير، والثبات ضعيف.',
      lines,
    };
  }
  return {
    verdict: 'doubt',
    headline: 'السعد والنحس متكافئان في الأوتاد: العاقبة متوسطة.',
    lines,
  };
}

const opens = (f: Figure) => f.filter(r => r === 1).length;

/**
 * The winner (ص٣١٦), second method: the sought takes fire of 1, air of 4,
 * water of 7, earth of 10; the seeker the reverse. The first method rests
 * on «ما تحتها», which the book leaves unclear, so it is left out.
 */
function winner(s: Shield): RuleAnswer {
  const sought = [h(s, 1)[0], h(s, 4)[1], h(s, 7)[2], h(s, 10)[3]] as Figure;
  const seeker = [h(s, 10)[0], h(s, 7)[1], h(s, 4)[2], h(s, 1)[3]] as Figure;
  const end = sum(seeker, sought);
  const a = opens(seeker);
  const b = opens(sought);
  const lines = [
    `شكل الطالب (نار العاشر وهواء السابع وماء الرابع وتراب الأول) «${name(
      seeker,
    )}»، فيه ${a} عناصر مفتوحة.`,
    `شكل المطلوب (نار الأول وهواء الرابع وماء السابع وتراب العاشر) «${name(
      sought,
    )}»، فيه ${b} عناصر مفتوحة.`,
    `العاقبة من الشكلين ${shown(end)}: ${
      isGood(end)
        ? 'يقع بينهما صلح على خير'
        : isBad(end)
        ? 'يفترقان على غير صلح'
        : 'لا يتضح أمر الصلح'
    }.`,
  ];
  if (a === b) {
    return {
      verdict: 'doubt',
      headline: 'الطرفان متكافئان، لا يظهر غالب.',
      lines,
    };
  }
  return {
    verdict: 'info',
    headline:
      a > b ? 'الغلبة للطالب (المدّعي).' : 'الغلبة للمطلوب (المدّعى عليه).',
    lines,
  };
}

const RETURN_AT: Record<number, string> = {
  1: 'هو عند صاحب صديق',
  2: 'لم ينقص منه شيء ولم يضع',
  3: 'هو عند الإخوة، آمن',
  4: 'يرجع من جهة أهل الدار',
  5: 'هو عند الأولاد، ويرجع بعد مشقة',
  6: 'يرجع عاجلاً بلا نكد',
  8: 'ذهب وضاع',
};

/** Does the thing return (ص٣١٦–٣١٧): where the figure of the 7th repeats. */
function returns(s: Shield): RuleAnswer {
  const at = repeatsOf(s, 7).filter(n => n in RETURN_AT);
  const lines = [`شكل ${hn(7)} «${name(h(s, 7))}».`];
  if (!at.length) {
    lines.push(
      'لم يتكرر في البيوت التي ذكرها الكتاب لهذا الباب (من الأول إلى السادس، والثامن).',
    );
    return {
      verdict: 'doubt',
      headline: 'لا دلالة في هذا الباب على رجوعه أو ضياعه.',
      lines,
    };
  }
  for (const n of at) {
    lines.push(`تكرر في ${hn(n)}: ${RETURN_AT[n]}.`);
  }
  const back = at.some(n => n !== 8);
  const lost = at.includes(8);
  if (back && !lost) {
    return {
      verdict: 'yes',
      headline: `الشيء يرجع: ${RETURN_AT[at[0]]}.`,
      lines,
    };
  }
  if (lost && !back) {
    return { verdict: 'no', headline: 'الشيء ذهب وضاع.', lines };
  }
  return {
    verdict: 'doubt',
    headline: 'الدلائل متعارضة بين الرجوع والضياع.',
    lines,
  };
}

/** Who goes to whom (ص٣١٧): the points of the 1st against the 7th. */
function goes(s: Shield): RuleAnswer {
  const a = points(h(s, 1));
  const b = points(h(s, 7));
  const lines = [
    `نقاط شكل الطالع «${name(h(s, 1))}» ${a}، ونقاط شكل ${hn(7)} «${name(
      h(s, 7),
    )}» ${b}. والأكثر نقاطاً هو الذي يأتي إلى صاحبه.`,
  ];
  if (a === b) {
    return {
      verdict: 'doubt',
      headline: 'النقاط متساوية، والكتاب لم يذكر هذه الحال.',
      lines,
    };
  }
  return {
    verdict: 'info',
    headline:
      a > b
        ? 'السائل هو الذي يذهب إلى المطلوب.'
        : 'المطلوب هو الذي يأتي إلى السائل.',
    lines,
  };
}

export const RULES_5: BookRule[] = [
  {
    id: 'b5-sick',
    field: 'المرض',
    title: 'هل يُشفى المريض، ومن أي جهة علّته؟',
    page: 304,
    judge: sick,
  },
  {
    id: 'b5-prisoner',
    field: 'السجن',
    title: 'هل يخرج المسجون، وما عاقبته؟',
    page: 305,
    judge: prisoner,
  },
  {
    id: 'b5-hidden',
    field: 'السرقة والضائع',
    also: ['الكنوز والدفائن'],
    title: 'هل المخبوء أو المسروق في المكان، وفي أي جهة؟',
    page: 307,
    judge: hidden,
  },
  {
    id: 'b5-thieves',
    field: 'السرقة والضائع',
    title: 'هل وقعت السرقة، وكم عدد السرّاق؟',
    page: 308,
    judge: thieves,
  },
  {
    id: 'b5-thief-look',
    field: 'السرقة والضائع',
    title: 'السارق ذكر أم أنثى، وما صفته؟',
    page: 310,
    judge: thiefLook,
  },
  {
    id: 'b5-office',
    field: 'العمل والولاية',
    title: 'هل الولاية أو المنصب أو السكن ثابت؟',
    page: 314,
    judge: office,
  },
  {
    id: 'b5-winner',
    field: 'الأعداء والخصومة',
    title: 'من يغلب في الخصومة أو الدعوى؟',
    page: 316,
    judge: winner,
  },
  {
    id: 'b5-return',
    field: 'السرقة والضائع',
    title: 'هل يرجع الشيء الذاهب، وأين هو؟',
    page: 316,
    judge: returns,
  },
  {
    id: 'b5-goes',
    field: 'الطالب والمطلوب',
    title: 'هل أذهب أنا إلى المطلوب أم يأتي هو إليّ؟',
    page: 317,
    judge: goes,
  },
];
