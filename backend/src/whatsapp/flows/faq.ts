import prisma from '../../utils/prisma';
import { sendBotMessage } from './router-helpers';
import { DetectedLanguage, pickLocalized } from '../../ai/language/detector';

export async function faqFlow(
  businessId: string,
  conversationId: string,
  phone: string,
  text: string,
  lang: DetectedLanguage = 'mixed'
): Promise<void> {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  const settings = (business?.settings as Record<string, unknown>) || {};
  const workingHours = (settings.workingHours as string) || '9:00 AM - 11:00 PM';

  const lower = text.toLowerCase();
  let response: string;

  if (lower.includes('location') || lower.includes('موقع') || lower.includes('عنوان')) {
    response = pickLocalized(
      lang,
      `📍 ${business?.description || 'Contact us for location details'}`,
      `📍 ${business?.description || 'تواصل معنا لمعرفة العنوان'}`
    );
  } else if (lower.includes('price') || lower.includes('سعر')) {
    response = pickLocalized(
      lang,
      '💰 Prices are in our menu. Type "menu" to view.',
      '💰 الأسعار متوفرة في قائمتنا. اكتب "قائمة" لعرضها.'
    );
  } else {
    response = pickLocalized(
      lang,
      `🕐 Working Hours:\n${workingHours}`,
      `🕐 ساعات العمل:\n${workingHours}`
    );
  }

  response += pickLocalized(
    lang,
    '\n\nWas this helpful? (yes/no)',
    '\n\nهل كان هذا مفيداً؟ (نعم/لا)'
  );

  await sendBotMessage(conversationId, response, businessId, phone);
}
