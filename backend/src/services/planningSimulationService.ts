import prisma from '../utils/prisma';
import { addDays, daysBetween, runCpm, workingDaysToCalendar, type CpmResult } from './planningCpm';

export type ScenarioParams = {
  /** Remove N workers from a trade — extends labor-intensive activities */
  workerShortage?: { tradeRole?: string; workersRemoved: number };
  /** Material lead-time slip in days on activities with materials */
  materialDelayDays?: number;
  materialActivityIds?: string[];
  /** Crane / heavy equipment unavailable — tag or activity ids */
  equipmentDelayDays?: number;
  equipmentTag?: string;
  equipmentActivityIds?: string[];
  /** Single activity duration extension (legacy) */
  activityDelay?: { activityId: string; extraDays: number };
};

export type ScenarioResult = {
  id: string;
  label: string;
  params: ScenarioParams;
  projectSlipDays: number;
  costIncreaseSar: number;
  penaltySar: number;
  laborOvertimeSar: number;
  materialHoldingSar: number;
  simulatedProjectFinish: Date;
  originalProjectFinish: Date;
  criticalPathCount: number;
  affectedActivityCount: number;
  rank?: number;
};

type ActivityRow = {
  id: string;
  name: string;
  code: string | null;
  durationDays: number;
  laborCost: number | null;
  materialCost: number | null;
  equipmentTag?: string | null;
  resources: Array<{ tradeRole: string | null; units: number }>;
  materials: Array<{ id: string }>;
  _count?: { materials: number };
};

function applyScenarioDurations(
  activities: ActivityRow[],
  params: ScenarioParams,
  headcount: number
): Map<string, number> {
  const durations = new Map(activities.map((a) => [a.id, a.durationDays]));

  if (params.activityDelay) {
    const cur = durations.get(params.activityDelay.activityId) ?? 0;
    durations.set(params.activityDelay.activityId, cur + params.activityDelay.extraDays);
  }

  if (params.workerShortage && params.workerShortage.workersRemoved > 0) {
    const removed = params.workerShortage.workersRemoved;
    const trade = params.workerShortage.tradeRole?.toUpperCase();
    for (const act of activities) {
      const resUnits = act.resources
        .filter((r) => !trade || (r.tradeRole ?? 'GENERAL').toUpperCase().includes(trade))
        .reduce((s, r) => s + (r.units ?? 1), 0);
      if (resUnits <= 0 && !trade) {
        if ((act.laborCost ?? 0) > 0) {
          const factor = 1 + removed / Math.max(1, headcount);
          durations.set(act.id, act.durationDays * factor);
        }
        continue;
      }
      if (resUnits > 0) {
        const effective = Math.max(1, resUnits - removed * 0.5);
        const factor = resUnits / effective;
        durations.set(act.id, act.durationDays * factor);
      }
    }
  }

  if (params.materialDelayDays && params.materialDelayDays > 0) {
    const extra = params.materialDelayDays;
    for (const act of activities) {
      const hasMat =
        act.materials.length > 0 ||
        (params.materialActivityIds?.includes(act.id) ?? false);
      if (hasMat || (act.materialCost ?? 0) > 0) {
        if (!params.materialActivityIds || params.materialActivityIds.includes(act.id)) {
          durations.set(act.id, (durations.get(act.id) ?? act.durationDays) + extra);
        }
      }
    }
  }

  if (params.equipmentDelayDays && params.equipmentDelayDays > 0) {
    const extra = params.equipmentDelayDays;
    const tag = params.equipmentTag?.toUpperCase() ?? 'CRANE';
    for (const act of activities) {
      const match =
        params.equipmentActivityIds?.includes(act.id) ||
        (act.equipmentTag ?? '').toUpperCase().includes(tag) ||
        act.name.toUpperCase().includes(tag) ||
        (act.code ?? '').toUpperCase().includes(tag);
      if (match) {
        durations.set(act.id, (durations.get(act.id) ?? act.durationDays) + extra);
      }
    }
  }

  return durations;
}

function computeCostImpact(
  slipDays: number,
  activities: ActivityRow[],
  cpm: CpmResult,
  penaltyPerDay: number,
  laborRate: number
): { costIncreaseSar: number; penaltySar: number; laborOvertimeSar: number; materialHoldingSar: number } {
  const penaltySar = Math.round(slipDays * penaltyPerDay);
  const criticalActs = activities.filter((a) => cpm.critical.has(a.id));
  const laborOvertimeSar = Math.round(
    criticalActs.reduce((s, a) => s + (a.laborCost ?? 0), 0) * 0.15 * (slipDays / 7)
  );
  const materialHoldingSar = Math.round(
    activities.reduce((s, a) => s + (a.materialCost ?? 0), 0) * 0.02 * slipDays
  );
  const costIncreaseSar = penaltySar + laborOvertimeSar + materialHoldingSar;
  void laborRate;
  return { costIncreaseSar, penaltySar, laborOvertimeSar, materialHoldingSar };
}

async function loadProjectContext(businessId: string, projectId: string) {
  const project = await prisma.scheduleProject.findFirst({
    where: { id: projectId, businessId },
    include: {
      agencyProject: { select: { headcount: true } },
      activities: {
        include: {
          resources: { select: { tradeRole: true, units: true } },
          materials: { select: { id: true } },
        },
      },
    },
  });
  if (!project) throw new Error('Project not found');

  const deps = await prisma.activityDependency.findMany({ where: { projectId, businessId } });
  const headcount = project.agencyProject?.headcount ?? 20;
  const penaltyPerDay =
    (project as { penaltyPerDay?: number | null }).penaltyPerDay ?? 15000;
  const config = await prisma.cmmsFinanceConfig.findUnique({ where: { businessId } });
  const laborRate = config?.laborHourlyRate ?? 85;

  return { project, deps, headcount, penaltyPerDay, laborRate };
}

function runOneScenario(
  projectStart: Date,
  originalFinish: Date,
  activities: ActivityRow[],
  deps: Array<{ predecessorId: string; successorId: string; type: string; lagDays: number }>,
  params: ScenarioParams,
  headcount: number,
  penaltyPerDay: number,
  laborRate: number,
  label: string,
  id: string
): ScenarioResult {
  const durations = applyScenarioDurations(activities, params, headcount);
  const simulated = activities.map((a) => ({
    id: a.id,
    durationDays: durations.get(a.id) ?? a.durationDays,
  }));

  const baselineCpm = runCpm(
    activities.map((a) => ({ id: a.id, durationDays: a.durationDays })),
    deps
  );
  const cpm = runCpm(simulated, deps);

  const newFinish = addDays(projectStart, cpm.projectFinish);
  const baselineFinish = addDays(projectStart, baselineCpm.projectFinish);
  const slipDays = Math.round(daysBetween(originalFinish, newFinish) * 10) / 10;
  const costs = computeCostImpact(Math.max(0, slipDays), activities, cpm, penaltyPerDay, laborRate);

  const affected = activities.filter(
    (a) =>
      cpm.critical.has(a.id) ||
      (durations.get(a.id) ?? a.durationDays) !== a.durationDays
  ).length;

  return {
    id,
    label,
    params,
    projectSlipDays: Math.max(0, slipDays),
    ...costs,
    simulatedProjectFinish: newFinish,
    originalProjectFinish: baselineFinish,
    criticalPathCount: cpm.critical.size,
    affectedActivityCount: affected,
  };
}

/** Run a single custom what-if scenario */
export async function runScenarioSimulation(
  businessId: string,
  projectId: string,
  params: ScenarioParams,
  label?: string
): Promise<ScenarioResult> {
  const { project, deps, headcount, penaltyPerDay, laborRate } = await loadProjectContext(
    businessId,
    projectId
  );
  const projectStart = project.plannedStart ?? new Date();
  const originalFinish = project.plannedFinish ?? projectStart;

  return runOneScenario(
    projectStart,
    originalFinish,
    project.activities as ActivityRow[],
    deps.map((d) => ({
      predecessorId: d.predecessorId,
      successorId: d.successorId,
      type: d.type,
      lagDays: d.lagDays,
    })),
    params,
    headcount,
    penaltyPerDay,
    laborRate,
    label ?? 'Custom scenario',
    'custom'
  );
}

/** Generate and rank up to 100 multi-factor scenarios */
export async function runBatchScenarioSimulation(
  businessId: string,
  projectId: string,
  options?: { maxScenarios?: number; includeCombined?: boolean }
): Promise<{
  baselineFinish: Date;
  scenarioCount: number;
  scenarios: ScenarioResult[];
  bestCase: ScenarioResult | null;
  worstCase: ScenarioResult | null;
  recommended: ScenarioResult | null;
}> {
  const maxScenarios = Math.min(100, Math.max(10, options?.maxScenarios ?? 50));
  const { project, deps, headcount, penaltyPerDay, laborRate } = await loadProjectContext(
    businessId,
    projectId
  );
  const projectStart = project.plannedStart ?? new Date();
  const originalFinish = project.plannedFinish ?? projectStart;
  const activities = project.activities as ActivityRow[];

  const workerOpts = [0, 3, 5, 8];
  const materialOpts = [0, 3, 7, 10];
  const equipmentOpts = [0, 2, 5, 7];
  const trades = ['WELDER', 'MECHANIC', 'GENERAL'];

  const scenarios: ScenarioResult[] = [];
  let idx = 0;

  for (const w of workerOpts) {
    for (const m of materialOpts) {
      for (const e of equipmentOpts) {
        if (scenarios.length >= maxScenarios) break;
        const params: ScenarioParams = {};
        if (w > 0) params.workerShortage = { workersRemoved: w, tradeRole: trades[idx % trades.length] };
        if (m > 0) params.materialDelayDays = m;
        if (e > 0) {
          params.equipmentDelayDays = e;
          params.equipmentTag = 'CRANE';
        }
        if (w === 0 && m === 0 && e === 0) continue;

        const label = [
          w > 0 ? `−${w} workers` : null,
          m > 0 ? `material +${m}d` : null,
          e > 0 ? `crane +${e}d` : null,
        ]
          .filter(Boolean)
          .join(' · ');

        scenarios.push(
          runOneScenario(
            projectStart,
            originalFinish,
            activities,
            deps.map((d) => ({
              predecessorId: d.predecessorId,
              successorId: d.successorId,
              type: d.type,
              lagDays: d.lagDays,
            })),
            params,
            headcount,
            penaltyPerDay,
            laborRate,
            label || 'Baseline perturbation',
            `s-${idx++}`
          )
        );
      }
    }
  }

  if (options?.includeCombined !== false) {
    const combined: ScenarioParams[] = [
      {
        workerShortage: { workersRemoved: 5, tradeRole: 'WELDER' },
        materialDelayDays: 7,
        equipmentDelayDays: 3,
        equipmentTag: 'CRANE',
      },
      {
        workerShortage: { workersRemoved: 8 },
        materialDelayDays: 10,
        equipmentDelayDays: 5,
      },
      { materialDelayDays: 7, equipmentDelayDays: 7, equipmentTag: 'CRANE' },
    ];
    for (const params of combined) {
      if (scenarios.length >= maxScenarios) break;
      scenarios.push(
        runOneScenario(
          projectStart,
          originalFinish,
          activities,
          deps.map((d) => ({
            predecessorId: d.predecessorId,
            successorId: d.successorId,
            type: d.type,
            lagDays: d.lagDays,
          })),
          params,
          headcount,
          penaltyPerDay,
          laborRate,
          'Combined worst-case',
          `combined-${idx++}`
        )
      );
    }
  }

  scenarios.sort((a, b) => b.projectSlipDays - a.projectSlipDays);
  scenarios.forEach((s, i) => {
    s.rank = i + 1;
  });

  const worstCase = scenarios[0] ?? null;
  const bestCase = scenarios.length ? scenarios[scenarios.length - 1] : null;
  const recommended =
    scenarios.find((s) => s.projectSlipDays > 0 && s.projectSlipDays <= 5) ?? bestCase;

  return {
    baselineFinish: originalFinish,
    scenarioCount: scenarios.length,
    scenarios: scenarios.slice(0, maxScenarios),
    bestCase,
    worstCase,
    recommended,
  };
}

/** Legacy single-activity delay — delegates to unified engine */
export async function simulateDelay(
  businessId: string,
  projectId: string,
  input: { activityId: string; extraDays: number }
) {
  const result = await runScenarioSimulation(
    businessId,
    projectId,
    { activityDelay: input },
    `Activity delay +${input.extraDays}d`
  );
  return {
    activityId: input.activityId,
    extraDays: input.extraDays,
    originalProjectFinish: result.originalProjectFinish,
    simulatedProjectFinish: result.simulatedProjectFinish,
    projectSlipDays: result.projectSlipDays,
    costIncreaseSar: result.costIncreaseSar,
    penaltySar: result.penaltySar,
    criticalPathCount: result.criticalPathCount,
    affectedActivities: result.affectedActivityCount,
  };
}
