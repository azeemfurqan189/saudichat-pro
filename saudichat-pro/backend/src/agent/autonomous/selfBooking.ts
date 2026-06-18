import prisma from '../../utils/prisma';
import { sendBotMessage } from '../../whatsapp/flows/router-helpers';
import { ToolContext, executeTool } from '../toolExecutor';
import { DetectedLanguage, pickLocalized } from '../../ai/language/detector';
import { getConversationState, setConversationState } from '../conversationState';
import { trackEvent } from '../../analytics/eventTracker';
import { isNaturalBookingRequest, parseNaturalDateTime } from './naturalDateParser';
import { scheduleAppointmentReminderBefore } from '../../services/appointmentReminderService';

export async function trySelfBooking(
  ctx: ToolContext,
  text: string,
  lang: DetectedLanguage = 'mixed'
): Promise<boolean> {
  if (!isNaturalBookingRequest(text)) return false;

  const parsed = parseNaturalDateTime(text);
  if (!parsed?.date) return false;

  const state = await getConversationState(ctx.businessId, ctx.conversationId);
  let serviceId = state.pendingBooking?.serviceId;
  let serviceName = state.pendingBooking?.serviceName;

  if (!serviceId) {
    const services = await prisma.catalogItem.findMany({
      where: { businessId: ctx.businessId, isAvailable: true },
      orderBy: { sortOrder: 'asc' },
      take: 1,
    });
    if (services[0]) {
      serviceId = services[0].id;
      serviceName = services[0].nameAr;
    } else {
      serviceId = undefined;
      serviceName = 'Consultation';
    }
  }

  const avail = await executeTool(ctx, 'checkAvailability', {
    date: parsed.date,
    serviceId,
  });

  if (!avail.success || !avail.result) {
    await sendBotMessage(
      ctx.conversationId,
      pickLocalized(lang, 'Sorry, could not check calendar. Please try again.', 'عذراً، لم نتمكن من التحقق من المواعيد.'),
      ctx.businessId,
      ctx.phone
    );
    return true;
  }

  const slots = (avail.result as { availableSlots: string[] }).availableSlots || [];
  if (slots.length === 0) {
    await sendBotMessage(
      ctx.conversationId,
      pickLocalized(
        lang,
        `No slots available on ${parsed.date}. Try another day?`,
        `لا توجد مواعيد متاحة في ${parsed.date}. جرب يوماً آخر؟`
      ),
      ctx.businessId,
      ctx.phone
    );
    return true;
  }

  let chosenTime = parsed.time;
  if (chosenTime && !slots.includes(chosenTime)) {
    const hour = parseInt(chosenTime.split(':')[0], 10);
    chosenTime = slots.find((s) => Math.abs(parseInt(s.split(':')[0], 10) - hour) <= 1) || slots[0];
  }
  if (!chosenTime) chosenTime = slots[0];

  const result = await executeTool(
    { ...ctx, state: 'confirming_booking' },
    'createAppointment',
    {
      serviceId,
      serviceName,
      date: parsed.date,
      startTime: chosenTime.includes(':') ? chosenTime : `${chosenTime}:00`,
    }
  );

  await setConversationState(ctx.businessId, ctx.conversationId, { state: 'idle', pendingBooking: undefined });

  if (result.success && result.result) {
    const apptId = (result.result as { appointmentId?: string }).appointmentId;
    if (apptId) {
      await scheduleAppointmentReminderBefore(apptId, ctx.businessId, 60);
    }
    await trackEvent({
      businessId: ctx.businessId,
      conversationId: ctx.conversationId,
      customerId: ctx.customerId,
      eventType: 'self_booking_completed',
      metadata: { date: parsed.date, time: chosenTime },
    });
    await sendBotMessage(
      ctx.conversationId,
      pickLocalized(
        lang,
        `✅ Booked!\n\n${serviceName}\n📅 ${parsed.date} at ${chosenTime}\n\nReminder 1 hour before.`,
        `✅ تم الحجز!\n\n${serviceName}\n📅 ${parsed.date} الساعة ${chosenTime}\n\nتذكير قبل ساعة.`
      ),
      ctx.businessId,
      ctx.phone
    );
  } else {
    await sendBotMessage(
      ctx.conversationId,
      pickLocalized(lang, 'Booking failed. Please try again or type a service number.', 'فشل الحجز. حاول مرة أخرى.'),
      ctx.businessId,
      ctx.phone
    );
  }

  return true;
}
