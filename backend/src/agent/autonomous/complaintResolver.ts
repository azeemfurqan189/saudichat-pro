import prisma from '../../utils/prisma';
import { sendBotMessage } from '../../whatsapp/flows/router-helpers';
import { ToolContext } from '../toolExecutor';
import { DetectedLanguage, pickLocalized } from '../../ai/language/detector';
import { getConversationState, setConversationState } from '../conversationState';
import { trackEvent } from '../../analytics/eventTracker';

export async function runComplaintResolver(
  ctx: ToolContext,
  text: string,
  lang: DetectedLanguage = 'mixed'
): Promise<boolean> {
  const state = await getConversationState(ctx.businessId, ctx.conversationId);
  const lower = text.toLowerCase().trim();
  const flow = state.complaintFlow;

  if (flow?.step === 'awaiting_choice') {
    const wantsRefund = /\b(refund|money back|paisa|wapis|ارجاع|استرداد)\b/i.test(lower);
    const wantsReplace = /\b(replace|replacement|new|dobara|بديل|استبدال)\b/i.test(lower);

    if (wantsRefund) {
      const order = flow.orderId
        ? await prisma.order.findFirst({ where: { id: flow.orderId, businessId: ctx.businessId } })
        : await prisma.order.findFirst({
            where: { businessId: ctx.businessId, customerId: ctx.customerId },
            orderBy: { createdAt: 'desc' },
          });

      if (order) {
        await prisma.order.update({
          where: { id: order.id },
          data: { paymentStatus: 'REFUNDED', status: 'CANCELLED' },
        });
        await prisma.customerFeedback.create({
          data: {
            businessId: ctx.businessId,
            customerId: ctx.customerId,
            orderId: order.id,
            category: 'complaint',
            message: flow.issue || text,
            status: 'RESOLVED',
            rating: 2,
          },
        });
      }

      await setConversationState(ctx.businessId, ctx.conversationId, { complaintFlow: undefined, state: 'idle' });
      await trackEvent({
        businessId: ctx.businessId,
        conversationId: ctx.conversationId,
        customerId: ctx.customerId,
        eventType: 'complaint_auto_refund',
      });
      await sendBotMessage(
        ctx.conversationId,
        pickLocalized(
          lang,
          '✅ Refund initiated. Amount will return in 3-5 business days. Sorry for the trouble!',
          '✅ تم بدء الاسترداد. المبلغ خلال 3-5 أيام. نعتذر!'
        ),
        ctx.businessId,
        ctx.phone
      );
      return true;
    }

    if (wantsReplace) {
      await setConversationState(ctx.businessId, ctx.conversationId, { complaintFlow: undefined, state: 'idle' });
      await prisma.customerFeedback.create({
        data: {
          businessId: ctx.businessId,
          customerId: ctx.customerId,
          category: 'complaint',
          message: flow.issue || text,
          status: 'REPLACEMENT_SCHEDULED',
        },
      });
      await trackEvent({
        businessId: ctx.businessId,
        conversationId: ctx.conversationId,
        customerId: ctx.customerId,
        eventType: 'complaint_auto_replacement',
      });
      await sendBotMessage(
        ctx.conversationId,
        pickLocalized(
          lang,
          '✅ Replacement order scheduled for tomorrow. Driver will contact you.',
          '✅ تم جدولة طلب بديل للغد. السائق سيتواصل معك.'
        ),
        ctx.businessId,
        ctx.phone
      );
      return true;
    }

    await escalateComplaint(ctx, flow.issue || text);
    return true;
  }

  const isComplaint =
    /\b(complaint|shikayat|shikayet|galat|wrong|problem|issue|refund|mushkil|مشكلة|شكوى|غلط)\b/i.test(lower);
  if (!isComplaint) return false;

  const lastOrder = await prisma.order.findFirst({
    where: { businessId: ctx.businessId, customerId: ctx.customerId },
    orderBy: { createdAt: 'desc' },
  });

  await setConversationState(ctx.businessId, ctx.conversationId, {
    complaintFlow: { step: 'awaiting_choice', issue: text.slice(0, 300), orderId: lastOrder?.id },
    state: 'idle',
  });

  await sendBotMessage(
    ctx.conversationId,
    pickLocalized(
      lang,
      'Sorry for the trouble! 🙏\n\nReply:\n• REFUND — money back\n• REPLACEMENT — send again\n\nOr describe more — manager only if needed.',
      'نعتذر! 🙏\n\nرد:\n• REFUND — استرداد\n• REPLACEMENT — إرسال بديل'
    ),
    ctx.businessId,
    ctx.phone
  );
  return true;
}

async function escalateComplaint(ctx: ToolContext, reason: string): Promise<void> {
  await prisma.conversation.update({
    where: { id: ctx.conversationId },
    data: { isBotHandling: false, status: 'WAITING' },
  });
  const business = await prisma.business.findUnique({ where: { id: ctx.businessId } });
  if (business) {
    await prisma.notification.create({
      data: {
        businessId: ctx.businessId,
        userId: business.userId,
        type: 'MESSAGE',
        title: 'Complaint escalated',
        message: reason.slice(0, 200),
      },
    });
  }
  await setConversationState(ctx.businessId, ctx.conversationId, { complaintFlow: undefined });
}
