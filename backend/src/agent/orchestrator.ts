import prisma from '../utils/prisma';
import { assertActiveBusiness } from '../security/tenantScope';
import {
  checkAiTokenBudget,
  checkCustomerRateLimit,
  checkIdempotency,
  checkMessageQuota,
} from '../security/quotaManager';
import { detectIntent, detectSentiment, generateAIResponse, ChatHistoryTurn } from '../whatsapp/services/ai';
import { isAiConfigured } from '../ai/provider';
import { mapSaudiDialect } from '../whatsapp/utils/dialect';
import { sendBotMessage } from '../whatsapp/flows/router-helpers';
import { validateBotResponse } from '../ai/guardrails/responseValidator';
import { detectLanguage, pickLocalized } from '../ai/language/detector';
import { getCachedAnswer, setCachedAnswer } from '../cache/answerCache';
import { trackEvent } from '../analytics/eventTracker';
import { trackFunnelStep } from '../analytics/funnelTracker';
import { classifyRoute } from './supervisor';
import { performHandoff } from './handoff/handoffManager';
import { acquireConcurrentAgent, releaseConcurrentAgent } from '../security/rateLimiter';
import {
  getConversationState,
  setConversationState,
  runBookingAgent,
  runMarketingAgent,
  runSalesAgent,
  runSupportAgent,
  runOrderTrackingAgent,
  sendWelcomeButtons,
  sendMenuQuickButtons,
  isTrackOrderIntent,
  isMenuOrOrderIntent,
} from './agents';
import { parsePayload } from './interactiveCatalog';
import { ToolContext } from './toolExecutor';
import { SubscriptionPlan } from '@prisma/client';

interface IncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
}

const ORDER_FLOW_WORDS = ['menu', 'order', 'قائمة', 'طلب', 'اطلب', 'أريد', 'وجبة', 'اكل'];
const BOOKING_FLOW_WORDS = ['book', 'booking', 'appointment', 'حجز', 'موعد'];

function isGreetingOnly(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t || t.length > 40) return false;
  const greetings = [
    'hi',
    'hello',
    'hey',
    'salam',
    'assalam',
    'aoa',
    'مرحبا',
    'السلام',
    'kia hal',
    'kaise ho',
    'good morning',
    'good evening',
    'start',
    'help',
    'سلام',
  ];
  return greetings.some((g) => t === g || t.startsWith(`${g} `) || t.startsWith(`${g}!`));
}

function shouldRunSalesFlow(state: string, text: string, intent: string): boolean {
  if (isMenuOrOrderIntent(text)) return true;
  if (parsePayload(text)) return true;
  if (isTrackOrderIntent(text)) return true;
  if (['collecting_address', 'selecting_payment', 'confirming_order', 'confirming_item'].includes(state)) return true;
  if (intent === 'ORDER') return true;
  if (state === 'ordering') {
    const lower = text.toLowerCase().trim();
    if (/^\d+$/.test(lower)) return true;
    return ORDER_FLOW_WORDS.some((w) => lower.includes(w));
  }
  return false;
}

function shouldRunBookingFlow(state: string, text: string, intent: string): boolean {
  if (intent === 'BOOKING') return true;
  if (state === 'confirming_booking') return true;
  if (state === 'booking') {
    const lower = text.toLowerCase().trim();
    if (/^\d+$/.test(lower)) return true;
    if (/\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}/.test(lower)) return true;
    return BOOKING_FLOW_WORDS.some((w) => lower.includes(w));
  }
  return false;
}

export async function processIncomingMessage(businessId: string, message: IncomingMessage): Promise<void> {
  const business = await assertActiveBusiness(businessId);
  const plan = business.subscriptionPlan as SubscriptionPlan;

  const isNew = await checkIdempotency(businessId, message.id);
  if (!isNew) {
    console.log(`[orchestrator] duplicate message ${message.id}, skipping`);
    return;
  }

  const phone = message.from;
  const textContent = message.text?.body || '';
  const normalizedText = mapSaudiDialect(textContent);
  const userLang = detectLanguage(textContent);

  const customerRate = await checkCustomerRateLimit(businessId, phone);
  if (!customerRate.allowed) {
    await sendSafeMessage(
      '',
      businessId,
      phone,
      pickLocalized(userLang, 'Please wait a moment before sending more messages.', 'يرجى الانتظار قليلاً.')
    );
    return;
  }

  const msgQuota = await checkMessageQuota(businessId, plan);
  if (!msgQuota.allowed && msgQuota.fallbackMode === 'autoreply_only') {
    console.warn(`[orchestrator] message quota exceeded for ${businessId}`);
  }

  const agentSlot = await acquireConcurrentAgent(businessId, plan);
  if (!agentSlot.allowed) {
    await sendSafeMessage(
      '',
      businessId,
      phone,
      pickLocalized(userLang, 'We are busy right now. Please try again shortly.', 'النظام مشغول. يرجى المحاولة بعد قليل.')
    );
    return;
  }

  try {
  let customer = await prisma.customer.findUnique({
    where: { businessId_phone: { businessId, phone } },
  });
  if (!customer) {
    customer = await prisma.customer.create({
      data: { businessId, name: `Customer ${phone.slice(-4)}`, phone },
    });
  }

  let conversation = await prisma.conversation.findFirst({
    where: { businessId, customerId: customer.id, status: { not: 'CLOSED' } },
    include: { messages: { take: 14, orderBy: { createdAt: 'desc' } } },
  });

  const isNewConversation = !conversation;

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { businessId, customerId: customer.id, isBotHandling: true },
      include: { messages: true },
    });
  }

  if (textContent) {
    await prisma.message.create({
      data: { conversationId: conversation.id, senderType: 'CUSTOMER', messageType: 'TEXT', content: textContent },
    });
  }
  await prisma.customer.update({ where: { id: customer.id }, data: { lastInteraction: new Date() } });

  conversation = await prisma.conversation.findFirst({
    where: { id: conversation.id },
    include: { messages: { take: 14, orderBy: { createdAt: 'desc' } } },
  });
  if (!conversation) return;

  if (isNewConversation) {
    await trackEvent({ businessId, conversationId: conversation.id, customerId: customer.id, eventType: 'chat_started' });
    await trackFunnelStep({ businessId, conversationId: conversation.id, step: 'welcome' });
  }

  if (!conversation.isBotHandling) {
    await prisma.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } });
    await sendSafeMessage(
      conversation.id,
      businessId,
      phone,
      pickLocalized(
        userLang,
        'Your message was received. An agent will reply shortly.',
        'تم استلام رسالتك. سيتواصل معك موظف قريباً.'
      )
    );
    return;
  }

  const autoReply = await findAutoReply(businessId, normalizedText);
  if (autoReply) {
    const replyText =
      userLang === 'en'
        ? autoReply.responseEn?.trim() || autoReply.responseAr?.trim() || 'Thank you for your message!'
        : autoReply.responseAr?.trim() || autoReply.responseEn?.trim() || 'شكراً لتواصلك';
    await sendSafeMessage(conversation.id, businessId, phone, replyText);
    return;
  }

  // Cache-first for FAQ-style queries (zero LLM cost on hit)
  const cachedAnswer = await getCachedAnswer(businessId, normalizedText);
  if (cachedAnswer && !shouldRunSalesFlow('idle', normalizedText, 'FAQ')) {
    await trackEvent({ businessId, conversationId: conversation.id, eventType: 'cache_hit' });
    await sendSafeMessage(conversation.id, businessId, phone, cachedAnswer);
    return;
  }

  let knowledgeContext: string | undefined;
  try {
    const { searchKnowledge } = await import('../knowledge/rag');
    const knowledgeHits = await searchKnowledge(businessId, normalizedText, 3);
    if (knowledgeHits.length > 0) {
      knowledgeContext = knowledgeHits.join('\n\n');
    }
  } catch (err) {
    console.warn('[orchestrator] RAG search skipped:', err instanceof Error ? err.message : err);
  }

  const intent = await detectIntent(normalizedText);
  const sentiment = await detectSentiment(normalizedText);
  await trackEvent({ businessId, conversationId: conversation.id, customerId: customer.id, eventType: 'intent_detected', metadata: { intent } });

  const handoffKeywords = ['agent', 'human', 'موظف', 'بشري', 'مدير'];
  if (sentiment === 'URGENT' || sentiment === 'ANGRY' || handoffKeywords.some((k) => normalizedText.toLowerCase().includes(k))) {
    await performHandoff({
      businessId,
      conversationId: conversation.id,
      customerId: customer.id,
      phone,
      reason: normalizedText,
      tags: sentiment === 'ANGRY' ? ['angry'] : ['urgent'],
    });
    await sendSafeMessage(
      conversation.id,
      businessId,
      phone,
      pickLocalized(
        userLang,
        'Connected to an agent. They will reply shortly.',
        'تم تحويلك لموظف. سيتواصل معك قريباً.'
      )
    );
    return;
  }

  const convState = await getConversationState(businessId, conversation.id);
  if (
    ['ordering', 'booking', 'collecting_address', 'selecting_payment', 'confirming_order', 'confirming_item'].includes(convState.state) &&
    !shouldRunSalesFlow(convState.state, normalizedText, intent) &&
    !shouldRunBookingFlow(convState.state, normalizedText, intent)
  ) {
    await setConversationState(businessId, conversation.id, { state: 'idle' });
    convState.state = 'idle';
  }
  const ctx: ToolContext = {
    businessId,
    conversationId: conversation.id,
    customerId: customer.id,
    phone,
    state: convState.state,
    plan,
  };

  const chatHistory: ChatHistoryTurn[] = conversation.messages
    .slice()
    .reverse()
    .map((m) => ({
      role: (m.senderType === 'CUSTOMER' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content,
    }));

  const route = classifyRoute(intent, normalizedText);
  await trackEvent({
    businessId,
    conversationId: conversation.id,
    eventType: 'agent_routed',
    metadata: { agent: route.agent, confidence: route.confidence, intent: route.intent },
  });

  const aiBudget = await checkAiTokenBudget(businessId, plan, business.settings as Record<string, unknown>);
  const aiAvailable = isAiConfigured() && aiBudget.allowed;
  const agent = route.agent;

  const { runComplaintResolver } = await import('./autonomous/complaintResolver');
  if (await runComplaintResolver(ctx, textContent, userLang)) {
    return;
  }

  const { tryNaturalLanguageOrder, isNaturalOrderRequest } = await import('./autonomous/orderFulfillment');
  if (
    !['collecting_address', 'confirming_order', 'viewing_cart', 'confirming_item', 'selecting_payment'].includes(
      convState.state
    ) &&
    (isNaturalOrderRequest(normalizedText) || convState.pendingNlOrder)
  ) {
    if (await tryNaturalLanguageOrder(ctx, textContent, userLang)) {
      return;
    }
  }

  if (shouldRunSalesFlow(convState.state, normalizedText, intent)) {
    await runSalesAgent(ctx, textContent, normalizedText, userLang);
    return;
  }

  if (isTrackOrderIntent(normalizedText)) {
    await runOrderTrackingAgent(ctx, normalizedText, userLang);
    return;
  }

  if (aiAvailable && (intent === 'INQUIRY' || intent === 'FAQ' || intent === 'COMPLAINT') && !isMenuOrOrderIntent(normalizedText)) {
    const response = await generateAIResponse(
      normalizedText,
      chatHistory,
      businessId,
      userLang,
      { settings: business.settings as Record<string, unknown> },
      knowledgeContext
    );
    if (response) {
      await setCachedAnswer(businessId, normalizedText, response);
      await trackEvent({
        businessId,
        conversationId: conversation.id,
        eventType: 'ai_reply',
        metadata: { lang: userLang, agent, intent },
      });
      await sendSafeMessage(conversation.id, businessId, phone, response);
      if (intent === 'INQUIRY' || intent === 'FAQ') {
        await sendMenuQuickButtons(ctx, userLang);
      }
      return;
    }
    console.warn(`[orchestrator] AI returned empty for business ${businessId}, intent=${intent}`);
  } else if (!aiBudget.allowed) {
    console.warn(`[orchestrator] AI budget blocked: ${aiBudget.reason}`);
  }

  if (isNewConversation && isGreetingOnly(textContent)) {
    const ctxWelcome: ToolContext = {
      businessId,
      conversationId: conversation.id,
      customerId: customer.id,
      phone,
      state: 'idle',
    };
    await sendWelcomeButtons(ctxWelcome, userLang);
    return;
  }

  if (shouldRunBookingFlow(convState.state, normalizedText, intent)) {
    const { trySelfBooking } = await import('./autonomous/selfBooking');
    if (await trySelfBooking(ctx, textContent, userLang)) {
      return;
    }
    await runBookingAgent(ctx, normalizedText, userLang);
    return;
  }

  const { isNaturalBookingRequest } = await import('./autonomous/naturalDateParser');
  if (isNaturalBookingRequest(textContent)) {
    const { trySelfBooking } = await import('./autonomous/selfBooking');
    if (await trySelfBooking(ctx, textContent, userLang)) {
      return;
    }
  }

  if (agent === 'marketing') {
    await runMarketingAgent(ctx, userLang);
    return;
  }

  if (aiAvailable) {
    const response = await generateAIResponse(
      normalizedText,
      chatHistory,
      businessId,
      userLang,
      { settings: business.settings as Record<string, unknown> },
      knowledgeContext
    );
    if (response) {
      await setCachedAnswer(businessId, normalizedText, response);
      await trackEvent({
        businessId,
        conversationId: conversation.id,
        eventType: 'ai_reply',
        metadata: { lang: userLang, agent },
      });
      await sendSafeMessage(conversation.id, businessId, phone, response);
      return;
    }
    console.warn(`[orchestrator] AI returned empty for business ${businessId}, using support fallback`);
  }

  await runSupportAgent(ctx, textContent, normalizedText, userLang);
  } finally {
    await releaseConcurrentAgent(businessId);
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

async function sendSafeMessage(
  conversationId: string,
  businessId: string,
  phone: string,
  content: string
): Promise<void> {
  const { sanitized } = await validateBotResponse(content, businessId);
  if (conversationId) {
    await sendBotMessage(conversationId, sanitized, businessId, phone);
  } else {
    const { sendWhatsAppText } = await import('../services/whatsappSend');
    await sendWhatsAppText(businessId, phone, sanitized);
  }
}
