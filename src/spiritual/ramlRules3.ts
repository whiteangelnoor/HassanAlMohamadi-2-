// Question chapters of «الفلك المشحون في علم الرمل المصون», printed pages
// 181–211: theft and hidden things, the runaway and the absent, travel and
// moving, the sick. Chapters that judge death, that need a name, the moon's
// mansion, the Zanati ordering, «الباطن» or blending (الممازجة) are left out.
// AGPL-3.0-or-later.

import { castShield, Figure, figureInfo, RAML_HOUSES, Shield } from './raml';
import {
  BookRule,
  h,
  housesOf,
  inShield,
  isBad,
  isGood,
  isOneOf,
  kind,
  layer,
  name,
  points,
  repeatsOf,
  rowTotal,
  RuleAnswer,
  shown,
  sum,
  sumOf,
  Verdict,
} from './ramlKit';

const houseName = (n: number) => `البيت ${n} (${RAML_HOUSES[n - 1]})`;

/** The four groups of houses and the quarter each points to (ص١٨٦). */
const GROUPS = ['الأمهات', 'البنات', 'الحفيدات', 'السواقط'];
const groupOf = (n: number) => Math.floor((n - 1) / 4);
const QUARTER = ['الشرق', 'الغرب', 'الشمال', 'الجنوب'];

/** Groups (0–3) where a figure stands, without repeats. */
const groupsOf = (s: Shield, f: Figure) => [
  ...new Set(housesOf(s, f).map(groupOf)),
];

const element = (f: Figure) => figureInfo(f).element;

/** Gender of each figure (ص٦٩); the two «خنثى» lean as the book says. */
const MALE = [
  'الأحيان',
  'الحمرة',
  'النصرة الخارجة',
  'الاجتماع',
  'الطريق',
  'القبض الخارج',
  'الجماعة',
  'الجودلة',
];
const isMale = (f: Figure) => isOneOf(f, MALE);

/** A figure's day is its planet's day (ص٦٠–٦١); the head as the Sun, the tail as Mars. */
const DAY: Record<string, string> = {
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
const dayOf = (f: Figure) => DAY[figureInfo(f).planet];

/** Number of open (single) rows of one element over the sixteen houses. */
const openCount = (s: Shield, row: number) =>
  s.houses.filter(f => f[row] === 1).length;

const ROW_NAMES = ['النار', 'الهواء', 'الماء', 'التراب'];

/** The largest of some values by index, or null on a tie at the top. */
function largest(values: number[]): number | null {
  const top = Math.max(...values);
  const at = values.flatMap((v, i) => (v === top ? [i] : []));
  return at.length === 1 ? at[0] : null;
}

/** «A remainder after casting off n» : a full n when nothing is left. */
const castOff = (x: number, n: number) => ((x - 1) % n) + 1;

const answer = (
  verdict: Verdict,
  headline: string,
  lines: string[],
): RuleAnswer => ({ verdict, headline, lines });

const isIn = (f: Figure) => kind(f) === 'داخل' || kind(f) === 'ثابت';
const isOut = (f: Figure) => kind(f) === 'خارج' || kind(f) === 'منقلب';

export const RULES_3: BookRule[] = [
  // ص١٨١: halve the suspects, then judge by the kind of the 4th figure.
  {
    id: 'b3-thief-half',
    field: 'السرقة والضائع',
    title: 'في أي نصف من المتهمين السارق؟',
    page: 181,
    judge(s) {
      const f = h(s, 4);
      const here = isIn(f);
      return answer(
        'info',
        here
          ? 'السارق في النصف الذي نويته أولاً.'
          : 'السارق في النصف الآخر، لا في الذي نويته.',
        [
          'قسّم المتهمين قسمين، وانوِ أحدهما قبل الضرب.',
          `في ${houseName(4)} ${shown(f)}، وهو شكل ${kind(
            f,
          )}: الداخل والثابت للنصف المنوي، والخارج والمنقلب للآخر.`,
          'ثم قسّم النصف الذي فيه السارق قسمين واضرب من جديد، حتى يبقى واحد.',
        ],
      );
    },
  },
  // ص١٨٣: 2+5+8+11 gives the day; the 4th the place; the 6th the kind.
  {
    id: 'b3-theft-day',
    field: 'السرقة والضائع',
    title: 'في أي يوم ترجع السرقة؟',
    page: 183,
    judge(s) {
      const f = sumOf(s, 2, 5, 8, 11);
      const six = h(s, 6);
      const KIND: Record<string, string> = {
        نار: 'معدن',
        هواء: 'حيوان',
        ماء: 'نبات',
        تراب: 'جماد غير المعدن',
      };
      return answer('info', `ترجع السرقة يوم ${dayOf(f)}.`, [
        `جمع البيوت 2 و5 و8 و11 أعطى «${name(f)}»، وكوكبه ${
          figureInfo(f).planet
        }، ويومه ${dayOf(f)}.`,
        `الشكل في ${houseName(4)} «${name(h(s, 4))}» هو دليل موضع السرقة.`,
        `وفي ${houseName(6)} «${name(six)}»، وعنصره ${element(six)}: فالمسروق ${
          KIND[element(six)]
        }.`,
      ]);
    },
  },
  // ص١٨٤: the 7th is the thief and the 9th its witness.
  {
    id: 'b3-thief-gender',
    field: 'السرقة والضائع',
    title: 'هل السارق رجل أم امرأة؟',
    page: 184,
    judge(s) {
      const a = h(s, 7);
      const b = h(s, 9);
      const lines = [
        `في ${houseName(7)}، وهو دليل السارق، «${name(a)}» (${
          isMale(a) ? 'ذكر' : 'أنثى'
        })، وشاهده ${houseName(9)} «${name(b)}» (${
          isMale(b) ? 'ذكر' : 'أنثى'
        }).`,
      ];
      let head: string;
      if (isOneOf(a, ['الطريق', 'النصرة الخارجة'])) {
        head = 'السارق رجل بلا شك.';
        lines.push(`وجود «${name(a)}» في السابع يدل على الذكر قطعاً.`);
      } else if (isMale(a) && isMale(b)) {
        head = 'السارق رجل.';
      } else if (!isMale(a) && !isMale(b)) {
        head = 'السارق امرأة.';
      } else if (!isMale(a)) {
        head = 'السارق صبي.';
      } else {
        head = 'السارق بنت.';
      }
      const males = s.houses.filter(isMale).length;
      lines.push(
        `وفي التخت ${males} من الأشكال المذكرة و${
          16 - males
        } مؤنثة، والحكم بالأكثر عند الشك.`,
      );
      return answer('info', head, lines);
    },
  },
  // ص١٨٥: three ways to know whether a place holds something buried.
  {
    id: 'b3-buried-exists',
    field: 'السرقة والضائع',
    title: 'هل في المكان دفين أو خبيئة؟',
    page: 185,
    judge(s) {
      const lines: string[] = [];
      let yes = 0;
      let no = 0;
      const signs = ['القبض الداخل', 'العتبة الداخلة'].filter(n =>
        s.houses.some(f => name(f) === n),
      );
      if (signs.length) {
        yes++;
        lines.push(
          `في التخت ${signs.map(n => `«${n}»`).join(' و')}، وهو علامة الدفين.`,
        );
      } else {
        no++;
        lines.push('ليس في التخت القبض الداخل ولا العتبة الداخلة.');
      }
      const one = h(s, 1);
      const four = h(s, 4);
      if (isOneOf(four, ['الطريق', 'نقي الخد', 'النصرة الخارجة'])) {
        no++;
        lines.push(
          `في ${houseName(4)}، بيت ما تحت الأرض، «${name(
            four,
          )}»، وهو من الأشكال الكاذبة: لا شيء فيه.`,
        );
      } else if (isIn(one)) {
        yes++;
        lines.push(
          `الطالع «${name(one)}» شكل ${kind(one)}، وهو يدل على الوجود.`,
        );
      } else {
        no++;
        lines.push(
          `الطالع «${name(one)}» شكل ${kind(one)}، وهو لا يدل على الوجود.`,
        );
      }
      const m = sumOf(s, 4, 15);
      if (isIn(m)) {
        yes++;
        lines.push(
          `جمع البيت 4 والميزان أعطى «${name(m)}»، وهو ${kind(m)}${
            isGood(m) ? ' وسعيد' : ''
          }: في المكان دفين.`,
        );
      } else {
        no++;
        lines.push(
          `جمع البيت 4 والميزان أعطى «${name(m)}»، وهو ${kind(m)}: لا شيء.`,
        );
      }
      const verdict: Verdict = yes > no ? 'yes' : 'no';
      return answer(
        verdict,
        verdict === 'yes'
          ? `في المكان دفين على الأرجح (${yes} من 3 دلائل).`
          : `لا دفين في المكان على الأرجح (${no} من 3 دلائل).`,
        lines,
      );
    },
  },
  // ص١٨٦–١٨٧: the quarter of the place that holds the hidden thing.
  {
    id: 'b3-buried-quarter',
    field: 'السرقة والضائع',
    title: 'في أي ربع من المكان الخبيئة؟',
    page: 186,
    judge(s) {
      // East 1,2,9,13 by fire; north 3,10,11,15 by earth; west 7,8,12,14 by
      // air; south 4,5,6,16 by water.
      const e = layer(s, 0, [1, 2, 9, 13]);
      const n = layer(s, 3, [3, 10, 11, 15]);
      const w = layer(s, 1, [7, 8, 12, 14]);
      const so = layer(s, 2, [4, 5, 6, 16]);
      const f = sum(sum(e, n), sum(w, so));
      const at = groupsOf(s, f);
      const lines = [
        'قُسم المكان أربعة أرباع، وأُخذ من كل ربع شكل من عنصره، ثم جُمعت الأربعة في شكل واحد.',
        `خرج «${name(f)}».`,
      ];
      const key = ['القبض الداخل', 'العتبة الداخلة'].find(x =>
        s.houses.some(g => name(g) === x),
      );
      if (key) {
        const g = s.houses.find(x => name(x) === key)!;
        lines.push(
          `وبالطريقة الأخرى: «${key}» في ${groupsOf(s, g)
            .map(i => `${GROUPS[i]} (${QUARTER[i]})`)
            .join(' و')}.`,
        );
      }
      if (!at.length) {
        lines.push('ولم يظهر هذا الشكل في التخت كله.');
        return answer('no', 'الخبيئة قد نُبشت وأُخرجت.', lines);
      }
      lines.push(
        `وهو في ${at
          .map(i => GROUPS[i])
          .join(
            ' و',
          )}، والأمهات للشرق والبنات للغرب والحفيدات للشمال والسواقط للجنوب.`,
        'ثم قسّم ذلك الربع أربعة أرباع واضرب من جديد حتى ينحصر الموضع.',
      );
      return answer(
        'info',
        `الخبيئة في ${at.map(i => QUARTER[i]).join(' أو ')} من المكان.`,
        lines,
      );
    },
  },
  // ص١٨٩–١٩٠: the kind, worth and age of the hidden thing.
  {
    id: 'b3-buried-kind',
    field: 'السرقة والضائع',
    title: 'ما جنس الخبيئة وقيمتها وعمرها؟',
    page: 189,
    judge(s) {
      const totals = [0, 1, 2, 3].map(r => rowTotal(s, r));
      const i = largest(totals);
      const KIND = ['معدن', 'حيوان', 'نبات', 'جماد غير المعادن'];
      const one = h(s, 1);
      const lines = [
        `نقاط العناصر في التخت: ${ROW_NAMES.map(
          (x, k) => `${x} ${totals[k]}`,
        ).join('، ')}.`,
      ];
      lines.push(
        isGood(one)
          ? `الطالع «${name(one)}» سعيد: الخبيئة ثمينة.`
          : isBad(one)
          ? `الطالع «${name(one)}» نحس: الخبيئة رخيصة.`
          : `الطالع «${name(one)}» ممتزج: لا يُحكم بالقيمة.`,
      );
      const rep = repeatsOf(s, 1);
      const age = rep.some(x => [4, 5, 6].includes(x))
        ? 'جديدة'
        : rep.some(x => [7, 8, 9].includes(x))
        ? 'متوسطة العمر'
        : rep.some(x => [10, 11, 12].includes(x))
        ? 'قديمة'
        : 'متوسطة العمر';
      lines.push(
        rep.length
          ? `تكرر الطالع في البيت ${rep.join(' و')}: الخبيئة ${age}.`
          : 'لم يتكرر الطالع: الخبيئة متوسطة العمر.',
      );
      return answer(
        'info',
        i === null
          ? 'تساوى أكثر العناصر، فلا يُحكم بجنس الخبيئة.'
          : `الخبيئة ${KIND[i]}، ${age}.`,
        lines,
      );
    },
  },
  // ص١٩٠–١٩٢: the direction from (1+5)+(9+3).
  {
    id: 'b3-hidden-direction',
    field: 'السرقة والضائع',
    title: 'في أي جهة المسروق أو المخبوء؟',
    page: 190,
    judge(s) {
      const f = sum(sumOf(s, 1, 5), sumOf(s, 9, 3));
      const DIR: Record<string, string> = {
        نار: 'الشرق',
        هواء: 'الغرب',
        ماء: 'الشمال',
        تراب: 'الجنوب',
      };
      const BY: Record<string, string> = {
        الأنكيس: 'في الربع القبلي (الجنوبي)',
        الأحيان: 'في الربع الشرقي',
        الحمرة: 'في الربع الجنوبي',
        البياض: 'في الربع الشمالي',
        الاجتماع: 'بين الغرب والشمال',
        'القبض الداخل': 'بين الشمال والغرب',
        'القبض الخارج': 'بين الشرق والشمال',
        'النصرة الخارجة': 'في السقف',
        الجماعة: 'خارج المكان أو خارج البلد',
        الطريق: 'خارج المكان أو خارج البلد',
      };
      const lines = [
        `جمع البيوت 1 و5 و9 و3 أعطى «${name(f)}»، وعنصره ${element(
          f,
        )}، والنار للشرق والهواء للغرب والماء للشمال والتراب للجنوب.`,
      ];
      if (BY[name(f)]) {
        lines.push(`وبجدول الجهات: «${name(f)}» يدل على أنه ${BY[name(f)]}.`);
      }
      return answer('info', `الجهة: ${DIR[element(f)]}.`, lines);
    },
  },
  // ص١٩٢–١٩٣: the runaway or stray, by the 6th and the 4th and 7th.
  {
    id: 'b3-runaway-town',
    field: 'الغائب والسفر',
    title: 'هل الهارب أو الضالة ما زال في البلد؟',
    page: 192,
    judge(s) {
      const six = h(s, 6);
      const rep = repeatsOf(s, 6);
      const before = rep.filter(x => [1, 4, 5, 7, 8, 9, 10].includes(x));
      const after = rep.filter(x => x > 10);
      const lines = [
        `دليل الهارب ${houseName(6)} «${name(six)}»${
          rep.length ? `، وتكرر في البيت ${rep.join(' و')}` : '، ولم يتكرر'
        }.`,
      ];
      let verdict: Verdict = 'doubt';
      let head = 'لم يتكرر دليل الهارب في البيوت التي يُحكم بها.';
      if (before.length && after.length) {
        verdict = 'info';
        head = 'خرج من البلد ثم يرجع إليها.';
      } else if (after.length) {
        verdict = 'no';
        head = 'خرج من البلد.';
      } else if (before.length) {
        verdict = 'yes';
        head = 'ما زال في البلد.';
      }
      const a = h(s, 4);
      const b = h(s, 7);
      const both = (p: (f: Figure) => boolean) => p(a) && p(b);
      const k = (f: Figure) => kind(f);
      if (both(isGood) && both(f => k(f) === 'داخل')) {
        lines.push(
          'الرابع والسابع سعيدان داخلان: في المدينة حائر، ويقع في اليد سريعاً.',
        );
      } else if (both(isBad) && both(f => k(f) === 'خارج')) {
        lines.push('الرابع والسابع نحسان خارجان: خرج باختياره.');
      } else if (both(isBad) && both(f => k(f) === 'ثابت')) {
        lines.push('الرابع والسابع نحسان ثابتان: في المدينة، ويرجع أو يُمسك.');
      } else if (both(isGood) && both(f => k(f) === 'منقلب')) {
        lines.push(
          'الرابع والسابع سعيدان منقلبان: في المدينة باختياره، ويرجع.',
        );
      }
      const c = h(s, 6);
      if (k(a) === 'خارج' && k(c) === 'داخل') {
        lines.push(
          'الرابع خارج والسادس داخل: مختبئ في مكان مظلم بغير اختياره، ويقع في اليد.',
        );
      } else if (k(c) === 'خارج' && k(a) === 'داخل') {
        lines.push('السادس خارج والرابع داخل: طليق، لا يقع في اليد.');
      } else if (isBad(a) && isBad(c) && k(a) === 'منقلب' && k(c) === 'منقلب') {
        lines.push(
          'الرابع والسادس نحسان منقلبان: في المدينة خائف يترقب، ويُمسك.',
        );
      } else if (isBad(a) && isBad(c) && k(a) === 'ثابت' && k(c) === 'ثابت') {
        lines.push(
          'الرابع والسادس نحسان ثابتان: يخرج ولا يقع في اليد إلا بتعب.',
        );
      }
      return answer(verdict, head, lines);
    },
  },
  // ص١٩٣–١٩٤: does the runaway come back, and who is he.
  {
    id: 'b3-runaway-back',
    field: 'الغائب والسفر',
    title: 'هل يرجع الهارب؟',
    page: 193,
    judge(s) {
      const f = sumOf(s, 1, 7);
      const back = name(f) === 'الأنكيس';
      const WHO: Record<number, string> = {
        2: 'خادم',
        3: 'أخ أو أخت',
        4: 'أم أو أب',
        5: 'ولد أو بنت',
        6: 'سارق أو متهم',
        7: 'زوج أو زوجة',
      };
      const lines = [
        `البيت الأول للسائل والسابع للهارب، وجمعهما أعطى «${name(f)}»${
          back
            ? '، وهو علامة رجوع الهارب.'
            : '، وليس الأنكيس الذي يدل على الرجوع.'
        }`,
      ];
      const at = s.houses.findIndex(x => name(x) === 'الأنكيس') + 1;
      if (WHO[at]) {
        lines.push(`والأنكيس في البيت ${at}: الهارب ${WHO[at]}.`);
      }
      return answer(
        back ? 'yes' : 'doubt',
        back ? 'يقدم الهارب ويرجع.' : 'لا تظهر علامة رجوع الهارب.',
        lines,
      );
    },
  },
  // ص١٩٤: (1+4)+13 for the lost thing.
  {
    id: 'b3-lost-back',
    field: 'السرقة والضائع',
    title: 'هل يعود الضائع إلى صاحبه؟',
    page: 194,
    judge(s) {
      const f = sum(sumOf(s, 1, 4), h(s, 13));
      const back = isIn(f);
      const ease = isGood(f) ? ' بسهولة' : isBad(f) ? ' بعسر' : '';
      return answer(
        back ? 'yes' : 'no',
        back ? `يرجع الضائع${ease}.` : `لا يرجع الضائع.`,
        [
          `جمع البيت 1 والبيت 4، ثم الناتج مع ${houseName(13)}، أعطى ${shown(
            f,
          )}، وهو ${kind(f)}.`,
          'الداخل والثابت للرجوع، والخارج والمنقلب لعدمه؛ والسعد للسهولة والنحس للعسر.',
        ],
      );
    },
  },
  // ص١٩٤–١٩٥: the asker's side (9,1,2) against the other's (12,7,8).
  {
    id: 'b3-stray-contest',
    field: 'الأعداء والخصومة',
    title: 'من يغلب، وهل ترجع الضالة؟',
    page: 194,
    judge(s) {
      const p = (n: number) => points(h(s, n));
      const a = castOff(p(9) * p(1) * p(2), 12);
      const b = castOff(p(12) * p(7) * p(8), 12);
      const lines = [
        `جانب السائل: نقاط البيوت 9 و1 و2 مضروبة، وبعد إسقاط 12 بقي ${a}.`,
        `جانب المسؤول عنه: نقاط البيوت 12 و7 و8 مضروبة، وبعد إسقاط 12 بقي ${b}.`,
      ];
      const oddA = a % 2 === 1;
      const oddB = b % 2 === 1;
      let asker: boolean | null = null;
      if (!oddA && oddB) {
        asker = false;
      } else if (oddA && !oddB) {
        asker = true;
      } else if (oddA && oddB) {
        asker = a <= b;
        lines.push(
          a === b
            ? 'الباقيان فردان متساويان: يغلب الطالب.'
            : 'الباقيان فردان: الأقل يغلب الأكثر.',
        );
      } else if (a === b) {
        asker = false;
        lines.push('الباقيان زوجان متساويان: يغلب المطلوب.');
      } else {
        lines.push('الباقيان زوجان مختلفان، والكتاب لا يصرّح بحكمهما.');
      }
      if (asker === null) {
        return answer('doubt', 'لا يُحكم في هذا الضرب.', lines);
      }
      return answer(
        asker ? 'yes' : 'no',
        asker
          ? 'السائل يغلب، والضالة ترجع.'
          : 'المسؤول عنه يغلب، والضالة لا ترجع.',
        lines,
      );
    },
  },
  // ص١٩٥–١٩٦: does the journey happen, how, which way and by what.
  {
    id: 'b3-travel',
    field: 'الغائب والسفر',
    title: 'هل يتم السفر، وكيف يكون؟',
    page: 195,
    judge(s) {
      const rep = repeatsOf(s, 1).filter(x => [3, 5, 9].includes(x));
      const three = h(s, 3);
      const one = h(s, 1);
      const lines: string[] = [];
      let verdict: Verdict = 'doubt';
      if (rep.length) {
        verdict = 'yes';
        lines.push(`تكرر الطالع في البيت ${rep.join(' و')}: يتم السفر.`);
      }
      if (kind(three) === 'منقلب') {
        verdict = 'yes';
        lines.push(
          `في ${houseName(3)}، بيت الحركة، «${name(three)}» منقلب: يسافر.`,
        );
      } else if (kind(three) === 'ثابت' && !rep.length) {
        verdict = 'no';
        lines.push(
          `في ${houseName(3)}، بيت الحركة، «${name(three)}» ثابت: لا سفر له.`,
        );
      }
      if ((verdict as Verdict) === 'no') {
        return answer('no', 'لا يتم السفر.', lines);
      }
      lines.push(
        isGood(one)
          ? `الطالع «${name(one)}» سعيد: السفر سعيد.`
          : isBad(one)
          ? `الطالع «${name(one)}» نحس: السفر فيه شدة.`
          : `الطالع «${name(one)}» ممتزج.`,
      );
      const nine = h(s, 9);
      if (isBad(nine)) {
        const WARN: Record<string, string> = {
          نار: 'اللصوص',
          هواء: 'ركوب الدواب',
          ماء: 'الغرق',
          تراب: 'لدغ الهوام',
        };
        lines.push(
          `${houseName(9)}، بيت السفر، فيه «${name(nine)}» وهو نحس: ليحذر من ${
            WARN[element(nine)]
          }.`,
        );
      }
      const seven = h(s, 7);
      lines.push(
        `البلد المقصود (السابع) فيه «${name(seven)}»: ${
          isGood(seven) ? 'هناء' : isBad(seven) ? 'شقاء' : 'حال ممتزج'
        }.`,
      );
      const dir = largest([0, 1, 2, 3].map(r => openCount(s, r)));
      if (dir !== null) {
        lines.push(
          `أكثر العناصر المفتوحة ${ROW_NAMES[dir]}: جهة السفر ${QUARTER[dir]}.`,
        );
      }
      const way = largest([1, 2, 3].map(r => rowTotal(s, r)));
      if (way !== null) {
        lines.push(`السفر ${['جواً', 'بحراً', 'براً'][way]}، بأكثر النقاط.`);
      }
      return answer(
        verdict,
        verdict === 'yes'
          ? 'يتم السفر.'
          : verdict === 'no'
          ? 'لا يتم السفر.'
          : 'لا دليل واضح على تمام السفر.',
        lines,
      );
    },
  },
  // ص١٩٦–١٩٧: has the traveller reached the town he set out for.
  {
    id: 'b3-arrived',
    field: 'الغائب والسفر',
    title: 'هل وصل المسافر إلى البلد الذي قصده؟',
    page: 196,
    judge(s) {
      const f = sum(sumOf(s, 1, 3), sumOf(s, 7, 9));
      const STATE: Record<string, string> = {
        خارج: 'خارج إليها الآن',
        منقلب: 'في الطريق',
        داخل: 'دخل البلاد',
        ثابت: 'وصل إليها واستراح',
      };
      const lines = [
        `جمع البيوت 1 و3 مع 7 و9 أعطى ${shown(f)}، وهو ${kind(f)}.`,
      ];
      const one = h(s, 1);
      const rep = repeatsOf(s, 1);
      if (rep.includes(7)) {
        lines.push('والطالع في السابع: قد وصل.');
      } else if (rep.includes(3) || rep.includes(9)) {
        lines.push('والطالع متكرر في الثالث أو التاسع: هو في الطريق.');
      }
      if (kind(h(s, 4)) === 'خارج' && kind(h(s, 7)) === 'داخل') {
        lines.push('والرابع خارج والسابع داخل: قد وصل.');
      }
      if (kind(one) === 'داخل') {
        lines.push(`والطالع «${name(one)}» داخل: دخل البلاد.`);
      } else if (isOut(one)) {
        lines.push(`والطالع «${name(one)}» ${kind(one)}: لم يدخلها بعد.`);
      }
      lines.push(
        isGood(f)
          ? 'والشكل سعيد: بخير وفرح.'
          : isBad(f)
          ? 'والشكل نحس: فيه تعب.'
          : 'والشكل ممتزج.',
      );
      const arrived = kind(f) === 'داخل' || kind(f) === 'ثابت';
      return answer(
        arrived ? 'yes' : 'no',
        `المسافر ${STATE[kind(f)]}.`,
        lines,
      );
    },
  },
  // ص١٩٧ و٢٠٠: stay or move, by the 1st against the 7th and by the angles.
  {
    id: 'b3-move-or-stay',
    field: 'الغائب والسفر',
    title: 'البقاء خير أم النقلة إلى بلد أو عمل آخر؟',
    page: 197,
    judge(s) {
      const score = (f: Figure) => (isGood(f) ? 1 : isBad(f) ? -1 : 0);
      const a = h(s, 1);
      const b = h(s, 7);
      const lines = [
        `الأول للمكان الذي أنت فيه: «${name(a)}» (${
          figureInfo(a).nature
        }). والسابع لما تقصده: «${name(b)}» (${figureInfo(b).nature}).`,
      ];
      const angles = [1, 4, 7, 10].map(n => h(s, n));
      let byAngles: 'stay' | 'move' | null = null;
      if (angles.every(isIn)) {
        byAngles = 'stay';
        lines.push('والأوتاد كلها ثابتة أو داخلة: البقاء أحسن.');
      } else if (angles.every(isOut)) {
        byAngles = 'move';
        lines.push('والأوتاد كلها خارجة أو منقلبة: الحركة أحسن.');
      }
      if (score(a) > score(b)) {
        return answer('info', 'البقاء في مكانك أفضل.', lines);
      }
      if (score(b) > score(a)) {
        return answer('info', 'النقلة أفضل.', lines);
      }
      lines.push('تساوى الأول والسابع في السعد والنحس.');
      if (byAngles) {
        return answer(
          'info',
          byAngles === 'stay' ? 'البقاء في مكانك أفضل.' : 'النقلة أفضل.',
          lines,
        );
      }
      return answer('doubt', 'لا ترجيح بين البقاء والنقلة.', lines);
    },
  },
  // ص٢٠٢: where the absent is, and whether he comes back.
  {
    id: 'b3-absent-where',
    field: 'الغائب والسفر',
    title: 'في أي جهة الغائب، وهل يرجع؟',
    page: 202,
    judge(s) {
      const f = sumOf(s, 1, 8);
      const at = groupsOf(s, f);
      const DIR = [
        'الشرق',
        'الغرب',
        'جهة البحر (الشمال)',
        'جهة القبلة (الجنوب)',
      ];
      const lines = [
        `جمع البيت 1 والبيت 8 أعطى «${name(f)}»${
          at.length
            ? `، وهو في ${at.map(i => GROUPS[i]).join(' و')}.`
            : '، ولم يظهر في التخت.'
        }`,
      ];
      const total = s.houses.reduce((a, x) => a + points(x), 0);
      const r = castOff(total, 3);
      const back = r % 2 === 0;
      lines.push(
        `ونقاط الأشكال الستة عشر ${total}، وبعد إسقاط ثلاثة ثلاثة بقي ${r}: ${
          back ? 'زوج، فيرجع' : 'فرد، فلا يرجع'
        }.`,
      );
      // The unit of the time: (15·16 points) cast off 12, walked from the
      // ascendant; that figure with the 16th gives days … years by element.
      const step = castOff(points(h(s, 15)) * points(h(s, 16)), 12);
      const u = sum(h(s, step), h(s, 16));
      const UNIT: Record<string, string> = {
        نار: 'أيام',
        هواء: 'أسابيع',
        ماء: 'أشهر',
        تراب: 'سنوات',
      };
      if (back) {
        lines.push(
          `والمدة تُعدّ ${UNIT[element(u)]} («${name(u)}»، عنصره ${element(
            u,
          )}).`,
        );
      }
      const where = at.length
        ? `الغائب في ${at.map(i => DIR[i]).join(' أو ')}`
        : 'لا تظهر جهة الغائب';
      return answer(
        back ? 'yes' : 'no',
        `${where}، و${back ? 'يرجع' : 'لا يرجع'}.`,
        lines,
      );
    },
  },
  // ص٢٠٣–٢٠٤: how the absent lives where he is, and for how long.
  {
    id: 'b3-absent-state',
    field: 'الغائب والسفر',
    title: 'كيف حال الغائب في غربته؟',
    page: 203,
    judge(s) {
      const a = h(s, 7);
      const b = h(s, 9);
      const lines = [
        `ينظر إلى ${houseName(7)} «${name(a)}» (${kind(a)}) و${houseName(
          9,
        )} «${name(b)}» (${kind(b)}).`,
      ];
      const ka = kind(a);
      const kb = kind(b);
      const good = isGood(a) && isGood(b);
      const bad = isBad(a) && isBad(b);
      let head = 'حال الغائب غير واضح في هذا الضرب.';
      if (ka === 'داخل' && kb === 'داخل') {
        head = good
          ? 'الغائب مقيم براحة.'
          : bad
          ? 'الغائب مقيم بتعب.'
          : 'الغائب مقيم.';
      } else if (ka === 'خارج' && kb === 'خارج') {
        head = good
          ? 'الغائب خرج من مكانه بسرور.'
          : bad
          ? 'الغائب خرج من مكانه بهموم.'
          : 'الغائب خرج من مكانه.';
      } else if (ka === 'ثابت' && kb === 'ثابت') {
        head = 'الغائب محبوس أو ممنوع مثقل.';
      } else if (ka === 'منقلب' && kb === 'منقلب') {
        head = 'حال الغائب متغيرة، كثير التنقل.';
      } else if (
        (ka === 'داخل' && kb === 'خارج') ||
        (ka === 'خارج' && kb === 'داخل')
      ) {
        head = 'الغائب متحيّر في أمره.';
      }
      // Duration: (6+7) where it stands; open rows by أبدح (1, 2, 4, 8).
      const f = sumOf(s, 6, 7);
      const at = housesOf(s, f);
      const n = f.reduce<number>(
        (acc, r, i) => acc + (r === 1 ? [1, 2, 4, 8][i] : 0),
        0,
      );
      if (at.length && groupOf(at[0]) <= 1) {
        lines.push(
          `ومدة إقامته: جمع السادس والسابع أعطى «${name(f)}»، وهو في البيت ${
            at[0]
          }؛ عدده ${n}، فالمدة ${n} ${
            groupOf(at[0]) === 0 ? 'يوماً' : 'أسبوعاً'
          }.`,
        );
      }
      return answer('info', head, lines);
    },
  },
  // ص٢٠٥: when the absent comes.
  {
    id: 'b3-absent-when',
    field: 'الغائب والسفر',
    title: 'متى يأتي الغائب؟',
    page: 205,
    judge(s) {
      const f = sumOf(s, 8, 9);
      const at = groupsOf(s, f);
      const lines = [
        `جمع البيت 8 والبيت 9 أعطى «${name(f)}»${
          at.length ? `، وهو في ${GROUPS[at[0]]}.` : '، ولم يظهر في التخت.'
        }`,
      ];
      const WHEN = ['يأتي سريعاً', 'يبطئ', 'تطول غيبته', 'يبطئ كثيراً'];
      let verdict: Verdict = at.length ? 'yes' : 'no';
      let head = at.length ? `${WHEN[at[0]]}.` : 'لا يأتي.';
      if (name(h(s, 8)) === name(h(s, 15))) {
        verdict = 'yes';
        head = 'يأتي في يومه أو ليلته.';
        lines.push('شكل الثامن هو نفسه في الميزان: يأتي في يومه أو ليلته.');
      }
      const rep = repeatsOf(s, 1);
      if (rep.includes(10) || rep.includes(11)) {
        lines.push('الطالع في العاشر أو الحادي عشر: يقدم.');
      } else if (rep.includes(9) || rep.includes(13)) {
        lines.push('الطالع في التاسع أو الثالث عشر: هو في الطريق.');
      }
      if (kind(h(s, 15)) === 'داخل' && kind(h(s, 16)) === 'داخل') {
        lines.push('الخامس عشر والسادس عشر داخلان: يقدم في يومه.');
      }
      const m = h(s, 15);
      if (
        isOneOf(m, ['القبض الداخل', 'النصرة الداخلة', 'الطريق']) &&
        isOneOf(h(s, 9), ['الأنكيس', 'نقي الخد', 'العتبة الداخلة'])
      ) {
        lines.push(
          `في الميزان «${name(m)}» وفي التاسع «${name(h(s, 9))}»: يقدم سريعاً.`,
        );
      } else if (isOneOf(m, ['العقلة', 'الاجتماع'])) {
        lines.push(`في الميزان «${name(m)}»: لا يقدر على الحضور إلا بعد مدة.`);
      }
      const seven = h(s, 7);
      if (seven[0] === 2 && seven[1] === 2) {
        lines.push(
          `في السابع «${name(seven)}» مسدود النار والهواء: الغائب مريض.`,
        );
      }
      const t = h(s, 3);
      if (kind(t) === 'داخل' && kind(m) === 'داخل') {
        lines.push('الثالث والميزان داخلان: يقدم سريعاً.');
      } else if (kind(t) === 'خارج' && kind(m) === 'خارج') {
        lines.push('الثالث والميزان خارجان: يبطئ.');
      }
      return answer(verdict, head, lines);
    },
  },
  // ص٢٠٦: (1+5) found in the shield means he is still in town.
  {
    id: 'b3-absent-in-town',
    field: 'الغائب والسفر',
    title: 'هل الغائب ما زال في البلد؟',
    page: 206,
    judge(s) {
      const f = sumOf(s, 1, 5);
      const here = inShield(s, f);
      return answer(
        here ? 'yes' : 'no',
        here ? 'هو في البلد.' : 'خرج من البلد.',
        [
          `جمع البيت 1 والبيت 5 أعطى «${name(f)}»، و${
            here
              ? `هو موجود في التخت في البيت ${housesOf(s, f).join(' و')}`
              : 'ليس في التخت'
          }.`,
        ],
      );
    },
  },
  // ص٢٠٧: a second shield from houses 1,4,5,6; (5+6)+(5+9) there.
  {
    id: 'b3-absent-soon',
    field: 'الغائب والسفر',
    title: 'هل يأتي الغائب عاجلاً؟',
    page: 207,
    judge(s) {
      const second = castShield(
        [1, 4, 5, 6].flatMap(n => h(s, n).map(r => r as number)),
      );
      const f = sum(sumOf(second, 5, 6), sumOf(second, 5, 9));
      const soon = kind(f) === 'داخل';
      const lines = [
        'جُعلت أشكال البيوت 1 و4 و5 و6 أمهات لتخت ثانٍ.',
        `في التخت الثاني: جمع الخامس والسادس مع الخامس والتاسع أعطى «${name(
          f,
        )}»، وهو ${kind(f)}.`,
      ];
      const way = largest([1, 2, 3].map(r => rowTotal(s, r)));
      if (way !== null) {
        lines.push(`ويأتي ${['جواً', 'بحراً', 'براً'][way]}، بأكثر النقاط.`);
      }
      return answer(
        soon ? 'yes' : 'no',
        soon ? 'يأتي الغائب عاجلاً.' : 'لا يأتي عاجلاً.',
        lines,
      );
    },
  },
  // ص٢٠٩–٢١١: the sick: medicine, doctor and recovery by the four layers.
  {
    id: 'b3-sick',
    field: 'المرض',
    title: 'هل يُشفى المريض، وهل يوافقه الدواء والطبيب؟',
    page: 209,
    judge(s) {
      const fire = layer(s, 0, [1, 5, 9, 13]);
      const air = layer(s, 1, [2, 6, 10, 14]);
      const water = layer(s, 2, [3, 7, 11, 15]);
      const earth = layer(s, 3, [4, 8, 12, 16]);
      const say = (f: Figure, good: string, bad: string) =>
        isGood(f) ? good : isBad(f) ? bad : 'ممتزج، لا يُحكم به.';
      const lines = [
        `نار النار «${name(fire)}»: ${say(
          fire,
          'يُنتظر له الخير.',
          'يُنتظر له الشر في مرضه.',
        )}`,
        `هواء الهواء «${name(air)}»: ${say(
          air,
          'تتجدد فيه الحياة.',
          'يُخاف عليه.',
        )}`,
        `ماء الماء «${name(water)}»: ${say(
          water,
          'يبرأ بإذن الله.',
          'لا يبرأ قريباً.',
        )}`,
        `تراب التراب «${name(earth)}»: ${say(
          earth,
          'يُرجى شفاؤه.',
          'يُخاف عليه.',
        )}`,
      ];
      const seven = h(s, 7);
      const ten = h(s, 10);
      lines.push(
        `الدواء (السابع «${name(seven)}»): ${
          isGood(seven)
            ? 'موافق للعلة.'
            : isBad(seven)
            ? 'غير موافق.'
            : 'ممتزج.'
        }`,
        `الطبيب (العاشر «${name(ten)}»): ${
          isGood(ten) ? 'حسن.' : isBad(ten) ? 'غير حسن.' : 'ممتزج.'
        }`,
      );
      const warn = [1, 3, 6, 8].filter(n =>
        isOneOf(h(s, n), [
          'العقلة',
          'الاجتماع',
          'الجماعة',
          'الجودلة',
          'البياض',
          'النصرة الداخلة',
        ]),
      );
      if (warn.length) {
        lines.push(
          `وفي البيت ${warn.join(
            ' و',
          )} من الأشكال التي يحذر منها الكتاب: الحال تستدعي العناية الشديدة.`,
        );
      }
      const verdict: Verdict = isGood(water)
        ? 'yes'
        : isBad(water)
        ? 'no'
        : 'doubt';
      return answer(
        verdict,
        verdict === 'yes'
          ? 'يُرجى شفاء المريض بإذن الله.'
          : verdict === 'no'
          ? 'المرض لا يزول قريباً.'
          : 'حال المريض متردد.',
        lines,
      );
    },
  },
];
