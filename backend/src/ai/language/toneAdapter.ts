import { DetectedLanguage } from './detector';

export type ToneStyle = 'formal' | 'friendly' | 'casual';

export interface PersonaSettings {
  tone?: ToneStyle;
  businessType?: string;
  brandName?: string;
}

export function getToneFromSettings(settings: Record<string, unknown>): ToneStyle {
  const persona = (settings.aiPersona as PersonaSettings) || {};
  const tone = persona.tone || settings.aiTone;
  if (tone === 'formal' || tone === 'friendly' || tone === 'casual') return tone;
  const bizType = String(settings.businessType || persona.businessType || '').toLowerCase();
  if (bizType.includes('enterprise') || bizType.includes('clinic') || bizType.includes('legal')) {
    return 'formal';
  }
  if (bizType.includes('restaurant') || bizType.includes('cafe') || bizType.includes('retail')) {
    return 'friendly';
  }
  return 'friendly';
}

export function buildPersonaPrompt(settings: Record<string, unknown>, lang: DetectedLanguage): string {
  const tone = getToneFromSettings(settings);
  const persona = (settings.aiPersona as PersonaSettings) || {};
  const brand = persona.brandName || settings.businessName || 'the business';

  const toneLines: Record<ToneStyle, string> = {
    formal: 'Use formal, respectful language suitable for professional services.',
    friendly: 'Use warm, welcoming language suitable for restaurants and retail.',
    casual: 'Use casual Saudi/Gulf dialect where appropriate — still polite.',
  };

  const langLine =
    lang === 'ar'
      ? 'Reply in Arabic.'
      : lang === 'ur'
        ? 'Reply in Urdu or Roman Urdu as the user writes.'
        : lang === 'en'
          ? 'Reply in English.'
          : 'Match the user language mix.';

  return `You represent ${brand}. ${toneLines[tone]} ${langLine}`;
}

export function adaptTonePrefix(settings: Record<string, unknown>, lang: DetectedLanguage): string {
  const tone = getToneFromSettings(settings);
  if (lang === 'ar') {
    if (tone === 'formal') return 'حياك الله';
    if (tone === 'casual') return 'هلا!';
    return 'أهلاً وسهلاً';
  }
  if (lang === 'ur') {
    if (tone === 'formal') return 'Assalam-o-Alaikum';
    return 'Salam!';
  }
  if (tone === 'formal') return 'Welcome';
  return 'Hi there!';
}
