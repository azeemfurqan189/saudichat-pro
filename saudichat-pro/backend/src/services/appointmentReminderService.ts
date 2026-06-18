import prisma from '../utils/prisma';
import { sendWhatsAppText } from './whatsappSend';

export async function runDueAppointmentReminders(): Promise<number> {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const appointments = await prisma.appointment.findMany({
    where: {
      status: { in: ['PENDING', 'CONFIRMED'] },
      reminderSent: false,
      date: { gte: in24h, lte: in25h },
    },
    include: { customer: true, business: { select: { name: true } } },
    take: 100,
  });

  let sent = 0;
  for (const appt of appointments) {
    if (!appt.customer?.phone) continue;
    try {
      const dateStr = appt.date.toISOString().slice(0, 10);
      const msg = `⏰ Appointment reminder\n\n${appt.serviceName || 'Appointment'}\n📅 ${dateStr} at ${appt.startTime}\n\n${appt.business.name}\n\nReply CONFIRM to confirm or CANCEL to cancel.`;
      await sendWhatsAppText(appt.businessId, appt.customer.phone, msg);
      await prisma.appointment.update({
        where: { id: appt.id },
        data: { reminderSent: true },
      });
      sent++;
    } catch (err) {
      console.warn('[appointment] reminder failed:', appt.id, err instanceof Error ? err.message : err);
    }
  }
  return sent;
}

export async function runOneHourAppointmentReminders(): Promise<number> {
  const now = new Date();
  const in55m = new Date(now.getTime() + 55 * 60 * 1000);
  const in65m = new Date(now.getTime() + 65 * 60 * 1000);

  const appointments = await prisma.appointment.findMany({
    where: {
      status: { in: ['PENDING', 'CONFIRMED'] },
      date: { gte: new Date(now.toISOString().slice(0, 10)) },
    },
    include: { customer: true, business: { select: { name: true } } },
    take: 200,
  });

  let sent = 0;
  for (const appt of appointments) {
    if (!appt.customer?.phone) continue;
    const meta = (appt.notes || '').includes('[reminder1h]');
    if (meta) continue;

    const [h, m] = appt.startTime.split(':').map(Number);
    const apptStart = new Date(appt.date);
    apptStart.setHours(h, m || 0, 0, 0);
    if (apptStart < in55m || apptStart > in65m) continue;

    try {
      const dateStr = appt.date.toISOString().slice(0, 10);
      const msg = `⏰ Reminder — 1 hour left!\n\n${appt.serviceName || 'Appointment'}\n📅 ${dateStr} at ${appt.startTime}\n\n${appt.business.name}`;
      await sendWhatsAppText(appt.businessId, appt.customer.phone, msg);
      await prisma.appointment.update({
        where: { id: appt.id },
        data: { notes: `${appt.notes || ''} [reminder1h]`.trim() },
      });
      sent++;
    } catch (err) {
      console.warn('[appointment] 1h reminder failed:', appt.id, err instanceof Error ? err.message : err);
    }
  }
  return sent;
}

export async function scheduleAppointmentReminderBefore(
  appointmentId: string,
  businessId: string,
  minutesBefore = 60
): Promise<void> {
  const connection = process.env.REDIS_URL;
  if (!connection) return;

  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, businessId },
  });
  if (!appt) return;

  const [h, m] = appt.startTime.split(':').map(Number);
  const apptStart = new Date(appt.date);
  apptStart.setHours(h, m || 0, 0, 0);
  const delay = apptStart.getTime() - minutesBefore * 60 * 1000 - Date.now();
  if (delay <= 0) return;

  try {
    const { Queue } = await import('bullmq');
    const queue = new Queue('scheduled-jobs', { connection: { url: connection } });
    await queue.add(
      'appointment_reminder',
      { appointmentId, businessId },
      { delay, jobId: `appt-reminder-${appointmentId}`, removeOnComplete: true }
    );
  } catch (err) {
    console.warn('[appointment] schedule reminder failed:', err instanceof Error ? err.message : err);
  }
}

export async function sendAppointmentReminder(data: { appointmentId: string; businessId: string }): Promise<void> {
  const appt = await prisma.appointment.findFirst({
    where: { id: data.appointmentId, businessId: data.businessId },
    include: { customer: true, business: { select: { name: true } } },
  });
  if (!appt?.customer?.phone) return;

  const dateStr = appt.date.toISOString().slice(0, 10);
  const msg = `⏰ Appointment reminder (1 hour)\n\n${appt.serviceName || 'Appointment'}\n📅 ${dateStr} at ${appt.startTime}\n\n${appt.business.name}`;
  await sendWhatsAppText(appt.businessId, appt.customer.phone, msg);
}
