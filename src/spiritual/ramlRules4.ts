// Question chapters of «الفلك المشحون في علم الرمل المصون», printed pages
// 227–262: the seeker and the sought (النظر والنطق والاتصال والانفصال), what
// comes to the asker, and durations. Only what the book states in full is
// judged here. AGPL-3.0-or-later.

import { Figure, figureInfo, RAML_HOUSES, Shield } from './raml';
import {
  BookRule,
  h,
  housesOf,
  infisal,
  isBad,
  isGood,
  ittisal,
  kind,
  nadhar,
  name,
  nutq,
  repeatsOf,
  RuleAnswer,
  shown,
  sumOf,
} from './ramlKit';

const house = (n: number) => `البيت ${n} (${RAML_HOUSES[n - 1]})`;

const ELEMENTS = ['النار', 'الهواء', 'الماء', 'التراب'];

/** Open (single) rows of one element over a set of houses. */
const openRows = (s: Shield, row: number, houses: number[]) =>
  houses.filter(n => h(s, n)[row] === 1).length;

const ALL = Array.from({ length: 16 }, (_, i) => i + 1);

/** Open rows of each element over the sixteen houses. */
const elementTotals = (s: Shield) => [0, 1, 2, 3].map(r => openRows(s, r, ALL));

/** Day and night of each planet's figures (ص٦٠–٦١); head as Sun, tail as Mars. */
const PLANET_DAYS: Record<string, [string, string]> = {
  زحل: ['السبت', 'الأربعاء'],
  المشتري: ['الخميس', 'الإثنين'],
  المريخ: ['الثلاثاء', 'الخميس'],
  الشمس: ['الأحد', 'السبت'],
  الزهرة: ['الجمعة', 'الثلاثاء'],
  عطارد: ['الأربعاء', 'الأحد'],
  القمر: ['الإثنين', 'الجمعة'],
  الرأس: ['الأحد', 'السبت'],
  الذنب: ['الثلاثاء', 'الخميس'],
};

const WEEKDAYS = [
  'السبت',
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
];

const list = (ns: number[]) => ns.map(house).join('، ');

// Do the two meet: 9 + 11, by its water row (ص٢٣١).
const meet: BookRule = {
  id: 'b4-meet',
  field: 'الطالب والمطلوب',
  title: 'هل يجتمع الشخصان؟',
  page: 231,
  judge(s) {
    const f = sumOf(s, 9, 11);
    const open = f[2] === 1;
    return {
      verdict: open ? 'yes' : 'no',
      headline: open ? 'نعم، يجتمعان.' : 'لا يجتمعان.',
      lines: [
        `جمعنا ${house(9)} و${house(11)} فخرج «${name(f)}».`,
        open
          ? 'صف الماء فيه مفتوح (نقطة واحدة)، والماء للاتصال، فيدل على الاجتماع.'
          : 'صف الماء فيه مسدود (نقطتان)، فلا اجتماع.',
      ],
    };
  },
};

const CONTACT: Record<number, string> = {
  3: 'الاتصال قريب وفيه ألفة وضحك ومؤانسة.',
  5: 'يكون نظر من غير اجتماع، وقد يأخذ السائل من المسؤول عنه حاجة أو مالاً أو هدية.',
  9: 'يكون اللقاء خارج البلد، ويجمع بينهما الناس أو وسيط، ويكون بينهما وعد.',
  11: 'يكون الاتصال من غير علم أحد، أو عند بعض الأصحاب أو الإخوان أو الأقارب.',
};

// Contact with the sought: where the ascendant's figure repeats (ص٢٣١–٢٣٢).
const contact: BookRule = {
  id: 'b4-contact',
  field: 'الطالب والمطلوب',
  title: 'هل يقع الاتصال بالمطلوب، وكيف؟',
  page: 231,
  judge(s) {
    const reps = repeatsOf(s, 1);
    const hits = reps.filter(n => n in CONTACT);
    const lines = [
      `شكل الطالع «${name(h(s, 1))}».`,
      reps.length ? `تكرر في ${list(reps)}.` : 'لم يتكرر في بقية البيوت.',
    ];
    if (!hits.length) {
      lines.push(
        'لم يتكرر في الثالث ولا الخامس ولا التاسع ولا الحادي عشر، فالاتصال بعيد.',
      );
      return { verdict: 'no', headline: 'الاتصال بعيد.', lines };
    }
    if (reps.length === 1) {
      lines.push(CONTACT[hits[0]]);
    } else {
      lines.push(
        'تكرر في أحد بيوت الاتصال، والكتاب يفصّل كيفيته إذا لم يتكرر في غيره، وهنا تكرر في أكثر من بيت.',
      );
    }
    return { verdict: 'yes', headline: 'يقع الاتصال.', lines };
  },
};

const MEETING_PLACE: Record<number, string> = {
  1: 'في دار السائل',
  2: 'عند بعض الأحباب',
  3: 'عند إخوة السائل',
  4: 'في دار السائل',
  5: 'عند الرسول أو الوسيط بينهما',
  6: 'عند من يأخذ أجرة',
  7: 'عند قريب للمسؤول عنه',
  8: 'في بيت المسؤول عنه',
  9: 'خارج البلد',
  10: 'قرب السوق',
  11: 'عند أصدقائهما وبحضور غيرهما',
  12: 'في موضع خوف وكدر يُخشى عليهما فيه',
  13: 'في دار السائل',
};

// Where they meet: 4 + 8, by where it stands (ص٢٣٢).
const meetingPlace: BookRule = {
  id: 'b4-place',
  field: 'الطالب والمطلوب',
  title: 'أين يكون اللقاء؟',
  page: 232,
  judge(s) {
    const f = sumOf(s, 4, 8);
    const at = housesOf(s, f);
    const lines = [`جمعنا ${house(4)} و${house(8)} فخرج «${name(f)}».`];
    if (!at.length) {
      lines.push('هذا الشكل ليس في التخت، ولم يذكر الكتاب حكماً لهذه الحال.');
      return { verdict: 'doubt', headline: 'لا يظهر مكان اللقاء.', lines };
    }
    const known = at.filter(n => n in MEETING_PLACE);
    lines.push(`وهو في ${list(at)}.`);
    if (!known.length) {
      lines.push(
        'الكتاب يجعل هذه البيوت الأخيرة كالأوتاد، ولم يبيّن حكمها بوضوح.',
      );
      return { verdict: 'doubt', headline: 'مكان اللقاء غير واضح.', lines };
    }
    const places = [...new Set(known.map(n => MEETING_PLACE[n]))];
    return {
      verdict: 'info',
      headline: `اللقاء ${places.join('، أو ')}.`,
      lines,
    };
  },
};

// Lawful or not: 11 + 13, in odd or even houses (ص٢٣٢–٢٣٣).
const lawful: BookRule = {
  id: 'b4-lawful',
  field: 'الطالب والمطلوب',
  title: 'هل الصلة بينهما حلال؟',
  page: 232,
  judge(s) {
    const f = sumOf(s, 11, 13);
    const at = housesOf(s, f);
    const lines = [`جمعنا ${house(11)} و${house(13)} فخرج «${name(f)}».`];
    if (!at.length) {
      lines.push('هذا الشكل ليس في التخت، ولم يذكر الكتاب حكماً لهذه الحال.');
      return { verdict: 'doubt', headline: 'لا حكم في هذا الضرب.', lines };
    }
    lines.push(`وهو في ${list(at)}.`);
    const odd = at.map(n => n % 2 === 1);
    if (odd.every(Boolean)) {
      lines.push('البيوت الفردة للحلال.');
      return { verdict: 'yes', headline: 'الصلة حلال.', lines };
    }
    if (odd.every(x => !x)) {
      lines.push('البيوت الزوجة للحرام.');
      return { verdict: 'no', headline: 'الصلة غير حلال.', lines };
    }
    lines.push('ظهر في بيت فرد وبيت زوج، والحكم بترتيب ظهوره.');
    return odd[0]
      ? {
          verdict: 'doubt',
          headline: 'تبدأ حلالاً ثم تصير غير ذلك.',
          lines,
        }
      : {
          verdict: 'doubt',
          headline: 'تبدأ على غير حلال ثم تصير حلالاً.',
          lines,
        };
  },
};

// Sight, speech, contact and separation of each side (ص٢٣٧).
const ACTS = [
  { label: 'الرؤية', verb: 'يراه', of: nadhar },
  { label: 'الكلام', verb: 'يكلمه', of: nutq },
  { label: 'الاتصال', verb: 'يتصل به', of: ittisal },
  { label: 'الانفصال', verb: 'ينفصل عنه', of: infisal },
];
const relations: BookRule = {
  id: 'b4-relations',
  field: 'الطالب والمطلوب',
  title: 'هل يرى كل منهما الآخر ويكلمه ويلتقيه أو يفارقه؟',
  page: 237,
  judge(s) {
    const asker = ACTS.map((_, i) => sumOf(s, 1 + i, 13 + i));
    const asked = ACTS.map((_, i) => sumOf(s, 5 + i, 13 + i));
    const lines: string[] = [];
    const yes: string[] = [];
    ACTS.forEach((a, i) => {
      const fa = asker[i];
      const fb = asked[i];
      const ha = housesOf(s, fa).length > 0;
      const hb = housesOf(s, fb).length > 0;
      lines.push(
        `${a.label}: من جهة السائل (البيت ${1 + i} مع البيت ${13 + i}) «${name(
          fa,
        )}» ${
          ha ? 'موجود في التخت' : 'غير موجود'
        }، ومن جهة المسؤول عنه (البيت ${5 + i} مع البيت ${13 + i}) «${name(
          fb,
        )}» ${hb ? 'موجود' : 'غير موجود'}.`,
      );
      if (ha) {
        yes.push(`السائل ${a.verb}`);
      }
      if (hb) {
        yes.push(`المسؤول عنه ${a.verb}`);
      }
    });
    lines.push('ما وُجد في التخت يقع، وما لم يوجد لا يقع.');
    return {
      verdict: 'info',
      headline: yes.length
        ? `${yes.join('، ')}.`
        : 'لا رؤية ولا كلام ولا اتصال بينهما.',
      lines,
    };
  },
};

const FIRST = ['الرؤية', 'الكلام', 'الاتصال', 'البعد والانفصال'];

// Which comes first: the element with most open rows (ص٢٣٨).
const first: BookRule = {
  id: 'b4-first',
  field: 'الطالب والمطلوب',
  title: 'ما الذي يحدث أولاً: الرؤية أم الكلام أم اللقاء؟',
  page: 238,
  judge(s) {
    const t = elementTotals(s);
    const max = Math.max(...t);
    const top = [0, 1, 2, 3].filter(r => t[r] === max);
    const lines = [
      `عدد الصفوف المفتوحة في التخت: النار ${t[0]}، الهواء ${t[1]}، الماء ${t[2]}، التراب ${t[3]}.`,
      'النار للرؤية، والهواء للكلام، والماء للاتصال، والتراب للبعد.',
    ];
    if (top.length > 1) {
      lines.push('تساوى أكثر من عنصر في العدد.');
      return {
        verdict: 'info',
        headline: `يتقارب ${top.map(r => FIRST[r]).join(' و')} في الأسبقية.`,
        lines,
      };
    }
    return {
      verdict: 'info',
      headline: `يبدأ الأمر بـ${FIRST[top[0]]}.`,
      lines,
    };
  },
};

// Who sees, speaks, joins or parts more: the asker's half against the
// asked-about's (ص٢٤٣–٢٤٤). Water is read as contact, as in the book's example.
const ASKER_PART = [1, 2, 3, 4, 9, 10, 13];
const ASKED_PART = [5, 6, 7, 8, 11, 12, 14];
const MORE = ['الرؤية', 'الكلام', 'طلب الاتصال', 'البعد والانفصال'];
const more: BookRule = {
  id: 'b4-more',
  field: 'الطالب والمطلوب',
  title: 'أيهما أكثر رؤية وكلاماً وطلباً للآخر؟',
  page: 243,
  judge(s) {
    const lines = [
      'جزء السائل: الأمهات والتاسع والعاشر والثالث عشر. جزء المسؤول عنه: البنات والحادي عشر والثاني عشر والرابع عشر.',
    ];
    const parts: string[] = [];
    [0, 1, 2, 3].forEach(r => {
      const a = openRows(s, r, ASKER_PART);
      const b = openRows(s, r, ASKED_PART);
      lines.push(`${ELEMENTS[r]}: السائل ${a}، المسؤول عنه ${b}.`);
      parts.push(
        a === b
          ? `يتساويان في ${MORE[r]}`
          : `${a > b ? 'السائل' : 'المسؤول عنه'} أكثر في ${MORE[r]}`,
      );
    });
    return { verdict: 'info', headline: `${parts.join('؛ ')}.`, lines };
  },
};

const BALANCE_REPEAT: Record<number, string> = {
  1: 'المسؤول عنه يأتي إلى السائل راغباً.',
  3: 'المسؤول عنه يأتي إلى السائل راغباً.',
  2: 'المسؤول عنه يأتي إلى السائل كارهاً.',
  4: 'المسؤول عنه يأتي إلى السائل كارهاً.',
  5: 'السائل يذهب إلى المسؤول عنه راغباً.',
  7: 'السائل يذهب إلى المسؤول عنه راغباً.',
  6: 'السائل يتوجه إلى المسؤول عنه كارهاً.',
  8: 'السائل يتوجه إلى المسؤول عنه كارهاً.',
  9: 'يجتمعان عند أحد أصحابهما.',
  11: 'يجتمعان عند أحد أصحابهما.',
  10: 'يجتمعان في سوق أو مكان فيه جدار بعد مدة قليلة.',
  12: 'يجتمعان في سوق أو مكان فيه جدار بعد مدة قليلة.',
  13: 'المسؤول عنه يأتي إلى السائل راغباً.',
  14: 'المسؤول عنه يأتي إلى السائل كارهاً.',
  16: 'يجتمعان على التراضي بينهما.',
};

// Will they meet and who goes to whom: the balance (15) and where it
// repeats (ص٢٤٤–٢٤٥).
const balanceMeet: BookRule = {
  id: 'b4-balance',
  field: 'الطالب والمطلوب',
  title: 'هل يحصل اللقاء، ومن يذهب إلى الآخر؟',
  page: 244,
  judge(s) {
    const f = h(s, 15);
    const k = kind(f);
    const lines = [`في ${house(15)} ${shown(f)}، وهو ${k}.`];
    let verdict: RuleAnswer['verdict'] = 'doubt';
    let headline = 'الكتاب لم يبيّن حكم هذا الشكل في الميزان.';
    if (isBad(f)) {
      verdict = 'no';
      headline = 'لا يُطمع في اللقاء.';
    } else if (isGood(f) && k === 'داخل') {
      verdict = 'yes';
      headline = 'يحصل اللقاء.';
    } else if (isGood(f) && k === 'خارج') {
      verdict = 'yes';
      headline = 'يحصل اللقاء بعد مدة وتعب.';
    }
    if (verdict !== 'no') {
      const reps = repeatsOf(s, 15);
      if (!reps.length) {
        lines.push(
          'لم يتكرر الميزان في التخت: السائل يذهب إلى المسؤول عنه راغباً.',
        );
      } else {
        lines.push(`تكرر الميزان في ${list(reps)}:`);
        for (const n of reps) {
          if (BALANCE_REPEAT[n]) {
            lines.push(BALANCE_REPEAT[n]);
          }
        }
      }
    }
    return { verdict, headline, lines };
  },
};

// Description of the sought: the figure whose open rows are the elements
// with most open rows in the shield (ص٢٤٦).
const describe: BookRule = {
  id: 'b4-describe',
  field: 'الطالب والمطلوب',
  title: 'ما الشكل الدال على صفة المطلوب؟',
  page: 246,
  judge(s) {
    const t = elementTotals(s);
    const max = Math.max(...t);
    const f = t.map(x => (x === max ? 1 : 2)) as Figure;
    const at = housesOf(s, f);
    const info = figureInfo(f);
    const lines = [
      `عدد الصفوف المفتوحة في التخت: النار ${t[0]}، الهواء ${t[1]}، الماء ${t[2]}، التراب ${t[3]}.`,
      `نفتح العنصر الأكثر عدداً فيخرج «${info.name}».`,
      `كوكبه ${info.planet}، وبرجه ${info.sign}، وطبعه ${info.nature}.`,
      at.length
        ? `وهو في ${list(at)}، فيُحكم بمعنى ذلك البيت أيضاً.`
        : 'وليس في التخت.',
    ];
    return {
      verdict: 'info',
      headline: `صفة المطلوب على شكل «${info.name}».`,
      lines,
    };
  },
};

const INCOMING: { when: string; w: [number, number]; q: [number, number] }[] = [
  { when: 'في وقته', w: [8, 9], q: [11, 15] },
  { when: 'في الأيام', w: [3, 8], q: [15, 12] },
  { when: 'في الأسابيع', w: [5, 9], q: [7, 11] },
  { when: 'في الشهور', w: [6, 9], q: [8, 11] },
  { when: 'في السنين', w: [6, 13], q: [2, 11] },
];

// What comes to the asker in each span of time (ص٢٤٨–٢٤٩).
const incoming: BookRule = {
  id: 'b4-incoming',
  field: 'النفس والحال',
  title: 'ما الذي سيرد عليّ في الأيام والشهور والسنين؟',
  page: 248,
  judge(s) {
    const lines: string[] = [];
    let good = 0;
    let bad = 0;
    for (const x of INCOMING) {
      const w = sumOf(s, ...x.w);
      const q = sumOf(s, ...x.q);
      const at = housesOf(s, w);
      const where = at.length
        ? `يخص ${at.map(n => RAML_HOUSES[n - 1]).join(' و')}`
        : 'وليس في التخت';
      const end = isGood(q)
        ? 'والعاقبة سالمة.'
        : isBad(q)
        ? 'ويصيب السائل منه ضرر.'
        : 'وعاقبته ممتزجة.';
      if (isGood(q)) {
        good++;
      } else if (isBad(q)) {
        bad++;
      }
      lines.push(
        `${x.when}: يرد «${name(w)}» (${where})، وسؤاله «${name(q)}»، ${end}`,
      );
    }
    lines.push(
      'الوارد يُقرأ بمعنى البيت الذي حلّ فيه، وسؤاله يبيّن هل ينجو السائل من ضرره.',
    );
    return {
      verdict: 'info',
      headline:
        good > bad
          ? 'أغلب ما يرد عليك سالم العاقبة.'
          : bad > good
          ? 'فيما يرد عليك ما يُحذر منه.'
          : 'ما يرد عليك ممتزج بين السلامة والضرر.',
      lines,
    };
  },
};

// The left of the cast: 8 + 9 (ص٢٤٧).
const yasar: BookRule = {
  id: 'b4-yasar',
  field: 'النفس والحال',
  title: 'هل الرمل في جملته سعد أم نحس؟',
  page: 247,
  judge(s) {
    const f = sumOf(s, 8, 9);
    const lines = [
      `يسار الرمل: جمعنا ${house(8)} و${house(9)} فخرج ${shown(f)}.`,
    ];
    if (isGood(f)) {
      return { verdict: 'yes', headline: 'الرمل كله سعد.', lines };
    }
    if (isBad(f)) {
      return { verdict: 'no', headline: 'الرمل كله نحس.', lines };
    }
    lines.push('والكتاب حكم في السعد والنحس فقط.');
    return { verdict: 'doubt', headline: 'الرمل ممتزج.', lines };
  },
};

/** Ties between elements (ص٢٥٩): air > water > fire > earth. */
const STRENGTH = [2, 0, 1, 3]; // rank by element row: fire, air, water, earth
const UNIT = ['أيام', 'أسابيع', 'شهور', 'سنين'];
const DROP = [9, 12, 15, 16];

// Days, weeks, months or years: the dominant element (ص٢٥٩–٢٦٠).
const span: BookRule = {
  id: 'b4-span',
  field: 'المدة والعدد',
  title: 'كم المدة: أيام أم أسابيع أم شهور أم سنين؟',
  page: 259,
  judge(s) {
    const t = elementTotals(s);
    const max = Math.max(...t);
    const tied = [0, 1, 2, 3].filter(r => t[r] === max);
    const r = tied.reduce((a, b) => (STRENGTH[b] < STRENGTH[a] ? b : a));
    const sq = max * max;
    const rest = sq % DROP[r];
    const lines = [
      `عدد الصفوف المفتوحة في التخت: النار ${t[0]}، الهواء ${t[1]}، الماء ${t[2]}، التراب ${t[3]}.`,
      tied.length > 1
        ? `تساوى ${tied.map(x => ELEMENTS[x]).join(' و')}، والأغلب ${
            ELEMENTS[r]
          }.`
        : `الأغلب ${ELEMENTS[r]}، فالمدة ${UNIT[r]}.`,
      `${max} × ${max} = ${sq}، نطرح منه ${DROP[r]} ${DROP[r]} فيبقى ${rest}.`,
    ];
    if (rest === 0) {
      lines.push('لم يبق شيء، ولم يذكر الكتاب حكم هذه الحال.');
      return {
        verdict: 'doubt',
        headline: `المدة ${UNIT[r]}، ولا يتبيّن عددها.`,
        lines,
      };
    }
    if (r === 3) {
      const parts: string[] = [];
      if (sq % 12) {
        parts.push(`في الشهر ${sq % 12} من السنة ${rest + 1}`);
      }
      if (sq % 30) {
        parts.push(`في اليوم ${sq % 30} من الشهر`);
      }
      if (sq % 24) {
        parts.push(`في الساعة ${sq % 24}`);
      }
      parts.push(`يوم ${WEEKDAYS[sq % 7]}`);
      lines.push(
        `ولوقت التمام: نقسم ${sq} على ١٢ و٣٠ و٢٤ و٧، فيكون ${parts.join(
          '، ',
        )}.`,
      );
    }
    return {
      verdict: 'info',
      headline: `المدة ${rest} ${UNIT[r]}.`,
      lines,
    };
  },
};

const LONGEST = [
  'سبعة أيام',
  'أسبوعان',
  'ثلاثة أسابيع',
  'شهر',
  'شهر',
  'ثلاثة أشهر',
  'ستة أشهر',
  'تسعة أشهر',
  'سنة',
];

// When the need is met, at the shortest and the longest (ص٢٤٩–٢٥٠): open air
// rows squared, cast off by nines, walked from the first house. The middle
// span needs the order of Sheikh Khalaf and is left out.
const needTime: BookRule = {
  id: 'b4-need-time',
  field: 'المدة والعدد',
  title: 'متى تُقضى الحاجة؟',
  page: 249,
  judge(s) {
    const air = openRows(s, 1, ALL);
    const sq = air * air;
    const rest = sq % 9;
    const lines = [
      `عدد صفوف الهواء المفتوحة ${air}، و${air} × ${air} = ${sq}، نطرح منه تسعة تسعة فيبقى ${rest}.`,
    ];
    if (rest === 0) {
      lines.push('لم يبق شيء، ولم يذكر الكتاب حكم هذه الحال.');
      return { verdict: 'doubt', headline: 'لا تتبيّن المدة.', lines };
    }
    const f = h(s, rest);
    const days = PLANET_DAYS[figureInfo(f).planet];
    lines.push(
      `نعدّ ${rest} من البيت الأول فنقف على ${house(rest)}: «${name(f)}».`,
    );
    lines.push(
      `أقرب المدة يوم ${days[0]} أو ليلة ${days[1]}، يوم كوكبه وليلته.`,
    );
    lines.push(`وأبعدها بحسب بيته: ${LONGEST[rest - 1]}.`);
    lines.push('المدة الوسطى تحتاج ترتيباً للأشكال لم نعتمده بعد، فتُركت.');
    return {
      verdict: 'info',
      headline: `أقربها يوم ${days[0]}، وأبعدها ${LONGEST[rest - 1]}.`,
      lines,
    };
  },
};

export const RULES_4: BookRule[] = [
  meet,
  contact,
  meetingPlace,
  lawful,
  relations,
  first,
  more,
  balanceMeet,
  describe,
  incoming,
  yasar,
  span,
  needTime,
];
