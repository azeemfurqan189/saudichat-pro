type Intent = 'ORDER' | 'BOOKING' | 'INQUIRY' | 'COMPLAINT' | 'URGENT' | 'FAQ';
type Sentiment = 'HAPPY' | 'ANGRY' | 'URGENT' | 'CONFUSED' | 'NEUTRAL';

export type ChatHistoryTurn = { role: 'user' | 'assistant'; content: string };

import {
  DetectedLanguage,
  getLanguageInstruction,
  getToneInstruction,
  detectLanguage as detectLang,
} from '../../ai/language/detector';
import { buildPersonaPrompt } from '../../ai/language/toneAdapter';
import { isAiConfigured } from '../../ai/provider';

const ORDER_KEYWORDS = ['طلب', 'اطلب', 'أريد', 'menu', 'order', 'قائمة', 'وجبة', 'اكل'];
const BOOKING_KEYWORDS = ['حجز', 'موعد', 'appointment', 'book', 'booking', 'schedule'];
const COMPLAINT_KEYWORDS = ['شكوى', 'complaint', 'مشكلة', 'problem', 'غاضب', 'سيء'];
const FAQ_KEYWORDS = ['ساعات', 'موقع', 'عنوان', 'hours', 'location', 'address', 'price', 'سعر'];

export async function detectIntent(text: string): Promise<Intent> {
  const lower = text.toLowerCase();

  if (ORDER_KEYWORDS.some((k) => lower.includes(k))) return 'ORDER';
  if (BOOKING_KEYWORDS.some((k) => lower.includes(k))) return 'BOOKING';
  if (COMPLAINT_KEYWORDS.some((k) => lower.includes(k))) return 'COMPLAINT';
  if (FAQ_KEYWORDS.some((k) => lower.includes(k))) return 'FAQ';

  return 'INQUIRY';
}

export async function detectSentiment(text: string): Promise<Sentiment> {
  const lower = text.toLowerCase();
  if (['urgent', 'عاجل', 'فوري', '!!!'].some((k) => lower.includes(k))) return 'URGENT';
  if (['angry', 'غاضب', 'سيء', 'bad', 'terrible'].some((k) => lower.includes(k))) return 'ANGRY';
  if (['confused', 'ما فهمت', '؟؟', 'help'].some((k) => lower.includes(k))) return 'CONFUSED';
  if (['thanks', 'شكر', 'ممتاز', 'great'].some((k) => lower.includes(k))) return 'HAPPY';
  return 'NEUTRAL';
}

function formatWorkingHoursFromSettings(settings: Record<string, unknown>): string | null {
  const text = settings.workingHoursText;
  if (typeof text === 'string' && text.trim()) return text.trim();

  const wh = settings.workingHours;
  if (typeof wh === 'string' && wh.trim()) return wh.trim();

  if (Array.isArray(wh)) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const lines = wh.map((entry, i) => {
      if (!entry || typeof entry !== 'object') return null;
      const e = entry as { closed?: boolean; open?: string; close?: string };
      if (e.closed) return `${dayNames[i] ?? i}: Closed`;
      if (e.open && e.close) return `${dayNames[i] ?? i}: ${e.open} - ${e.close}`;
      return null;
    }).filter(Boolean);
    if (lines.length > 0) return lines.join('; ');
  }
  return null;
}

function buildProfileContext(settings: Record<string, unknown>): string[] {
  const lines: string[] = [];
  const whText = formatWorkingHoursFromSettings(settings);
  if (whText) lines.push(`Working hours: ${whText}`);

  const pairs: Array<[string, string]> = [
    ['city', 'City'],
    ['address', 'Address'],
    ['cuisineType', 'Cuisine'],
    ['deliveryTime', 'Delivery time'],
    ['deliveryAreas', 'Delivery areas'],
    ['minOrder', 'Minimum order'],
    ['deliveryFee', 'Delivery fee'],
    ['pickupTime', 'Pickup time'],
    ['paymentMethods', 'Payment methods'],
    ['servicesSummary', 'Services offered'],
    ['appointmentDuration', 'Appointment duration'],
    ['cancellationPolicy', 'Cancellation policy'],
    ['walkInAvailable', 'Walk-ins'],
    ['returnPolicy', 'Return policy'],
  ];

  for (const [key, label] of pairs) {
    const v = settings[key];
    if (typeof v === 'string' && v.trim()) lines.push(`${label}: ${v.trim()}`);
    else if (typeof v === 'number' && !Number.isNaN(v)) lines.push(`${label}: ${v}`);
  }

  const refund = settings.refundPolicy;
  if (typeof refund === 'string' && refund.trim()) lines.push(`Refund/cancel policy: ${refund.trim()}`);

  return lines;
}

function buildSystemPrompt(params: {
  businessName: string;
  userLang: DetectedLanguage;
  persona?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}): string {
  const tone = String(params.persona?.tone || 'friendly');
  const customInstructions = String(params.persona?.instructions || '').trim();
  const personaLine = params.settings ? buildPersonaPrompt(params.settings, params.userLang) : '';

  return [
    `You are the WhatsApp assistant for "${params.businessName}".`,
    personaLine || getToneInstruction(tone),
    getLanguageInstruction(params.userLang),
    'Have a natural conversation. Answer what the customer actually asked.',
    'Use the business info below when answering about hours, location, delivery, menu, or services.',
    'If CURRENT MENU is provided below, ALWAYS use it for items and prices — ignore older chat messages that said menu was empty or outdated.',
    'If delivery time is not specified in business info, say you will confirm with the team and give a reasonable estimate only if stated in business info.',
    'If they greet you (hi, hello, kia hal hai, salam, مرحبا), greet them back warmly and briefly mention you can help with orders, bookings, or questions.',
    'Do NOT reply with only a generic "How can I help you?" — always respond to their specific message.',
    'Never invent prices. For orders say they can type "order" or "menu". For booking say "booking" or "appointment".',
    'Keep replies short (2-4 sentences) for WhatsApp.',
    customInstructions,
  ]
    .filter(Boolean)
    .join(' ');
}

/** Returns AI text or null if AI unavailable / failed. */
export async function generateAIResponse(
  text: string,
  history: ChatHistoryTurn[],
  businessId: string,
  lang?: DetectedLanguage,
  businessMeta?: { name?: string; settings?: Record<string, unknown> },
  knowledgeContext?: string
): Promise<string | null> {
  if (!isAiConfigured()) return null;

  const userLang = lang ?? detectLang(text);

  const prisma = (await import('../../utils/prisma')).default;
  const business = await prisma.business.findFirst({
    where: { id: businessId },
    select: { name: true, description: true, settings: true },
  });
  const settings = businessMeta?.settings ?? ((business?.settings as Record<string, unknown>) || {});
  const persona = (settings.aiPersona as Record<string, unknown>) || {};
  const businessName = businessMeta?.name || business?.name || 'our business';

  const { createChatCompletion } = await import('../../ai/provider');

  const chatMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    {
      role: 'system',
      content: buildSystemPrompt({ businessName, userLang, persona, settings }),
    },
  ];

  if (business?.description?.trim()) {
    chatMessages.push({
      role: 'system',
      content: `Business info: ${business.description.trim()}`,
    });
  }

  const settingsExtras = buildProfileContext(settings);
  if (settingsExtras.length > 0) {
    chatMessages.push({ role: 'system', content: settingsExtras.join('\n') });
  }

  const { buildMenuSummary } = await import('../../services/catalogService');
  const liveMenu = await buildMenuSummary(businessId, userLang);
  if (liveMenu) {
    chatMessages.push({
      role: 'system',
      content: `CURRENT MENU (live from dashboard — use ONLY this for items/prices/categories):\n${liveMenu}\nCustomers can type item number or "menu" to order.`,
    });
  }

  if (knowledgeContext?.trim()) {
    chatMessages.push({
      role: 'system',
      content: `Knowledge base (use if relevant):\n${knowledgeContext.trim()}`,
    });
  }

  const recent = history.slice(-12);
  for (const turn of recent) {
    if (turn.content?.trim()) {
      chatMessages.push({ role: turn.role, content: turn.content.trim() });
    }
  }

  const last = recent[recent.length - 1];
  if (!last || last.role !== 'user' || last.content.trim() !== text.trim()) {
    chatMessages.push({ role: 'user', content: text });
  }

  const result = await createChatCompletion({
    businessId,
    messages: chatMessages,
    maxTokens: 350,
  });

  const content = result?.content?.trim();
  if (!content) return null;

  const genericOnly = /^how can i help you\??\.?$/i.test(content);
  if (genericOnly) return null;

  return content;
}
