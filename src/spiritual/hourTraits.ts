// What each planetary hour is held to suit, after the Arabic tradition of
// elections (as in Ghayat al-Hakim); the sources differ in detail and this
// is their common ground. AGPL-3.0-or-later.

import { Planet } from '../astro/traditional';

export interface HourTraits {
  nature: string;
  good: string;
  avoid?: string;
}

export const HOUR_TRAITS: Record<Planet, HourTraits> = {
  sun: {
    nature: 'حارة يابسة، سعد إذا صلح حال الشمس',
    good: 'لقاء الملوك وأصحاب السلطة، طلب الجاه والمنصب، الظهور والشهرة، طلب الحوائج من الكبراء.',
    avoid: 'الأمور الخفية والسرية.',
  },
  venus: {
    nature: 'باردة رطبة، السعد الأصغر',
    good: 'المحبة والتآلف، الزواج والخطبة، الصلح، الزينة واللباس والطيب، الفرح والطرب.',
  },
  mercury: {
    nature: 'ممتزجة، تتبع ما يقارن عطارد',
    good: 'العلم والتعلم، الكتابة والمراسلات، الحساب، التجارة والبيع والشراء، أعمال الذكاء والحيلة.',
  },
  moon: {
    nature: 'باردة رطبة، سريعة',
    good: 'السفر، الرسائل، الأمور التي يُراد لها السرعة، ما يتعلق بالماء، مخالطة العامة.',
    avoid: 'ما يُراد له الثبات والدوام.',
  },
  saturn: {
    nature: 'باردة يابسة، النحس الأكبر',
    good: 'الهدم والتفريق، الأعمال الثقيلة، الأرض والأساسات، ما يُراد له الدوام البطيء.',
    avoid: 'بدء الأعمال في الغالب.',
  },
  jupiter: {
    nature: 'حارة رطبة، السعد الأكبر',
    good: 'طلب الرزق والخير، لقاء العلماء والقضاة وأهل الدين، العقود، الصدقة، كل بداية يُرجى لها البركة.',
  },
  mars: {
    nature: 'حارة يابسة، النحس الأصغر',
    good: 'الخصومة والمواجهة، الجراحة والقطع، الحديد، الصيد، الرياضة الشاقة.',
    avoid: 'الصلح والزواج.',
  },
};
