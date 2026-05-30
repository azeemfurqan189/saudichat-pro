import { sendBotMessage } from '../flows/router';

export async function welcomeFlow(
  businessId: string,
  conversationId: string,
  _customerId: string,
  phone: string
): Promise<void> {
  const greeting = `مرحباً بك! 👋\nWelcome!\n\nأنا مساعدك الذكي. كيف يمكنني مساعدتك؟\nI'm your smart assistant. How can I help you?\n\n1️⃣ طلب / Order\n2️⃣ حجز موعد / Book appointment\n3️⃣ استفسار / Inquiry`;

  await sendBotMessage(conversationId, greeting, businessId, phone);
}
