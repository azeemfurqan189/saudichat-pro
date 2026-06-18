export type ActivityEvmInput = {
  laborCost: number | null;
  materialCost: number | null;
  percentComplete: number;
  plannedStart: Date | null;
  plannedFinish: Date | null;
  workOrder?: { status: string } | null;
  /** When set (from timesheets / CMMS finance), overrides estimated ACWP */
  actualCostOverride?: number;
};

function activityBudget(a: ActivityEvmInput): number {
  return (a.laborCost ?? 0) + (a.materialCost ?? 0);
}

/** Planned % complete by schedule date (0–1) — drives BCWS / PV */
export function plannedProgressByDate(
  plannedStart: Date | null,
  plannedFinish: Date | null,
  asOf: Date
): number {
  if (!plannedStart || !plannedFinish) return 0;
  const start = plannedStart.getTime();
  const end = plannedFinish.getTime();
  if (end <= start) return 0;
  const now = asOf.getTime();
  if (now <= start) return 0;
  if (now >= end) return 1;
  return (now - start) / (end - start);
}

function actualCostForActivity(a: ActivityEvmInput): number {
  if (a.actualCostOverride != null) return a.actualCostOverride;
  const budget = activityBudget(a);
  if (a.workOrder?.status === 'COMPLETED') return budget;
  return budget * (a.percentComplete / 100);
}

export type ProjectEvmMetrics = {
  /** Budget at Completion — total approved budget */
  bac: number;
  /** BCWS — Planned Value (should have earned by now per schedule) */
  bcws: number;
  pv: number;
  /** BCWP — Earned Value (value of work actually completed) */
  bcwp: number;
  ev: number;
  /** ACWP — Actual Cost of Work Performed */
  acwp: number;
  ac: number;
  /** Schedule Performance Index = BCWP / BCWS */
  spi: number;
  /** Cost Performance Index = BCWP / ACWP */
  cpi: number;
  /** Schedule Variance = BCWP − BCWS (positive = ahead) */
  sv: number;
  /** Cost Variance = BCWP − ACWP (positive = under budget) */
  cv: number;
  /** Estimate at Completion = BAC / CPI */
  eac: number;
  /** Variance at Completion = BAC − EAC */
  vac: number;
  /** Physical % complete weighted by budget */
  percentComplete: number;
  scheduleCompliancePct: number;
  costVariancePct: number;
  asOf: string;
};

export function computeProjectEvm(
  activities: ActivityEvmInput[],
  asOf: Date = new Date()
): ProjectEvmMetrics {
  let bac = 0;
  let bcws = 0;
  let bcwp = 0;
  let acwp = 0;

  for (const act of activities) {
    const budget = activityBudget(act);
    bac += budget;
    const plannedPct = plannedProgressByDate(act.plannedStart, act.plannedFinish, asOf);
    bcws += budget * plannedPct;
    bcwp += budget * (act.percentComplete / 100);
    acwp += actualCostForActivity(act);
  }

  const spi = bcws > 0 ? bcwp / bcws : 1;
  const cpi = acwp > 0 ? bcwp / acwp : 1;
  const sv = bcwp - bcws;
  const cv = bcwp - acwp;
  const eac = cpi > 0 ? bac / cpi : bac;
  const vac = bac - eac;
  const percentComplete = bac > 0 ? (bcwp / bac) * 100 : 0;

  const round = (n: number) => Math.round(n * 100) / 100;

  return {
    bac: round(bac),
    bcws: round(bcws),
    pv: round(bcws),
    bcwp: round(bcwp),
    ev: round(bcwp),
    acwp: round(acwp),
    ac: round(acwp),
    spi: Math.round(spi * 1000) / 1000,
    cpi: Math.round(cpi * 1000) / 1000,
    sv: round(sv),
    cv: round(cv),
    eac: round(eac),
    vac: round(vac),
    percentComplete: Math.round(percentComplete * 10) / 10,
    scheduleCompliancePct: Math.round(spi * 1000) / 10,
    costVariancePct: bcwp > 0 ? Math.round((cv / bcwp) * 1000) / 10 : 0,
    asOf: asOf.toISOString(),
  };
}
