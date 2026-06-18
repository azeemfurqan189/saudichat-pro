import prisma from '../../utils/prisma';
import { sendBotMessage } from '../../whatsapp/flows/router-helpers';
import { executeTool, ToolContext } from '../toolExecutor';
import { trackEvent } from '../../analytics/eventTracker';
import { DetectedLanguage, pickLocalized } from '../../ai/language/detector';
import { getConversationState, setConversationState } from '../conversationState';
import { runInteractiveSalesAgent, runOrderTrackingAgent, sendWelcomeButtons, isTrackOrderIntent } from '../salesFlow';

export { getConversationState, setConversationState } from '../conversationState';
export { runOrderTrackingAgent, sendWelcomeButtons, sendMenuQuickButtons, sendFullMenuExperience, isTrackOrderIntent, isMenuOrOrderIntent } from '../salesFlow';

export async function runSalesAgent(
  ctx: ToolContext,
  text: string,
  normalizedText: string,
  lang: DetectedLanguage = 'mixed'
): Promise<void> {
  await runInteractiveSalesAgent(ctx, text, normalizedText, lang);
}

export async function runBookingAgent(
  ctx: ToolContext,
  normalizedText: string,
  lang: DetectedLanguage = 'mixed'
): Promise<void> {
  const dateMatch = normalizedText.match(/(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
  const timeMatch = normalizedText.match(/(\d{1,2}:\d{2}|\d{1,2}\s*(?:am|pm|ص|م))/i);
  const numMatch = normalizedText.match(/^(\d+)$/);

  const state = await getConversationState(ctx.businessId, ctx.conversationId);

  if (ctx.state === 'booking' && numMatch && !state.pendingBooking?.serviceId) {
    const index = parseInt(numMatch[1], 10);
    const services = await prisma.catalogItem.findMany({ where: { businessId: ctx.businessId, isAvailable: true }, take: 8 });
    const service = services[index - 1];
    if (service) {
      await setConversationState(ctx.businessId, ctx.conversationId, {
        state: 'booking',
        pendingBooking: { serviceId: service.id, serviceName: service.nameAr },
      });
      await sendBotMessage(ctx.conversationId, `📅 ${service.nameAr}\n\nSend date (YYYY-MM-DD) and time (HH:MM)`, ctx.businessId, ctx.phone);
      return;
    }
  }

  if (state.pendingBooking?.serviceId && dateMatch && timeMatch) {
    let dateStr = dateMatch[1];
    if (dateStr.includes('/') || dateStr.includes('-')) {
      const parts = dateStr.split(/[\/\-]/);
      if (parts[2]?.length === 2) parts[2] = `20${parts[2]}`;
      if (parts[0].length <= 2) dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    const timeStr = timeMatch[1].replace(/\s*(am|pm|ص|م)/i, '').padStart(5, '0');

    const result = await executeTool(
      { ...ctx, state: 'confirming_booking' },
      'createAppointment',
      {
        serviceId: state.pendingBooking.serviceId,
        serviceName: state.pendingBooking.serviceName,
        date: dateStr,
        startTime: timeStr.includes(':') ? timeStr : `${timeStr}:00`,
      }
    );
    await setConversationState(ctx.businessId, ctx.conversationId, { state: 'idle' });
    if (result.success) {
      await trackEvent({ businessId: ctx.businessId, conversationId: ctx.conversationId, customerId: ctx.customerId, eventType: 'appointment_created' });
      await sendBotMessage(ctx.conversationId, `✅ Booked!\n\n${state.pendingBooking.serviceName}\n${dateStr} ${timeStr}`, ctx.businessId, ctx.phone);
      return;
    }
  }

  await setConversationState(ctx.businessId, ctx.conversationId, { state: 'booking' });
  const services = await prisma.catalogItem.findMany({ where: { businessId: ctx.businessId, isAvailable: true }, take: 8 });
  const list = services.length
    ? services.map((s, i) => `${i + 1}. ${s.nameAr} (${s.duration || 30} min) - ${s.price} SAR`).join('\n')
    : '1. Consultation - 150 SAR';
  await sendBotMessage(ctx.conversationId, `📅 Booking\n\n${list}\n\nChoose service number`, ctx.businessId, ctx.phone);
}

export async function runSupportAgent(
  ctx: ToolContext,
  text: string,
  normalizedText: string,
  lang: DetectedLanguage = 'en'
): Promise<void> {
  const knowledgeResult = await executeTool(ctx, 'searchKnowledge', { query: normalizedText });
  if (knowledgeResult.success && knowledgeResult.result) {
    const results = (knowledgeResult.result as { results: string[] }).results;
    if (results.length > 0) {
      await sendBotMessage(ctx.conversationId, results.join('\n\n---\n\n'), ctx.businessId, ctx.phone);
      return;
    }
  }

  const result = await executeTool(ctx, 'searchCatalog', { query: normalizedText });
  if (result.success && result.result) {
    const items = (result.result as { items: Array<{ nameAr: string; price: number }> }).items;
    if (items.length > 0) {
      const list = items.map((i) => `• ${i.nameAr} — ${i.price} SAR`).join('\n');
      await sendBotMessage(ctx.conversationId, list, ctx.businessId, ctx.phone);
      return;
    }
  }

  await sendWelcomeButtons(ctx, lang);
}

export async function runMarketingAgent(ctx: ToolContext, lang: DetectedLanguage = 'mixed'): Promise<void> {
  const promos = await prisma.promoCode.findMany({
    where: { businessId: ctx.businessId, isActive: true },
    take: 3,
  });
  if (promos.length === 0) {
    await sendBotMessage(ctx.conversationId, pickLocalized(lang, 'No active promos right now.', 'لا توجد عروض حالياً.'), ctx.businessId, ctx.phone);
    return;
  }
  const list = promos.map((p) => `🏷️ ${p.code}: ${p.discountValue}${p.discountType === 'PERCENTAGE' ? '%' : ' SAR'}`).join('\n');
  await sendBotMessage(ctx.conversationId, list, ctx.businessId, ctx.phone);
}
