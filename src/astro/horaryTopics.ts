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
      'الراتب والدخل',
      'هل أسترد ديناً لي',
      'شيء ضائع أو مفقود',
      'شراء أو بيع شيء منقول',
    ],
  },
  {
    house: 3,
    title: 'الإخوة والأخبار والتنقل',
    matters: [
      'العلاقة مع الإخوة والأقارب',
      'الجيران',
      'رسالة أو خبر أنتظره',
      'هل الخبر صحيح',
      'سفر قريب',
      'السيارة والتنقل',
      'الدورات والدراسة الأولى',
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
    ],
  },
  {
    house: 5,
    title: 'الأولاد والحب والمخاطرة',
    matters: [
      'الحمل',
      'العلاقة العاطفية',
      'الهدايا والمناسبات',
      'المضاربة والمخاطرة',
    ],
  },
  {
    house: 6,
    title: 'المرض والعمال',
    matters: ['المرض وعاقبته', 'المرؤوسون والعمال', 'الحيوانات الأليفة'],
  },
  {
    house: 7,
    title: 'الزواج والشراكة والخصوم',
    matters: [
      'الزواج',
      'الخطبة',
      'عودة الزوج أو الحبيب',
      'الطلاق والانفصال',
      'الشراكة والتعاقد',
      'الصفقة والطرف الآخر',
      'القضية والنزاع',
      'السرقة والسارق',
    ],
  },
  {
    house: 8,
    title: 'الميراث والديون',
    matters: [
      'الميراث والوصية',
      'القرض والدين الذي عليّ',
      'مال الشريك أو الزوج',
      'التأمين والتعويض',
    ],
  },
  {
    house: 9,
    title: 'السفر البعيد والعلم والدين',
    matters: [
      'سفر بعيد أو هجرة',
      'عودة المسافر',
      'الدراسة الجامعية',
      'الحج والعمرة',
      'الرؤيا والمنام',
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
      'المشروع والمهنة',
      'السمعة والشهرة',
      'الحكومة وأصحاب السلطة',
    ],
  },
  {
    house: 11,
    title: 'الأصدقاء والآمال',
    matters: ['تحقق أمنية', 'الدعم والمساندة', 'الجماعة والمؤسسة'],
  },
  {
    house: 12,
    title: 'الخفايا والسجن',
    matters: [
      'عدو خفي أو مكيدة',
      'خروج السجين',
      'الحزن والهموم',
      'المستشفى والعزلة',
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
