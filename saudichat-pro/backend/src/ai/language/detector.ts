const ARABIC_RE = /[\u0600-\u06FF]/;
const URDU_EXTRA = /[\u0750-\u077F]/;

/** Roman Urdu written in Latin script (e.g. "kia hal hai", "delivery kitna time") */
const ROMAN_URDU_RE =
  /\b(aap|ap|apny|apka|mujhe|mujhy|mujhay|kya|kia|hai|hain|ho|hoon|hun|batao|bata|batayein|krna|karna|karo|kitna|kitni|kitne|kaise|kesy|kesay|kyun|kyu|shukriya|salam|theek|thik|nahi|nah|yeh|ye|wo|mera|meri|restaurant|khana|madad|pochna|pocho|lagta|lagty|lagti|der|ghante|minut|delivery|deliver|sawal|jawab|bataien|batao|about|bata|btao|karo|krdo|chahiye|chahye|batao|bata do)\b/i;

export type DetectedLanguage = 'ar' | 'ur' | 'en' | 'mixed';

export function detectLanguage(text: string): DetectedLanguage {
  const trimmed = text.trim();
  if (!trimmed) return 'en';

  const hasArabic = ARABIC_RE.test(trimmed);
  const hasUrduScript = URDU_EXTRA.test(trimmed);
  const hasEnglish = /[a-zA-Z]/.test(trimmed);
  const hasRomanUrdu = ROMAN_URDU_RE.test(trimmed);

  if (hasRomanUrdu && hasEnglish && !hasArabic) return 'ur';
  if (hasUrduScript && !hasEnglish && !hasArabic) return 'ur';
  if (hasArabic && !hasEnglish) return 'ar';
  if (hasEnglish && !hasArabic && !hasUrduScript) return 'en';
  if (hasArabic && hasEnglish) return 'mixed';
  if (hasUrduScript || hasRomanUrdu) return 'ur';
  if (hasArabic) return 'ar';
  if (hasEnglish) return 'en';
  return 'mixed';
}

export function getToneInstruction(tone?: string): string {
  switch (tone) {
    case 'formal':
      return 'Use formal, professional language.';
    case 'friendly':
      return 'Use warm, friendly conversational tone.';
    case 'casual':
      return 'Use casual Saudi dialect where appropriate.';
    default:
      return 'Match the user language and tone politely.';
  }
}

export function getLanguageInstruction(lang: DetectedLanguage): string {
  switch (lang) {
    case 'en':
      return 'IMPORTANT: Reply ONLY in English. Do not use Arabic or Urdu unless the user explicitly asks for translation.';
    case 'ar':
      return 'IMPORTANT: Reply ONLY in Arabic.';
    case 'ur':
      return 'IMPORTANT: Reply ONLY in Urdu (or Roman Urdu if the user writes in Roman Urdu).';
    case 'mixed':
      return 'Reply using the same language mix as the user (e.g. Arabic + English if they used both).';
    default:
      return 'Reply in the same language as the user.';
  }
}

/** Single-language reply when possible; bilingual only for mixed input. */
export function pickLocalized(
  lang: DetectedLanguage,
  en: string,
  ar: string,
  ur?: string
): string {
  switch (lang) {
    case 'en':
      return en;
    case 'ar':
      return ar;
    case 'ur':
      return ur ?? en;
    case 'mixed':
    default:
      return `${ar}\n${en}`;
  }
}

export function bilingualFallback(lang: DetectedLanguage): string {
  return pickLocalized(
    lang,
    'Thank you for contacting us! How can I help you today?',
    'شكراً لتواصلك! كيف يمكنني مساعدتك؟',
    'Shukriya! Main aap ki kaise madad kar sakta hoon?'
  );
}
