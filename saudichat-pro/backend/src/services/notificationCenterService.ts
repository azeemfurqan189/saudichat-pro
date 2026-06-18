import prisma from '../utils/prisma';
import { getChannelIntegrations, upsertChannelIntegration } from './channelService';
import { sendEmail } from './emailService';
import { sendSms } from './smsService';
import { sendWhatsAppText } from './whatsappSend';

export const NOTIFICATION_CHANNELS = ['EMAIL', 'SMS', 'WHATSAPP', 'PUSH'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const CMMS_EVENT_TYPES = [
  { key: 'WORK_REQUEST', label: 'Work Request submitted', labelAr: 'طلب صيانة جديد' },
  { key: 'WORK_ORDER', label: 'Work Order assigned', labelAr: 'أمر عمل مُسند' },
  { key: 'PM_DUE', label: 'PM plan due', labelAr: 'PM مستحق' },
  { key: 'INSPECTION_DUE', label: 'Inspection overdue', labelAr: 'فحص متأخر' },
  { key: 'WARRANTY_EXPIRY', label: 'Warranty expiring', labelAr: 'انتهاء الضمان' },
  { key: 'LOW_STOCK', label: 'Low stock alert', labelAr: 'مخزون منخفض' },
  { key: 'PROCUREMENT', label: 'Purchase approved', labelAr: 'موافقة مشتريات' },
  { key: 'AI_ALERT', label: 'AI high-risk asset', labelAr: 'تنبيه AI — خطر عالي' },
] as const;

type EventRules = Record<string, Partial<Record<Lowercase<NotificationChannel>, boolean>>>;

const DEFAULT_EVENT_RULES: EventRules = {
  WORK_REQUEST: { email: true, sms: false, whatsapp: true, push: true },
  WORK_ORDER: { email: true, sms: true, whatsapp: true, push: true },
  PM_DUE: { email: true, sms: false, whatsapp: false, push: true },
  INSPECTION_DUE: { email: true, sms: true, whatsapp: true, push: true },
  WARRANTY_EXPIRY: { email: true, sms: false, whatsapp: true, push: true },
  LOW_STOCK: { email: true, sms: true, whatsapp: false, push: true },
  PROCUREMENT: { email: true, sms: false, whatsapp: true, push: false },
  AI_ALERT: { email: true, sms: true, whatsapp: true, push: true },
};

async function getOrCreateConfig(businessId: string) {
  const existing = await prisma.cmmsNotificationConfig.findUnique({ where: { businessId } });
  if (existing) return existing;
  return prisma.cmmsNotificationConfig.create({
    data: { businessId, eventRules: DEFAULT_EVENT_RULES },
  });
}

async function logDelivery(
  businessId: string,
  channel: NotificationChannel,
  eventType: string,
  title: string,
  message: string,
  status: string,
  recipient?: string
) {
  return prisma.notificationDeliveryLog.create({
    data: { businessId, channel, eventType, title, message, status, recipient: recipient ?? null },
  });
}

export async function getNotificationCenterSummary(businessId: string) {
  const [config, channels, deliveries, inAppUnread, owner] = await Promise.all([
    getOrCreateConfig(businessId),
    getChannelIntegrations(businessId),
    prisma.notificationDeliveryLog.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    prisma.notification.count({ where: { businessId, isRead: false } }),
    prisma.businessMember.findFirst({
      where: { businessId, role: 'OWNER', isActive: true },
      include: { user: { select: { email: true, phone: true } } },
    }),
  ]);

  const eventRules = { ...DEFAULT_EVENT_RULES, ...(config.eventRules as EventRules) };

  const channelStatus = [
    {
      channel: 'EMAIL' as NotificationChannel,
      label: 'Email',
      labelAr: 'البريد',
      isEnabled: channels.email?.isEnabled ?? false,
      configured: !!(channels.email?.config?.smtpHost || process.env.SMTP_HOST),
      lastSyncAt: channels.email?.lastSyncAt ?? null,
    },
    {
      channel: 'SMS' as NotificationChannel,
      label: 'SMS',
      labelAr: 'رسائل SMS',
      isEnabled: channels.sms?.isEnabled ?? false,
      configured: !!(channels.sms?.config?.apiKey || process.env.UNIFONIC_API_KEY),
      lastSyncAt: channels.sms?.lastSyncAt ?? null,
    },
    {
      channel: 'WHATSAPP' as NotificationChannel,
      label: 'WhatsApp',
      labelAr: 'واتساب',
      isEnabled: channels.whatsapp?.isEnabled ?? true,
      configured: true,
      lastSyncAt: channels.whatsapp?.lastSyncAt ?? null,
    },
    {
      channel: 'PUSH' as NotificationChannel,
      label: 'Push Notification',
      labelAr: 'إشعار Push',
      isEnabled: config.pushEnabled,
      configured: true,
      lastSyncAt: null,
    },
  ];

  const byChannel = NOTIFICATION_CHANNELS.reduce(
    (acc, ch) => {
      acc[ch] = deliveries.filter((d) => d.channel === ch).length;
      return acc;
    },
    {} as Record<NotificationChannel, number>
  );

  return {
    channels: channelStatus,
    eventRules,
    eventTypes: CMMS_EVENT_TYPES,
    stats: {
      totalDeliveries: deliveries.length,
      sentToday: deliveries.filter((d) => d.createdAt >= new Date(new Date().setHours(0, 0, 0, 0))).length,
      inAppUnread,
      byChannel,
    },
    recentDeliveries: deliveries,
    defaultRecipient: {
      email: owner?.user?.email ?? null,
      phone: owner?.user?.phone ?? null,
    },
  };
}

export async function updateNotificationCenterConfig(
  businessId: string,
  input: { eventRules?: EventRules; pushEnabled?: boolean }
) {
  await getOrCreateConfig(businessId);
  return prisma.cmmsNotificationConfig.update({
    where: { businessId },
    data: {
      eventRules: input.eventRules,
      pushEnabled: input.pushEnabled,
    },
  });
}

export async function toggleNotificationChannel(
  businessId: string,
  channel: string,
  isEnabled: boolean
) {
  const map: Record<string, string> = {
    EMAIL: 'email',
    SMS: 'sms',
    WHATSAPP: 'whatsapp',
  };
  const ch = map[channel.toUpperCase()];
  if (ch) {
    await upsertChannelIntegration(businessId, ch, { isEnabled });
  } else if (channel.toUpperCase() === 'PUSH') {
    await getOrCreateConfig(businessId);
    await prisma.cmmsNotificationConfig.update({ where: { businessId }, data: { pushEnabled: isEnabled } });
  }
  return getNotificationCenterSummary(businessId);
}

async function sendPushNotification(
  businessId: string,
  title: string,
  message: string,
  eventType: string
) {
  const members = await prisma.businessMember.findMany({
    where: { businessId, isActive: true, role: { in: ['OWNER', 'MANAGER'] } },
    select: { userId: true },
  });
  for (const m of members) {
    await prisma.notification.create({
      data: {
        businessId,
        userId: m.userId,
        type: 'SYSTEM',
        title,
        message,
      },
    });
  }
  return logDelivery(businessId, 'PUSH', eventType, title, message, 'SENT', `${members.length} users`);
}

export async function sendTestNotification(
  businessId: string,
  channel: NotificationChannel,
  recipient: string
) {
  const title = 'SaudiChat Pro — Test Alert';
  const message = 'CMMS Notification Center test — Work Request WR-2026-0042 submitted at Site A.';
  const eventType = 'TEST';

  try {
    if (channel === 'EMAIL') {
      await sendEmail(businessId, recipient, title, message);
      return logDelivery(businessId, 'EMAIL', eventType, title, message, 'SENT', recipient);
    }
    if (channel === 'SMS') {
      await sendSms(businessId, recipient, `${title}: ${message}`);
      return logDelivery(businessId, 'SMS', eventType, title, message, 'SENT', recipient);
    }
    if (channel === 'WHATSAPP') {
      await sendWhatsAppText(businessId, recipient, `🔔 *${title}*\n${message}`);
      return logDelivery(businessId, 'WHATSAPP', eventType, title, message, 'SENT', recipient);
    }
    if (channel === 'PUSH') {
      return sendPushNotification(businessId, title, message, eventType);
    }
    throw new Error('Unknown channel');
  } catch (err) {
    await logDelivery(
      businessId,
      channel,
      eventType,
      title,
      message,
      'FAILED',
      recipient
    );
    throw err;
  }
}

export async function dispatchCmmsNotification(
  businessId: string,
  eventType: string,
  title: string,
  message: string,
  recipients: { email?: string; phone?: string }
) {
  const config = await getOrCreateConfig(businessId);
  const rules = { ...DEFAULT_EVENT_RULES, ...(config.eventRules as EventRules) }[eventType] ?? {};

  const results: string[] = [];

  if (rules.email && recipients.email) {
    try {
      await sendEmail(businessId, recipients.email, title, message);
      await logDelivery(businessId, 'EMAIL', eventType, title, message, 'SENT', recipients.email);
      results.push('EMAIL');
    } catch {
      await logDelivery(businessId, 'EMAIL', eventType, title, message, 'FAILED', recipients.email);
    }
  }
  if (rules.sms && recipients.phone) {
    try {
      await sendSms(businessId, recipients.phone, `${title}: ${message}`);
      await logDelivery(businessId, 'SMS', eventType, title, message, 'SENT', recipients.phone);
      results.push('SMS');
    } catch {
      await logDelivery(businessId, 'SMS', eventType, title, message, 'FAILED', recipients.phone);
    }
  }
  if (rules.whatsapp && recipients.phone) {
    try {
      await sendWhatsAppText(businessId, recipients.phone, `🔔 *${title}*\n${message}`);
      await logDelivery(businessId, 'WHATSAPP', eventType, title, message, 'SENT', recipients.phone);
      results.push('WHATSAPP');
    } catch {
      await logDelivery(businessId, 'WHATSAPP', eventType, title, message, 'FAILED', recipients.phone);
    }
  }
  if (rules.push && config.pushEnabled) {
    await sendPushNotification(businessId, title, message, eventType);
    results.push('PUSH');
  }

  return { dispatched: results };
}

export async function seedNotificationCenterDemo(businessId: string) {
  const existing = await prisma.notificationDeliveryLog.count({ where: { businessId } });
  if (existing >= 5) {
    return { skipped: true, message: 'Notification center already seeded' };
  }

  await upsertChannelIntegration(businessId, 'email', { isEnabled: true, config: { smtpHost: 'smtp.demo.local', fromEmail: 'cmms@demo.local' } });
  await upsertChannelIntegration(businessId, 'sms', { isEnabled: true, config: { apiKey: 'demo', senderId: 'SaudiChat' } });
  await upsertChannelIntegration(businessId, 'whatsapp', { isEnabled: true });
  await getOrCreateConfig(businessId);

  const samples = [
    { channel: 'WHATSAPP' as NotificationChannel, eventType: 'WORK_REQUEST', title: 'New Work Request', message: 'WR-2026-0042 — Pump vibration at Site A', status: 'SENT' },
    { channel: 'EMAIL' as NotificationChannel, eventType: 'PM_DUE', title: 'PM Due Reminder', message: 'Generator monthly inspection due tomorrow', status: 'SENT' },
    { channel: 'SMS' as NotificationChannel, eventType: 'LOW_STOCK', title: 'Low Stock Alert', message: 'SKF-6205 bearing below reorder point (qty: 2)', status: 'SENT' },
    { channel: 'PUSH' as NotificationChannel, eventType: 'AI_ALERT', title: 'AI High Risk', message: 'Compressor C-101 failure probability 78%', status: 'SENT' },
    { channel: 'WHATSAPP' as NotificationChannel, eventType: 'PROCUREMENT', title: 'PO Approved', message: 'PO-2026-0015 sent to Al-Rashid Supplies', status: 'SENT' },
    { channel: 'EMAIL' as NotificationChannel, eventType: 'WORK_ORDER', title: 'Work Order Assigned', message: 'WO-2026-0088 assigned to maintenance team', status: 'QUEUED' },
  ];

  for (const s of samples) {
    await prisma.notificationDeliveryLog.create({
      data: {
        businessId,
        channel: s.channel,
        eventType: s.eventType,
        title: s.title,
        message: s.message,
        status: s.status,
        recipient: s.channel === 'PUSH' ? 'dashboard' : '+966500000000',
      },
    });
  }

  const owner = await prisma.businessMember.findFirst({
    where: { businessId, role: 'OWNER', isActive: true },
  });
  if (owner) {
    await prisma.notification.create({
      data: {
        businessId,
        userId: owner.userId,
        type: 'SYSTEM',
        title: 'CMMS Push — Low stock',
        message: 'SKF-6205 bearing below reorder point. Auto PR suggested.',
      },
    });
  }

  return { skipped: false, created: samples.length };
}
