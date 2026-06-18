import prisma from '../utils/prisma';

export type ManpowerPolicy = {
  regularHoursPerDay: number;
  overtimeMultiplier: number;
  autoCalculateOvertime: boolean;
  approvalLevels: Array<'SITE_MANAGER' | 'ADMIN' | 'PAYROLL'>;
  autoReminderHours: number;
  shiftStart: string;
  shiftEnd: string;
  equalizeOvertime: boolean;
  fatigueOtThresholdWeekly: number;
};

export const DEFAULT_MANPOWER_POLICY: ManpowerPolicy = {
  regularHoursPerDay: 8,
  overtimeMultiplier: 1.5,
  autoCalculateOvertime: true,
  approvalLevels: ['SITE_MANAGER', 'ADMIN'],
  autoReminderHours: 24,
  shiftStart: '07:00',
  shiftEnd: '17:00',
  equalizeOvertime: true,
  fatigueOtThresholdWeekly: 20,
};

export async function getManpowerPolicy(businessId: string): Promise<ManpowerPolicy> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { settings: true },
  });
  const settings = (business?.settings || {}) as Record<string, unknown>;
  const raw = (settings.manpowerPolicy || {}) as Partial<ManpowerPolicy>;
  return {
    ...DEFAULT_MANPOWER_POLICY,
    ...raw,
    approvalLevels: raw.approvalLevels?.length
      ? raw.approvalLevels
      : DEFAULT_MANPOWER_POLICY.approvalLevels,
  };
}

export async function setManpowerPolicy(
  businessId: string,
  patch: Partial<ManpowerPolicy>
): Promise<ManpowerPolicy> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { settings: true },
  });
  const settings = (business?.settings || {}) as Record<string, unknown>;
  const current = await getManpowerPolicy(businessId);
  const next = { ...current, ...patch };
  await prisma.business.update({
    where: { id: businessId },
    data: {
      settings: { ...settings, manpowerPolicy: next },
    },
  });
  return next;
}

export function applyOvertimeRules(
  policy: ManpowerPolicy,
  input: { regularHours?: number; overtimeHours?: number; hoursWorked?: number; hourlyRate?: number | null }
) {
  const total =
    input.hoursWorked ??
    (input.regularHours ?? 0) + (input.overtimeHours ?? 0);

  let regularHours = input.regularHours ?? total;
  let overtimeHours = input.overtimeHours ?? 0;

  if (policy.autoCalculateOvertime && total > policy.regularHoursPerDay) {
    regularHours = policy.regularHoursPerDay;
    overtimeHours = Math.max(0, total - policy.regularHoursPerDay);
  } else if (!input.overtimeHours && input.regularHours && input.regularHours > policy.regularHoursPerDay) {
    regularHours = policy.regularHoursPerDay;
    overtimeHours = input.regularHours - policy.regularHoursPerDay;
  }

  const hoursWorked = regularHours + overtimeHours;
  const rate = input.hourlyRate ?? 0;
  const overtimePay =
    rate > 0
      ? regularHours * rate + overtimeHours * rate * policy.overtimeMultiplier
      : null;

  return { regularHours, overtimeHours, hoursWorked, overtimePay };
}

export const PENDING_STATUSES = ['PENDING', 'PENDING_ADMIN', 'PENDING_PAYROLL'] as const;

export function isPendingStatus(status: string) {
  return (PENDING_STATUSES as readonly string[]).includes(status);
}
