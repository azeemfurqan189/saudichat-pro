import prisma from '../utils/prisma';
import { getProjectFinancialControl } from './projectFinanceAdvancedService';
import type { ActivityEvmInput } from './planningEvmService';

const DEFAULT_HOURLY_RATE = 85;

export type ActivityWithEvmRelations = {
  id: string;
  name: string;
  laborCost: number | null;
  materialCost: number | null;
  percentComplete: number;
  plannedStart: Date | null;
  plannedFinish: Date | null;
  durationDays: number;
  workOrder?: { status: string; laborCost?: number | null; partsCost?: number | null } | null;
  resources?: Array<{ units?: number | null; workerProfileId?: string | null }>;
};

export type EvmIntegrationSummary = {
  linkedAgencyProjectId: string | null;
  linkedAgencyProjectName: string | null;
  timesheetHoursApproved: number;
  timesheetLaborCostSar: number;
  cmmsFinanceActualSar: number;
  cmmsFinanceBudgetSar: number;
  progressSource: 'MANUAL' | 'TIMESHEET' | 'HYBRID';
  costSource: 'ESTIMATED' | 'CMMS_FINANCE' | 'HYBRID';
  activityProgress: Array<{
    activityId: string;
    name: string;
    manualPct: number;
    integratedPct: number;
    hoursUsed: number;
  }>;
  lastSyncedAt: string;
};

function activityBudget(a: ActivityWithEvmRelations): number {
  return (a.laborCost ?? 0) + (a.materialCost ?? 0);
}

function plannedLaborHours(act: ActivityWithEvmRelations, shiftHours: number): number {
  const units = act.resources?.reduce((s, r) => s + (r.units ?? 1), 0) ?? 1;
  return act.durationDays * shiftHours * Math.max(1, units);
}

export function computeTimesheetProgressByActivity(
  activities: ActivityWithEvmRelations[],
  timesheets: Array<{ workDate: Date; hoursWorked: number; workerProfileId: string }>,
  shiftHours: number
): Map<string, { pct: number; hours: number }> {
  const result = new Map<string, { pct: number; hours: number }>();
  const totalPlannedHours = activities.reduce((s, a) => s + plannedLaborHours(a, shiftHours), 0);
  const totalApprovedHours = timesheets.reduce((s, t) => s + t.hoursWorked, 0);

  for (const act of activities) {
    const plannedHours = plannedLaborHours(act, shiftHours);
    if (plannedHours <= 0) {
      result.set(act.id, { pct: act.percentComplete, hours: 0 });
      continue;
    }

    const workerIds = new Set(
      (act.resources ?? [])
        .map((r) => r.workerProfileId)
        .filter((id): id is string => !!id)
    );

    let actualHours = 0;
    if (act.plannedStart && act.plannedFinish && workerIds.size > 0) {
      for (const ts of timesheets) {
        if (ts.workDate < act.plannedStart || ts.workDate > act.plannedFinish) continue;
        if (!workerIds.has(ts.workerProfileId)) continue;
        actualHours += ts.hoursWorked;
      }
    } else if (totalPlannedHours > 0) {
      actualHours = (plannedHours / totalPlannedHours) * totalApprovedHours;
    }

    const pct = Math.min(100, Math.round((actualHours / plannedHours) * 1000) / 10);
    result.set(act.id, { pct, hours: Math.round(actualHours * 10) / 10 });
  }

  return result;
}

export function allocateActualCosts(
  activities: ActivityWithEvmRelations[],
  cmmsActualTotal: number,
  timesheetLaborTotal: number
): Map<string, number> {
  const result = new Map<string, number>();
  let bac = 0;
  for (const a of activities) bac += activityBudget(a);
  if (bac <= 0) return result;

  const combinedActual = cmmsActualTotal > 0 ? cmmsActualTotal : timesheetLaborTotal;

  for (const act of activities) {
    const budget = activityBudget(act);
    let actual = 0;

    if (act.workOrder?.status === 'COMPLETED') {
      actual = (act.workOrder.laborCost ?? 0) + (act.workOrder.partsCost ?? 0);
    } else if (combinedActual > 0) {
      actual = combinedActual * (budget / bac);
    } else {
      actual = budget * (act.percentComplete / 100);
    }

    result.set(act.id, Math.round(actual * 100) / 100);
  }

  return result;
}

export async function buildIntegratedEvmActivities(
  businessId: string,
  project: {
    agencyProjectId: string | null;
    shiftHours: number;
    agencyProject?: { id: string; name: string } | null;
    activities: ActivityWithEvmRelations[];
  }
): Promise<{ activities: ActivityEvmInput[]; integration: EvmIntegrationSummary }> {
  const shiftHours = project.shiftHours ?? 8;
  let timesheetHours = 0;
  let timesheetLabor = 0;
  let cmmsActual = 0;
  let cmmsBudget = 0;
  let progressSource: EvmIntegrationSummary['progressSource'] = 'MANUAL';
  let costSource: EvmIntegrationSummary['costSource'] = 'ESTIMATED';

  const timesheets: Array<{ workDate: Date; hoursWorked: number; workerProfileId: string }> = [];

  if (project.agencyProjectId) {
    const approved = await prisma.timesheet.findMany({
      where: { businessId, projectId: project.agencyProjectId, status: 'APPROVED' },
      include: { workerProfile: { select: { hourlyRate: true } } },
    });
    for (const ts of approved) {
      timesheets.push({
        workDate: ts.workDate,
        hoursWorked: ts.hoursWorked,
        workerProfileId: ts.workerProfileId,
      });
      timesheetHours += ts.hoursWorked;
      timesheetLabor += ts.hoursWorked * (ts.workerProfile.hourlyRate ?? DEFAULT_HOURLY_RATE);
    }

    try {
      const finance = await getProjectFinancialControl(businessId, project.agencyProjectId);
      cmmsActual = finance.actual;
      cmmsBudget = finance.budget;
    } catch {
      /* finance optional */
    }
  }

  const tsProgress = computeTimesheetProgressByActivity(project.activities, timesheets, shiftHours);
  const actualCosts = allocateActualCosts(project.activities, cmmsActual, timesheetLabor);

  const activityProgress: EvmIntegrationSummary['activityProgress'] = [];
  const integratedActivities: ActivityEvmInput[] = [];

  for (const act of project.activities) {
    const ts = tsProgress.get(act.id);
    const useTimesheet = timesheetHours > 0 && ts != null;
    const integratedPct = useTimesheet ? ts.pct : act.percentComplete;
    const actualOverride = actualCosts.get(act.id);
    const useFinanceCost = cmmsActual > 0 || timesheetLabor > 0;

    if (useTimesheet) {
      progressSource = integratedPct !== act.percentComplete ? 'HYBRID' : 'TIMESHEET';
    }
    if (cmmsActual > 0) costSource = 'CMMS_FINANCE';
    else if (timesheetLabor > 0 && costSource === 'ESTIMATED') costSource = 'HYBRID';

    activityProgress.push({
      activityId: act.id,
      name: act.name,
      manualPct: act.percentComplete,
      integratedPct,
      hoursUsed: ts?.hours ?? 0,
    });

    integratedActivities.push({
      laborCost: act.laborCost,
      materialCost: act.materialCost,
      percentComplete: useTimesheet ? integratedPct : act.percentComplete,
      plannedStart: act.plannedStart,
      plannedFinish: act.plannedFinish,
      workOrder: act.workOrder,
      actualCostOverride: useFinanceCost ? actualOverride : undefined,
    });
  }

  return {
    activities: integratedActivities,
    integration: {
      linkedAgencyProjectId: project.agencyProjectId,
      linkedAgencyProjectName: project.agencyProject?.name ?? null,
      timesheetHoursApproved: Math.round(timesheetHours * 10) / 10,
      timesheetLaborCostSar: Math.round(timesheetLabor),
      cmmsFinanceActualSar: Math.round(cmmsActual),
      cmmsFinanceBudgetSar: Math.round(cmmsBudget),
      progressSource,
      costSource,
      activityProgress,
      lastSyncedAt: new Date().toISOString(),
    },
  };
}

/** Push timesheet-derived % complete into schedule activities */
export async function syncTimesheetProgressToActivities(businessId: string, projectId: string) {
  const project = await prisma.scheduleProject.findFirst({
    where: { id: projectId, businessId },
    include: {
      agencyProject: { select: { id: true, name: true } },
      activities: {
        include: {
          resources: true,
          workOrder: { select: { status: true, laborCost: true, partsCost: true } },
        },
      },
    },
  });
  if (!project) throw new Error('Project not found');
  if (!project.agencyProjectId) throw new Error('Link an agency manpower project first');

  const { integration } = await buildIntegratedEvmActivities(businessId, project);

  let updated = 0;
  for (const ap of integration.activityProgress) {
    if (ap.integratedPct === ap.manualPct) continue;
    await prisma.scheduleActivity.update({
      where: { id: ap.activityId },
      data: { percentComplete: ap.integratedPct },
    });
    updated++;
  }

  return { ...integration, activitiesUpdated: updated };
}
