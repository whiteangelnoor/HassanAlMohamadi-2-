// Matters of the twelve houses for horary questions, after the Arabic and
// later books. Each matter is judged by the lord of its house.
// AGPL-3.0-or-later.

import type { MatterKind } from './horaryAnswer';

export interface HouseMatters {
  house: number;
  title: string;
  matters: string[];
}

export const HOUSE_MATTERS: HouseMatters[] = [
  {
    house: 1,
    title: 'النفس والحال',
    matters: [
      'حالي وما يجري لي',
      'صحتي العامة',
      'هل أنجح فيما أنوي',
      'هل أبقى في مكاني',
    ],
  },
  {
    house: 2,
    title: 'المال والملك',
    matters: [
      'هل يأتيني مال أنتظره',
      'شيء ضائع أو مفقود',
      'هل أسترد ديناً لي',
      'شراء أو بيع شيء منقول',
      'الراتب والدخل',
    ],
  },
  {
    house: 3,
    title: 'الإخوة والأقارب',
    matters: [
      'العلاقة مع الإخوة والأقارب',
      'الجيران',
      'سفر قريب',
      'رسالة أو خبر أنتظره',
      'هل الخبر صحيح',
      'الدورات والدراسة الأولى',
      'السيارة والتنقل',
    ],
  },
  {
    house: 4,
    title: 'البيت والعقار',
    matters: [
      'شراء بيت أو أرض',
      'بيع بيت أو عقار',
      'الانتقال إلى سكن جديد',
      'الإيجار',
      'شيء مدفون أو كنز',
      'أمر يخص الأب',
      'عاقبة أمر ونهايته',
    ],
  },
  {
    house: 5,
    title: 'الأولاد والحب',
    matters: [
      'الحمل',
      'أمر يخص الأولاد',
      'العلاقة العاطفية',
      'الهدايا والفرح',
      'الرسول أو الوسيط',
      'المضاربة والمخاطرة',
    ],
  },
  {
    house: 6,
    title: 'المرض والعمل اليومي',
    matters: [
      'المرض وعاقبته',
      'المرؤوسون والعمال',
      'الحيوانات الأليفة',
      'الهموم الصغيرة',
    ],
  },
  {
    house: 7,
    title: 'الزواج والشراكة والخصوم',
    matters: [
      'الزواج',
      'الخطبة',
      'عودة الزوج أو الحبيب',
      'الشراكة والتعاقد',
      'الصفقة والطرف الآخر',
      'القضية والنزاع',
      'السرقة والسارق',
      'الطلاق والانفصال',
    ],
  },
  {
    house: 8,
    title: 'الميراث ومال الغير',
    matters: [
      'الميراث والوصية',
      'مال الشريك أو الزوج',
      'القرض والدين الذي عليّ',
      'التأمين والتعويض',
      'الخوف والقلق الشديد',
      'الأمور الخفية',
    ],
  },
  {
    house: 9,
    title: 'السفر البعيد والعلم',
    matters: [
      'سفر بعيد أو هجرة',
      'عودة المسافر',
      'الدراسة الجامعية',
      'الحج والعمرة',
      'الدين والعلماء',
      'الرؤيا والمنام',
      'القانون والمحاكم العليا',
      'النشر والكتب',
    ],
  },
  {
    house: 10,
    title: 'العمل والمنصب',
    matters: [
      'الحصول على وظيفة',
      'الترقية',
      'البقاء في العمل',
      'السمعة والشهرة',
      'الحكومة وأصحاب السلطة',
      'المشروع والمهنة',
      'أمر يخص الأم',
    ],
  },
  {
    house: 11,
    title: 'الأصدقاء والآمال',
    matters: [
      'تحقق أمنية',
      'أمر يخص صديق',
      'الدعم والمساندة',
      'مال من العمل',
      'الجماعة والمؤسسة',
    ],
  },
  {
    house: 12,
    title: 'الخفايا والسجن',
    matters: [
      'عدو خفي أو مكيدة',
      'خروج السجين',
      'الحزن والهموم',
      'الحيوانات الكبيرة',
      'العزلة والمستشفى',
    ],
  },
];

/** Matters with a chapter of their own. */
export const MATTER_KIND: Record<string, MatterKind> = {
  'شيء ضائع أو مفقود': 'lost',
  'السرقة والسارق': 'theft',
  'المرض وعاقبته': 'sick',
  'عودة المسافر': 'return',
  'عودة الزوج أو الحبيب': 'return',
  الحمل: 'pregnancy',
  'القضية والنزاع': 'contest',
  الزواج: 'marriage',
  الخطبة: 'marriage',
  'الحصول على وظيفة': 'jobGet',
  الترقية: 'jobGet',
  'البقاء في العمل': 'jobStay',
  'شراء بيت أو أرض': 'sale',
  'بيع بيت أو عقار': 'sale',
  'شراء أو بيع شيء منقول': 'sale',
  'سفر بعيد أو هجرة': 'travel',
  'سفر قريب': 'travel',
};

/** Whose matter the question is: the house of that person from the Ascendant. */
export const SUBJECTS: { house: number; label: string }[] = [
  { house: 1, label: 'عن نفسي' },
  { house: 10, label: 'الأم' },
  { house: 4, label: 'الأب' },
  { house: 7, label: 'الزوج أو الشريك' },
  { house: 3, label: 'الأخ أو الأخت' },
  { house: 5, label: 'الابن أو البنت' },
  { house: 11, label: 'صديق' },
  { house: 7, label: 'شخص آخر' },
];

/** Houses whose matters are mostly people, to be described. */
export const PERSON_HOUSES = [3, 4, 5, 7, 10, 11, 12];
