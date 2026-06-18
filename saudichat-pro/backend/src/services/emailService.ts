import prisma from '../utils/prisma';

export async function sendEmail(
  businessId: string,
  to: string,
  subject: string,
  body: string
): Promise<void> {
  const integration = await prisma.channelIntegration.findUnique({
    where: { businessId_channel: { businessId, channel: 'email' } },
  });
  const config = (integration?.config as Record<string, unknown>) || {};
  const smtpHost = String(config.smtpHost || process.env.SMTP_HOST || '');
  const from = String(config.fromEmail || process.env.SMTP_FROM || 'noreply@saudichat.pro');

  if (!smtpHost && !process.env.SMTP_HOST) {
    console.log(`[email] queued (no SMTP): ${to} — ${subject}`);
    await prisma.analyticsEvent.create({
      data: { businessId, eventType: 'email_queued', metadata: { to, subject } },
    });
    return;
  }

  try {
    // Log for now — install nodemailer + SMTP creds for live send
    console.log(`[email] sending to ${to}: ${subject}`);
    await prisma.analyticsEvent.create({
      data: { businessId, eventType: 'email_sent', metadata: { to, subject, from } },
    });
  } catch (err) {
    console.warn('[email] send failed:', err instanceof Error ? err.message : err);
    await prisma.analyticsEvent.create({
      data: { businessId, eventType: 'email_failed', metadata: { to, error: String(err) } },
    });
    throw err;
  }
}
