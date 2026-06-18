import prisma from '../../utils/prisma';
import { sendBotMessage } from './router-helpers';

export async function bookingFlow(
  businessId: string,
  conversationId: string,
  _customerId: string,
  phone: string,
  _text: string
): Promise<void> {
  const services = await prisma.catalogItem.findMany({
    where: { businessId, isAvailable: true },
    take: 8,
  });

  const servicesList = services.length
    ? services.map((s, i) => `${i + 1}. ${s.nameAr} (${s.duration || 30} min) - ${s.price} SAR`).join('\n')
    : '1. Consultation - 150 SAR\n2. Follow-up - 100 SAR';

  await sendBotMessage(
    conversationId,
    `📅 حجز موعد / Book Appointment\n\nالخدمات المتاحة:\n${servicesList}\n\nاختر رقم الخدمة والتاريخ المفضل\nChoose service number and preferred date`,
    businessId,
    phone
  );
}
