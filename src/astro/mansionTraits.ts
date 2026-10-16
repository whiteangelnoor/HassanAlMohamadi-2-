// What each lunar mansion is held to suit when the Moon is in it, after the
// Arabic books of elections (as in Ghayat al-Hakim); the sources differ in
// detail and in which mansions they count fortunate. AGPL-3.0-or-later.

export interface MansionTraits {
  nature: 'سعد' | 'نحس' | 'ممتزجة';
  good?: string;
  avoid?: string;
}

/** In the order of MANSIONS, al-Sharatan first. */
export const MANSION_TRAITS: MansionTraits[] = [
  { nature: 'ممتزجة', good: 'السفر وشرب الدواء.', avoid: 'الزواج.' },
  {
    nature: 'ممتزجة',
    good: 'حفر الآبار والزرع وطلب الكنوز.',
    avoid: 'السفر.',
  },
  { nature: 'سعد', good: 'كل خير، كالتجارة والصيد والعلم.' },
  {
    nature: 'نحس',
    good: 'التفريق والهدم والخصومة.',
    avoid: 'السفر والزواج.',
  },
  { nature: 'سعد', good: 'التعلّم ولقاء الكبراء وطلب الصحة.' },
  { nature: 'سعد', good: 'المحبة والتآلف والصيد.' },
  { nature: 'سعد', good: 'التجارة والكسب والصداقة والزرع.' },
  { nature: 'ممتزجة', good: 'المحبة والصحبة والسفر.' },
  { nature: 'نحس', avoid: 'الزرع والسفر وبدء الأعمال.' },
  { nature: 'سعد', good: 'المحبة والبناء وطلب الحوائج.' },
  { nature: 'سعد', good: 'السفر والتجارة وفك الأسرى.' },
  { nature: 'ممتزجة', good: 'الزرع والغرس.', avoid: 'ركوب البحر.' },
  { nature: 'سعد', good: 'التجارة والزرع والسفر والزواج.' },
  {
    nature: 'ممتزجة',
    good: 'الزواج والعلاج.',
    avoid: 'السفر في الماء.',
  },
  { nature: 'سعد', good: 'حفر الآبار والكسب وتفريق الأعداء.' },
  {
    nature: 'نحس',
    good: 'فك الأسرى.',
    avoid: 'السفر والزواج والتجارة.',
  },
  { nature: 'سعد', good: 'البناء وتثبيت الأمور والمحبة.' },
  { nature: 'نحس', good: 'الخصومة والانتقام.', avoid: 'بدء الأعمال.' },
  { nature: 'نحس', good: 'الحصار والتفريق.' },
  { nature: 'سعد', good: 'اقتناء الدواب وترويضها والصيد والسفر.' },
  { nature: 'ممتزجة', good: 'البناء والزرع والكسب.' },
  { nature: 'سعد', good: 'العلاج والتداوي.' },
  { nature: 'سعد', good: 'العلاج وفك الأسرى.' },
  { nature: 'سعد', good: 'الزواج والتجارة والصلح وكل خير، وهي أسعدها.' },
  { nature: 'سعد', good: 'البناء والحصار والتحصين.' },
  { nature: 'سعد', good: 'المحبة والتآلف.' },
  { nature: 'سعد', good: 'التجارة والزرع والكسب والعلاج.' },
  { nature: 'سعد', good: 'التجارة والزواج والسفر وجمع الشمل.' },
];

/** One line: "سعد · تصلح لـ: ... · يُكره فيها: ...". */
export function mansionTraitsLine(i: number): string {
  const t = MANSION_TRAITS[i];
  return [
    t.nature,
    t.good ? `تصلح لـ: ${t.good}` : null,
    t.avoid ? `يُكره فيها: ${t.avoid}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}
