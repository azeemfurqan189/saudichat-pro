import prisma from '../utils/prisma';
import { sendWhatsAppText } from './whatsappSend';
import { trackEvent } from '../analytics/eventTracker';

const RATE_LIMIT_MS = 1200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendCampaignBroadcast(
  businessId: string,
  campaignId: string
): Promise<{ sent: number; failed: number; total: number }> {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, businessId },
  });

  if (!campaign) {
    throw new Error('Campaign not found');
  }

  if (campaign.status === 'COMPLETED' || campaign.status === 'CANCELLED') {
    throw new Error('Campaign already finished');
  }

  const target = (campaign.target as Record<string, unknown>) || {};
  const segment = String(target.segment || 'all');

  let customers = await prisma.customer.findMany({
    where: { businessId },
    select: { id: true, phone: true, name: true, totalSpent: true, lastInteraction: true, createdAt: true },
  });

  if (segment === 'vip') {
    customers = customers.filter((c) => c.totalSpent > 5000);
  } else if (segment === 'new') {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    customers = customers.filter((c) => c.createdAt >= weekAgo);
  } else if (segment === 'inactive') {
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    customers = customers.filter((c) => !c.lastInteraction || c.lastInteraction < monthAgo);
  }

  if (Array.isArray(target.customerIds) && target.customerIds.length > 0) {
    const ids = new Set(target.customerIds as string[]);
    customers = customers.filter((c) => ids.has(c.id));
  }

  let sent = 0;
  let failed = 0;

  for (const customer of customers) {
    if (!customer.phone?.trim()) {
      failed++;
      continue;
    }
    try {
      const personalized = campaign.message.replace(/\{name\}/gi, customer.name || '');
      await sendWhatsAppText(businessId, customer.phone, personalized);
      sent++;
      await sleep(RATE_LIMIT_MS);
    } catch (err) {
      failed++;
      console.warn('[campaign] send failed:', customer.phone, err instanceof Error ? err.message : err);
    }
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: 'COMPLETED',
      sentAt: new Date(),
      stats: { sent, failed, total: customers.length },
    },
  });

  await trackEvent({
    businessId,
    eventType: 'campaign_sent',
    metadata: { campaignId, sent, failed, type: campaign.type },
  });

  return { sent, failed, total: customers.length };
}

export async function scheduleCampaignSend(
  businessId: string,
  campaignId: string,
  scheduledAt: Date
): Promise<void> {
  const connection = process.env.REDIS_URL ? { url: process.env.REDIS_URL } : null;
  if (!connection) {
    console.warn('[campaign] Redis unavailable — scheduled send skipped');
    return;
  }

  const delay = Math.max(0, scheduledAt.getTime() - Date.now());
  const { Queue } = await import('bullmq');
  const queue = new Queue('scheduled-jobs', { connection });
  await queue.add(
    'campaign_send',
    { businessId, campaignId },
    { delay, jobId: `campaign:${campaignId}`, removeOnComplete: true }
  );
}
