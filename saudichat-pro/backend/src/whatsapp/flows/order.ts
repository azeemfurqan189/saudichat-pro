import prisma from '../../utils/prisma';
import { sendBotMessage } from './router-helpers';

export async function orderFlow(
  businessId: string,
  conversationId: string,
  _customerId: string,
  phone: string,
  _text: string
): Promise<void> {
  const items = await prisma.catalogItem.findMany({
    where: { businessId, isAvailable: true },
    take: 10,
    orderBy: { sortOrder: 'asc' },
  });

  if (items.length === 0) {
    await sendBotMessage(
      conversationId,
      'عذراً، القائمة غير متوفرة حالياً.\nSorry, menu is currently unavailable.',
      businessId,
      phone
    );
    return;
  }

  const menuText = items
    .map((item, i) => `${i + 1}. ${item.nameAr} / ${item.nameEn} - ${item.price} SAR`)
    .join('\n');

  await sendBotMessage(
    conversationId,
    `📋 قائمتنا / Our Menu:\n\n${menuText}\n\nاكتب رقم الطلب أو اسم الوجبة\nType item number or name to order`,
    businessId,
    phone
  );
}
