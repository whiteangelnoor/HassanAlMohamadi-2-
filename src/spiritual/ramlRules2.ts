// Question chapters of «الفلك المشحون في علم الرمل المصون», printed pages
// ١٣٥–١٨٠: the matter done, needs, the day, news, disputes, the prisoner,
// enemies, the ruler and theft. AGPL-3.0-or-later.

import { castShield, Figure, RAML_HOUSES, Shield } from './raml';
import {
  ANGLES,
  BookRule,
  h,
  housesOf,
  isBad,
  isGood,
  isOneOf,
  isOpen,
  kind,
  layer,
  name,
  nature,
  points,
  repeatsOf,
  RuleAnswer,
  inShield,
  sumOf,
  Verdict,
} from './ramlKit';

/** «البيت ٧ (الفراش)». */
const house = (n: number) => `البيت ${n} (${RAML_HOUSES[n - 1]})`;

/** «البيت ١ (الحياة) والبيت ٧ (الفراش)». */
const houses = (ns: number[]) => ns.map(house).join(' و');

/** «البياض»، وهو سعد ثابت. */
const told = (f: Figure) => `«${name(f)}»، وهو ${nature(f)} ${kind(f)}`;

/** A cast completed from four given figures as mothers. */
const shieldFrom = (mothers: Figure[]): Shield =>
  castShield(mothers.flatMap(f => [...f]));

const isIn = (f: Figure) => kind(f) === 'داخل' || kind(f) === 'ثابت';
const isOut = (f: Figure) => kind(f) === 'خارج' || kind(f) === 'منقلب';

/** Fortunate, unfortunate or mixed as a verdict. */
const byNature = (f: Figure): Verdict =>
  isGood(f) ? 'yes' : isBad(f) ? 'no' : 'doubt';

const answer = (
  verdict: Verdict,
  headline: string,
  lines: string[],
): RuleAnswer => ({ verdict, headline, lines });

/** The line for a sum of houses. */
const sumLine = (ns: number[], f: Figure) =>
  `جُمع ${houses(ns)} فخرج ${told(f)}.`;

/** Repeats, in words. */
const repeatsLine = (s: Shield, n: number) => {
  const r = repeatsOf(s, n);
  return r.length
    ? `«${name(h(s, n))}» في ${house(n)} يتكرر في ${r
        .map(x => `البيت ${x}`)
        .join(' و')}.`
    : `«${name(h(s, n))}» في ${house(n)} لا يتكرر في غيره.`;
};

/** Strength order of the dispute chapter (ص١٥٣); null for plain mixed. */
function strength(f: Figure): number | null {
  const k = kind(f);
  if (isGood(f)) {
    return { داخل: 8, ثابت: 7, خارج: 6, منقلب: 5 }[k];
  }
  if (isBad(f)) {
    return { خارج: 4, منقلب: 3, داخل: 2, ثابت: 1 }[k];
  }
  return null;
}

/** Number of single (open) rows over the sixteen houses. */
const openRows = (s: Shield) =>
  s.houses.reduce((a, f) => a + f.filter(r => r === 1).length, 0);

export const RULES_2: BookRule[] = [
  {
    // (ص١٣٥) 1+5, and (1+7)+(10+11).
    id: 'b2-done',
    field: 'النفس والحال',
    title: 'هل يتم الأمر؟',
    page: 135,
    judge(s) {
      const a = sumOf(s, 1, 5);
      const b = sumOf(s, 1, 7, 10, 11);
      const va = byNature(a);
      const vb = byNature(b);
      const v: Verdict = va === vb ? va : 'doubt';
      return answer(
        v,
        v === 'yes'
          ? 'نعم، يتم الأمر.'
          : v === 'no'
          ? 'لا يتم الأمر.'
          : 'الدلائل مختلفة؛ لا ترجيح واضح.',
        [
          sumLine([1, 5], a),
          `وجُمع ${houses([1, 7])} مع ${houses([10, 11])} فخرج ${told(b)}.`,
          'السعد يدل على التمام، والنحس على عدمه.',
        ],
      );
    },
  },
  {
    // (ص١٣٦) 7+10: entering or fixed, the need is met.
    id: 'b2-need-person',
    field: 'النفس والحال',
    title: 'هل تُقضى حاجتي من شخص أرجوه؟',
    page: 136,
    judge(s) {
      const f = sumOf(s, 7, 10);
      const yes = isIn(f);
      return answer(
        yes ? 'yes' : 'no',
        yes ? 'نعم، تحصل حاجتك منه.' : 'لا تحصل حاجتك منه.',
        [
          sumLine([7, 10], f),
          'الداخل والثابت يدلان على الحصول، والخارج والمنقلب على عدمه.',
        ],
      );
    },
  },
  {
    // (ص١٣٧) (1+7)+(5+10), and the figure of the ascendant.
    id: 'b2-end',
    field: 'النفس والحال',
    title: 'ما عاقبة ما أطلبه؟',
    page: 137,
    judge(s) {
      const f = sumOf(s, 1, 7, 5, 10);
      const v = byNature(f);
      const ASC: Record<string, string> = {
        الجماعة: 'العاقبة حميدة سهلة.',
        الأحيان: 'تتعب لغيرك وتقاسي عناءً، والعاقبة حميدة.',
        'النصرة الخارجة': 'تحصل على مطلوبك ثم يخرج من يدك.',
        'القبض الداخل': 'العاقبة حميدة سعيدة.',
        الجودلة: 'فاحذر، فالعاقبة ممتزجة.',
        'نقي الخد': 'تحصل على مطلوبك، والعاقبة جيدة.',
        الحمرة: 'العاقبة مذمومة، إلا لصاحب السلطان فهي جيدة.',
        البياض: 'العاقبة حميدة، إلا لصاحب السلطان فهي مذمومة.',
        العقلة: 'العاقبة مذمومة.',
        'العتبة الداخلة': 'العاقبة سعيدة.',
        'العتبة الخارجة': 'العاقبة رديئة، إلا في حضور الغائب فهي خير.',
        الاجتماع: 'العاقبة جيدة.',
        الأنكيس: 'العاقبة رديئة، إلا في حضور الغائب فهي خير.',
        'النصرة الداخلة': 'العاقبة جيدة حميدة.',
        الطريق: 'العاقبة رديئة.',
      };
      const asc = ASC[name(h(s, 1))];
      return answer(
        v,
        v === 'yes'
          ? 'العاقبة سعيدة.'
          : v === 'no'
          ? 'العاقبة نحسة.'
          : 'العاقبة ممتزجة.',
        [
          `جُمع ${houses([1, 7])} مع ${houses([5, 10])} فخرج ${told(f)}.`,
          asc
            ? `وفي الطالع «${name(h(s, 1))}»: ${asc}`
            : `وفي الطالع «${name(
                h(s, 1),
              )}»، ولم يذكر له الكتاب حكماً في هذا الباب.`,
        ],
      );
    },
  },
  {
    // (ص١٤٥) The turned cast: 1+5, 2+6, 3+7, 4+8 as new mothers; the two
    // figures under the balance give joining.
    id: 'b2-join',
    field: 'الطالب والمطلوب',
    title: 'هل يحصل الاتصال (زواج أو شراكة أو قبض مال)؟',
    page: 145,
    judge(s) {
      const t = shieldFrom([1, 2, 3, 4].map(n => sumOf(s, n, n + 4)));
      const a = h(t, 13);
      const b = h(t, 14);
      const both = (k: string) => kind(a) === k && kind(b) === k;
      const v: Verdict = both('داخل') ? 'yes' : both('خارج') ? 'no' : 'doubt';
      return answer(
        v,
        v === 'yes'
          ? 'نعم، يحصل الاتصال.'
          : v === 'no'
          ? 'لا يحصل الاتصال.'
          : 'لا يبيّن الكتاب حكماً لهذه الحال؛ لا ترجيح.',
        [
          'جُمع كل بيت من الأربعة الأولى مع ما يقابله من الأربعة التالية، وجُعلت أمهات لتخت ثانٍ هو «تخت الانقلاب».',
          `في تخت الانقلاب: السائل ${told(a)}، والمسؤول ${told(b)}.`,
          'إن كانا داخلين فالاتصال حاصل، وإن كانا خارجين فلا.',
        ],
      );
    },
  },
  {
    // (ص١٤٥–١٤٦) The same turned cast for parting.
    id: 'b2-part',
    field: 'الطالب والمطلوب',
    title: 'هل يحصل الانفصال (خروج من حبس أو شفاء أو ترك عمل)؟',
    page: 145,
    judge(s) {
      const t = shieldFrom([1, 2, 3, 4].map(n => sumOf(s, n, n + 4)));
      const a = h(t, 13);
      const b = h(t, 14);
      const both = (k: string) => kind(a) === k && kind(b) === k;
      let v: Verdict = 'doubt';
      let head = 'لا يبيّن الكتاب حكماً لهذه الحال؛ لا ترجيح.';
      if (both('خارج')) {
        v = 'yes';
        head = 'نعم، يحصل المطلوب.';
      } else if (both('داخل')) {
        v = 'no';
        head = 'لا يكون قريباً.';
      } else if (both('ثابت')) {
        v = 'no';
        head = 'يبقى الأمر على حاله.';
      } else if (both('منقلب')) {
        v = 'yes';
        head = 'سيكون التغيّر.';
      }
      return answer(v, head, [
        'جُمع كل بيت من الأربعة الأولى مع ما يقابله من الأربعة التالية، وجُعلت أمهات لتخت ثانٍ هو «تخت الانقلاب».',
        `في تخت الانقلاب: السائل ${told(a)}، والمسؤول ${told(b)}.`,
        'الخارجان للحصول، والداخلان للتأخر، والثابتان للبقاء، والمنقلبان للتغير.',
      ]);
    },
  },
  {
    // (ص١٤٦–١٤٧) 1+7 for the day; and the figure in the eighth.
    id: 'b2-day',
    field: 'النفس والحال',
    title: 'هل يومي خير أم شر؟',
    page: 146,
    judge(s) {
      const f = sumOf(s, 1, 7);
      const v = byNature(f);
      return answer(
        v,
        v === 'yes'
          ? 'يحصل لك الخير في يومك.'
          : v === 'no'
          ? 'في يومك كدر.'
          : 'يومك ممتزج، لا خير خالص ولا شر خالص.',
        [
          sumLine([1, 7], f),
          `وفي ${house(8)} «${name(h(s, 8))}»، وهو ${nature(
            h(s, 8),
          )}، والسعد فيه للسعد والنحس للنحس.`,
        ],
      );
    },
  },
  {
    // (ص١٤٨–١٤٩) The ascendant, and «لسان الأمر» 5+9 by where it repeats.
    id: 'b2-reach',
    field: 'النفس والحال',
    title: 'هل أدرك ما أطلبه؟',
    page: 148,
    judge(s) {
      const asc = h(s, 1);
      const LIST: Record<string, string> = {
        الأحيان: 'فاجتهد في طلبه، فإن لك فيه نصيباً.',
        الأنكيس: 'لا نصيب لك فيه.',
        الجماعة: 'لك ربعه.',
        الطريق: 'تنال شيئاً يسيراً.',
        'النصرة الداخلة': 'أقدم ولا تخف، فإنك تسعد.',
        'النصرة الخارجة': 'تناله بعد مدة ويشاركك فيه شريك.',
        'العتبة الداخلة': 'أقدم تسعد.',
        'العتبة الخارجة': 'التأخير فيه أولى.',
        الجودلة: 'تظفر به بواسطة.',
        'نقي الخد': 'تدرك نصفه.',
        الاجتماع: 'تدرك نصفه.',
        البياض: 'تبلغ مرادك.',
        الحمرة: 'تأخّر عنه، فهو مذموم.',
      };
      const k = kind(asc);
      const v: Verdict = k === 'داخل' ? 'yes' : k === 'خارج' ? 'no' : 'doubt';
      const lines = [`في الطالع ${told(asc)}. الداخل يُدرك والخارج لا يُدرك.`];
      const l = LIST[name(asc)];
      if (l) {
        lines.push(`ولـ«${name(asc)}» في هذا الباب: ${l}`);
      }
      const tongue = sumOf(s, 5, 9);
      const where = housesOf(s, tongue).filter(x => x <= 12);
      lines.push(`ولسان الأمر: ${sumLine([5, 9], tongue)}`);
      if (isGood(tongue) && where.length) {
        const x = where[0];
        lines.push(
          ANGLES.includes(x)
            ? `وهو في البيت ${x} من الأوتاد: يُقضى في الحال.`
            : [2, 5, 8, 11].includes(x)
            ? `وهو في البيت ${x} مما يلي الأوتاد: يُقضى في المستقبل.`
            : `وهو في البيت ${x} من السواقط: الوقت قد مضى.`,
        );
      } else if (isBad(tongue)) {
        lines.push('ولسان الأمر نحس، فحكم الوقت فيه بالضد.');
      }
      return answer(
        v,
        v === 'yes'
          ? 'نعم، تدركه، فامضِ إليه.'
          : v === 'no'
          ? 'لا تدركه.'
          : 'الطالع ليس داخلاً ولا خارجاً؛ انظر التفاصيل.',
        lines,
      );
    },
  },
  {
    // (ص١٤٩) The angles as mothers of a second cast; its angles decide.
    id: 'b2-keep',
    field: 'العمل والولاية',
    title: 'هل يثبت ما في يدي من رزق أو وظيفة؟',
    page: 149,
    judge(s) {
      const t = shieldFrom(ANGLES.map(n => h(s, n)));
      const GOOD = [
        'الأحيان',
        'النصرة الداخلة',
        'النصرة الخارجة',
        'القبض الداخل',
        'العتبة الداخلة',
        'الاجتماع',
      ];
      const found = ANGLES.map(n => h(t, n)).filter(f => isOneOf(f, GOOD));
      const yes = found.length > 0;
      return answer(
        yes ? 'yes' : 'no',
        yes ? 'نعم، ما في يدك ثابت.' : 'لا يثبت ما في يدك.',
        [
          'جُعلت الأوتاد (البيوت ١ و٤ و٧ و١٠) أمهات لتخت ثانٍ.',
          `أوتاد التخت الثاني: ${ANGLES.map(n => `«${name(h(t, n))}»`).join(
            '، ',
          )}.`,
          yes
            ? `فيها ${found
                .map(f => `«${name(f)}»`)
                .join(' و')}، وهي من أشكال الثبات.`
            : 'ليس فيها شيء من أشكال الثبات (الأحيان، النصرتان، القبض الداخل، العتبة الداخلة، الاجتماع).',
        ],
      );
    },
  },
  {
    // (ص١٥٠–١٥١) The ascendant's kind; its points rule; its figure list.
    id: 'b2-rumor',
    field: 'النفس والحال',
    title: 'هل الخبر الشائع صدق؟',
    page: 150,
    judge(s) {
      const asc = h(s, 1);
      const yes = isIn(asc);
      const total = [1, 9, 10, 13].reduce((a, n) => a + points(h(s, n)), 0) + 9;
      const rest = total % 8 || 8;
      const LISTS: [string[], string][] = [
        [
          [
            'البياض',
            'الحمرة',
            'القبض الداخل',
            'النصرة الداخلة',
            'النصرة الخارجة',
            'الاجتماع',
          ],
          'ما وصلك من الخبر حق.',
        ],
        [
          ['الطريق', 'العتبة الداخلة', 'الجودلة', 'نقي الخد'],
          'بعضه صدق وبعضه كذب.',
        ],
        [['الجماعة', 'الأحيان', 'الأنكيس'], 'فيه مبالغة، والأمر دون ما وصلك.'],
        [['العقلة', 'القبض الخارج', 'العتبة الخارجة'], 'كل ما وصلك باطل.'],
      ];
      const l = LISTS.find(([ns]) => isOneOf(asc, ns));
      // The two ways must agree, else the news is mixed.
      const agree = yes === (rest % 2 === 1);
      const v: Verdict = !agree ? 'doubt' : yes ? 'yes' : 'no';
      const head = !agree
        ? 'الدلائل مختلفة: في الخبر صدق وكذب.'
        : yes
        ? 'الخبر صدق.'
        : 'الخبر كذب.';
      return answer(v, head, [
        `في الطالع ${told(asc)}. الداخل والثابت للصدق، والخارج والمنقلب للكذب.`,
        `وبطريقة النقط: نقط البيوت ١ و٩ و١٠ و١٣ مع تسعة = ${total}، وبعد طرح ثمانية ثمانية يبقى ${rest}، وهو ${
          rest % 2 ? 'فرد فالخبر حق' : 'زوج فالخبر غير صادق'
        }.`,
        ...(l ? [`ولشكل الطالع «${name(asc)}» في هذا الباب: ${l[1]}`] : []),
      ]);
    },
  },
  {
    // (ص١٥١) The asker 13 against the one asked about 14.
    id: 'b2-right',
    field: 'الأعداء والخصومة',
    title: 'أيّ الطرفين صاحب الحق: أنا أم الآخر؟',
    page: 151,
    judge(s) {
      const a = h(s, 13);
      const b = h(s, 14);
      let v: Verdict = 'doubt';
      let head = 'الطرفان متساويان في الدلالة؛ لا ترجيح.';
      if (isGood(a) && !isGood(b)) {
        v = 'yes';
        head = 'الحق معك.';
      } else if (isGood(b) && !isGood(a)) {
        v = 'no';
        head = 'الحق مع الطرف الآخر.';
      }
      return answer(v, head, [
        `${house(13)}: «${name(a)}» (${nature(a)}).`,
        `${house(14)}: «${name(b)}» (${nature(b)}).`,
        'أيهما كان سعداً فهو صاحب الحق، وأيهما كان نحساً فهو صاحب الباطل.',
      ]);
    },
  },
  {
    // (ص١٥١–١٥٣) The first 1 against the seventh 7 by the order of strength.
    id: 'b2-court',
    field: 'الأعداء والخصومة',
    title: 'من يظفر في الخصومة أو المحكمة؟',
    page: 153,
    judge(s) {
      const a = h(s, 1);
      const b = h(s, 7);
      const sa = strength(a);
      const sb = strength(b);
      let v: Verdict = 'doubt';
      let head = 'الطرفان متكافئان؛ لا ترجيح.';
      if (sa !== null && sb !== null && sa !== sb) {
        v = sa > sb ? 'yes' : 'no';
        head = sa > sb ? 'أنت تظفر.' : 'خصمك يظفر.';
      }
      const lines = [
        `الطالب في ${house(1)}: ${told(a)}.`,
        `المطلوب في ${house(7)}: ${told(b)}.`,
        'ترتيب القوة: السعد الداخل ثم الثابت ثم الخارج ثم المنقلب، ثم النحس الخارج ثم المنقلب ثم الداخل ثم الثابت.',
      ];
      if (sa === null || sb === null) {
        lines.push('وفيهما شكل ممتزج، ولم يضعه الكتاب في هذا الترتيب.');
      }
      lines.push(
        `القاضي في ${house(10)}: «${name(h(s, 10))}» (${nature(
          h(s, 10),
        )})، والعاقبة في ${house(15)}: «${name(h(s, 15))}» (${nature(
          h(s, 15),
        )}).`,
      );
      return answer(v, head, lines);
    },
  },
  {
    // (ص١٥٤–١٥٥ و١٦٤) The ninth figure; the fire rows; the open rows by four.
    id: 'b2-winner',
    field: 'الأعداء والخصومة',
    title: 'من الغالب في النزاع: أنا أم الطرف الآخر؟',
    page: 154,
    judge(s) {
      const nine = h(s, 9);
      const NINE: [string[], Verdict, string][] = [
        [
          [
            'الأحيان',
            'العتبة الداخلة',
            'القبض الداخل',
            'النصرة الداخلة',
            'نقي الخد',
          ],
          'no',
          'الطرف الآخر يغلب.',
        ],
        [
          ['القبض الخارج', 'العتبة الخارجة', 'النصرة الخارجة', 'الجودلة'],
          'yes',
          'أنت تغلب.',
        ],
        [
          ['الجماعة', 'الاجتماع', 'العقلة', 'الطريق'],
          'doubt',
          'يحصل تراضٍ بينكما على أمر معلوم.',
        ],
        [['البياض', 'الأنكيس'], 'no', 'يُحبس السائل ثم يخرج بضمانة.'],
      ];
      const hit = NINE.find(([ns]) => isOneOf(nine, ns));
      const mine = layer(s, 0, [1, 2, 9, 13]);
      const theirs = layer(s, 0, [5, 6, 11, 14]);
      const fire =
        isGood(mine) && !isGood(theirs)
          ? 'وهو يشهد لك بالغلبة.'
          : isGood(theirs) && !isGood(mine)
          ? 'وهو يشهد للطرف الآخر بالغلبة.'
          : 'ولا ترجيح بينهما.';
      const r = openRows(s) % 4;
      const COUNT = [
        'يطول بينكما النزاع',
        'أنت تغلب',
        'الطرف الآخر يغلب',
        'تصطلحان',
      ];
      const BY_COUNT: Verdict[] = ['doubt', 'yes', 'no', 'doubt'];
      const v = hit ? hit[1] : BY_COUNT[r];
      const head = hit ? hit[2] : `${COUNT[r]}.`;
      return answer(v, head, [
        hit
          ? `في ${house(9)} «${name(nine)}».`
          : `في ${house(9)} «${name(
              nine,
            )}»، ولم يذكر له الكتاب حكماً في هذا الباب، فالحكم بعدد الصفوف المفردة.`,
        `ومن صفّ النار في البيوت ١ و٢ و٩ و١٣ خرج لك «${name(mine)}» (${nature(
          mine,
        )})، ومن صفّ النار في البيوت ٥ و٦ و١١ و١٤ خرج للآخر «${name(
          theirs,
        )}» (${nature(theirs)})، ${fire}`,
        `وعدد الصفوف المفردة في التخت ${openRows(
          s,
        )}، وبعد طرح أربعة أربعة يبقى ${r || 4}: ${COUNT[r]}.`,
      ]);
    },
  },
  {
    // (ص١٦١) (1+7)+(10+15).
    id: 'b2-quarrel-end',
    field: 'الأعداء والخصومة',
    title: 'ما عاقبة الخلاف بيني وبين خصمي؟',
    page: 161,
    judge(s) {
      const f = sumOf(s, 1, 7, 10, 15);
      const v = byNature(f);
      return answer(
        v,
        v === 'yes'
          ? 'عاقبة الأمر بينكما خير.'
          : v === 'no'
          ? 'عاقبة الأمر بينكما شر.'
          : 'العاقبة ممتزجة.',
        [`جُمع ${houses([1, 7])} مع ${houses([10, 15])} فخرج ${told(f)}.`],
      );
    },
  },
  {
    // (ص١٦٥–١٦٨) 1+13; then 1+3, 3+15, the sixth and twelfth, the fifth's fire.
    id: 'b2-prison-out',
    field: 'السجن',
    title: 'هل يخرج المسجون؟',
    page: 166,
    judge(s) {
      const f = sumOf(s, 1, 13);
      const yes = isOut(f);
      const lines = [
        `${sumLine(
          [1, 13],
          f,
        )} الخارج والمنقلب للخروج، والثابت والداخل للخروج بعد مدة طويلة.`,
      ];
      const b = sumOf(s, 1, 3);
      const BY = (x: Figure) =>
        isGood(x) && kind(x) === 'خارج'
          ? 'يخرج بهناء'
          : isBad(x) && kind(x) === 'خارج'
          ? 'لا يخرج إلا بنكد'
          : isBad(x) && kind(x) === 'داخل'
          ? 'لا يخرج'
          : nature(x) === 'ممتزج'
          ? 'يتحرك حركة يعقبها ندم'
          : null;
      const lb = BY(b);
      if (lb) {
        lines.push(`${sumLine([1, 3], b)} ${lb}.`);
      }
      const c = sumOf(s, 3, 15);
      const lc = BY(c);
      if (lc) {
        lines.push(`${sumLine([3, 15], c)} ${lc}.`);
      }
      const six = h(s, 6);
      const twelve = h(s, 12);
      lines.push(
        kind(six) === 'خارج' && kind(twelve) === 'خارج'
          ? `وفي ${house(6)} و${house(12)} شكلان خارجان: يخرج${
              isOut(h(s, 15)) ? '، والميزان يشهد بالخروج' : ''
            }.`
          : `و${house(6)} و${house(12)} ليسا خارجين معاً.`,
      );
      lines.push(
        isOpen(h(s, 5), 0)
          ? `ونار ${house(5)} مفتوحة: يخلص سريعاً.`
          : `ونار ${house(5)} مسدودة: خلاصه أبطأ.`,
      );
      return answer(
        yes ? 'yes' : 'no',
        yes ? 'نعم، يخرج.' : 'يخرج بعد مدة طويلة.',
        lines,
      );
    },
  },
  {
    // (ص١٦٧–١٦٨) (1+6)+(12+15), and (3+12)+(1+4).
    id: 'b2-prison-end',
    field: 'السجن',
    title: 'ما عاقبة المسجون؟',
    page: 167,
    judge(s) {
      const a = sumOf(s, 1, 6, 12, 15);
      const b = sumOf(s, 3, 12, 1, 4);
      const va = byNature(a);
      const vb = byNature(b);
      const v: Verdict = va === vb ? va : 'doubt';
      return answer(
        v,
        v === 'yes'
          ? 'عاقبته خير.'
          : v === 'no'
          ? 'عاقبته شر.'
          : 'الدلائل مختلفة؛ لا ترجيح واضح.',
        [
          `جُمع ${houses([1, 6])} مع ${houses([12, 15])} فخرج ${told(a)}.`,
          `وجُمع ${houses([3, 12])} مع ${houses([1, 4])} فخرج ${told(b)}.`,
        ],
      );
    },
  },
  {
    // (ص١٦٦) 1+10 and where it repeats.
    id: 'b2-prison-whose',
    field: 'السجن',
    title: 'في سجن من هو المسجون؟',
    page: 166,
    judge(s) {
      const f = sumOf(s, 1, 10);
      const at = housesOf(s, f);
      const WHO: [number, string][] = [
        [6, 'في سجن قاضٍ أو أمير'],
        [12, 'في سجن سلطان'],
        [8, 'في سجن والٍ صاحب منصب'],
      ];
      const hit = WHO.filter(([n]) => at.includes(n));
      return answer(
        'info',
        hit.length
          ? `هو ${hit.map(([, t]) => t).join('، أو ')}.`
          : 'لا يبيّن التخت ذلك.',
        [
          sumLine([1, 10], f),
          at.length ? `ويقع في البيوت ${at.join(' و')}.` : 'ولا يقع في التخت.',
          'في السادس سجن قاضٍ أو أمير، وفي الثاني عشر سجن سلطان، وفي الثامن سجن والٍ.',
        ],
      );
    },
  },
  {
    // (ص١٦٩) The ascendant and the twelfth; 1+12; repeats of 12 and 8.
    id: 'b2-enemies',
    field: 'الأعداء والخصومة',
    title: 'هل لي أعداء؟',
    page: 169,
    judge(s) {
      const one = h(s, 1);
      const tw = h(s, 12);
      let v: Verdict = 'doubt';
      let head = 'الدلائل مختلفة؛ لا ترجيح واضح.';
      if (isGood(one) && isGood(tw)) {
        v = 'no';
        head = 'ليس لك عدو، ومن عاداك ينقلب صديقاً.';
      } else if (isBad(one) && isBad(tw)) {
        v = 'yes';
        head = 'لك أعداء.';
      }
      const lines = [
        `في ${house(1)} «${name(one)}» (${nature(one)})، وفي ${house(
          12,
        )} «${name(tw)}» (${nature(tw)}).`,
      ];
      const end = sumOf(s, 1, 12);
      lines.push(`وعاقبتك مع أعدائك: ${sumLine([1, 12], end)}`);
      const r12 = repeatsOf(s, 12);
      if (r12.includes(2)) {
        lines.push(
          'والثاني عشر يتكرر في الثاني: الأعداء من خدمك أو من يعمل لك.',
        );
      }
      if (r12.includes(4) || r12.includes(13)) {
        lines.push(
          'والثاني عشر يتكرر في الرابع أو الثالث عشر: الأعداء ممن يُنسبون إليك.',
        );
      }
      if (isBad(h(s, 11)) && isBad(tw)) {
        lines.push(
          'وفي الحادي عشر والثاني عشر نحسان: قد ينقلب بعض أحبائك عدواً.',
        );
      }
      if (isOneOf(tw, ['الحمرة']) || isOneOf(h(s, 11), ['الحمرة'])) {
        lines.push('وفيها الحمرة: يقع عدوك في مصيبة تشغله عنك.');
      }
      const r8 = repeatsOf(s, 8);
      if (r8.length) {
        lines.push(
          `وسبب ${isGood(h(s, 8)) ? 'الصلح' : 'العداوة'} من شأن ${house(
            r8[0],
          )}، لأن شكل الثامن يتكرر فيه.`,
        );
      }
      return answer(v, head, lines);
    },
  },
  {
    // (ص١٧٠–١٧٣) The angles, and where the tenth repeats.
    id: 'b2-ruler',
    field: 'العمل والولاية',
    title: 'ما حال الحاكم أو المسؤول وثباته؟',
    page: 170,
    judge(s) {
      const REP: Record<number, string> = {
        1: 'مهاب قوي في أمره، ذو سياسة، محبوب عند رعيته.',
        2: 'يظفر بالمال وينتصر على الأعداء وتميل إليه الرعية.',
        3: 'محمود السيرة، ورع عادل محبوب عند الناس.',
        4: 'لا يترك أمره لغيره، حازم في رأيه.',
        5: 'عزيز في ذاته، له نفوذ، طالب للزيادة.',
        6: 'ضعيف سقيم، ومن طبعه الجور.',
        7: 'جائر كثير الفتن والخصومات.',
        8: 'ضعيف في سلطانه، كثير الخوف، تقوى عليه الرعية.',
        9: 'كثير الأسفار والحركة، يقيم الحق ويعمل للآخرة.',
        11: 'عادل مستقيم، كثير المال، محسن إلى رعيته محبوب.',
        12: 'فساد أمره وضعف طاعته، تخونه خدامه ويذهب ماله فيما لا ينفع.',
        13: 'طريقه مفتوح لكن حوائجه معوّقة، قليل الراحة.',
        14: 'يثبت أمره ويبلغ ما أراد بلا تعسير.',
        15: 'يتمكن ويقوى في مكانه.',
        16: 'بطيء الحركة، مهموم، يتّكل على غيره.',
      };
      const angles = ANGLES.map(n => h(s, n));
      const fixed = angles.every(f => kind(f) === 'ثابت');
      const lines = [
        `الأوتاد: ${ANGLES.map(
          n => `البيت ${n} «${name(h(s, n))}» (${kind(h(s, n))})`,
        ).join('، ')}.`,
      ];
      const r = repeatsOf(s, 10);
      for (const x of r) {
        if (REP[x]) {
          lines.push(`العاشر يتكرر في البيت ${x}: ${REP[x]}`);
        }
      }
      if (!r.length) {
        lines.push('والعاشر لا يتكرر في غيره.');
      }
      const end = sumOf(s, 1, 4, 7, 10);
      lines.push(`وعاقبة أمره من الأوتاد: ${sumLine([1, 4, 7, 10], end)}`);
      const v = byNature(end);
      return answer(
        fixed ? 'yes' : v,
        fixed
          ? 'الأوتاد كلها ثابتة: هو ثابت في مكانه.'
          : v === 'yes'
          ? 'عاقبة أمره خير.'
          : v === 'no'
          ? 'عاقبة أمره شر.'
          : 'عاقبة أمره ممتزجة.',
        lines,
      );
    },
  },
  {
    // (ص١٧٤) Any of four figures in the cast.
    id: 'b2-theft-real',
    field: 'السرقة والضائع',
    title: 'هل السرقة حقيقية؟',
    page: 174,
    judge(s) {
      const MARK = ['الحمرة', 'نقي الخد', 'العتبة الخارجة', 'القبض الخارج'];
      const found = MARK.filter(n => s.houses.some(f => name(f) === n));
      const yes = found.length > 0;
      return answer(
        yes ? 'yes' : 'no',
        yes ? 'نعم، السرقة واقعة.' : 'السرقة غير واقعة.',
        [
          yes
            ? `ظهر في التخت ${found.map(n => `«${n}»`).join(' و')}.`
            : 'لم يظهر في التخت شيء من الحمرة ونقي الخد والعتبة الخارجة والقبض الخارج.',
          'ظهور أحد هذه الأشكال علامة وقوع السرقة.',
        ],
      );
    },
  },
  {
    // (ص١٧٥–١٧٦) The first and second against the seventh and eighth; the
    // twelfth and fourteenth; repeats of the sixth, seventh and eighth.
    id: 'b2-theft-return',
    field: 'السرقة والضائع',
    title: 'هل يرجع المسروق؟',
    page: 175,
    judge(s) {
      const g = (n: number) => isGood(h(s, n));
      const b = (n: number) => isBad(h(s, n));
      let v: Verdict = 'doubt';
      if (g(1) && g(2) && b(7) && b(8)) {
        v = 'yes';
      } else if (b(1) && b(2) && g(7) && g(8)) {
        v = 'no';
      } else if (g(2) && b(8)) {
        v = 'yes';
      } else if (b(2) && g(8)) {
        v = 'no';
      }
      const lines = [
        `${[1, 2, 7, 8]
          .map(n => `${house(n)} «${name(h(s, n))}» (${nature(h(s, n))})`)
          .join('، ')}.`,
        'سعد الأول والثاني مع نحس السابع والثامن للرجوع، والعكس لعدمه؛ وإن اختلفت فالحكم للثاني والثامن.',
      ];
      const k12 = kind(h(s, 12));
      const k14 = kind(h(s, 14));
      if (k12 === k14) {
        lines.push(
          {
            داخل: 'والثاني عشر والرابع عشر داخلان: لا بد من رجوعها.',
            خارج: 'والثاني عشر والرابع عشر خارجان: لا ترجع.',
            ثابت: 'والثاني عشر والرابع عشر ثابتان: ترجع بمشقة.',
            منقلب:
              'والثاني عشر والرابع عشر منقلبان: يرجع السعد بسهولة والنحس بصعوبة.',
          }[k12],
        );
      }
      const r6 = repeatsOf(s, 6);
      if (r6.includes(13)) {
        lines.push('والسادس يتكرر في الثالث عشر: ترجع السرقة.');
      } else if (r6.includes(14)) {
        lines.push('والسادس يتكرر في الرابع عشر: لا ترجع.');
      }
      const thief = repeatsOf(s, 7).some(x => x <= 4);
      const money = repeatsOf(s, 8).some(x => x <= 4);
      if (thief || money) {
        lines.push(
          thief && money
            ? 'والسابع والثامن يتكرران في الأمهات: تظفر بالمال وبالسارق.'
            : thief
            ? 'والسابع يتكرر في الأمهات: تظفر بالسارق.'
            : 'والثامن يتكرر في الأمهات: تظفر بالمال.',
        );
      }
      return answer(
        v,
        v === 'yes'
          ? 'نعم، يرجع المسروق.'
          : v === 'no'
          ? 'لا يرجع المسروق.'
          : 'الدلائل متكافئة؛ لا ترجيح واضح.',
        lines,
      );
    },
  },
  {
    // (ص١٧٦–١٧٧) Which figures repeat in the seventh, and where it repeats.
    id: 'b2-thief',
    field: 'السرقة والضائع',
    title: 'من السارق وما مصيره؟',
    page: 176,
    judge(s) {
      const in7 = (n: number) => repeatsOf(s, n).includes(7);
      const who: string[] = [];
      if (in7(1)) {
        who.push('السائل نفسه هو السارق.');
      }
      if (repeatsOf(s, 1).includes(2) && in7(3)) {
        who.push('السارق من أعوان السائل.');
      }
      if (in7(4)) {
        who.push('السارق من أهل البيت أو الأقارب.');
      }
      if (in7(5)) {
        who.push('السارق من أهل صاحب الدار أو أولاده.');
      }
      if (in7(6)) {
        who.push('السارق من الجيران أو الخدم.');
      }
      const r7 = repeatsOf(s, 7);
      if (r7.includes(8)) {
        who.push('السارق غريب بعيد.');
      }
      if (repeatsOf(s, 6).includes(9)) {
        who.push('السارق سينتقل من بيته أو يسافر من البلد.');
      }
      const FATE: Record<number, string> = {
        10: 'يمسكه الحاكم.',
        11: 'يقع في يد الحاكم وينجو.',
        12: 'يقع أمام الحاكم ويُقرّ بالسرقة ويظهرها.',
        13: 'ينجو بالسرقة ولا يُضبط.',
        14: 'يُضبط وتؤخذ منه السرقة وينال عقوبة شديدة.',
        15: 'يخرج من البلد سالماً.',
        16: 'قد سافر، ورجوع السرقة بعيد.',
      };
      const fate = r7.filter(x => FATE[x]).map(x => FATE[x]);
      return answer(
        'info',
        who[0] ?? fate[0] ?? 'لا يبيّن التخت السارق في هذا الباب.',
        [repeatsLine(s, 7), ...who, ...fate],
      );
    },
  },
  {
    // (ص١٧٧) The count of the seventh in the cast.
    id: 'b2-thieves',
    field: 'السرقة والضائع',
    title: 'كم عدد السارقين؟',
    page: 177,
    judge(s) {
      const n = housesOf(s, h(s, 7)).length;
      return answer('info', n === 1 ? 'السارق واحد.' : `عدد السارقين ${n}.`, [
        `شكل ${house(7)} «${name(h(s, 7))}» يظهر في التخت ${n} ${
          n === 1 ? 'مرة' : 'مرات'
        } (${housesOf(s, h(s, 7)).join(' و')}).`,
        'عدد ظهوره هو عدد السارقين.',
      ]);
    },
  },
  {
    // (ص١٧٨) (1+5)+(7+9) found in the cast.
    id: 'b2-theft-town',
    field: 'السرقة والضائع',
    title: 'هل المسروق ما زال في البلد؟',
    page: 178,
    judge(s) {
      const f = sumOf(s, 1, 5, 7, 9);
      const yes = inShield(s, f);
      return answer(
        yes ? 'yes' : 'no',
        yes ? 'نعم، المسروق في البلد.' : 'المسروق خرج من البلد.',
        [
          `جُمع ${houses([1, 5])} مع ${houses([7, 9])} فخرج «${name(f)}».`,
          yes
            ? `وهو موجود في التخت (البيت ${housesOf(s, f).join(' و')}).`
            : 'وهو غير موجود في التخت.',
        ],
      );
    },
  },
  {
    // (ص١٧٨–١٧٩) The third and fourth: in or out of town.
    id: 'b2-left-town',
    field: 'الغائب والسفر',
    title: 'هل خرج الغائب أو المطلوب من البلد؟',
    page: 178,
    judge(s) {
      const a = h(s, 3);
      const b = h(s, 4);
      let v: Verdict;
      let head: string;
      if (isOut(a) && isOut(b)) {
        v = 'yes';
        head = 'نعم، هو خارج البلد.';
      } else if (isIn(a) && isIn(b)) {
        v = 'no';
        head = 'لا، هو داخل البلد.';
      } else if (isIn(a)) {
        v = 'doubt';
        head = 'هو قريب الخروج.';
      } else {
        v = 'yes';
        head = 'خرج من البلد، لكنه قريب الرجوع.';
      }
      return answer(v, head, [
        `في ${house(3)} ${told(a)}، وفي ${house(4)} ${told(b)}.`,
        'الخارج والمنقلب للخروج، والداخل والثابت للبقاء.',
      ]);
    },
  },
  {
    // (ص١٧٩) The eighth and the second.
    id: 'b2-stolen-state',
    field: 'السرقة والضائع',
    title: 'ما حال المسروق؟',
    page: 179,
    judge(s) {
      const e = h(s, 8);
      const t = h(s, 2);
      const EIGHT = {
        داخل: 'السرقة موجودة لم يُتصرف فيها.',
        خارج: 'قد تصرف فيها السارق.',
        ثابت: 'السارق متوقف متحير فيها.',
        منقلب: 'تصرف السارق في بعضها.',
      }[kind(e)];
      const TWO = {
        داخل: 'لم تخرج.',
        ثابت: 'لم تخرج من الدار.',
        خارج: 'خرجت.',
        منقلب: 'خرجت.',
      }[kind(t)];
      return answer('info', EIGHT, [
        `في ${house(8)} ${told(e)}: ${EIGHT}`,
        `وفي ${house(2)} ${told(t)}: ${TWO}`,
        `ومكانها يُعرف من شكل ${house(10)} «${name(h(s, 10))}».`,
      ]);
    },
  },
  {
    // (ص١٨٠) (1+7)+15 and where it falls.
    id: 'b2-theft-direction',
    field: 'السرقة والضائع',
    title: 'في أي جهة المسروق؟',
    page: 180,
    judge(s) {
      const f = sumOf(s, 1, 7, 15);
      const at = housesOf(s, f);
      const DIR = (x: number) =>
        x <= 4 ? 'الشرق' : x <= 8 ? 'الغرب' : x <= 12 ? 'الشمال' : 'الجنوب';
      if (!at.length) {
        return answer('info', 'لا يبيّن التخت الجهة.', [
          `جُمع ${houses([1, 7])} ثم ${house(15)} فخرج «${name(f)}».`,
          'وهو غير موجود في التخت، ولم يذكر الكتاب حكم هذه الحال.',
        ]);
      }
      return answer('info', `المسروق في جهة ${DIR(at[0])}.`, [
        `جُمع ${houses([1, 7])} ثم ${house(15)} فخرج «${name(f)}».`,
        `وهو في البيت ${at[0]}. الأمهات للشرق، والبنات للغرب، والحفيدات للشمال، والأربعة الأخيرة للجنوب.`,
      ]);
    },
  },
  {
    // (ص١٨٠) The fourth; and the seventh with the twelfth.
    id: 'b2-thief-present',
    field: 'السرقة والضائع',
    title: 'هل السارق بين المتهمين؟',
    page: 180,
    judge(s) {
      const four = h(s, 4);
      const yes = isIn(four);
      const s7 = h(s, 7);
      const s12 = h(s, 12);
      const lines = [
        `في ${house(4)} ${told(
          four,
        )}. الداخل والثابت: السارق بين المتهمين؛ والخارج والمنقلب: ليس بينهم.`,
      ];
      if (isIn(s7) && isIn(s12)) {
        lines.push(
          `و${house(7)} و${house(12)} داخلان أو ثابتان: يؤكد أنه بينهم.`,
        );
      } else if (isOut(s7) && isOut(s12)) {
        lines.push(
          `و${house(7)} و${house(12)} خارجان أو منقلبان: يؤكد أنه ليس بينهم.`,
        );
      }
      return answer(
        yes ? 'yes' : 'no',
        yes ? 'نعم، السارق بين المتهمين.' : 'السارق ليس بين المتهمين.',
        lines,
      );
    },
  },
];
