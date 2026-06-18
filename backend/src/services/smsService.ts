import prisma from '../utils/prisma';

export async function sendSms(businessId: string, to: string, message: string): Promise<void> {
  const integration = await prisma.channelIntegration.findUnique({
    where: { businessId_channel: { businessId, channel: 'sms' } },
  });
  const config = (integration?.config as Record<string, unknown>) || {};
  const apiKey = String(config.unifonicApiKey || process.env.UNIFONIC_API_KEY || '');
  const sender = String(config.senderId || process.env.UNIFONIC_SENDER || 'SaudiChat');

  if (!apiKey) {
    console.log(`[sms] queued (no Unifonic key): ${to}`);
    await prisma.analyticsEvent.create({
      data: { businessId, eventType: 'sms_queued', metadata: { to, message: message.slice(0, 100) } },
    });
    return;
  }

  try {
    const res = await fetch('https://el.cloud.unifonic.com/rest/SMS/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        Recipient: to.replace(/\D/g, ''),
        Body: message,
        SenderID: sender,
      }),
    });
    if (!res.ok) throw new Error(`Unifonic ${res.status}`);
    await prisma.analyticsEvent.create({
      data: { businessId, eventType: 'sms_sent', metadata: { to } },
    });
  } catch (err) {
    console.warn('[sms] failed:', err instanceof Error ? err.message : err);
    await prisma.analyticsEvent.create({
      data: { businessId, eventType: 'sms_failed', metadata: { to, error: String(err) } },
    });
    throw err;
  }
}
