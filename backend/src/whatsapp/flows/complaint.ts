import prisma from '../../utils/prisma';
import { sendBotMessage } from './router';

export async function complaintFlow(
  businessId: string,
  conversationId: string,
  _customerId: string,
  phone: string,
  text: string
): Promise<void> {
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { isBotHandling: false, status: 'WAITING' },
  });

  await sendBotMessage(
    conversationId,
    'نعتذر عن أي إزعاج 🙏\nWe apologize for any inconvenience.\n\nتم تحويلك لأحد موظفينا وسيتواصل معك قريباً.\nYou have been connected to an agent who will contact you shortly.',
    businessId,
    phone
  );

  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (business) {
    await prisma.notification.create({
      data: {
        businessId,
        userId: business.userId,
        type: 'MESSAGE',
        title: 'Complaint - Agent Required',
        message: `Customer ${phone} needs assistance: ${text.slice(0, 100)}`,
      },
    });
  }
}
