// House systems offered in the app, with Arabic names. Codes are the Swiss
// Ephemeris ones. Gauquelin sectors (36 cusps) are left out of the wheel.
// AGPL-3.0-or-later.

export interface HouseSystemOption {
  code: string;
  name: string;
  common?: boolean; // listed first
}

export const HOUSE_SYSTEMS: HouseSystemOption[] = [
  { code: 'P', name: 'بلاسيدس', common: true },
  { code: 'W', name: 'البرج الكامل', common: true },
  { code: 'B', name: 'القبيصي', common: true },
  { code: 'R', name: 'ريجيومونتانوس', common: true },
  { code: 'K', name: 'كوخ', common: true },
  { code: 'A', name: 'المتساوية من الطالع', common: true },
  { code: 'O', name: 'بورفيري', common: true },
  { code: 'C', name: 'كامبانوس', common: true },
  { code: 'T', name: 'الطوبوغرافية (بوليتش وبيج)' },
  { code: 'M', name: 'مورينوس' },
  { code: 'D', name: 'المتساوية من وسط السماء' },
  { code: 'V', name: 'المتساوية (فيلو)' },
  { code: 'N', name: 'المتساوية من الحمل' },
  { code: 'X', name: 'الدوران المحوري' },
  { code: 'H', name: 'الأفقية (السمتية)' },
  { code: 'U', name: 'كروشينسكي' },
  { code: 'Y', name: 'نصف قوس الصعود' },
  { code: 'S', name: 'سريباتي' },
  { code: 'F', name: 'كارتر' },
  { code: 'I', name: 'الشمسية' },
  { code: 'i', name: 'الشمسية (الصيغة البديلة)' },
  { code: 'L', name: 'بولن (الانحراف الجيبي)' },
  { code: 'Q', name: 'بولن (النسبة الجيبية)' },
  { code: 'J', name: 'سافارد' },
];

export function houseSystemName(code: string): string {
  return HOUSE_SYSTEMS.find(h => h.code === code)?.name ?? code;
}
