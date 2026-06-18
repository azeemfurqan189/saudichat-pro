import prisma from '../utils/prisma';
import { getManpowerPolicy } from './manpowerPolicyService';
import { sendSms } from './smsService';
import { sendEmail } from './emailService';

export async function runTimesheetApprovalReminders(): Promise<number> {
  const businesses = await prisma.business.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  let sent = 0;

  for (const business of businesses) {
    const policy = await getManpowerPolicy(business.id);
    const cutoff = new Date(Date.now() - policy.autoReminderHours * 60 * 60 * 1000);

    const pending = await prisma.timesheet.findMany({
      where: {
        businessId: business.id,
        status: { in: ['PENDING', 'PENDING_ADMIN', 'PENDING_PAYROLL'] },
        OR: [{ lastReminderAt: null }, { lastReminderAt: { lt: cutoff } }],
        submittedAt: { lte: cutoff },
      },
      take: 50,
    });

    if (pending.length === 0) continue;

    const managers = await prisma.businessMember.findMany({
      where: {
        businessId: business.id,
        isActive: true,
        role: { in: ['OWNER', 'MANAGER'] },
      },
      include: { user: { select: { id: true, phone: true, email: true } } },
    });

    const message = `[SaudiChat] ${pending.length} timesheet(s) pending approval for ${business.name}.`;

    for (const mgr of managers) {
      if (!mgr.user) continue;
      await prisma.notification.create({
        data: {
          businessId: business.id,
          userId: mgr.user.id,
          type: 'SYSTEM',
          title: 'Timesheet approval reminder',
          message: `${pending.length} entries waiting > ${policy.autoReminderHours}h`,
        },
      });

      if (mgr.user.phone) {
        try {
          await sendSms(business.id, mgr.user.phone, message);
          sent += 1;
        } catch {
          /* optional */
        }
      }
      if (mgr.user.email) {
        try {
          await sendEmail(business.id, mgr.user.email, 'Timesheet Approval Reminder', message);
        } catch {
          /* stub */
        }
      }
    }

    await prisma.timesheet.updateMany({
      where: { id: { in: pending.map((p) => p.id) } },
      data: { lastReminderAt: new Date() },
    });
  }

  return sent;
}

export async function notifyTimesheetSubmitted(
  businessId: string,
  workerName: string,
  projectName?: string
) {
  const owner = await prisma.business.findUnique({
    where: { id: businessId },
    select: { userId: true },
  });
  if (!owner) return;

  await prisma.notification.create({
    data: {
      businessId,
      userId: owner.userId,
      type: 'SYSTEM',
      title: 'New timesheet submitted',
      message: `${workerName}${projectName ? ` @ ${projectName}` : ''} — pending approval`,
    },
  });
}
