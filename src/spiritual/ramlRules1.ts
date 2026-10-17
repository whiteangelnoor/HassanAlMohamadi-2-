// Question chapters of «الفلك المشحون في علم الرمل المصون», printed pages
// 92–135: marriage, pregnancy, friends, debts, money, work and needs. Each
// rule follows the procedure the book states; branches it leaves unclear
// answer «doubt» with a plain explanation. AGPL-3.0-or-later.

import { castShield, Figure, figureInfo, RAML_HOUSES, Shield } from './raml';
import {
  ANGLES,
  BookRule,
  h,
  housesOf,
  inShield,
  isBad,
  isGood,
  isOneOf,
  kind,
  name,
  nature,
  numberOf,
  layer,
  nadhar,
  nutq,
  ittisal,
  infisal,
  points,
  repeatsOf,
  RuleAnswer,
  shown,
  sum,
  sumOf,
  Verdict,
} from './ramlKit';

/** «البيت 7 (الفراش)». */
const hl = (n: number) => `البيت ${n} (${RAML_HOUSES[n - 1]})`;

/** «جُمع البيت 1 (الحياة) والبيت 7 (الفراش) فخرج «X» (سعد).» */
const sumLine = (houses: number[], f: Figure) =>
  `جُمع ${houses.map(hl).join(' و')} فخرج ${shown(f)}.`;

/** «في البيت 3 (الإخاء) «X» (سعد).» */
const inLine = (s: Shield, n: number) => `في ${hl(n)} ${shown(h(s, n))}.`;

/** Rows: 0 fire, 1 air, 2 water, 3 earth. A row is open when single. */
const open = (f: Figure, row: number) => f[row] === 1;
const openRows = (f: Figure) => [0, 1, 2, 3].filter(r => open(f, r));
const openCount = (f: Figure) => openRows(f).length;

/** Casting off k: a remainder of 0 counts as k. */
const drop = (n: number, k: number) => (n % k === 0 ? k : n % k);

/** Values of the open rows by بزدح (ص١٢٢، ص١٢٩): fire 2, air 7, water 4, earth 8. */
const BAZDAH = [2, 7, 4, 8];
const bazdah = (f: Figure) => openRows(f).reduce((a, r) => a + BAZDAH[r], 0);

/** Houses of each element (ص٣٨). */
const ELEMENT_HOUSES: Record<string, number[]> = {
  نار: [1, 5, 9, 13],
  هواء: [2, 6, 10, 14],
  ماء: [3, 7, 11, 15],
  تراب: [4, 8, 12, 16],
};
const WATER_HOUSES = ELEMENT_HOUSES['ماء'];
const element = (f: Figure) => figureInfo(f).element;

/** A second shield with the given figures as mothers (تحليف الخط). */
const reCast = (mothers: Figure[]) => castShield(mothers.flat());

const answer = (
  verdict: Verdict,
  headline: string,
  lines: string[],
): RuleAnswer => ({ verdict, headline, lines });

/** yes for fortunate, no for unfortunate, doubt for mixed. */
function byNature(
  f: Figure,
  yes: string,
  no: string,
  mixed: string,
  lines: string[],
): RuleAnswer {
  return isGood(f)
    ? answer('yes', yes, lines)
    : isBad(f)
    ? answer('no', no, lines)
    : answer('doubt', mixed, lines);
}

/** Planet → day (ص٦٠–٦١); the head goes with the Sun, the tail with Mars. */
const PLANET_DAY: Record<string, string> = {
  زحل: 'السبت',
  المشتري: 'الخميس',
  المريخ: 'الثلاثاء',
  الشمس: 'الأحد',
  الزهرة: 'الجمعة',
  عطارد: 'الأربعاء',
  القمر: 'الإثنين',
  الرأس: 'الأحد',
  الذنب: 'الثلاثاء',
};

/** Gender of the figures (ص٦٩; القبض الداخل from ص٨٣). */
const GENDER: Record<string, string> = {
  الجودلة: 'ذكر',
  الأحيان: 'ذكر',
  'العتبة الداخلة': 'أنثى',
  البياض: 'أنثى',
  'نقي الخد': 'أنثى',
  'العتبة الخارجة': 'أنثى',
  الحمرة: 'ذكر',
  الأنكيس: 'أنثى',
  'النصرة الخارجة': 'ذكر',
  العقلة: 'أنثى',
  الاجتماع: 'ذكر',
  'النصرة الداخلة': 'أنثى',
  الطريق: 'ذكر',
  'القبض الخارج': 'ذكر',
  الجماعة: 'ذكر',
  'القبض الداخل': 'أنثى',
};

export const RULES_1: BookRule[] = [
  // ——— الزواج ———
  {
    id: 'b1-agree3',
    field: 'الزواج',
    title: 'هل يتفق الزوجان بعد الزواج؟',
    page: 92,
    // The figure in the third house (ص٩٢).
    judge: s =>
      byNature(
        h(s, 3),
        'نعم، يكون بينهما اتفاق.',
        'لا، يقع بينهما اختلاف.',
        'حالهما بين الاتفاق والاختلاف.',
        [inLine(s, 3), 'الحكم بطبع شكل البيت الثالث.'],
      ),
  },
  {
    id: 'b1-agree',
    field: 'الزواج',
    title: 'هل تكون الموافقة بين الطرفين؟',
    page: 92,
    // (4+11)+(7+14): fortunate → agreement, otherwise disagreement (ص٩٢).
    judge: s => {
      const a = sumOf(s, 4, 11);
      const b = sumOf(s, 7, 14);
      const r = sum(a, b);
      const lines = [
        sumLine([4, 11], a),
        sumLine([7, 14], b),
        `ومن الشكلين خرج ${shown(r)}.`,
      ];
      return isGood(r)
        ? answer('yes', 'نعم، تكون بينهما موافقة.', lines)
        : answer('no', 'لا، يقع بينهما خلاف.', lines);
    },
  },
  {
    id: 'b1-glance',
    field: 'الزواج',
    title: 'هل ينظر كل منهما إلى الآخر بمحبة؟',
    page: 100,
    // Houses 7 and 14, entering or leaving (ص١٠٠–١٠١).
    judge: s => {
      const a = kind(h(s, 7));
      const b = kind(h(s, 14));
      const lines = [
        `في ${hl(7)} «${name(h(s, 7))}» وهو ${a}، وفي ${hl(14)} «${name(
          h(s, 14),
        )}» وهو ${b}.`,
      ];
      if (a === 'داخل' && b === 'داخل') {
        return answer('yes', 'نعم، كل منهما ينظر إلى الآخر بمحبة.', lines);
      }
      if (a === 'خارج' && b === 'خارج') {
        return answer('no', 'لا، لا ينظر أحدهما إلى الآخر.', lines);
      }
      if (a === 'داخل' && b === 'خارج') {
        return answer('doubt', 'الطالب يحب المطلوب، والمطلوب ليس كذلك.', lines);
      }
      if (a === 'خارج' && b === 'داخل') {
        return answer('doubt', 'المطلوب يحب الطالب، والطالب ليس كذلك.', lines);
      }
      lines.push('لم يذكر الكتاب حكم الثابت والمنقلب في هذا الباب.');
      return answer('doubt', 'لا حكم واضحاً في هذا الضرب.', lines);
    },
  },
  {
    id: 'b1-suits',
    field: 'الزواج',
    title: 'هل يناسبك هذا الشخص ويعجبك؟',
    page: 101,
    // (7+11)+5 (ص١٠١–١٠٢).
    judge: s => {
      const a = sumOf(s, 7, 11);
      const r = sum(a, h(s, 5));
      return byNature(
        r,
        'نعم، يعجبك ويناسبك.',
        'لا، لا يعجبك.',
        'الأمر بين ذلك، لا ترجيح.',
        [sumLine([7, 11], a), `ومع ${hl(5)} خرج ${shown(r)}.`],
      );
    },
  },
  {
    id: 'b1-marriage-end',
    field: 'الزواج',
    title: 'ما عاقبة الزواج ومن أي سبب؟',
    page: 103,
    // (2+5)+(4+13); the element of the result gives the cause (ص١٠٣).
    judge: s => {
      const a = sumOf(s, 2, 5);
      const b = sumOf(s, 4, 13);
      const r = sum(a, b);
      const cause: Record<string, string> = {
        نار: 'النظر',
        هواء: 'الكلام',
        ماء: 'الاتصال والمخالطة',
        تراب: 'الانفصال والفراق',
      };
      const lines = [
        sumLine([2, 5], a),
        sumLine([4, 13], b),
        `ومن الشكلين خرج ${shown(r)}، وعنصره ${element(r)}.`,
        `والسبب من جهة ${cause[element(r)]}.`,
      ];
      return byNature(
        r,
        'العاقبة حسنة.',
        'العاقبة فيها شر.',
        'العاقبة بين الخير والشر.',
        lines,
      );
    },
  },
  {
    id: 'b1-wife-love',
    field: 'الزواج',
    title: 'هل الزوجة تحب زوجها؟',
    page: 99,
    // The figure in the seventh: nature and kind; the rest of the chapter
    // is left out (ص٩٩).
    judge: s => {
      const f = h(s, 7);
      const k = kind(f);
      const lines = [`${inLine(s, 7)} وهو ${k}.`];
      if (isOneOf(f, ['الجماعة'])) {
        return answer('no', 'محبتها لا يُطمأن إليها.', lines);
      }
      if (k === 'ثابت') {
        return answer('yes', 'محبتها سليمة لا غش فيها.', lines);
      }
      if (isGood(f) && k === 'منقلب') {
        return answer('doubt', 'محبتها له متوسطة.', lines);
      }
      if (isBad(f) && k === 'منقلب') {
        return answer('no', 'محبتها له غير صادقة.', lines);
      }
      if (isGood(f)) {
        return answer(
          'yes',
          k === 'داخل' ? 'نعم، تحبه محبة صادقة.' : 'نعم، تحبه.',
          lines,
        );
      }
      lines.push('ترك التطبيق بقية هذا الباب لأنها أحكام اتهام.');
      return answer('doubt', 'لا حكم واضحاً في هذا الضرب.', lines);
    },
  },
  {
    id: 'b1-divorcee',
    field: 'الزواج',
    title: 'هل ترجع المطلقة إلى زوجها؟',
    page: 104,
    // The water row of 5, 6, 7, then of 8, 9, 11, 15 (ص١٠٤).
    judge: s => {
      const group = (hs: number[]) => hs.map(n => open(h(s, n), 2));
      const g1 = group([5, 6, 7]);
      const g2 = group([8, 9, 11, 15]);
      const lines = [
        `سطر الماء في البيوت 5 و6 و7: ${g1
          .map(o => (o ? 'مفتوح' : 'مسدود'))
          .join('، ')}.`,
      ];
      if (g1.every(Boolean)) {
        return answer('yes', 'نعم، هي راغبة فيه وترجع.', lines);
      }
      if (g1.every(o => !o)) {
        return answer('no', 'لا، لا ترجع.', lines);
      }
      lines.push(
        `وسطر الماء في البيوت 8 و9 و11 و15: ${g2
          .map(o => (o ? 'مفتوح' : 'مسدود'))
          .join('، ')}.`,
      );
      if (g2.every(Boolean)) {
        return answer('yes', 'نعم، ترجع.', lines);
      }
      if (g2.every(o => !o)) {
        return answer('no', 'لا، لا ترجع.', lines);
      }
      return answer('doubt', 'رجوعها إليه قليل الاحتمال.', lines);
    },
  },

  // ——— الحمل والأولاد ———
  {
    id: 'b1-pregnant',
    field: 'الحمل والأولاد',
    title: 'هل المرأة حامل؟',
    page: 108,
    // Points of houses 1–6, cast off nines: odd → no, even → yes (ص١٠٨).
    judge: s => {
      const total = [1, 2, 3, 4, 5, 6].reduce((a, n) => a + points(h(s, n)), 0);
      const r = drop(total, 9);
      const lines = [
        `مجموع نقط الأمهات الأربع والبيتين 5 و6 = ${total}، وبعد إسقاط تسعة تسعة بقي ${r}.`,
      ];
      if (isOneOf(h(s, 5), ['الحمرة'])) {
        lines.push(
          `وفي ${hl(5)} «الحمرة»، والكتاب يجعلها علامة على عدم الحمل.`,
        );
        return answer('doubt', 'العلامات متعارضة، لا ترجيح.', lines);
      }
      return r % 2 === 0
        ? answer('yes', 'نعم، هي حامل.', [...lines, 'الباقي زوج.'])
        : answer('no', 'لا، ليست حاملاً.', [...lines, 'الباقي فرد.']);
    },
  },
  {
    id: 'b1-pregnancy-holds',
    field: 'الحمل والأولاد',
    title: 'هل يثبت الحمل وتسلم الحامل؟',
    page: 109,
    // The angles and the balance, then 6, 8 and 12 (ص١٠٩). The book's
    // branches on loss are left out.
    judge: s => {
      const angles = [...ANGLES, 15].every(n => isGood(h(s, n)));
      const safe = [6, 8, 12].every(n => isGood(h(s, n)));
      const lines = [
        `الأوتاد (1 و4 و7 و10) والميزان (15): ${[...ANGLES, 15]
          .map(n => `«${name(h(s, n))}»`)
          .join('، ')}.`,
        `والبيوت 6 و8 و12: ${[6, 8, 12]
          .map(n => `«${name(h(s, n))}»`)
          .join('، ')}.`,
      ];
      if (angles) {
        lines.push(
          safe
            ? 'والبيوت 6 و8 و12 سعيدة، فتسلم الحامل.'
            : 'والبيوت 6 و8 و12 ليست كلها سعيدة.',
        );
        return answer('yes', 'نعم، يثبت الحمل.', lines);
      }
      lines.push('لم تأتِ الأوتاد والميزان كلها سعيدة.');
      return answer('doubt', 'لم تظهر علامة ثبوت الحمل.', lines);
    },
  },
  {
    id: 'b1-months',
    field: 'الحمل والأولاد',
    title: 'كم شهراً الحمل؟',
    page: 109,
    // Open rows of the mothers, fire 1, air 2, water 3, earth 4, cast off
    // nines (ص١٠٩–١١٠).
    judge: s => {
      const total = s.mothers.reduce(
        (a, f) => a + openRows(f).reduce((b, r) => b + r + 1, 0),
        0,
      );
      const m = drop(total, 9);
      const lines = [
        `مجموع المفتوح من الأمهات (النار 1، الهواء 2، الماء 3، التراب 4) = ${total}، وبعد إسقاط تسعة تسعة بقي ${m}.`,
      ];
      if (isOneOf(h(s, 6), ['الجماعة']) || isOneOf(h(s, 10), ['الجماعة'])) {
        lines.push('و«الجماعة» في البيت 6 أو 10: يدل على توأم.');
      }
      const label = m === 1 ? 'شهر واحد' : m === 2 ? 'شهران' : `${m} أشهر`;
      return answer('info', `${label}.`, lines);
    },
  },
  {
    id: 'b1-baby-sex',
    field: 'الحمل والأولاد',
    title: 'هل الحمل ذكر أم أنثى؟',
    page: 110,
    // 1+6: odd points → male, even → female (ص١١٢).
    judge: s => {
      const r = sumOf(s, 1, 6);
      const p = points(r);
      const fa = s.houses.reduce(
        (a, f) => a + (open(f, 0) ? 1 : 0) + (open(f, 1) ? 1 : 0),
        0,
      );
      const we = s.houses.reduce(
        (a, f) => a + (open(f, 2) ? 1 : 0) + (open(f, 3) ? 1 : 0),
        0,
      );
      const lines = [
        sumLine([1, 6], r),
        `نقطه ${p}، وهو ${p % 2 ? 'فرد' : 'زوج'}.`,
        `وللاستئناس: مفتوح النار والهواء في التخت ${fa}، ومفتوح الماء والتراب ${we}.`,
      ];
      return answer('info', p % 2 ? 'ذكر.' : 'أنثى.', lines);
    },
  },
  {
    id: 'b1-birth-day',
    field: 'الحمل والأولاد',
    title: 'في أي يوم تلد الحامل؟',
    page: 114,
    // 5+1, the day of the result's planet (ص١١٤).
    judge: s => {
      const r = sumOf(s, 5, 1);
      const pl = figureInfo(r).planet;
      return answer('info', `يوم ${PLANET_DAY[pl]}.`, [
        sumLine([5, 1], r),
        `وهو من أشكال ${pl}، ويومه ${PLANET_DAY[pl]}.`,
      ]);
    },
  },
  {
    id: 'b1-offspring',
    field: 'الحمل والأولاد',
    title: 'هل يُرزق بذرية؟',
    page: 114,
    // (1+7)+5: entering or fixed → yes, leaving or moving → no (ص١١٤–١١٥).
    judge: s => {
      const a = sumOf(s, 1, 7);
      const r = sum(a, h(s, 5));
      const k = kind(r);
      const lines = [
        sumLine([1, 7], a),
        `ومع ${hl(5)} خرج ${shown(r)}، وهو ${k}.`,
      ];
      if (isOneOf(h(s, 1), ['العقلة', 'البياض'])) {
        lines.push(`وفي ${hl(1)} «${name(h(s, 1))}»، وهو علامة على الذرية.`);
        return answer('yes', 'نعم، يُرزق بذرية.', lines);
      }
      return k === 'داخل' || k === 'ثابت'
        ? answer('yes', 'نعم، يُرزق بذرية.', lines)
        : answer('no', 'لا تظهر علامة الذرية.', lines);
    },
  },

  // ——— الأصحاب والمحبة ———
  {
    id: 'b1-friend-good',
    field: 'الأصحاب والمحبة',
    title: 'هل يأتي من صاحبك خير؟',
    page: 115,
    // 1+3 (ص١١٥، ص١١٧).
    judge: s => {
      const r = sumOf(s, 1, 3);
      return byNature(
        r,
        'نعم، يأتي منه الخير.',
        'لا، يأتي منه الشر.',
        'لا خير ولا شر.',
        [sumLine([1, 3], r)],
      );
    },
  },
  {
    id: 'b1-friend-loves',
    field: 'الأصحاب والمحبة',
    title: 'هل يحبك صاحبك؟',
    page: 115,
    // The figure in the first house (ص١١٥–١١٦).
    judge: s => {
      const f = h(s, 1);
      const lines = [inLine(s, 1)];
      const T: Record<string, [Verdict, string]> = {
        الجودلة: ['no', 'محبته ستنقلب إلى بغض.'],
        'نقي الخد': ['no', 'محبته ستنقلب إلى بغض.'],
        الأحيان: ['yes', 'نعم، هو معك كما أنت معه.'],
        'العتبة الداخلة': ['yes', 'نعم، محبتكما متساوية.'],
        البياض: ['no', 'صحبته رياء، وقد تنقلب عداوة.'],
        'العتبة الخارجة': ['no', 'صحبته فيها نكد وهم.'],
        الحمرة: ['yes', 'نعم، هو محب لك.'],
        الأنكيس: ['doubt', 'يواسيك لكنه يحب غيرك.'],
        'النصرة الداخلة': ['yes', 'يحبك، لكنه قد يهجرك بسبب وشاية.'],
        'النصرة الخارجة': ['yes', 'يحبك، لكنه قد يهجرك بسبب وشاية.'],
        العقلة: ['doubt', 'يحبك لكن لا ينتفع أحدكما بالآخر.'],
        الطريق: ['doubt', 'صحبته لا خير فيها ولا شر.'],
      };
      const t = T[name(f)];
      if (!t) {
        lines.push('لم يذكر الكتاب حكم هذا الشكل في هذا الباب.');
        return answer('doubt', 'لا حكم في هذا الضرب.', lines);
      }
      return answer(t[0], t[1], lines);
    },
  },
  {
    id: 'b1-friendship',
    field: 'الأصحاب والمحبة',
    title: 'هل بين الاثنين صداقة أم عداوة؟',
    page: 116,
    // 11+15 (ص١١٦–١١٧).
    judge: s => {
      const r = sumOf(s, 11, 15);
      return byNature(
        r,
        'بينهما صداقة.',
        'بينهما عداوة.',
        'لا صداقة واضحة ولا عداوة.',
        [sumLine([11, 15], r)],
      );
    },
  },
  {
    id: 'b1-lover',
    field: 'الأصحاب والمحبة',
    title: 'هل يصل المحب إلى من يحب؟',
    page: 117,
    // The eleventh: nature and kind; the fifth gives the beloved's sex;
    // 1+5 against 3+11 tells who loves more (ص١١٧–١١٨).
    judge: s => {
      const f = h(s, 11);
      const k = kind(f);
      const lines = [`${inLine(s, 11)} وهو ${k}.`];
      const k5 = kind(h(s, 5));
      lines.push(
        `وفي ${hl(5)} «${name(h(s, 5))}» وهو ${k5}: المحبوب ${
          k5 === 'خارج' || k5 === 'منقلب' ? 'ذكر' : 'أنثى'
        }.`,
      );
      const a = sumOf(s, 1, 5);
      const b = sumOf(s, 3, 11);
      const rank = (x: Figure) => (isGood(x) ? 1 : isBad(x) ? -1 : 0);
      lines.push(
        `قلب المحب (البيتان 1 و5) ${shown(
          a,
        )}، وقلب المحبوب (البيتان 3 و11) ${shown(b)}: ${
          rank(a) > rank(b)
            ? 'المحب أكثر حباً.'
            : rank(a) < rank(b)
            ? 'المحبوب أكثر حباً.'
            : 'المحبة بينهما متقاربة.'
        }`,
      );
      if (isGood(f) && k === 'داخل') {
        return answer('yes', 'نعم، يكون الوصل.', lines);
      }
      if (isBad(f) && k === 'داخل') {
        return answer('no', 'المحبوب يعاند المحب ولا يطيعه.', lines);
      }
      if (isBad(f) && k === 'خارج') {
        return answer('no', 'يُخشى على المحب من أعداء في هذا الأمر.', lines);
      }
      if (isGood(f) && k === 'منقلب') {
        return answer('doubt', 'الحال بينهما متوسطة.', lines);
      }
      if (isBad(f) && k === 'منقلب') {
        return answer('no', 'لا يصل إليه، والمحبوب يميل إلى غيره.', lines);
      }
      lines.push('لم يذكر الكتاب حكم هذه الحال من الشكل الحادي عشر.');
      return answer('doubt', 'لا حكم واضحاً في هذا الضرب.', lines);
    },
  },
  {
    id: 'b1-promise',
    field: 'الأصحاب والمحبة',
    title: 'هل يفي بوعده؟',
    page: 118,
    // The open rows of the eleventh, then the fifteenth as witness (ص١١٨–١١٩).
    judge: s => {
      const f = h(s, 11);
      const o = openRows(f).join('');
      const ROW = ['النار', 'الهواء', 'الماء', 'التراب'];
      const lines = [
        `${inLine(s, 11)} والمفتوح فيه: ${
          o
            ? openRows(f)
                .map(r => ROW[r])
                .join(' و')
            : 'لا شيء'
        }.`,
      ];
      const w = h(s, 15);
      const witness = `والشاهد في ${hl(15)} ${shown(w)}.`;
      if (o === '01' || o === '1' || o === '2') {
        return answer('yes', 'نعم، يفي بوعده.', [...lines, witness]);
      }
      if (o === '23') {
        return answer('yes', 'يفي بعد مماطلة.', [...lines, witness]);
      }
      if (['0', '3', '03', '12', '13'].includes(o)) {
        return answer('no', 'لا يفي بوعده.', [...lines, witness]);
      }
      lines.push('هذه الحال لم يذكرها الكتاب، فالحكم بالشاهد في البيت 15.');
      lines.push(witness);
      return byNature(
        w,
        'نعم، يفي بوعده.',
        'لا يفي بوعده.',
        'يفي بعد مماطلة.',
        lines,
      );
    },
  },

  // ——— الديون والودائع ———
  {
    id: 'b1-debtor',
    field: 'الديون والودائع',
    title: 'هل يرد المدين الدين؟',
    page: 119,
    // (1+7)+(2+8), with 8 against 2 and the first repeating in the tenth
    // (ص١١٩–١٢٠).
    judge: s => {
      const a = sumOf(s, 1, 7);
      const b = sumOf(s, 2, 8);
      const r = sum(a, b);
      const lines = [
        sumLine([1, 7], a),
        sumLine([2, 8], b),
        `ومن الشكلين خرج ${shown(r)}.`,
      ];
      if (isGood(h(s, 8)) && isBad(h(s, 2))) {
        lines.push(
          `و${hl(8)} سعد و${hl(2)} نحس: علامة على أن المدين يجحد الدين.`,
        );
      }
      if (repeatsOf(s, 1).includes(10)) {
        lines.push(
          'وشكل البيت الأول يتكرر في العاشر: قد يُرفع الأمر إلى الحاكم.',
        );
      }
      const n = nature(r);
      if (n === 'سعد') {
        return inShield(s, r)
          ? answer('yes', 'نعم، ينوي رده ويرده.', [
              ...lines,
              'والشكل الخارج موجود في التخت.',
            ])
          : answer('doubt', 'الأرجح أنه يرده.', lines);
      }
      if (n === 'نحس') {
        return answer('no', 'لا، لا يرده.', lines);
      }
      if (n === 'ممتزج سعيد') {
        return answer('yes', 'يرده بعد مماطلة.', lines);
      }
      if (n === 'ممتزج نحس') {
        return answer('no', 'يماطل ولا يرده.', lines);
      }
      return answer('doubt', 'يماطل، والأمر غير محسوم.', lines);
    },
  },
  {
    id: 'b1-debt-paid',
    field: 'الديون والودائع',
    title: 'هل يُقضى الدين وكيف؟',
    page: 120,
    // The figure in the first house (ص١٢٠).
    judge: s => {
      const T: Record<string, [Verdict, string]> = {
        'القبض الخارج': ['yes', 'يُقضى سريعاً.'],
        'النصرة الداخلة': ['yes', 'يُقضى متفرقاً على أقساط.'],
        'النصرة الخارجة': ['doubt', 'يطول أمره ولا يؤخذ إلا بعضه.'],
        الطريق: ['no', 'لا يُقضى منه شيء.'],
        'العتبة الداخلة': ['no', 'لا يُقضى منه شيء.'],
        'العتبة الخارجة': ['no', 'لا يُقضى منه شيء.'],
        الجماعة: ['doubt', 'يقع الصلح عليه أو على بعضه.'],
        الأنكيس: ['yes', 'يتحول ثم يُقضى.'],
        الأحيان: ['no', 'يتحول ويتعذر تحصيله حتى عند الحاكم.'],
        الحمرة: ['yes', 'يُقضى بعد تأخير.'],
        الاجتماع: ['yes', 'يقع الصلح عليه.'],
        البياض: ['doubt', 'يأخذ المدين من الدائن مالاً آخر.'],
        العقلة: ['yes', 'يُقضى بعضه نقداً وبعضه بعمل.'],
        'نقي الخد': ['doubt', 'يصطلحان على وفائه منقوصاً.'],
        الجودلة: ['no', 'يضيع ويُستهلك رهنه.'],
      };
      const t = T[name(h(s, 1))];
      const lines = [inLine(s, 1)];
      if (!t) {
        lines.push('لم يذكر الكتاب حكم هذا الشكل في هذا الباب.');
        return answer('doubt', 'لا حكم في هذا الضرب.', lines);
      }
      return answer(t[0], t[1], lines);
    },
  },
  {
    id: 'b1-deposit',
    field: 'الديون والودائع',
    title: 'هل ترجع الوديعة؟',
    page: 121,
    // (1+4)+7: fortunate → yes, otherwise no (ص١٢١).
    judge: s => {
      const a = sumOf(s, 1, 4);
      const r = sum(a, h(s, 7));
      const lines = [sumLine([1, 4], a), `ومع ${hl(7)} خرج ${shown(r)}.`];
      return isGood(r)
        ? answer('yes', 'نعم، ترجع الوديعة.', lines)
        : answer('no', 'لا، لا ترجع.', lines);
    },
  },

  // ——— السرقة والضائع ———
  {
    id: 'b1-came-back',
    field: 'السرقة والضائع',
    title: 'هل يرجع ما خرج من يدك؟',
    page: 121,
    // A figure from the earth rows of 1, 12, 7, 2 (ص١٢١).
    judge: s => {
      const f = layer(s, 3, [1, 12, 7, 2]);
      const k = kind(f);
      const lines = [
        `من سطر التراب في البيوت 1 و12 و7 و2 خرج ${shown(f)}، وهو ${k}.`,
      ];
      if (isGood(f) && k === 'داخل') {
        return answer('yes', 'نعم، يعود إليك بخير.', lines);
      }
      if (isGood(f) && k === 'خارج') {
        return answer('doubt', 'الأمل في عودته ضعيف.', lines);
      }
      if (isBad(f) && k === 'خارج') {
        return answer('no', 'لا، لا يعود.', lines);
      }
      lines.push('هذه الحال لم يذكرها الكتاب بوضوح.');
      return answer('doubt', 'لا حكم واضحاً في هذا الضرب.', lines);
    },
  },

  // ——— المال والتجارة ———
  {
    id: 'b1-profit',
    field: 'المال والتجارة',
    title: 'هل يحصل ربح ورزق؟',
    page: 123,
    // (9+7)+15 (ص١٢٣).
    judge: s => {
      const a = sumOf(s, 9, 7);
      const r = sum(a, h(s, 15));
      return byNature(
        r,
        'نعم، الربح كثير.',
        'الربح قليل جداً، وربما لا يحصل.',
        'الربح متوسط.',
        [sumLine([9, 7], a), `ومع ${hl(15)} خرج ${shown(r)}.`],
      );
    },
  },
  {
    id: 'b1-sell-or-buy',
    field: 'المال والتجارة',
    title: 'البيع أفضل الآن أم الشراء؟',
    page: 124,
    // The first and the fifteenth (ص١٢٤).
    judge: s => {
      const a = h(s, 1);
      const b = h(s, 15);
      const lines = [
        `${inLine(s, 1)} وهو ${kind(a)}.`,
        `${inLine(s, 15)} وهو ${kind(b)}.`,
      ];
      const moving = (f: Figure) => kind(f) === 'خارج' || kind(f) === 'منقلب';
      const still = (f: Figure) => kind(f) === 'داخل' || kind(f) === 'ثابت';
      if (isGood(a) && isGood(b) && moving(a) && moving(b)) {
        return answer('info', 'البيع أفضل.', lines);
      }
      if (isGood(a) && isGood(b) && still(a) && still(b)) {
        return answer('info', 'الشراء أفضل.', lines);
      }
      if (isBad(a) && isBad(b)) {
        return answer('no', 'لا هذا ولا ذاك؛ يُخشى الخسارة.', lines);
      }
      lines.push('هذه الحال لم يذكرها الكتاب.');
      return answer('doubt', 'لا ترجيح في هذا الضرب.', lines);
    },
  },
  {
    id: 'b1-buy',
    field: 'المال والتجارة',
    title: 'هل في الشراء خير؟',
    page: 124,
    // 1 with its witness 3, and 6 with its witness 8; equal → the balance
    // (ص١٢٤).
    judge: s => {
      const hs = [1, 3, 6, 8];
      const good = hs.filter(n => isGood(h(s, n))).length;
      const bad = hs.filter(n => isBad(h(s, n))).length;
      const lines = [
        `البيوت 1 و3 و6 و8: ${hs.map(n => shown(h(s, n))).join('، ')}.`,
      ];
      if (good === 4) {
        return answer('yes', 'نعم، الخير فيما تشتريه.', lines);
      }
      if (bad >= 3) {
        return answer('no', 'الأفضل ألا تشتري.', lines);
      }
      if (good === 2 && bad === 2) {
        lines.push(`تساوت، فالحكم بالميزان: ${inLine(s, 15)}`);
        return byNature(
          h(s, 15),
          'نعم، في الشراء خير.',
          'الأفضل ألا تشتري.',
          'لا ترجيح.',
          lines,
        );
      }
      return answer('doubt', 'لا ترجيح واضحاً.', lines);
    },
  },
  {
    id: 'b1-sale-profit',
    field: 'المال والتجارة',
    title: 'هل يربح ما تبيعه؟',
    page: 124,
    // The second and the sixth (ص١٢٤).
    judge: s => {
      const a = h(s, 2);
      const b = h(s, 6);
      const lines = [
        `${inLine(s, 2)} وهو ${kind(a)}.`,
        `${inLine(s, 6)} وهو ${kind(b)}.`,
      ];
      const moving = (f: Figure) => kind(f) === 'خارج' || kind(f) === 'منقلب';
      if (isGood(a) && isGood(b)) {
        return moving(a) && moving(b)
          ? answer('yes', 'نعم، البيع رابح.', lines)
          : answer(
              'doubt',
              'البيع حسن، لكن الكتاب لم يذكر هذه الحال بعينها.',
              lines,
            );
      }
      if (isBad(a) && isBad(b)) {
        return answer('no', 'لا، البيع خاسر.', lines);
      }
      const badOne = isBad(a) ? a : isBad(b) ? b : null;
      if (badOne) {
        lines.push(
          kind(badOne) === 'داخل'
            ? 'والشكل النحس داخل: يلحق المبيع ضرر.'
            : kind(badOne) === 'خارج'
            ? 'والشكل النحس خارج: لا يمسه سوء، لكن تسمع ما تكره.'
            : 'وأحدهما نحس.',
        );
      }
      return answer('doubt', 'الربح متوسط.', lines);
    },
  },
  {
    id: 'b1-year',
    field: 'المال والتجارة',
    title: 'هل يكون العام المقبل رخاء أم غلاء؟',
    page: 125,
    // 1+5 (ص١٢٥).
    judge: s => {
      const r = sumOf(s, 1, 5);
      const lines = [sumLine([1, 5], r)];
      const signs = ['البياض', 'النصرة الداخلة', 'النصرة الخارجة'].filter(
        n => s.houses.filter(f => name(f) === n).length > 1,
      );
      if (signs.length) {
        lines.push(
          `وتكرر في التخت ${signs
            .map(n => `«${n}»`)
            .join(' و')}، وهو علامة رخاء.`,
        );
      }
      return byNature(r, 'رخاء.', 'غلاء.', 'بين الرخاء والغلاء.', lines);
    },
  },
  {
    id: 'b1-prices',
    field: 'المال والتجارة',
    title: 'هل ترتفع الأسعار أم تنخفض؟',
    page: 125,
    // The figures in the fourth and fifth (ص١٢٥).
    judge: s => {
      const cat = (f: Figure) =>
        isOneOf(f, ['الطريق', 'الجماعة', 'الأحيان', 'القبض الداخل'])
          ? 'down'
          : isOneOf(f, [
              'الأنكيس',
              'الحمرة',
              'القبض الخارج',
              'نقي الخد',
              'البياض',
            ])
          ? 'up'
          : 'same';
      const a = cat(h(s, 4));
      const b = cat(h(s, 5));
      const lines = [inLine(s, 4), inLine(s, 5)];
      const T = {
        down: 'تنخفض الأسعار.',
        up: 'ترتفع الأسعار.',
        same: 'تبقى الأسعار على حالها.',
      };
      if (a !== b) {
        lines.push('حكم البيتين مختلف، ولم يذكر الكتاب هذه الحال.');
        return answer('doubt', 'لا ترجيح في هذا الضرب.', lines);
      }
      return answer('info', T[a], lines);
    },
  },
  {
    id: 'b1-living',
    field: 'المال والتجارة',
    title: 'هل تتحسن المعيشة؟',
    page: 126,
    // The tenth with every row flipped, and where it stands (ص١٢٦).
    judge: s => {
      const f = h(s, 10).map(r => (r === 1 ? 2 : 1)) as Figure;
      const at = housesOf(s, f).filter(n => n <= 12)[0];
      const lines = [
        `قُلب شكل ${hl(10)} «${name(h(s, 10))}» فصار «${name(f)}».`,
      ];
      if (!at) {
        lines.push(
          'ولم يوجد في البيوت الاثني عشر الأولى، والكتاب لم يذكر هذه الحال.',
        );
        return answer('doubt', 'لا حكم في هذا الضرب.', lines);
      }
      lines.push(`ووُجد في ${hl(at)}.`);
      if ([1, 4, 7, 10].includes(at)) {
        return answer('yes', 'نعم، تُرجى أحسن.', lines);
      }
      if ([2, 5, 8, 11].includes(at)) {
        return answer('doubt', 'تبقى على حالها.', lines);
      }
      return answer('no', 'لا، يُخشى أن تسوء.', lines);
    },
  },
  {
    id: 'b1-money-whose',
    field: 'المال والتجارة',
    title: 'هل المال للسائل أم لغيره؟',
    page: 128,
    // Open rows of 1 and 8, counted on the houses (ص١٢٨–١٢٩).
    judge: s => {
      const n = openCount(h(s, 1)) + openCount(h(s, 8));
      const lines = [`المفتوح في البيتين 1 و8 = ${n}.`];
      if (n === 0) {
        lines.push('لا مفتوح فيهما، والكتاب لم يذكر هذه الحال.');
        return answer('doubt', 'لا حكم في هذا الضرب.', lines);
      }
      const k = kind(h(s, n));
      lines.push(`فوقع العدّ على ${hl(n)} «${name(h(s, n))}»، وهو ${k}.`);
      return k === 'داخل' || k === 'ثابت'
        ? answer('info', 'المال للسائل.', lines)
        : answer('info', 'المال لغير السائل.', lines);
    },
  },
  {
    id: 'b1-money-out',
    field: 'المال والتجارة',
    title: 'كم يخرج من المال من يدك؟',
    page: 129,
    // The tenth by بزدح, counted on the houses; the open rows of that figure
    // by ranks 1, 10, 100, 1000 (ص١٢٩–١٣٠).
    judge: s => {
      const v = bazdah(h(s, 10));
      const lines = [
        `${inLine(
          s,
          10,
        )} ومفتوحه بحساب بزدح (النار 2، الهواء 7، الماء 4، التراب 8) = ${v}.`,
      ];
      if (v === 0) {
        lines.push('لا مفتوح فيه.');
        return answer('info', 'لا يخرج من يدك شيء.', lines);
      }
      const n = drop(v, 16);
      const f = h(s, n);
      const amount = openRows(f).reduce((a, r) => a + [1, 10, 100, 1000][r], 0);
      lines.push(`فوقع العدّ على ${hl(n)} «${name(f)}».`);
      if (amount === 0) {
        lines.push('وهو مسدود كله.');
        return answer('info', 'لا يخرج من يدك شيء.', lines);
      }
      lines.push(
        `ومفتوحه بحساب المراتب (النار 1، الهواء 10، الماء 100، التراب 1000) = ${amount}.`,
      );
      if (n <= 12) {
        lines.push(
          n <= 4
            ? 'ووقع في الأمهات: من أعلى النقد.'
            : n <= 8
            ? 'ووقع في البنات: من النقد الأضعف.'
            : 'ووقع في الحفيدات: من أضعف النقد.',
        );
      }
      return answer('info', `يخرج نحو ${amount} من وحدات المال.`, lines);
    },
  },
  {
    id: 'b1-money-get',
    field: 'المال والتجارة',
    title: 'هل يحصل لك المال؟',
    page: 130,
    // The open rows of the mothers counted on the houses; the second house
    // with its witnesses 4 and 7 (ص١٣٠–١٣١).
    judge: s => {
      const n = s.mothers.reduce((a, f) => a + openCount(f), 0);
      const lines = [`المفتوح في الأمهات الأربع = ${n}.`];
      const two = h(s, 2);
      const wit = isGood(h(s, 4)) && isGood(h(s, 7));
      const extra = `وللاستشهاد: ${inLine(s, 2)} والبيتان 4 و7 ${
        wit ? 'سعيدان' : 'ليسا سعيدين معاً'
      }.${kind(two) === 'داخل' ? ' والثاني داخل: يدخل المال بعد خروجه.' : ''}`;
      if (n === 0) {
        lines.push('لا مفتوح فيها.', extra);
        return byNature(
          two,
          'نعم، يحصل المال.',
          'لا يحصل.',
          'لا ترجيح.',
          lines,
        );
      }
      const f = h(s, n);
      lines.push(`فوقع العدّ على ${hl(n)} ${shown(f)}.`, extra);
      return byNature(
        f,
        'نعم، يحصل المال.',
        'لا، لا يحصل.',
        'لا ترجيح.',
        lines,
      );
    },
  },
  {
    id: 'b1-money-oath',
    field: 'المال والتجارة',
    title: 'تأكيد حكم المال: هل يحصل؟',
    page: 131,
    // A second shield with 8, 5, 2, 11 as mothers; its angles (ص١٣١–١٣٢).
    judge: s => {
      const t = reCast([h(s, 8), h(s, 5), h(s, 2), h(s, 11)]);
      const ang = ANGLES.map(n => h(t, n));
      const lines = [
        'جُعلت أشكال البيوت 8 و5 و2 و11 أمهات لخط ثانٍ.',
        `وأوتاده (1 و4 و7 و10): ${ang.map(shown).join('، ')}.`,
      ];
      if (ang.every(isGood)) {
        return answer('yes', 'نعم، يحصل المال.', lines);
      }
      if (ang.every(isBad)) {
        return answer('no', 'لا يحصل المال.', lines);
      }
      return answer('doubt', 'يحصل بعد بطء وتعب، إن حصل.', lines);
    },
  },
  {
    id: 'b1-money-source',
    field: 'المال والتجارة',
    title: 'من أين يأتي المال؟',
    page: 132,
    // All points of the sixteen, cast off sevens (ص١٣٢).
    judge: s => {
      const total = s.houses.reduce((a, f) => a + points(f), 0);
      const r = drop(total, 7);
      const T = [
        '',
        'من جهة السلطان أو الحكومة.',
        'من جهة النساء.',
        'من جهة القرابة.',
        'من سفر.',
        'من ميراث.',
        'من تجارة.',
        'من وجه غير حلال؛ فتحرَّ.',
      ];
      return answer('info', T[r], [
        `مجموع نقط الأشكال الستة عشر = ${total}، وبعد إسقاط سبعة سبعة بقي ${r}.`,
      ]);
    },
  },

  // ——— العمل والولاية ———
  {
    id: 'b1-trade-craft',
    field: 'العمل والولاية',
    title: 'التجارة خير لك أم الصنعة؟',
    page: 123,
    // 2+10: leaving or moving → trade, entering or fixed → craft (ص١٢٣–١٢٤).
    judge: s => {
      const r = sumOf(s, 2, 10);
      const k = kind(r);
      const lines = [sumLine([2, 10], r), `وهو ${k}.`];
      return answer(
        'info',
        k === 'خارج' || k === 'منقلب' ? 'التجارة خير لك.' : 'الصنعة خير لك.',
        lines,
      );
    },
  },
  {
    id: 'b1-dismissed',
    field: 'العمل والولاية',
    title: 'هل يرجع المطرود إلى عمله؟',
    page: 104,
    // 6+7: water open and fire closed → yes, the reverse → no (ص١٠٤). The
    // remaining case needs blending and is left out.
    judge: s => {
      const r = sumOf(s, 6, 7);
      const lines = [sumLine([6, 7], r)];
      if (open(r, 2) && !open(r, 0)) {
        return answer('yes', 'نعم، يرجع.', [
          ...lines,
          'ماؤه مفتوح وناره مسدودة.',
        ]);
      }
      if (open(r, 0) && !open(r, 2)) {
        return answer('no', 'لا، لا يرجع.', [
          ...lines,
          'ناره مفتوحة وماؤه مسدود.',
        ]);
      }
      lines.push(
        'النار والماء فيه متساويان، والحكم هنا يحتاج قاعدة الممازجة، ولم يطبقها التطبيق.',
      );
      return answer('doubt', 'لا حكم في هذا الضرب.', lines);
    },
  },
  {
    id: 'b1-job',
    field: 'العمل والولاية',
    title: 'هل تحصل الوظيفة أو المنصب؟',
    page: 133,
    // Where the fifth repeats, its element and the water houses (ص١٣٣–١٣٤).
    judge: s => {
      const f = h(s, 5);
      const at = repeatsOf(s, 5);
      const el = element(f);
      const lines = [
        `${inLine(s, 5)} وعنصره ${el}.`,
        at.length
          ? `ويتكرر في البيوت ${at.join(' و')}.`
          : 'ولا يتكرر في التخت.',
      ];
      const water = WATER_HOUSES.map(n => open(h(s, n), 2));
      if (water[0] && water[1] && !water[2] && !water[3]) {
        lines.push(
          'وماء البيتين 3 و7 مفتوح، وماء 11 و15 مسدود: يسهل أولاً ويتعسر آخراً.',
        );
      } else if (!water[0] && !water[1] && water[2] && water[3]) {
        lines.push(
          'وماء البيتين 11 و15 مفتوح، وماء 3 و7 مسدود: يتعسر أولاً ويسهل آخراً.',
        );
      }
      if (at.some(n => ANGLES.includes(n))) {
        return answer('yes', 'نعم، تنال ما ترجوه وترتفع.', lines);
      }
      if (water.every(Boolean)) {
        lines.push('وسطر الماء مفتوح في بيوت الماء كلها.');
        return answer('no', 'لا تحصل.', lines);
      }
      const light = el === 'نار' || el === 'هواء';
      const inLight = at.some(
        n =>
          ELEMENT_HOUSES['نار'].includes(n) ||
          ELEMENT_HOUSES['هواء'].includes(n),
      );
      const inHeavy = at.some(
        n =>
          ELEMENT_HOUSES['ماء'].includes(n) ||
          ELEMENT_HOUSES['تراب'].includes(n),
      );
      if (light && inLight) {
        return answer('yes', 'نعم، يبشر بنيل الأمل.', lines);
      }
      if (!light && inHeavy) {
        return answer('no', 'لا تحصل.', lines);
      }
      return answer('doubt', 'لا ترجيح واضحاً.', lines);
    },
  },
  {
    id: 'b1-post-lasts',
    field: 'العمل والولاية',
    title: 'هل يبقى العمل والرزق ويزيد؟',
    page: 127,
    // Open rows of 1, 2, 4, 5, 10, 11, 15 cast off twelves; the figure there
    // with its sight, speech, contact and separation (ص١٢٧–١٢٨).
    judge: s => {
      const n = [1, 2, 4, 5, 10, 11, 15].reduce(
        (a, x) => a + openCount(h(s, x)),
        0,
      );
      const at = drop(n, 12);
      const f = h(s, at);
      const four = [nadhar(f), nutq(f), ittisal(f), infisal(f)];
      const good = four.filter(isGood).length;
      const bad = four.filter(isBad).length;
      const lines = [
        `مجموع المفتوح في البيوت 1 و2 و4 و5 و10 و11 و15 = ${n}، وبعد إسقاط اثني عشر بقي ${at}.`,
        `فوقع على ${hl(at)} ${shown(f)}، وهو ${kind(f)}${
          ANGLES.includes(at) ? '، في وتد' : ''
        }.`,
        `نظره «${name(four[0])}»، ونطقه «${name(four[1])}»، واتصاله «${name(
          four[2],
        )}»، وانفصاله «${name(four[3])}».`,
      ];
      if (isGood(f) && good >= bad) {
        return answer('yes', 'نعم، رزقك يزيد وعملك يرتقي.', lines);
      }
      if (isBad(f) && bad >= good) {
        return answer('no', 'يُخشى نقص الرزق أو زوال العمل.', lines);
      }
      return answer('doubt', 'الحال متوسطة.', lines);
    },
  },

  // ——— النفس والحال ———
  {
    id: 'b1-seeker',
    field: 'النفس والحال',
    title: 'هل أنت طالب أم مطلوب؟',
    page: 94,
    // 5+8; open fire and air against open water and earth, then the
    // figure's element (ص٩٤–٩٥).
    judge: s => {
      const r = sumOf(s, 5, 8);
      const fa = (open(r, 0) ? 1 : 0) + (open(r, 1) ? 1 : 0);
      const we = (open(r, 2) ? 1 : 0) + (open(r, 3) ? 1 : 0);
      const lines = [
        sumLine([5, 8], r),
        `المفتوح من النار والهواء ${fa}، ومن الماء والتراب ${we}.`,
      ];
      if (fa !== we) {
        return answer('info', fa > we ? 'أنت طالب.' : 'أنت مطلوب.', lines);
      }
      const el = element(r);
      lines.push(`تساويا، فالحكم بعنصر الشكل: ${el}.`);
      return answer(
        'info',
        el === 'نار' || el === 'هواء' ? 'أنت طالب.' : 'أنت مطلوب.',
        lines,
      );
    },
  },
  {
    id: 'b1-living-thing',
    field: 'النفس والحال',
    title: 'هل ما في الضمير حيوان أم جماد؟',
    page: 96,
    // Open air rows against open earth rows over the sixteen (ص٩٦–٩٧).
    judge: s => {
      const air = s.houses.filter(f => open(f, 1)).length;
      const earth = s.houses.filter(f => open(f, 3)).length;
      const lines = [`مفتوح الهواء في التخت ${air}، ومفتوح التراب ${earth}.`];
      if (air === earth) {
        lines.push('تساويا، ولم يذكر الكتاب هذه الحال.');
        return answer('doubt', 'لا ترجيح في هذا الضرب.', lines);
      }
      return answer('info', air > earth ? 'حيوان.' : 'جماد.', lines);
    },
  },
  {
    id: 'b1-person-sex',
    field: 'النفس والحال',
    title: 'هل المسؤول عنه ذكر أم أنثى؟',
    page: 97,
    // 5+13 by the figure's gender; in the seventh → neither (ص٩٧).
    judge: s => {
      const r = sumOf(s, 5, 13);
      const lines = [sumLine([5, 13], r)];
      if (key7(s, r)) {
        lines.push(`والشكل الخارج نفسه في ${hl(7)}.`);
        return answer('info', 'خنثى.', lines);
      }
      const g = GENDER[name(r)];
      lines.push(
        `و«${name(r)}» من الأشكال ${g === 'ذكر' ? 'المذكرة' : 'المؤنثة'}.`,
      );
      return answer('info', g === 'ذكر' ? 'ذكر.' : 'أنثى.', lines);
    },
  },
  {
    id: 'b1-after',
    field: 'النفس والحال',
    title: 'هل يأتي خير بعد هذا الشخص أو الأمر؟',
    page: 116,
    // (1+5)+15 (ص١١٦).
    judge: s => {
      const a = sumOf(s, 1, 5);
      const r = sum(a, h(s, 15));
      return byNature(r, 'نعم، يأتي خير.', 'يأتي شر.', 'وسط بين ذلك.', [
        sumLine([1, 5], a),
        `ومع ${hl(15)} خرج ${shown(r)}.`,
      ]);
    },
  },
  {
    id: 'b1-distress',
    field: 'النفس والحال',
    title: 'هل يزول الهم والكرب ومتى؟',
    page: 126,
    // 6+12; the figure's number gives the days (ص١٢٦).
    judge: s => {
      const r = sumOf(s, 6, 12);
      const d = numberOf(r);
      const lines = [
        sumLine([6, 12], r),
        `وعدد «${name(r)}» ${d}، فالمدة نحو ${d} يوماً.`,
      ];
      return byNature(
        r,
        `نعم، يزول، في نحو ${d} يوماً.`,
        'يطول الكرب.',
        `يزول بعد مدة، نحو ${d} يوماً.`,
        lines,
      );
    },
  },
  {
    id: 'b1-happiness',
    field: 'النفس والحال',
    title: 'هل تدوم السعادة؟',
    page: 128,
    // Points of the fortunate figures cast off twelves (ص١٢٨). Only purely
    // fortunate figures are counted.
    judge: s => {
      const total = s.houses
        .filter(f => nature(f) === 'سعد')
        .reduce((a, f) => a + points(f), 0);
      const lines = [`مجموع نقط الأشكال السعيدة في التخت = ${total}.`];
      if (total === 0) {
        lines.push('لا شكل سعيداً في التخت.');
        return answer('no', 'يُخشى زوالها.', lines);
      }
      const at = drop(total, 12);
      lines.push(
        `وبعد إسقاط اثني عشر بقي ${at}، فوقع على ${hl(at)} ${shown(h(s, at))}.`,
      );
      return byNature(
        h(s, at),
        'نعم، تدوم السعادة.',
        'يُخشى زوالها.',
        'لا ترجيح.',
        lines,
      );
    },
  },
  {
    id: 'b1-hope',
    field: 'النفس والحال',
    title: 'هل تنجح الحاجة التي ترجوها؟',
    page: 104,
    // Open rows of the sixteen cast off sixteens; the figure there (ص١٠٤–١٠٥).
    judge: s => {
      const n = s.houses.reduce((a, f) => a + openCount(f), 0);
      const at = drop(n, 16);
      const f = h(s, at);
      const k = kind(f);
      const lines = [
        `مجموع المفتوح في التخت = ${n}، وبعد إسقاط ستة عشر بقي ${at}.`,
        `فوقع على ${hl(at)} ${shown(f)}، وهو ${k}.`,
      ];
      if (open(f, 2)) {
        return answer('yes', 'نعم، الأمر ينجح والحاجة تُقضى.', [
          ...lines,
          'وماؤه مفتوح.',
        ]);
      }
      if ((k === 'ثابت' || k === 'داخل') && isGood(f)) {
        return answer('yes', 'تُقضى بعد مدة.', lines);
      }
      if (k === 'خارج' && isGood(f)) {
        return answer('yes', 'تُقضى بسرعة.', lines);
      }
      if (k === 'خارج' && isBad(f)) {
        return answer('no', 'لا تُقضى.', lines);
      }
      if (k === 'منقلب') {
        return isGood(f)
          ? answer('yes', 'تُقضى بعد تردد.', lines)
          : isBad(f)
          ? answer('no', 'لا تُقضى.', lines)
          : answer('doubt', 'لا ترجيح.', lines);
      }
      lines.push('هذه الحال لم يذكرها الكتاب بوضوح.');
      return answer('doubt', 'لا حكم واضحاً في هذا الضرب.', lines);
    },
  },
  {
    id: 'b1-obtained',
    field: 'النفس والحال',
    title: 'هل يحصل المطلوب؟',
    page: 134,
    // The figure of the water rows of 3, 7, 11, 15 (ص١٣٤).
    judge: s => {
      const f = layer(s, 2, WATER_HOUSES);
      const k = kind(f);
      const at = housesOf(s, f);
      const lines = [
        `من سطر الماء في البيوت 3 و7 و11 و15 خرج ${shown(f)}، وهو ${k}.`,
      ];
      if (at.some(n => ANGLES.includes(n))) {
        lines.push('وهو في وتد: سرعة الحصول.');
      }
      if (isBad(f) && k === 'ثابت') {
        lines.push('وهو نحس ثابت.');
      } else if (isBad(f) && k === 'منقلب') {
        lines.push('وهو نحس منقلب: يحصل بعد تعب.');
      } else if (isGood(f)) {
        lines.push('وهو سعد يساعد على الحصول.');
      }
      if (isBad(f) && k === 'ثابت') {
        return answer('no', 'لا يحصل.', lines);
      }
      return open(f, 2)
        ? answer('yes', 'نعم، يحصل الأمر.', [...lines, 'وماؤه مفتوح.'])
        : answer('no', 'لا يحصل.', [...lines, 'وماؤه مسدود.']);
    },
  },
  {
    id: 'b1-need',
    field: 'النفس والحال',
    title: 'هل تُقضى الحاجة؟',
    page: 134,
    // Points of the mothers' heads against their feet (ص١٣٤–١٣٥).
    judge: s => {
      const heads = s.mothers.reduce((a, f) => a + f[0], 0);
      const feet = s.mothers.reduce((a, f) => a + f[3], 0);
      const lines = [`نقط رؤوس الأمهات ${heads}، ونقط أرجلها ${feet}.`];
      if (heads === feet) {
        lines.push('تساويا، ولم يذكر الكتاب هذه الحال.');
        return answer('doubt', 'لا ترجيح في هذا الضرب.', lines);
      }
      return heads > feet
        ? answer('yes', 'نعم، تُقضى.', lines)
        : answer('no', 'لا تُقضى.', lines);
    },
  },
  {
    id: 'b1-need-done',
    field: 'النفس والحال',
    title: 'هل قُضيت الحاجة؟',
    page: 135,
    // The water rows of the water houses, then the eleventh (ص١٣٥).
    judge: s => {
      const w = WATER_HOUSES.map(n => open(h(s, n), 2));
      const lines = [
        `سطر الماء في البيوت 3 و7 و11 و15: ${w
          .map(o => (o ? 'مفتوح' : 'مسدود'))
          .join('، ')}.`,
      ];
      if (w.every(Boolean)) {
        return answer('yes', 'نعم، قُضيت.', lines);
      }
      if (w.every(o => !o)) {
        return answer('no', 'لم تُقضَ.', lines);
      }
      const k = kind(h(s, 11));
      lines.push(`فيُنظر في ${hl(11)} «${name(h(s, 11))}»، وهو ${k}.`);
      return k === 'داخل'
        ? answer('yes', 'نعم، قُضيت.', lines)
        : answer('no', 'لم تُقضَ.', lines);
    },
  },
  {
    id: 'b1-enemies',
    field: 'الأعداء والخصومة',
    title: 'هل لك أعداء في دارك أو عملك؟',
    page: 107,
    // Open rows of the unfortunate figures cast off fives; the figure there,
    // and how often it repeats (ص١٠٧–١٠٨). Only purely unfortunate figures
    // are counted.
    judge: s => {
      const n = s.houses
        .filter(f => nature(f) === 'نحس')
        .reduce((a, f) => a + openCount(f), 0);
      const lines = [`مجموع المفتوح في الأشكال النحسة = ${n}.`];
      if (n === 0) {
        lines.push('لا مفتوح فيها، والكتاب لم يذكر هذه الحال.');
        return answer('doubt', 'لا حكم في هذا الضرب.', lines);
      }
      const at = drop(n, 5);
      const f = h(s, at);
      const count = housesOf(s, f).length;
      lines.push(
        `وبعد إسقاط خمسة خمسة بقي ${at}، فوقع على ${hl(at)} ${shown(
          f,
        )}، وتكرر في التخت ${count} ${count > 2 ? 'مرات' : 'مرة'}.`,
      );
      return isGood(f)
        ? answer('yes', `لك أصدقاء لا أعداء، نحو ${count}.`, lines)
        : isBad(f)
        ? answer('no', `لك أعداء، نحو ${count}.`, lines)
        : answer('doubt', 'لك أعداء وأصدقاء.', lines);
    },
  },
  {
    id: 'b1-secret',
    field: 'الأعداء والخصومة',
    title: 'هل يُكتم السر؟',
    page: 122,
    // The fourteenth and fifteenth (ص١٢٢).
    judge: s => {
      const a = h(s, 14);
      const b = h(s, 15);
      const lines = [
        `${inLine(s, 14)} وهو ${kind(a)}.`,
        `${inLine(s, 15)} وهو ${kind(b)}.`,
      ];
      const kept =
        (isGood(a) && isGood(b) && kind(a) === 'داخل' && kind(b) === 'داخل') ||
        (kind(a) === 'ثابت' && kind(b) === 'ثابت');
      return kept
        ? answer('yes', 'نعم، يُكتم السر.', lines)
        : answer('no', 'لا، يفشو السر.', lines);
    },
  },

  // ——— الغائب والسفر ———
  {
    id: 'b1-comer',
    field: 'الغائب والسفر',
    title: 'هل القادم عليك خير أم شر؟',
    page: 122,
    // 1+4 (ص١٢٢).
    judge: s => {
      const r = sumOf(s, 1, 4);
      return byNature(r, 'القادم خير.', 'القادم شر.', 'القادم وسط.', [
        sumLine([1, 4], r),
      ]);
    },
  },
  {
    id: 'b1-visitors',
    field: 'الغائب والسفر',
    title: 'كم شخصاً يأتيك اليوم؟',
    page: 122,
    // 1+8, its open rows by بزدح (ص١٢٢–١٢٣).
    judge: s => {
      const r = sumOf(s, 1, 8);
      const v = bazdah(r);
      const lines = [
        sumLine([1, 8], r),
        `ومفتوحه بحساب بزدح (النار 2، الهواء 7، الماء 4، التراب 8) = ${v}.`,
      ];
      return answer(
        'info',
        v ? `نحو ${v} أشخاص.` : 'لا يأتيك أحد على الأرجح.',
        lines,
      );
    },
  },
];

/** Does the figure stand in the seventh house? */
function key7(s: Shield, f: Figure): boolean {
  return h(s, 7).join('') === f.join('');
}
