import prisma from '../utils/prisma';
import { getBusinessAnalytics } from './eventTracker';
import { getFunnelAnalytics } from './funnelTracker';
import { tenantKey, redisGet } from '../utils/redis';

export async function aggregateDailyAnalytics(businessId: string, date: Date): Promise<void> {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const [events, orders, funnel] = await Promise.all([
    prisma.analyticsEvent.findMany({
      where: { businessId, createdAt: { gte: dayStart, lte: dayEnd } },
      select: { eventType: true },
    }),
    prisma.order.findMany({
      where: { businessId, createdAt: { gte: dayStart, lte: dayEnd } },
      select: { total: true },
    }),
    getFunnelAnalytics(businessId, 1),
  ]);

  let chatsStarted = 0;
  let ordersCreated = 0;
  let handoffs = 0;
  let aiReplies = 0;

  for (const e of events) {
    if (e.eventType === 'chat_started') chatsStarted++;
    if (e.eventType === 'order_created') ordersCreated++;
    if (e.eventType === 'handoff') handoffs++;
    if (e.eventType === 'ai_reply') aiReplies++;
  }

  const revenue = orders.reduce((s, o) => s + o.total, 0);
  const month = date.toISOString().slice(0, 7);
  const tokensStr = await redisGet(tenantKey(businessId, 'quota', 'tokens', month));
  const tokensUsed = parseInt(tokensStr || '0', 10);

  const conversionRate = chatsStarted > 0 ? Math.round((ordersCreated / chatsStarted) * 100) : 0;

  await prisma.analyticsDailySummary.upsert({
    where: {
      businessId_date: {
        businessId,
        date: dayStart,
      },
    },
    create: {
      businessId,
      date: dayStart,
      chatsStarted,
      ordersCreated,
      revenue,
      handoffs,
      aiReplies,
      tokensUsed,
      conversionRate,
      dropOffSteps: funnel.dropOffPoints as object,
    },
    update: {
      chatsStarted,
      ordersCreated,
      revenue,
      handoffs,
      aiReplies,
      tokensUsed,
      conversionRate,
      dropOffSteps: funnel.dropOffPoints as object,
    },
  });
}

export async function runDailyAggregationForAll(): Promise<number> {
  const businesses = await prisma.business.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  for (const b of businesses) {
    await aggregateDailyAnalytics(b.id, yesterday);
  }
  return businesses.length;
}

export async function getAggregatedAnalytics(businessId: string, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [summaries, live, funnel] = await Promise.all([
    prisma.analyticsDailySummary.findMany({
      where: { businessId, date: { gte: since } },
      orderBy: { date: 'asc' },
    }),
    getBusinessAnalytics(businessId, days),
    getFunnelAnalytics(businessId, days),
  ]);

  return {
    daily: summaries,
    live,
    funnel,
  };
}
