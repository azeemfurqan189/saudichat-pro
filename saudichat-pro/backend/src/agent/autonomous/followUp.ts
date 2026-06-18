import prisma from '../../utils/prisma';
import { sendWhatsAppText } from '../../services/whatsappSend';
import { validateBotResponse } from '../../ai/guardrails/responseValidator';
import { trackEvent } from '../../analytics/eventTracker';

const LEAD_FOLLOWUP_DAYS = 2;
const PAYMENT_REMINDER_DAYS = 1;

export async function runLeadFollowUps(): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - LEAD_FOLLOWUP_DAYS);

  const leads = await prisma.lead.findMany({
    where: {
      status: { in: ['NEW', 'CONTACTED'] },
      updatedAt: { lt: cutoff },
    },
    take: 100,
  });

  let sent = 0;
  for (const lead of leads) {
    if (!lead.phone) continue;
    const meta = (lead.metadata as Record<string, unknown>) || {};
    const lastFollowUp = meta.lastFollowUpAt ? new Date(String(meta.lastFollowUpAt)) : null;
    if (lastFollowUp && Date.now() - lastFollowUp.getTime() < LEAD_FOLLOWUP_DAYS * 86400000) continue;

    const msg = `Hi ${lead.name}! 👋\nKya aap abhi bhi interested hain? Main help kar sakta hoon.\n\nمرحباً ${lead.name}! هل ما زلت مهتماً؟`;
    const { sanitized } = await validateBotResponse(msg, lead.businessId);
    try {
      await sendWhatsAppText(lead.businessId, lead.phone, sanitized);
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: 'CONTACTED',
          metadata: { ...meta, lastFollowUpAt: new Date().toISOString(), followUpCount: Number(meta.followUpCount || 0) + 1 },
        },
      });
      await trackEvent({ businessId: lead.businessId, eventType: 'lead_auto_followup', metadata: { leadId: lead.id } });
      sent++;
    } catch (err) {
      console.warn('[followUp] lead failed:', lead.id, err instanceof Error ? err.message : err);
    }
  }
  return sent;
}

export async function runPaymentPendingReminders(): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - PAYMENT_REMINDER_DAYS);

  const orders = await prisma.order.findMany({
    where: {
      paymentStatus: 'PENDING',
      status: { notIn: ['CANCELLED', 'DELIVERED'] },
      createdAt: { lt: cutoff },
    },
    include: { customer: true },
    take: 100,
  });

  let sent = 0;
  for (const order of orders) {
    if (!order.customer?.phone) continue;
    const msg = `💳 Friendly reminder\n\nOrder #${order.orderNumber}\nAmount: ${order.total} SAR\n\nPayment pending — reply PAY when done or ask for help.`;
    const { sanitized } = await validateBotResponse(msg, order.businessId);
    try {
      await sendWhatsAppText(order.businessId, order.customer.phone, sanitized);
      await trackEvent({
        businessId: order.businessId,
        customerId: order.customerId,
        eventType: 'payment_reminder_sent',
        metadata: { orderId: order.id },
      });
      sent++;
    } catch (err) {
      console.warn('[followUp] payment reminder failed:', order.id, err instanceof Error ? err.message : err);
    }
  }
  return sent;
}

export async function alertAgentOnLeadReply(businessId: string, customerId: string, leadId: string): Promise<void> {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) return;
  await prisma.notification.create({
    data: {
      businessId,
      userId: business.userId,
      type: 'MESSAGE',
      title: 'Lead replied to follow-up',
      message: `Lead ${leadId} responded — assign agent for conversion.`,
    },
  });
}
