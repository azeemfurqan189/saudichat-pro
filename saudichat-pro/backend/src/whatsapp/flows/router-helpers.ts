import prisma from '../../utils/prisma';
import { sendWhatsAppMessage, WhatsAppOutbound } from '../../services/whatsappSend';
import { validateBotResponse } from '../../ai/guardrails/responseValidator';

export async function sendBotMessage(
  conversationId: string,
  content: string,
  businessId: string,
  customerPhone: string
): Promise<void> {
  const { sanitized } = await validateBotResponse(content, businessId);

  await prisma.message.create({
    data: {
      conversationId,
      senderType: 'BOT',
      messageType: 'TEXT',
      content: sanitized,
      metadata: { auto: true },
    },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  });

  await sendWhatsAppMessage(businessId, customerPhone, { type: 'text', body: sanitized });
}

export async function sendBotOutbound(
  conversationId: string,
  businessId: string,
  customerPhone: string,
  message: WhatsAppOutbound,
  logContent: string
): Promise<void> {
  const { sanitized } = await validateBotResponse(logContent, businessId);

  const messageType: 'TEXT' | 'IMAGE' | 'BUTTON' | 'LIST' | 'DOCUMENT' =
    message.type === 'image'
      ? 'IMAGE'
      : message.type === 'document'
        ? 'DOCUMENT'
        : message.type === 'buttons'
          ? 'BUTTON'
          : message.type === 'list'
            ? 'LIST'
            : 'TEXT';

  await prisma.message.create({
    data: {
      conversationId,
      senderType: 'BOT',
      messageType,
      content: sanitized,
      metadata: { auto: true, outboundType: message.type },
    },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  });

  await sendWhatsAppMessage(businessId, customerPhone, message);
}
