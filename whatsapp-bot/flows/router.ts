import prisma from '../../saudichat-pro/backend/src/utils/prisma';
import { detectIntent, detectSentiment, generateAIResponse } from '../services/ai';
import { mapSaudiDialect } from '../utils/dialect';
import { welcomeFlow } from './welcome';
import { orderFlow } from './order';
import { bookingFlow } from './booking';
import { complaintFlow } from './complaint';
import { faqFlow } from './faq';

interface IncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
}

export async function routeMessage(businessId: string, message: IncomingMessage): Promise<void> {
  const phone = message.from;
  const textContent = message.text?.body || '';
  const normalizedText = mapSaudiDialect(textContent);

  // Find or create customer
  let customer = await prisma.customer.findUnique({
    where: { businessId_phone: { businessId, phone } },
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: { businessId, name: `Customer ${phone.slice(-4)}`, phone },
    });
  }

  // Find or create conversation
  let conversation = await prisma.conversation.findFirst({
    where: { businessId, customerId: customer.id, status: { not: 'CLOSED' } },
    include: { messages: { take: 10, orderBy: { createdAt: 'desc' } } },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { businessId, customerId: customer.id, isBotHandling: true },
      include: { messages: true },
    });
    await welcomeFlow(businessId, conversation.id, customer.id, phone);
    return;
  }

  // Save incoming message
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderType: 'CUSTOMER',
      messageType: 'TEXT',
      content: textContent,
    },
  });

  await prisma.customer.update({
    where: { id: customer.id },
    data: { lastInteraction: new Date() },
  });

  if (!conversation.isBotHandling) {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });
    return; // Human agent handling
  }

  // Check auto-replies first
  const autoReply = await findAutoReply(businessId, normalizedText);
  if (autoReply) {
    await sendBotMessage(conversation.id, autoReply.responseAr, businessId, phone);
    return;
  }

  const intent = await detectIntent(normalizedText);
  const sentiment = await detectSentiment(normalizedText);

  if (sentiment === 'URGENT' || sentiment === 'ANGRY') {
    await complaintFlow(businessId, conversation.id, customer.id, phone, normalizedText);
    return;
  }

  switch (intent) {
    case 'ORDER':
      await orderFlow(businessId, conversation.id, customer.id, phone, normalizedText);
      break;
    case 'BOOKING':
      await bookingFlow(businessId, conversation.id, customer.id, phone, normalizedText);
      break;
    case 'COMPLAINT':
      await complaintFlow(businessId, conversation.id, customer.id, phone, normalizedText);
      break;
    case 'FAQ':
      await faqFlow(businessId, conversation.id, phone, normalizedText);
      break;
    default: {
      const context = conversation.messages.map((m) => m.content).reverse();
      const response = await generateAIResponse(normalizedText, context, businessId);
      await sendBotMessage(conversation.id, response, businessId, phone);
    }
  }
}

async function findAutoReply(businessId: string, text: string) {
  const rules = await prisma.autoReply.findMany({
    where: { businessId, isActive: true },
    orderBy: { priority: 'asc' },
  });

  const lowerText = text.toLowerCase();

  for (const rule of rules) {
    for (const keyword of rule.triggerKeywords) {
      const kw = keyword.toLowerCase();
      if (
        (rule.triggerType === 'CONTAINS' && lowerText.includes(kw)) ||
        (rule.triggerType === 'EXACT' && lowerText === kw) ||
        (rule.triggerType === 'STARTS_WITH' && lowerText.startsWith(kw))
      ) {
        return rule;
      }
    }
  }
  return null;
}

export async function sendBotMessage(
  conversationId: string,
  content: string,
  businessId: string,
  customerPhone: string
): Promise<void> {
  await prisma.message.create({
    data: {
      conversationId,
      senderType: 'BOT',
      messageType: 'TEXT',
      content,
      metadata: { auto: true },
    },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  });

  // Send via WhatsApp Cloud API (when configured)
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (business?.whatsappToken && business?.whatsappPhoneId) {
    try {
      await fetch(
        `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || 'v21.0'}/${business.whatsappPhoneId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${business.whatsappToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: customerPhone,
            type: 'text',
            text: { body: content },
          }),
        }
      );
    } catch (err) {
      console.error('WhatsApp send error:', err);
    }
  }
}
