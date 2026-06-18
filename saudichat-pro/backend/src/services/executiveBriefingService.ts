import prisma from '../utils/prisma';
import { computeFatigueAndOvertimeBalance } from './manpowerDashboardService';
import { getCmmsAlerts } from './cmmsAlertsService';
import { createChatCompletion, isAiConfigured } from '../ai/provider';

export type AttentionItem = {
  id: string;
  category: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  detail?: string;
  href?: string;
  count?: number;
};

export async function getOwnerBriefing(businessId: string) {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    pendingTimesheets,
    pendingAdmin,
    iqamaExpiring,
    projectsEnding,
    overdueTasks,
    staleTasks,
    unreadConversations,
    workerStats,
    projectStats,
    fatigue,
    cmmsAlerts,
    criticalActivities,
    business,
    pendingLeave,
    cmmsWoOpen,
    cmmsPmDue,
    cmmsFinance,
  ] = await Promise.all([
    prisma.timesheet.count({ where: { businessId, status: 'PENDING' } }),
    prisma.timesheet.count({
      where: { businessId, status: { in: ['PENDING_ADMIN', 'PENDING_PAYROLL'] } },
    }),
    prisma.workerProfile.findMany({
      where: { businessId, iqamaExpiry: { lte: in30Days, gte: now } },
      select: { id: true, name: true, iqamaExpiry: true, iqamaNumber: true },
      orderBy: { iqamaExpiry: 'asc' },
      take: 20,
    }),
    prisma.agencyProject.findMany({
      where: { businessId, status: 'ACTIVE', endDate: { lte: in30Days, gte: now } },
      select: { id: true, name: true, endDate: true },
      orderBy: { endDate: 'asc' },
      take: 10,
    }),
    prisma.task.findMany({
      where: {
        businessId,
        status: { in: ['TODO', 'IN_PROGRESS'] },
        dueDate: { lt: now },
      },
      select: { id: true, title: true, dueDate: true, priority: true },
      take: 15,
    }),
    prisma.task.findMany({
      where: {
        businessId,
        status: { in: ['TODO', 'IN_PROGRESS'] },
        updatedAt: { lt: weekAgo },
      },
      select: { id: true, title: true, updatedAt: true },
      take: 10,
    }),
    prisma.conversation.count({
      where: { businessId, status: 'ACTIVE', updatedAt: { lt: weekAgo } },
    }),
    prisma.workerProfile.groupBy({
      by: ['status'],
      where: { businessId },
      _count: true,
    }),
    prisma.agencyProject.groupBy({
      by: ['status'],
      where: { businessId },
      _count: true,
    }),
    computeFatigueAndOvertimeBalance(businessId),
    getCmmsAlerts(businessId).catch(() => ({ summary: { total: 0 }, items: [] })),
    prisma.scheduleActivity.findMany({
      where: { businessId, isCritical: true, percentComplete: { lt: 100 } },
      include: { project: { select: { id: true, name: true } } },
      take: 8,
    }).catch(() => []),
    prisma.business.findUnique({
      where: { id: businessId },
      select: { name: true, type: true, settings: true },
    }),
    prisma.workerLeaveRequest.count({ where: { businessId, status: 'PENDING' } }),
    prisma.workOrder.count({ where: { businessId, status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    prisma.maintenancePlan.count({
      where: { businessId, isActive: true, nextDueAt: { lte: now } },
    }),
    prisma.cmmsFinanceConfig.findUnique({ where: { businessId } }),
  ]);

  const attentionItems: AttentionItem[] = [];

  if (pendingTimesheets > 0) {
    attentionItems.push({
      id: 'pending-timesheets',
      category: 'timesheets',
      severity: pendingTimesheets > 10 ? 'HIGH' : 'MEDIUM',
      title: `${pendingTimesheets} timesheet(s) awaiting site manager approval`,
      href: '/timesheets',
      count: pendingTimesheets,
    });
  }
  if (pendingAdmin > 0) {
    attentionItems.push({
      id: 'pending-admin',
      category: 'timesheets',
      severity: 'HIGH',
      title: `${pendingAdmin} timesheet(s) awaiting admin/payroll approval`,
      href: '/timesheets',
      count: pendingAdmin,
    });
  }
  for (const w of iqamaExpiring) {
    const days = w.iqamaExpiry
      ? Math.ceil((w.iqamaExpiry.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      : 0;
    attentionItems.push({
      id: `iqama-${w.id}`,
      category: 'compliance',
      severity: days <= 7 ? 'CRITICAL' : days <= 14 ? 'HIGH' : 'MEDIUM',
      title: `Iqama expiring: ${w.name}`,
      detail: `${days} days left (${w.iqamaNumber || 'no number'})`,
      href: '/workers',
    });
  }
  for (const p of projectsEnding) {
    const days = p.endDate
      ? Math.ceil((p.endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      : 0;
    attentionItems.push({
      id: `project-end-${p.id}`,
      category: 'projects',
      severity: days <= 7 ? 'HIGH' : 'MEDIUM',
      title: `Project ending: ${p.name}`,
      detail: `${days} days remaining`,
      href: `/projects/${p.id}`,
    });
  }
  for (const t of overdueTasks) {
    attentionItems.push({
      id: `task-overdue-${t.id}`,
      category: 'tasks',
      severity: t.priority === 'URGENT' || t.priority === 'HIGH' ? 'HIGH' : 'MEDIUM',
      title: `Overdue task: ${t.title}`,
      href: '/tasks',
    });
  }
  for (const w of fatigue.fatigueRisk.slice(0, 5)) {
    attentionItems.push({
      id: `fatigue-${w.workerProfileId}`,
      category: 'workforce',
      severity: w.riskLevel === 'HIGH' ? 'CRITICAL' : 'HIGH',
      title: `Fatigue risk: ${w.workerName}`,
      detail: `${w.weeklyOvertimeHours}h OT this week`,
      href: '/manpower-live',
    });
  }
  if (pendingLeave > 0) {
    attentionItems.push({
      id: 'pending-leave',
      category: 'hr',
      severity: pendingLeave > 5 ? 'HIGH' : 'MEDIUM',
      title: `${pendingLeave} leave request(s) pending approval`,
      href: '/hr',
      count: pendingLeave,
    });
  }
  for (const alert of cmmsAlerts.items.slice(0, 12)) {
    attentionItems.push({
      id: alert.id,
      category: 'cmms',
      severity: alert.severity,
      title: alert.title,
      detail: alert.detail,
      href: alert.href,
    });
  }
  for (const act of criticalActivities) {
    if ((act.totalFloat ?? 1) <= 0 && act.percentComplete < 80) {
      attentionItems.push({
        id: `plan-${act.id}`,
        category: 'planning',
        severity: act.percentComplete < 30 ? 'HIGH' : 'MEDIUM',
        title: `Critical path: ${act.name} (${act.project.name})`,
        detail: `Float ${act.totalFloat ?? 0}d · ${act.percentComplete}% complete`,
        href: '/planning',
      });
    }
  }
  if (unreadConversations > 0) {
    attentionItems.push({
      id: 'stale-inbox',
      category: 'inbox',
      severity: 'MEDIUM',
      title: `${unreadConversations} open conversation(s) inactive 7+ days`,
      href: '/inbox',
      count: unreadConversations,
    });
  }

  const ignoredItems: AttentionItem[] = staleTasks.map((t) => ({
    id: `ignored-task-${t.id}`,
    category: 'tasks',
    severity: 'LOW',
    title: `Task untouched 7+ days: ${t.title}`,
    detail: `Last updated ${t.updatedAt.toISOString().slice(0, 10)}`,
    href: '/tasks',
  }));

  const settings = (business?.settings as Record<string, unknown>) || {};
  const reminders = (settings.companyReminders as Array<Record<string, unknown>>) || [];
  const overdueReminders = reminders.filter((r) => {
    const due = r.dueDate ? new Date(String(r.dueDate)) : null;
    return due && due < now && r.status !== 'DONE';
  });
  for (const r of overdueReminders.slice(0, 5)) {
    ignoredItems.push({
      id: `reminder-${String(r.id || r.title)}`,
      category: 'reminders',
      severity: 'MEDIUM',
      title: `Overdue: ${String(r.title || 'Reminder')}`,
      detail: String(r.type || 'subscription'),
    });
  }

  const workerByStatus = Object.fromEntries(workerStats.map((s) => [s.status, s._count]));
  const projectByStatus = Object.fromEntries(projectStats.map((s) => [s.status, s._count]));

  const resourceVisibility = {
    workers: {
      total: workerStats.reduce((s, r) => s + r._count, 0),
      available: workerByStatus.AVAILABLE || 0,
      assigned: workerByStatus.ASSIGNED || 0,
      onLeave: workerByStatus.ON_LEAVE || 0,
    },
    projects: {
      active: projectByStatus.ACTIVE || 0,
      completed: projectByStatus.COMPLETED || 0,
      paused: projectByStatus.PAUSED || 0,
    },
    placementsActive: await prisma.placement.count({
      where: { businessId, status: 'ACTIVE' },
    }),
  };

  const riskFactors: { label: string; weight: number; score: number }[] = [
    {
      label: 'Pending approvals',
      weight: 25,
      score: Math.min(100, (pendingTimesheets + pendingAdmin) * 8),
    },
    {
      label: 'Iqama compliance',
      weight: 25,
      score: Math.min(100, iqamaExpiring.filter((w) => {
        const d = w.iqamaExpiry ? (w.iqamaExpiry.getTime() - now.getTime()) / 86400000 : 99;
        return d <= 14;
      }).length * 20),
    },
    {
      label: 'Workforce fatigue',
      weight: 20,
      score: Math.min(100, fatigue.fatigueRisk.filter((f) => f.riskLevel === 'HIGH').length * 25),
    },
    {
      label: 'Overdue tasks',
      weight: 15,
      score: Math.min(100, overdueTasks.length * 12),
    },
    {
      label: 'Stale inbox',
      weight: 15,
      score: Math.min(100, unreadConversations * 10),
    },
  ];

  const riskScore = Math.round(
    riskFactors.reduce((s, f) => s + (f.score * f.weight) / 100, 0)
  );
  const riskLevel =
    riskScore >= 70 ? 'CRITICAL' : riskScore >= 45 ? 'HIGH' : riskScore >= 25 ? 'MEDIUM' : 'LOW';

  const briefingContext = {
    businessName: business?.name,
    date: now.toISOString().slice(0, 10),
    attentionCount: attentionItems.length,
    criticalCount: attentionItems.filter((a) => a.severity === 'CRITICAL').length,
    pendingTimesheets,
    pendingAdmin,
    iqamaExpiring: iqamaExpiring.length,
    fatigueHigh: fatigue.fatigueRisk.filter((f) => f.riskLevel === 'HIGH').length,
    resourceVisibility,
    riskScore,
  };

  let morningBrief: string;
  if (isAiConfigured()) {
    const ai = await createChatCompletion({
      businessId,
      maxTokens: 400,
      messages: [
        {
          role: 'system',
          content:
            'You are an AI Chief of Staff for a Saudi manpower agency owner. Write a concise morning briefing (4-6 bullet points) in plain English. Be actionable. Mention approvals, iqama, fatigue, and projects if relevant.',
        },
        {
          role: 'user',
          content: JSON.stringify(briefingContext),
        },
      ],
    });
    morningBrief =
      ai?.content ||
      buildTemplateBrief(briefingContext, attentionItems.filter((a) => a.severity !== 'LOW').slice(0, 6));
  } else {
    morningBrief = buildTemplateBrief(
      briefingContext,
      attentionItems.filter((a) => a.severity !== 'LOW').slice(0, 6)
    );
  }

  const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  attentionItems.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return {
    generatedAt: now.toISOString(),
    morningBrief,
    riskScore,
    riskLevel,
    riskFactors,
    attentionItems,
    ignoredItems: ignoredItems.slice(0, 15),
    resourceVisibility,
    summary: {
      pendingTimesheets,
      pendingAdmin,
      iqamaExpiringCount: iqamaExpiring.length,
      projectsEndingCount: projectsEnding.length,
      overdueTasksCount: overdueTasks.length,
      fatigueRiskCount: fatigue.fatigueRisk.length,
      pendingLeave,
    },
    cmmsKpis: {
      openWorkOrders: cmmsWoOpen,
      pmOverdue: cmmsPmDue,
      cmmsAlerts: cmmsAlerts.summary?.total ?? cmmsAlerts.items?.length ?? 0,
      maintenanceBudget: cmmsFinance?.annualBudget ?? 0,
      erpConnected: cmmsFinance?.isConnected ?? false,
    },
  };
}

function buildTemplateBrief(
  ctx: Record<string, unknown>,
  topItems: AttentionItem[]
): string {
  const lines = [
    `Good morning — ${ctx.businessName || 'your agency'} briefing for ${ctx.date}:`,
    `• Risk score: ${ctx.riskScore}/100 (${topItems.filter((i) => i.severity === 'CRITICAL').length} critical items)`,
    `• ${ctx.pendingTimesheets} site-manager approvals + ${ctx.pendingAdmin} admin/payroll approvals pending`,
    `• ${ctx.iqamaExpiring} worker iqama(s) expiring within 30 days`,
    `• ${ctx.fatigueHigh} worker(s) at high OT fatigue risk`,
  ];
  if (topItems.length > 0) {
    lines.push(`• Top priority: ${topItems[0].title}`);
  }
  lines.push('• Review Command Center for full list and take action today.');
  return lines.join('\n');
}

export async function getCompanyReminders(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { settings: true },
  });
  const settings = (business?.settings as Record<string, unknown>) || {};
  return (settings.companyReminders as unknown[]) || [];
}

export async function upsertCompanyReminder(
  businessId: string,
  reminder: Record<string, unknown>
) {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) throw new Error('Business not found');

  const settings = (business.settings as Record<string, unknown>) || {};
  const list = [...((settings.companyReminders as Record<string, unknown>[]) || [])];
  const id = String(reminder.id || crypto.randomUUID());
  const idx = list.findIndex((r) => r.id === id);
  const row = { ...reminder, id, updatedAt: new Date().toISOString() };
  if (idx >= 0) list[idx] = row;
  else list.push(row);

  settings.companyReminders = list;
  await prisma.business.update({
    where: { id: businessId },
    data: { settings: settings as object },
  });
  return row;
}

export async function deleteCompanyReminder(businessId: string, reminderId: string) {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) throw new Error('Business not found');

  const settings = (business.settings as Record<string, unknown>) || {};
  const list = ((settings.companyReminders as Record<string, unknown>[]) || []).filter(
    (r) => r.id !== reminderId
  );
  settings.companyReminders = list;
  await prisma.business.update({
    where: { id: businessId },
    data: { settings: settings as object },
  });
}
