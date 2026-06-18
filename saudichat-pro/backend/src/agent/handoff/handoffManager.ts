import { createChatCompletion } from '../../ai/provider';
import prisma from '../../utils/prisma';
import { logHandoffEvent } from '../../security/auditLog';
import { trackEvent } from '../../analytics/eventTracker';

export async function generateHandoffSummary(
  businessId: string,
  conversationId: string
): Promise<string> {
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: 20,
  });

  const transcript = messages.map((m) => `${m.senderType}: ${m.content}`).join('\n');
  if (!transcript) return 'No conversation history.';

  const result = await createChatCompletion({
    businessId,
    messages: [
      {
        role: 'system',
        content: 'Summarize this customer chat in 3 bullet points for a human agent. Include issue, sentiment, and recommended action. Same language as chat.',
      },
      { role: 'user', content: transcript },
    ],
    maxTokens: 200,
  });

  return result?.content || transcript.slice(0, 300);
}

export async function performHandoff(params: {
  businessId: string;
  conversationId: string;
  customerId: string;
  phone: string;
  reason: string;
  tags?: string[];
}): Promise<string> {
  const summary = await generateHandoffSummary(params.businessId, params.conversationId);

  await prisma.conversation.update({
    where: { id: params.conversationId },
    data: {
      isBotHandling: false,
      status: 'WAITING',
      metadata: { handoffSummary: summary, handoffReason: params.reason, handoffAt: new Date().toISOString() },
    },
  });

  const business = await prisma.business.findFirst({ where: { id: params.businessId } });
  if (business) {
    await prisma.notification.create({
      data: {
        businessId: params.businessId,
        userId: business.userId,
        type: 'MESSAGE',
        title: 'Live agent needed',
        message: `${params.phone}: ${summary.slice(0, 150)}`,
      },
    });
  }

  const customer = await prisma.customer.findFirst({ where: { id: params.customerId, businessId: params.businessId } });
  const autoTags: string[] = [...(params.tags || [])];
  if ((customer?.totalSpent || 0) > 500) autoTags.push('vip');
  if (params.reason.toLowerCase().includes('complaint') || params.reason.toLowerCase().includes('angry')) {
    autoTags.push('complaint');
  }
  if (autoTags.length) {
    await prisma.customer.update({
      where: { id: params.customerId },
      data: { tags: { push: autoTags.filter((t, i, a) => a.indexOf(t) === i) } },
    });
  }

  await logHandoffEvent({
    businessId: params.businessId,
    conversationId: params.conversationId,
    reason: params.reason,
    summary,
    tags: autoTags,
  });

  await trackEvent({
    businessId: params.businessId,
    conversationId: params.conversationId,
    customerId: params.customerId,
    eventType: 'handoff',
    metadata: { reason: params.reason, tags: autoTags },
  });

  return summary;
}

export async function returnToBot(businessId: string, conversationId: string): Promise<void> {
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      isBotHandling: true,
      status: 'ACTIVE',
      metadata: { handoffSummary: null, handoffReason: null, returnedToBotAt: new Date().toISOString() },
    },
  });

  await trackEvent({
    businessId,
    conversationId,
    eventType: 'bot_resumed',
  });
}
