import prisma from '../utils/prisma';
import { sendWhatsAppText } from './whatsappSend';

export const WORKFLOW_TEMPLATES = [
  {
    name: 'New Order → Status Updates',
    description: 'Notify customer on order status changes',
    triggerType: 'order_status_changed',
    steps: [{ type: 'notify', channel: 'whatsapp', message: 'Order status updated automatically' }],
  },
  {
    name: 'Abandoned Cart Reminder',
    description: 'Remind customer 30 min after cart abandonment',
    triggerType: 'abandoned_cart',
    steps: [
      { type: 'wait', minutes: 30 },
      { type: 'send_whatsapp', message: 'You left items in your cart! Reply MENU to complete your order.' },
    ],
  },
  {
    name: 'New Lead Welcome',
    description: 'Welcome message when new customer first messages',
    triggerType: 'new_customer',
    steps: [{ type: 'send_whatsapp', message: 'Welcome! We are happy to help you today.' }],
  },
  {
    name: 'Appointment Reminder',
    description: '24h before appointment reminder',
    triggerType: 'appointment_reminder',
    steps: [{ type: 'send_whatsapp', message: 'Reminder: your appointment is tomorrow.' }],
  },
  {
    name: 'Win-back Inactive',
    description: 'Re-engage customers inactive 30+ days',
    triggerType: 'customer_inactive',
    steps: [{ type: 'send_whatsapp', message: 'We miss you! Come back for a special offer.' }],
  },
];

export async function ensureDefaultWorkflows(businessId: string): Promise<void> {
  const count = await prisma.automationWorkflow.count({ where: { businessId } });
  if (count > 0) return;

  for (const tpl of WORKFLOW_TEMPLATES) {
    await prisma.automationWorkflow.create({
      data: {
        businessId,
        name: tpl.name,
        description: tpl.description,
        triggerType: tpl.triggerType,
        triggerConfig: {},
        steps: tpl.steps,
        isActive: tpl.triggerType !== 'customer_inactive',
      },
    });
  }
}

export async function runWorkflowsForTrigger(
  businessId: string,
  triggerType: string,
  context: Record<string, unknown> = {}
): Promise<number> {
  const workflows = await prisma.automationWorkflow.findMany({
    where: { businessId, triggerType, isActive: true },
  });

  let ran = 0;
  for (const wf of workflows) {
    try {
      const steps = wf.steps as Array<Record<string, unknown>>;
      for (const step of steps) {
        if (step.type === 'send_whatsapp' && context.phone) {
          const msg = String(step.message || '').replace(/\{name\}/gi, String(context.name || ''));
          await sendWhatsAppText(businessId, String(context.phone), msg);
        }
      }
      await prisma.automationWorkflow.update({
        where: { id: wf.id },
        data: { runsCount: { increment: 1 }, lastRunAt: new Date() },
      });
      await prisma.workflowLog.create({
        data: {
          businessId,
          entityType: 'workflow',
          entityId: wf.id,
          step: triggerType,
          messageSent: `Ran ${steps.length} step(s)`,
        },
      });
      ran++;
    } catch (err) {
      console.warn('[workflowRunner]', wf.id, err instanceof Error ? err.message : err);
    }
  }
  return ran;
}
