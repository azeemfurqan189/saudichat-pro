import prisma from '../utils/prisma';
import { createScheduleBaseline, recalculateSchedule } from './planningService';

export type ChangeLogEntry = {
  at: string;
  action: string;
  byMemberId?: string | null;
  note?: string;
};

async function nextVoNumber(businessId: string, projectId: string): Promise<string> {
  const count = await prisma.scheduleChangeOrder.count({ where: { businessId, projectId } });
  return `VO-${String(count + 1).padStart(3, '0')}`;
}

export async function listChangeOrders(businessId: string, projectId: string) {
  return prisma.scheduleChangeOrder.findMany({
    where: { businessId, projectId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createChangeOrder(
  businessId: string,
  projectId: string,
  input: {
    title: string;
    description?: string;
    scopeChange?: string;
    costImpactSar?: number;
    scheduleImpactDays?: number;
    affectsBaseline?: boolean;
  },
  requestedByMemberId?: string
) {
  const project = await prisma.scheduleProject.findFirst({ where: { id: projectId, businessId } });
  if (!project) throw new Error('Project not found');

  const number = await nextVoNumber(businessId, projectId);
  const log: ChangeLogEntry[] = [
    {
      at: new Date().toISOString(),
      action: 'CREATED',
      byMemberId: requestedByMemberId ?? null,
      note: 'Variation order drafted',
    },
  ];

  return prisma.scheduleChangeOrder.create({
    data: {
      businessId,
      projectId,
      number,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      scopeChange: input.scopeChange?.trim() || null,
      costImpactSar: input.costImpactSar ?? 0,
      scheduleImpactDays: input.scheduleImpactDays ?? 0,
      affectsBaseline: input.affectsBaseline ?? true,
      status: 'DRAFT',
      requestedByMemberId: requestedByMemberId || null,
      changeLog: log as object,
    },
  });
}

function appendLog(
  existing: unknown,
  entry: ChangeLogEntry
): ChangeLogEntry[] {
  const arr = Array.isArray(existing) ? (existing as ChangeLogEntry[]) : [];
  return [...arr, entry];
}

export async function submitChangeOrder(
  businessId: string,
  changeOrderId: string,
  memberId?: string
) {
  const vo = await prisma.scheduleChangeOrder.findFirst({
    where: { id: changeOrderId, businessId },
  });
  if (!vo) throw new Error('Change order not found');
  if (vo.status !== 'DRAFT') throw new Error('Only DRAFT orders can be submitted');

  return prisma.scheduleChangeOrder.update({
    where: { id: changeOrderId },
    data: {
      status: 'PENDING',
      changeLog: appendLog(vo.changeLog, {
        at: new Date().toISOString(),
        action: 'SUBMITTED',
        byMemberId: memberId ?? null,
        note: 'Sent for client / manager approval',
      }) as object,
    },
  });
}

export async function approveChangeOrder(
  businessId: string,
  changeOrderId: string,
  approvedByMemberId?: string
) {
  const vo = await prisma.scheduleChangeOrder.findFirst({
    where: { id: changeOrderId, businessId },
  });
  if (!vo) throw new Error('Change order not found');
  if (vo.status !== 'PENDING') throw new Error('Only PENDING orders can be approved');

  const project = await prisma.scheduleProject.findFirst({
    where: { id: vo.projectId, businessId },
  });
  if (!project) throw new Error('Project not found');

  await prisma.$transaction(async (tx) => {
    if (vo.scheduleImpactDays > 0 || vo.costImpactSar > 0) {
      await tx.scheduleActivity.create({
        data: {
          businessId,
          projectId: vo.projectId,
          code: vo.number,
          name: `Scope change: ${vo.title}`,
          durationDays: Math.max(0.5, vo.scheduleImpactDays),
          laborCost: vo.costImpactSar > 0 ? vo.costImpactSar * 0.6 : 0,
          materialCost: vo.costImpactSar > 0 ? vo.costImpactSar * 0.4 : 0,
          percentComplete: 0,
          status: 'NOT_STARTED',
          sortOrder: 999,
        },
      });
    }

    await tx.scheduleChangeOrder.update({
      where: { id: changeOrderId },
      data: {
        status: 'APPROVED',
        approvedByMemberId: approvedByMemberId || null,
        approvedAt: new Date(),
        changeLog: appendLog(vo.changeLog, {
          at: new Date().toISOString(),
          action: 'APPROVED',
          byMemberId: approvedByMemberId ?? null,
          note: `Scope incorporated — cost +${vo.costImpactSar} SAR, schedule +${vo.scheduleImpactDays}d`,
        }) as object,
      },
    });
  });

  await recalculateSchedule(businessId, vo.projectId);
  if (vo.affectsBaseline) {
    await createScheduleBaseline(businessId, vo.projectId, `After ${vo.number}`);
  }

  return prisma.scheduleChangeOrder.findFirst({ where: { id: changeOrderId } });
}

export async function rejectChangeOrder(
  businessId: string,
  changeOrderId: string,
  rejectionReason: string,
  memberId?: string
) {
  const vo = await prisma.scheduleChangeOrder.findFirst({
    where: { id: changeOrderId, businessId },
  });
  if (!vo) throw new Error('Change order not found');
  if (vo.status !== 'PENDING') throw new Error('Only PENDING orders can be rejected');

  return prisma.scheduleChangeOrder.update({
    where: { id: changeOrderId },
    data: {
      status: 'REJECTED',
      rejectionReason: rejectionReason.trim(),
      changeLog: appendLog(vo.changeLog, {
        at: new Date().toISOString(),
        action: 'REJECTED',
        byMemberId: memberId ?? null,
        note: rejectionReason.trim(),
      }) as object,
    },
  });
}
