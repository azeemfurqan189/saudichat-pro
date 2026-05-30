const DIALECT_MAP: Record<string, string> = {
  'ابغى': 'أريد',
  'ابي': 'أريد',
  'ابغا': 'أريد',
  'وش': 'ما',
  'وشلون': 'كيف',
  'كيف الحال': 'كيف حالك',
  'زين': 'جيد',
  'تمام': 'حسناً',
  'يلا': 'هيا',
  'حلو': 'جميل',
  'كذا': 'هكذا',
  'وين': 'أين',
  'ليش': 'لماذا',
  'شلون': 'كيف',
  'مره': 'جداً',
  'حبه': 'قليل',
  'دحين': 'الآن',
  'بكرة': 'غداً',
  'امس': 'أمس',
};

export function mapSaudiDialect(text: string): string {
  let result = text;
  for (const [dialect, standard] of Object.entries(DIALECT_MAP)) {
    result = result.replace(new RegExp(dialect, 'gi'), standard);
  }
  return result;
}

export function detectLanguage(text: string): 'ar' | 'en' | 'ur' {
  const arabicPattern = /[\u0600-\u06FF]/;
  const urduPattern = /[\u0600-\u06FF\u0750-\u077F]/;

  if (/^[a-zA-Z\s\d.,!?]+$/.test(text)) return 'en';
  if (urduPattern.test(text) && text.includes('ہ') || text.includes('ں')) return 'ur';
  if (arabicPattern.test(text)) return 'ar';
  return 'ar';
}
