import { MemberRole } from '@prisma/client';
import prisma from '../utils/prisma';
import type { ResolvedAccess } from './membershipService';
import { hasMinRole } from './membershipService';
import {
  getManpowerPolicy,
  isPendingStatus,
  PENDING_STATUSES,
} from './manpowerPolicyService';
import { hasProjectPermission } from './projectAccessService';

export type TimesheetAction = 'approve' | 'reject' | 'bill';

function canApproveAtLevel(role: MemberRole, status: string): boolean {
  if (role === 'OWNER') return true;
  if (role === 'MANAGER' && (status === 'PENDING' || status === 'PENDING_PAYROLL')) return true;
  return false;
}

export async function advanceTimesheet(
  businessId: string,
  timesheetId: string,
  actor: ResolvedAccess,
  action: TimesheetAction,
  rejectReason?: string
) {
  const ts = await prisma.timesheet.findFirst({
    where: { id: timesheetId, businessId },
    include: { workerProfile: true, project: true },
  });
  if (!ts) throw new Error('Timesheet not found');
  if (ts.status === 'BILLED') throw new Error('Already billed');

  if (ts.projectId) {
    const perm =
      action === 'reject'
        ? 'timesheets.approve'
        : action === 'bill'
          ? 'timesheets.approve'
          : 'timesheets.approve';
    const ok = await hasProjectPermission(actor, ts.projectId, perm);
    if (!ok && actor.role !== 'OWNER') {
      throw new Error('Missing timesheet approval permission for this project');
    }
  }

  if (action === 'reject') {
    if (!rejectReason?.trim()) throw new Error('Reject reason is required');
    if (!isPendingStatus(ts.status) && ts.status !== 'APPROVED') {
      throw new Error('Cannot reject this timesheet');
    }
    if (!canApproveAtLevel(actor.role, ts.status) && actor.role !== 'OWNER') {
      throw new Error('Not authorized to reject');
    }
    return prisma.timesheet.update({
      where: { id: timesheetId },
      data: {
        status: 'REJECTED',
        rejectReason: rejectReason.trim(),
        rejectedByMemberId: actor.memberId,
        rejectedAt: new Date(),
      },
      include: { workerProfile: true, project: true },
    });
  }

  if (action === 'bill') {
    if (ts.status !== 'APPROVED') throw new Error('Only approved timesheets can be billed');
    if (actor.role !== 'OWNER' && actor.role !== 'MANAGER') {
      throw new Error('Manager or owner required to bill');
    }
    return prisma.timesheet.update({
      where: { id: timesheetId },
      data: { status: 'BILLED', approvedByMemberId: actor.memberId, approvedAt: new Date() },
      include: { workerProfile: true, project: true },
    });
  }

  // approve — multi-level
  if (!isPendingStatus(ts.status)) {
    throw new Error('Timesheet is not pending approval');
  }

  const policy = await getManpowerPolicy(businessId);
  const levels = policy.approvalLevels;
  let nextStatus = ts.status;

  if (ts.status === 'PENDING') {
    if (actor.role === 'OFFICE_STAFF' || actor.role === 'FIELD_WORKER') {
      throw new Error('Office staff cannot approve');
    }
    if (levels.includes('ADMIN') && actor.role === 'MANAGER') {
      nextStatus = 'PENDING_ADMIN';
    } else if (levels.includes('PAYROLL') && actor.role === 'OWNER') {
      nextStatus = 'PENDING_PAYROLL';
    } else if (actor.role === 'OWNER') {
      nextStatus = levels.includes('PAYROLL') ? 'PENDING_PAYROLL' : 'APPROVED';
    } else if (actor.role === 'MANAGER' && !levels.includes('ADMIN')) {
      nextStatus = levels.includes('PAYROLL') ? 'PENDING_PAYROLL' : 'APPROVED';
    } else {
      throw new Error('Not authorized at this approval level');
    }
  } else if (ts.status === 'PENDING_ADMIN') {
    if (actor.role !== 'OWNER') throw new Error('Admin (Owner) approval required');
    nextStatus = levels.includes('PAYROLL') ? 'PENDING_PAYROLL' : 'APPROVED';
  } else if (ts.status === 'PENDING_PAYROLL') {
    if (!hasMinRole(actor.role, 'MANAGER')) throw new Error('Payroll approval required');
    nextStatus = 'APPROVED';
  }

  return prisma.timesheet.update({
    where: { id: timesheetId },
    data: {
      status: nextStatus,
      approvedByMemberId: actor.memberId,
      approvedAt: new Date(),
    },
    include: { workerProfile: true, project: true },
  });
}

export async function bulkAdvanceTimesheets(
  businessId: string,
  actor: ResolvedAccess,
  ids: string[],
  action: TimesheetAction,
  rejectReason?: string
) {
  const results: Array<{ id: string; ok: boolean; error?: string }> = [];
  for (const id of ids) {
    try {
      await advanceTimesheet(businessId, id, actor, action, rejectReason);
      results.push({ id, ok: true });
    } catch (err) {
      results.push({ id, ok: false, error: err instanceof Error ? err.message : 'Failed' });
    }
  }
  return results;
}

export async function getPendingTimesheetQueue(businessId: string, actor: ResolvedAccess) {
  if (actor.role === 'OFFICE_STAFF' || actor.role === 'FIELD_WORKER') return [];

  const rows = await prisma.timesheet.findMany({
    where: {
      businessId,
      status: { in: [...PENDING_STATUSES] },
    },
    include: { workerProfile: true, project: true, clientCompany: true },
    orderBy: { submittedAt: 'asc' },
    take: 500,
  });

  return rows.filter((row) => {
    if (actor.role === 'OWNER') return true;
    if (actor.role === 'MANAGER') return row.status === 'PENDING' || row.status === 'PENDING_PAYROLL';
    return false;
  });
}

export function approvalStageLabel(status: string, isAr = false): string {
  const labels: Record<string, { en: string; ar: string }> = {
    PENDING: { en: 'Site Manager', ar: 'مشرف الموقع' },
    PENDING_ADMIN: { en: 'Admin', ar: 'الإدارة' },
    PENDING_PAYROLL: { en: 'Payroll', ar: 'الرواتب' },
    APPROVED: { en: 'Approved', ar: 'معتمد' },
    REJECTED: { en: 'Rejected', ar: 'مرفوض' },
    BILLED: { en: 'Billed', ar: 'مفوتر' },
  };
  const l = labels[status] || { en: status, ar: status };
  return isAr ? l.ar : l.en;
}
