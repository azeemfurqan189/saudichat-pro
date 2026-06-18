import { sendBotMessage } from './router-helpers';
import { detectLanguage, pickLocalized } from '../../ai/language/detector';

export async function welcomeFlow(
  businessId: string,
  conversationId: string,
  _customerId: string,
  phone: string,
  userText = ''
): Promise<void> {
  const lang = detectLanguage(userText);

  const greeting = pickLocalized(
    lang,
    `Welcome! 👋\n\nI'm your smart assistant. How can I help you?\n\n1️⃣ Order\n2️⃣ Book appointment\n3️⃣ Inquiry`,
    `مرحباً بك! 👋\n\nأنا مساعدك الذكي. كيف يمكنني مساعدتك؟\n\n1️⃣ طلب\n2️⃣ حجز موعد\n3️⃣ استفسار`,
    `Khush amdeed! 👋\n\nMain aap ka smart assistant hoon. Main aap ki kaise madad kar sakta hoon?\n\n1️⃣ Order\n2️⃣ Appointment\n3️⃣ Inquiry`
  );

  await sendBotMessage(conversationId, greeting, businessId, phone);
}
