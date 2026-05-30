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
