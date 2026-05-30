import prisma from '../../backend/src/utils/prisma';
import { sendBotMessage } from './router';

export async function faqFlow(
  businessId: string,
  conversationId: string,
  phone: string,
  text: string
): Promise<void> {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  const settings = (business?.settings as Record<string, unknown>) || {};
  const workingHours = settings.workingHours as string || '9:00 AM - 11:00 PM';

  const faqResponses: Record<string, string> = {
    hours: `🕐 ساعات العمل / Working Hours:\n${workingHours}`,
    location: `📍 ${business?.description || 'Contact us for location details'}`,
    price: '💰 الأسعار متوفرة في قائمتنا. اكتب "قائمة" لعرضها.\nPrices available in our menu. Type "menu" to view.',
  };

  const lower = text.toLowerCase();
  let response = faqResponses.hours;

  if (lower.includes('location') || lower.includes('موقع') || lower.includes('عنوان')) {
    response = faqResponses.location;
  } else if (lower.includes('price') || lower.includes('سعر')) {
    response = faqResponses.price;
  }

  response += '\n\nهل كان هذا مفيداً؟ (نعم/لا)\nWas this helpful? (yes/no)';

  await sendBotMessage(conversationId, response, businessId, phone);
}
