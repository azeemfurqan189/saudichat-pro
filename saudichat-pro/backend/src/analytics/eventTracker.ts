import prisma from '../utils/prisma';

export async function trackEvent(params: {
  businessId: string;
  eventType: string;
  conversationId?: string;
  customerId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: {
        businessId: params.businessId,
        conversationId: params.conversationId,
        customerId: params.customerId,
        eventType: params.eventType,
        metadata: (params.metadata || {}) as object,
      },
    });
  } catch (err) {
    console.error('[analytics] track failed:', err);
  }
}

export async function getBusinessAnalytics(businessId: string, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const events = await prisma.analyticsEvent.findMany({
    where: { businessId, createdAt: { gte: since } },
    select: { eventType: true, metadata: true, createdAt: true },
  });

  const intentCounts: Record<string, number> = {};
  let chatsStarted = 0;
  let ordersCreated = 0;
  let handoffs = 0;
  let aiReplies = 0;

  for (const e of events) {
    if (e.eventType === 'chat_started') chatsStarted++;
    if (e.eventType === 'order_created') ordersCreated++;
    if (e.eventType === 'handoff') handoffs++;
    if (e.eventType === 'ai_reply') aiReplies++;
    if (e.eventType === 'intent_detected') {
      const intent = (e.metadata as { intent?: string })?.intent || 'UNKNOWN';
      intentCounts[intent] = (intentCounts[intent] || 0) + 1;
    }
  }

  const topIntents = Object.entries(intentCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([intent, count]) => ({ intent, count }));

  const orders = await prisma.order.findMany({
    where: { businessId, createdAt: { gte: since } },
    select: { total: true },
  });
  const revenue = orders.reduce((sum, o) => sum + o.total, 0);

  return {
    periodDays: days,
    chatsStarted,
    ordersCreated,
    conversionRate: chatsStarted > 0 ? Math.round((ordersCreated / chatsStarted) * 100) : 0,
    handoffRate: chatsStarted > 0 ? Math.round((handoffs / chatsStarted) * 100) : 0,
    aiReplies,
    topIntents,
    revenue,
    totalEvents: events.length,
  };
}
