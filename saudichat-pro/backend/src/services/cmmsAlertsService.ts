import prisma from '../utils/prisma';
import { dispatchCmmsNotification } from './notificationCenterService';
import { resolveReminderRecipients, ReminderNotifyConfig } from './reminderNotifyService';

export type CmmsAlertItem = {
  id: string;
  type: 'INSPECTION_OVERDUE' | 'PM_DUE' | 'WARRANTY_EXPIRING' | 'LOW_STOCK' | 'OPEN_REQUEST';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  title: string;
  detail?: string;
  href: string;
  assetTag?: string | null;
};

async function getLeaderRecipients(businessId: string, config?: ReminderNotifyConfig | null) {
  if (config?.enabled) {
    return resolveReminderRecipients(businessId, config);
  }
  const members = await prisma.businessMember.findMany({
    where: { businessId, isActive: true, role: { in: ['OWNER', 'MANAGER'] } },
    include: { user: { select: { email: true, phone: true } } },
  });
  const emails = [...new Set(members.map((m) => m.user.email).filter(Boolean))] as string[];
  const phones = [...new Set(members.map((m) => m.user.phone).filter(Boolean))] as string[];
  return { emails, phones };
}

export async function notifyCmmsEvent(
  businessId: string,
  eventType: string,
  title: string,
  message: string,
  options?: { notifyConfig?: ReminderNotifyConfig | null }
) {
  const { emails, phones } = await getLeaderRecipients(businessId, options?.notifyConfig);
  const tasks: Promise<unknown>[] = [];
  for (const email of emails.slice(0, 3)) {
    tasks.push(
      dispatchCmmsNotification(businessId, eventType, title, message, { email }).catch(() => undefined)
    );
  }
  for (const phone of phones.slice(0, 3)) {
    tasks.push(
      dispatchCmmsNotification(businessId, eventType, title, message, { phone }).catch(() => undefined)
    );
  }
  await Promise.all(tasks);
}

export async function getCmmsAlerts(businessId: string) {
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 86400000);

  const [
    inspectionOverdue,
    pmDuePlans,
    warrantyExpiring,
    lowStockParts,
    openRequests,
  ] = await Promise.all([
    prisma.agencyEquipment.findMany({
      where: {
        businessId,
        nextInspectionAt: { lt: now },
        boardColumn: { not: 'MAINTENANCE' },
      },
      select: { id: true, name: true, assetTag: true, nextInspectionAt: true },
      orderBy: { nextInspectionAt: 'asc' },
      take: 20,
    }),
    prisma.maintenancePlan.findMany({
      where: { businessId, isActive: true, nextDueAt: { lte: now } },
      include: {
        equipment: { select: { name: true, assetTag: true } },
      },
      orderBy: { nextDueAt: 'asc' },
      take: 20,
    }),
    prisma.agencyEquipment.findMany({
      where: {
        businessId,
        warrantyExpiry: { lte: in30Days, gte: now },
      },
      select: { id: true, name: true, assetTag: true, warrantyExpiry: true },
      orderBy: { warrantyExpiry: 'asc' },
      take: 20,
    }),
    prisma.sparePart.findMany({
      where: { businessId },
      select: { id: true, sku: true, name: true, stockQty: true, reorderPoint: true },
    }),
    prisma.workRequest.count({
      where: { businessId, status: 'SUBMITTED' },
    }),
  ]);

  const lowStock = lowStockParts.filter((p) => p.stockQty <= p.reorderPoint);

  const items: CmmsAlertItem[] = [];

  for (const eq of inspectionOverdue) {
    items.push({
      id: `insp-${eq.id}`,
      type: 'INSPECTION_OVERDUE',
      severity: 'CRITICAL',
      title: `Inspection overdue: ${eq.name}`,
      detail: eq.assetTag ? `Tag ${eq.assetTag}` : undefined,
      href: '/equipment',
      assetTag: eq.assetTag,
    });
  }

  for (const plan of pmDuePlans) {
    items.push({
      id: `pm-${plan.id}`,
      type: 'PM_DUE',
      severity: 'HIGH',
      title: `PM due: ${plan.name}`,
      detail: plan.equipment?.assetTag
        ? `${plan.equipment.name} (${plan.equipment.assetTag})`
        : plan.equipment?.name,
      href: '/maintenance',
      assetTag: plan.equipment?.assetTag,
    });
  }

  for (const eq of warrantyExpiring) {
    const days = eq.warrantyExpiry
      ? Math.ceil((eq.warrantyExpiry.getTime() - now.getTime()) / 86400000)
      : 0;
    items.push({
      id: `warr-${eq.id}`,
      type: 'WARRANTY_EXPIRING',
      severity: days <= 7 ? 'HIGH' : 'MEDIUM',
      title: `Warranty expiring: ${eq.name}`,
      detail: `${days} days · ${eq.assetTag || 'no tag'}`,
      href: '/assets',
      assetTag: eq.assetTag,
    });
  }

  for (const part of lowStock.slice(0, 15)) {
    items.push({
      id: `stock-${part.id}`,
      type: 'LOW_STOCK',
      severity: part.stockQty === 0 ? 'CRITICAL' : 'HIGH',
      title: `Low stock: ${part.name}`,
      detail: `${part.sku} — qty ${part.stockQty} (reorder ${part.reorderPoint})`,
      href: '/spares',
    });
  }

  if (openRequests > 0) {
    items.push({
      id: 'open-wr',
      type: 'OPEN_REQUEST',
      severity: openRequests > 5 ? 'HIGH' : 'MEDIUM',
      title: `${openRequests} work request(s) awaiting approval`,
      href: '/work-requests',
    });
  }

  return {
    summary: {
      inspectionOverdue: inspectionOverdue.length,
      pmDue: pmDuePlans.length,
      warrantyExpiring: warrantyExpiring.length,
      lowStock: lowStock.length,
      openRequests,
      total: items.length,
    },
    items,
  };
}

/** Scan due alerts and notify leaders (max once per 24h per business). */
export async function scanAndNotifyCmmsDueAlerts(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { settings: true },
  });
  const settings = (business?.settings || {}) as Record<string, unknown>;
  const lastScan = settings.lastCmmsAlertScan ? new Date(String(settings.lastCmmsAlertScan)).getTime() : 0;
  if (Date.now() - lastScan < 24 * 60 * 60 * 1000) return { skipped: true };

  const alerts = await getCmmsAlerts(businessId);
  const critical = alerts.items.filter((i) => i.severity === 'CRITICAL' || i.severity === 'HIGH');

  for (const item of critical.slice(0, 8)) {
    const eventType =
      item.type === 'INSPECTION_OVERDUE'
        ? 'INSPECTION_DUE'
        : item.type === 'PM_DUE'
          ? 'PM_DUE'
          : item.type === 'WARRANTY_EXPIRING'
            ? 'WARRANTY_EXPIRY'
            : item.type === 'LOW_STOCK'
              ? 'LOW_STOCK'
              : 'WORK_REQUEST';
    await notifyCmmsEvent(businessId, eventType, item.title, item.detail || item.title).catch(() => undefined);
  }

  await prisma.business.update({
    where: { id: businessId },
    data: {
      settings: { ...settings, lastCmmsAlertScan: new Date().toISOString() },
    },
  });

  return { notified: critical.length };
}
