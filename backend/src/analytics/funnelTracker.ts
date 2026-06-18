import prisma from '../utils/prisma';
import { trackEvent } from './eventTracker';

export type FunnelStep =
  | 'welcome'
  | 'menu'
  | 'item_select'
  | 'cart'
  | 'address'
  | 'payment'
  | 'confirm'
  | 'order_created'
  | 'abandoned';

export async function trackFunnelStep(params: {
  businessId: string;
  conversationId: string;
  step: FunnelStep;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.conversationFunnel.create({
      data: {
        businessId: params.businessId,
        conversationId: params.conversationId,
        step: params.step,
        metadata: (params.metadata || {}) as object,
      },
    });
    await trackEvent({
      businessId: params.businessId,
      conversationId: params.conversationId,
      eventType: 'funnel_step',
      metadata: { step: params.step, ...params.metadata },
    });
  } catch (err) {
    console.error('[analytics] funnel track failed:', err);
  }
}

export async function getFunnelAnalytics(businessId: string, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const steps = await prisma.conversationFunnel.groupBy({
    by: ['step'],
    where: { businessId, createdAt: { gte: since } },
    _count: { step: true },
  });

  const stepCounts: Record<string, number> = {};
  for (const s of steps) {
    stepCounts[s.step] = s._count.step;
  }

  const welcome = stepCounts.welcome || stepCounts.menu || 1;
  const orderCreated = stepCounts.order_created || 0;

  const dropOff: Record<string, number> = {};
  const orderedSteps: FunnelStep[] = ['welcome', 'menu', 'item_select', 'cart', 'address', 'payment', 'confirm', 'order_created'];
  for (let i = 0; i < orderedSteps.length - 1; i++) {
    const current = stepCounts[orderedSteps[i]] || 0;
    const next = stepCounts[orderedSteps[i + 1]] || 0;
    if (current > 0) {
      dropOff[orderedSteps[i]] = Math.round(((current - next) / current) * 100);
    }
  }

  return {
    stepCounts,
    conversionRate: welcome > 0 ? Math.round((orderCreated / welcome) * 100) : 0,
    dropOffPoints: dropOff,
    abandoned: stepCounts.abandoned || 0,
  };
}
