import {
  getScheduleProject,
  listPrograms,
  listScheduleProjects,
  runBatchScenarioSimulation,
} from './planningService';
import prisma from '../utils/prisma';

export async function getPlanningRiskReport(businessId: string, projectId: string) {
  const project = await getScheduleProject(businessId, projectId);
  if (!project) throw new Error('Project not found');

  const penaltyPerDay =
    (project as { penaltyPerDay?: number }).penaltyPerDay ?? 15000;
  const config = await prisma.cmmsFinanceConfig.findUnique({ where: { businessId } });
  const laborRate = config?.laborHourlyRate ?? 85;

  const timeElapsedPct =
    project.plannedFinish && project.plannedStart
      ? Math.min(
          100,
          ((Date.now() - project.plannedStart.getTime()) /
            (project.plannedFinish.getTime() - project.plannedStart.getTime())) *
            100
        )
      : 0;

  const activityRisks = project.activities.map((a) => {
    const float = a.totalFloat ?? 0;
    const behind = a.percentComplete < timeElapsedPct - 5;
    const laborMat = (a.laborCost ?? 0) + (a.materialCost ?? 0);
    let delayProbability = 20;
    if (a.isCritical) delayProbability += 45;
    if (float <= 0) delayProbability += 15;
    if (float <= 1 && float > 0) delayProbability += 8;
    if (behind) delayProbability += 20;
    if (a.percentComplete < 30 && timeElapsedPct > 40) delayProbability += 12;
    delayProbability = Math.min(98, Math.round(delayProbability));

    const slipDays = a.isCritical && behind ? Math.max(1, Math.ceil((timeElapsedPct - a.percentComplete) / 10)) : float <= 0 ? 2 : 0;
    const impactSar = Math.round(slipDays * penaltyPerDay + laborMat * 0.12 * (delayProbability / 100));

    return {
      activityId: a.id,
      code: a.code,
      name: a.name,
      equipmentTag: (a as { equipmentTag?: string | null }).equipmentTag ?? null,
      isCritical: a.isCritical,
      totalFloat: float,
      percentComplete: a.percentComplete,
      delayProbability,
      impactSar,
      riskLevel: delayProbability >= 75 ? 'HIGH' : delayProbability >= 50 ? 'MEDIUM' : 'LOW',
      categories: [
        ...(a.isCritical ? ['SCHEDULE'] : []),
        ...(laborMat > 10000 ? ['COST'] : []),
        ...((a as { equipmentTag?: string }).equipmentTag ? ['EQUIPMENT'] : []),
      ],
    };
  });

  activityRisks.sort((a, b) => b.impactSar - a.impactSar);

  const resourceRisks: Array<{ trade: string; date: string; shortage: number; impactSar: number }> = [];
  const headcount = project.agencyProject?.headcount ?? 20;
  const byDay = new Map<string, number>();
  for (const act of project.activities) {
    if (!act.plannedStart) continue;
    const day = act.plannedStart.toISOString().slice(0, 10);
    const units = act.resources?.reduce((s, r) => s + (r.units ?? 1), 0) ?? 0;
    if (units > 0) byDay.set(day, (byDay.get(day) ?? 0) + units);
  }
  for (const [date, required] of byDay) {
    if (required > headcount) {
      resourceRisks.push({
        trade: 'ALL',
        date,
        shortage: required - headcount,
        impactSar: Math.round((required - headcount) * laborRate * 8 * 3),
      });
    }
  }

  const integration = (project as { evmIntegration?: { timesheetHoursApproved: number; progressSource: string } })
    .evmIntegration;
  const timesheetRisks: Array<{ type: string; message: string; severity: string }> = [];
  if (project.agencyProject && integration) {
    if (integration.timesheetHoursApproved === 0) {
      timesheetRisks.push({
        type: 'TIMESHEET',
        message: 'No approved timesheet hours — EVM progress uses manual % only',
        severity: 'MEDIUM',
      });
    } else if (integration.progressSource === 'HYBRID') {
      timesheetRisks.push({
        type: 'TIMESHEET',
        message: 'Timesheet hours differ from manual progress — integrated EVM active',
        severity: 'LOW',
      });
    }
    if ((project.evm?.spi ?? 1) < 0.9 && integration.timesheetHoursApproved > 0) {
      timesheetRisks.push({
        type: 'SCHEDULE',
        message: `SPI ${project.evm?.spi?.toFixed(2)} — labor burn vs schedule slip`,
        severity: 'HIGH',
      });
    }
  } else if (!project.agencyProject) {
    timesheetRisks.push({
      type: 'LINK',
      message: 'Schedule not linked to agency project — link for timesheet + CMMS finance EVM',
      severity: 'MEDIUM',
    });
  }

  let batchPreview: Awaited<ReturnType<typeof runBatchScenarioSimulation>> | null = null;
  try {
    batchPreview = await runBatchScenarioSimulation(businessId, projectId, { maxScenarios: 20 });
  } catch {
    batchPreview = null;
  }

  const totalImpactSar = activityRisks.slice(0, 5).reduce((s, r) => s + r.impactSar, 0);

  return {
    engineVersion: '3.0-risk',
    projectId,
    projectName: project.name,
    summary: {
      highRiskCount: activityRisks.filter((r) => r.riskLevel === 'HIGH').length,
      mediumRiskCount: activityRisks.filter((r) => r.riskLevel === 'MEDIUM').length,
      totalExposureSar: totalImpactSar,
      scheduleCompliancePct: Math.round((project.evm?.spi ?? 1) * 100),
      costVariancePct: Math.round(((project.evm?.cpi ?? 1) - 1) * -100),
      worstCaseSlipDays: batchPreview?.worstCase?.projectSlipDays ?? 0,
      worstCaseCostSar: batchPreview?.worstCase?.costIncreaseSar ?? 0,
    },
    activityRisks: activityRisks.slice(0, 20),
    resourceRisks: resourceRisks.slice(0, 10),
    timesheetRisks,
    evmIntegration: (project as { evmIntegration?: unknown }).evmIntegration ?? null,
    scenarioPreview: batchPreview
      ? {
          scenarioCount: batchPreview.scenarioCount,
          worstCase: batchPreview.worstCase,
          recommended: batchPreview.recommended,
        }
      : null,
    evm: project.evm,
  };
}

export async function getPlanningAiInsights(businessId: string, projectId: string) {
  const report = await getPlanningRiskReport(businessId, projectId);
  const project = await getScheduleProject(businessId, projectId);
  if (!project) throw new Error('Project not found');

  const allSpares = await prisma.sparePart.findMany({
    where: { businessId },
    select: { sku: true, name: true, stockQty: true, reorderPoint: true },
  });
  const materialRisks = allSpares
    .filter((p) => p.stockQty <= p.reorderPoint)
    .slice(0, 5)
    .map((p) => ({
      sku: p.sku,
      name: p.name,
      stockQty: p.stockQty,
      reorderPoint: p.reorderPoint,
      impact: 'Material delay may push dependent activities',
    }));

  return {
    engineVersion: '3.0-planning',
    projectId,
    projectName: project.name,
    evm: report.evm,
    delayPredictions: report.activityRisks.map((r) => ({
      activityId: r.activityId,
      code: r.code,
      name: r.name,
      totalFloat: r.totalFloat,
      isCritical: r.isCritical,
      percentComplete: r.percentComplete,
      riskScore: r.delayProbability,
      prediction: `${r.riskLevel} — ${r.delayProbability}% delay probability · ${r.impactSar.toLocaleString()} SAR impact`,
    })),
    costImpact: {
      estimatedPenaltySar: report.summary.totalExposureSar,
      criticalActivitiesAtRisk: report.summary.highRiskCount,
      laborHourlyRate: (await prisma.cmmsFinanceConfig.findUnique({ where: { businessId } }))?.laborHourlyRate ?? 85,
      assumption: 'Penalty + labor/material exposure model v3',
    },
    materialRisks,
    recommendations: [
      ...(report.summary.highRiskCount > 0
        ? [`${report.summary.highRiskCount} HIGH risk activities — accelerate or add resources`]
        : []),
      ...(report.summary.worstCaseSlipDays > 3
        ? [`Simulation worst-case: +${report.summary.worstCaseSlipDays}d / +${report.summary.worstCaseCostSar.toLocaleString()} SAR`]
        : []),
      ...(report.resourceRisks.length > 0 ? ['Resource shortage detected on peak days — review leveling'] : []),
      ...(materialRisks.length > 0 ? ['Procure low-stock materials before critical activities'] : []),
    ],
    spareForecast: materialRisks,
    riskSummary: report.summary,
  };
}

export async function getPlanningPortfolioSummary(businessId: string) {
  const [programs, projects] = await Promise.all([
    listPrograms(businessId),
    listScheduleProjects(businessId),
  ]);

  const summaries = await Promise.all(
    projects.slice(0, 5).map(async (p) => {
      const full = await getScheduleProject(businessId, p.id);
      if (!full) return null;
      return {
        id: p.id,
        name: p.name,
        status: p.status,
        plannedFinish: p.plannedFinish,
        activityCount: full.activities.length,
        criticalCount: full.activities.filter((a) => a.isCritical).length,
        spi: full.evm?.spi,
        cpi: full.evm?.cpi,
      };
    })
  );

  return {
    programCount: programs.length,
    projectCount: projects.length,
    projects: summaries.filter(Boolean),
  };
}
