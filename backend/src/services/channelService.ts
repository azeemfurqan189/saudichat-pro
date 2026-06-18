import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { sendWhatsAppText } from './whatsappSend';

export type ChannelType = 'whatsapp' | 'instagram' | 'facebook' | 'email' | 'sms' | 'livechat';

export async function getChannelIntegrations(businessId: string) {
  const rows = await prisma.channelIntegration.findMany({ where: { businessId } });
  const channels: ChannelType[] = ['whatsapp', 'instagram', 'facebook', 'email', 'sms', 'livechat'];
  const map: Record<string, { isEnabled: boolean; config: Record<string, unknown>; lastSyncAt?: Date }> = {};

  for (const ch of channels) {
    const row = rows.find((r) => r.channel === ch);
    map[ch] = {
      isEnabled: row?.isEnabled ?? ch === 'whatsapp',
      config: (row?.config as Record<string, unknown>) || {},
      lastSyncAt: row?.lastSyncAt ?? undefined,
    };
  }
  return map;
}

export async function upsertChannelIntegration(
  businessId: string,
  channel: string,
  data: { isEnabled?: boolean; config?: Record<string, unknown> }
) {
  return prisma.channelIntegration.upsert({
    where: { businessId_channel: { businessId, channel } },
    create: {
      businessId,
      channel,
      isEnabled: data.isEnabled ?? false,
      config: (data.config || {}) as Prisma.InputJsonValue,
    },
    update: {
      isEnabled: data.isEnabled,
      config: data.config as Prisma.InputJsonValue | undefined,
      updatedAt: new Date(),
    },
  });
}

export async function sendChannelMessage(
  businessId: string,
  channel: ChannelType,
  to: string,
  content: string
): Promise<{ success: boolean; channel: string; error?: string }> {
  try {
    if (channel === 'whatsapp') {
      await sendWhatsAppText(businessId, to, content);
      return { success: true, channel };
    }

    if (channel === 'email') {
      const { sendEmail } = await import('./emailService');
      await sendEmail(businessId, to, 'Message from business', content);
      return { success: true, channel };
    }

    if (channel === 'sms') {
      const { sendSms } = await import('./smsService');
      await sendSms(businessId, to, content);
      return { success: true, channel };
    }

    if (channel === 'instagram' || channel === 'facebook') {
      const integration = await prisma.channelIntegration.findUnique({
        where: { businessId_channel: { businessId, channel } },
      });
      if (!integration?.isEnabled) {
        return { success: false, channel, error: `${channel} not configured` };
      }
      // Meta Graph API placeholder — stores message intent in analytics
      await prisma.analyticsEvent.create({
        data: {
          businessId,
          eventType: `${channel}_message_queued`,
          metadata: { to, content: content.slice(0, 200) },
        },
      });
      return { success: true, channel };
    }

    return { success: false, channel, error: 'Unsupported channel' };
  } catch (err) {
    return { success: false, channel, error: err instanceof Error ? err.message : 'Send failed' };
  }
}

export async function trackJourneyEvent(
  businessId: string,
  customerId: string,
  stage: string,
  channel?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await prisma.customerJourneyEvent.create({
    data: { businessId, customerId, stage, channel, metadata: (metadata || {}) as Prisma.InputJsonValue },
  });
}
