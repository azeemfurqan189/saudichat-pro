import prisma from '../utils/prisma';
import { sendWhatsAppText } from '../services/whatsappSend';
import { validateBotResponse } from '../ai/guardrails/responseValidator';
import { trackEvent } from '../analytics/eventTracker';

const STATUS_MESSAGES: Record<string, { ar: string; en: string }> = {
  CONFIRMED: { ar: '✅ تم تأكيد طلبك!', en: '✅ Your order is confirmed!' },
  PREPARING: { ar: '👨‍🍳 طلبك قيد التحضير', en: '👨‍🍳 Your order is being prepared' },
  READY: { ar: '🎉 طلبك جاهز للاستلام!', en: '🎉 Your order is ready for pickup!' },
  DELIVERED: { ar: '🚗 تم التوصيل! شكراً لك', en: '🚗 Delivered! Thank you' },
};

export async function runOrderWorkflow(
  businessId: string,
  orderId: string,
  newStatus: string,
  customerPhone: string
): Promise<void> {
  const template = STATUS_MESSAGES[newStatus];
  if (!template) return;

  const order = await prisma.order.findFirst({ where: { id: orderId, businessId } });
  if (!order) return;

  const msg = `${template.ar}\n${template.en}\n\nOrder #${order.orderNumber}`;
  const { sanitized } = await validateBotResponse(msg, businessId);
  await sendWhatsAppText(businessId, customerPhone, sanitized);

  await prisma.workflowLog.create({
    data: {
      businessId,
      entityType: 'order',
      entityId: orderId,
      step: newStatus.toLowerCase(),
      messageSent: sanitized,
    },
  });

  await trackEvent({
    businessId,
    eventType: 'workflow_step',
    metadata: { entityType: 'order', orderId, step: newStatus },
  });

  if (newStatus === 'DELIVERED') {
    const { scheduleOrderFeedbackRequest } = await import('../jobs/scheduler');
    await scheduleOrderFeedbackRequest(businessId, orderId, customerPhone);
  }
}

export async function runAppointmentWorkflow(
  businessId: string,
  appointmentId: string,
  newStatus: string,
  customerPhone: string
): Promise<void> {
  if (newStatus !== 'CONFIRMED' && newStatus !== 'COMPLETED') return;

  const appt = await prisma.appointment.findFirst({ where: { id: appointmentId, businessId } });
  if (!appt) return;

  const msg =
    newStatus === 'CONFIRMED'
      ? `✅ Appointment confirmed!\n📅 ${appt.serviceName}\n${appt.date.toISOString().slice(0, 10)} ${appt.startTime}`
      : `✅ Appointment completed! Thank you.\nشكراً لزيارتك!`;

  const { sanitized } = await validateBotResponse(msg, businessId);
  await sendWhatsAppText(businessId, customerPhone, sanitized);

  await prisma.workflowLog.create({
    data: { businessId, entityType: 'appointment', entityId: appointmentId, step: newStatus.toLowerCase(), messageSent: sanitized },
  });
}
