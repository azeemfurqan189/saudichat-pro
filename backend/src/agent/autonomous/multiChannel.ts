import prisma from '../../utils/prisma';
import { sendBotMessage } from '../../whatsapp/flows/router-helpers';
import { generateAIResponse } from '../../whatsapp/services/ai';
import { isAiConfigured } from '../../ai/provider';
import { validateBotResponse } from '../../ai/guardrails/responseValidator';
import { sendChannelMessage } from '../../services/channelService';

/** Route live chat visitor message through same AI as WhatsApp */
export async function processLiveChatWithAI(
  businessId: string,
  sessionId: string,
  content: string
): Promise<string | null> {
  const session = await prisma.liveChatSession.findFirst({
    where: { id: sessionId, businessId },
  });
  if (!session) return null;

  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) return null;

  const history = await prisma.liveChatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  if (!isAiConfigured()) {
    return 'Thanks for your message! An agent will reply shortly.';
  }

  const chatHistory = history.reverse().map((m) => ({
    role: (m.senderType === 'VISITOR' ? 'user' : 'assistant') as 'user' | 'assistant',
    content: m.content,
  }));

  const response = await generateAIResponse(content, chatHistory, businessId, 'mixed', {
    settings: business.settings as Record<string, unknown>,
  });

  if (!response) return 'How can we help you today?';

  const { sanitized } = await validateBotResponse(response, businessId);

  await prisma.liveChatMessage.create({
    data: { sessionId, senderType: 'BOT', content: sanitized },
  });

  return sanitized;
}

/** Unified entry for Instagram/Facebook/inbox messages */
export async function processOmnichannelMessage(
  businessId: string,
  channel: 'instagram' | 'facebook' | 'email' | 'sms',
  from: string,
  content: string
): Promise<{ replied: boolean; response?: string }> {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) return { replied: false };

  const integration = await prisma.channelIntegration.findUnique({
    where: { businessId_channel: { businessId, channel } },
  });
  if (!integration?.isEnabled) return { replied: false };

  if (!isAiConfigured()) return { replied: false };

  const response = await generateAIResponse(content, [], businessId, 'mixed', {
    settings: business.settings as Record<string, unknown>,
  });
  if (!response) return { replied: false };

  const { sanitized } = await validateBotResponse(response, businessId);
  const sent = await sendChannelMessage(businessId, channel, from, sanitized);

  await prisma.analyticsEvent.create({
    data: {
      businessId,
      eventType: 'multichannel_ai_reply',
      metadata: { channel, from: from.slice(0, 20) },
    },
  });

  return { replied: sent.success, response: sanitized };
}

/** Bridge WhatsApp-style processing for test harness */
export async function routeToOrchestrator(
  businessId: string,
  phone: string,
  text: string,
  messageId: string
): Promise<void> {
  const { processIncomingMessage } = await import('../orchestrator');
  await processIncomingMessage(businessId, {
    from: phone,
    id: messageId,
    timestamp: String(Math.floor(Date.now() / 1000)),
    type: 'text',
    text: { body: text },
  });
}
