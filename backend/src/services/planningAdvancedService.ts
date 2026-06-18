import prisma from '../utils/prisma';
import { computeProjectEvm, type ActivityEvmInput } from './planningEvmService';
import { buildIntegratedEvmActivities } from './planningEvmIntegrationService';

export type SCurvePoint = {
  date: string;
  dayIndex: number;
  plannedValue: number;
  earnedValue: number;
  actualCost: number;
  plannedProgressPct: number;
  actualProgressPct: number;
  zone: 'GREEN' | 'YELLOW' | 'RED';
};

function activityBudget(a: ActivityEvmInput): number {
  return (a.laborCost ?? 0) + (a.materialCost ?? 0);
}

function zoneFromSpiCpi(spi: number, cpi: number): 'GREEN' | 'YELLOW' | 'RED' {
  if (spi >= 0.95 && cpi >= 0.95) return 'GREEN';
  if (spi >= 0.85 && cpi >= 0.85) return 'YELLOW';
  return 'RED';
}

export function computeProjectSCurve(
  activities: ActivityEvmInput[],
  projectStart: Date,
  projectEnd: Date,
  intervalDays = 7
): { points: SCurvePoint[]; bac: number } {
  let bac = 0;
  for (const a of activities) bac += activityBudget(a);

  const spanMs = Math.max(86400000, projectEnd.getTime() - projectStart.getTime());
  const totalDays = Math.ceil(spanMs / 86400000);
  const step = Math.max(1, intervalDays);
  const points: SCurvePoint[] = [];

  for (let d = 0; d <= totalDays; d += step) {
    const asOf = new Date(projectStart.getTime() + d * 86400000);
    const evm = computeProjectEvm(activities, asOf);
    const plannedProgressPct = bac > 0 ? (evm.bcws / bac) * 100 : 0;
    const actualProgressPct = bac > 0 ? (evm.bcwp / bac) * 100 : 0;

    points.push({
      date: asOf.toISOString().slice(0, 10),
      dayIndex: d,
      plannedValue: evm.bcws,
      earnedValue: evm.bcwp,
      actualCost: evm.acwp,
      plannedProgressPct: Math.round(plannedProgressPct * 10) / 10,
      actualProgressPct: Math.round(actualProgressPct * 10) / 10,
      zone: zoneFromSpiCpi(evm.spi, evm.cpi),
    });
  }

  return { points, bac: Math.round(bac * 100) / 100 };
}

export async function getProjectSCurve(businessId: string, projectId: string) {
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

  const { activities } = await buildIntegratedEvmActivities(businessId, project);

  const starts = project.activities
    .map((a) => a.plannedStart?.getTime())
    .filter((t): t is number => t != null);
  const ends = project.activities
    .map((a) => a.plannedFinish?.getTime())
    .filter((t): t is number => t != null);

  const projectStart = project.plannedStart ?? (starts.length ? new Date(Math.min(...starts)) : new Date());
  const projectEnd =
    project.plannedFinish ?? (ends.length ? new Date(Math.max(...ends)) : new Date(Date.now() + 90 * 86400000));

  const curve = computeProjectSCurve(activities, projectStart, projectEnd);
  const currentEvm = computeProjectEvm(activities);

  return {
    ...curve,
    projectStart: projectStart.toISOString(),
    projectEnd: projectEnd.toISOString(),
    currentZone:
      currentEvm.spi >= 0.95 && currentEvm.cpi >= 0.95
        ? 'GREEN'
        : currentEvm.spi >= 0.85 && currentEvm.cpi >= 0.85
          ? 'YELLOW'
          : 'RED',
    spi: currentEvm.spi,
    cpi: currentEvm.cpi,
  };
}

export type ResourceForecastWeek = {
  weekStart: string;
  trade: string;
  required: number;
  available: number;
  gap: number;
  alert: boolean;
};

export async function getResourceForecast3Months(businessId: string, projectId: string) {
  const project = await prisma.scheduleProject.findFirst({
    where: { id: projectId, businessId },
    include: {
      activities: {
        include: { resources: true },
      },
      agencyProject: { select: { id: true, headcount: true } },
    },
  });
  if (!project) throw new Error('Project not found');

  const headcount = project.agencyProject?.headcount ?? 20;
  const now = new Date();
  const endDate = new Date(now.getTime() + 90 * 86400000);

  const byWeekTrade = new Map<string, number>();

  for (const act of project.activities) {
    if (!act.plannedStart || !act.plannedFinish) continue;
    const start = act.plannedStart.getTime();
    const finish = act.plannedFinish.getTime();
    if (finish < now.getTime()) continue;

    for (const res of act.resources) {
      const trade = res.tradeRole ?? 'GENERAL';
      const units = res.units ?? 1;
      let weekStart = new Date(Math.max(start, now.getTime()));
      const actEnd = Math.min(finish, endDate.getTime());

      while (weekStart.getTime() <= actEnd) {
        const key = `${weekStart.toISOString().slice(0, 10)}|${trade}`;
        byWeekTrade.set(key, (byWeekTrade.get(key) ?? 0) + units);
        weekStart = new Date(weekStart.getTime() + 7 * 86400000);
      }
    }
  }

  let poolByTrade = new Map<string, number>();
  if (project.agencyProjectId) {
    const placements = await prisma.placement.findMany({
      where: { businessId, projectId: project.agencyProjectId, status: 'ACTIVE' },
      include: { workerProfile: { select: { category: true } } },
    });
    for (const p of placements) {
      const trade = (p.workerProfile.category ?? 'GENERAL').toUpperCase();
      poolByTrade.set(trade, (poolByTrade.get(trade) ?? 0) + 1);
    }
  }

  const trades = new Set<string>();
  for (const key of byWeekTrade.keys()) trades.add(key.split('|')[1]);

  const weeks: ResourceForecastWeek[] = [];
  const alerts: ResourceForecastWeek[] = [];

  for (const [key, required] of byWeekTrade) {
    const [weekStart, trade] = key.split('|');
    const available = poolByTrade.get(trade.toUpperCase()) ?? Math.floor(headcount / Math.max(1, trades.size));
    const gap = Math.max(0, required - available);
    const row: ResourceForecastWeek = {
      weekStart,
      trade,
      required: Math.round(required * 10) / 10,
      available,
      gap: Math.round(gap * 10) / 10,
      alert: gap > 0,
    };
    weeks.push(row);
    if (row.alert) alerts.push(row);
  }

  weeks.sort((a, b) => a.weekStart.localeCompare(b.weekStart) || a.trade.localeCompare(b.trade));

  const histogramByTrade = new Map<string, { weeks: ResourceForecastWeek[]; peakRequired: number; peakWeek: string }>();
  for (const w of weeks) {
    const cur = histogramByTrade.get(w.trade) ?? { weeks: [], peakRequired: 0, peakWeek: '' };
    cur.weeks.push(w);
    if (w.required > cur.peakRequired) {
      cur.peakRequired = w.required;
      cur.peakWeek = w.weekStart;
    }
    histogramByTrade.set(w.trade, cur);
  }

  return {
    forecastDays: 90,
    headcount,
    totalAlerts: alerts.length,
    alerts,
    weeks,
    byTrade: Array.from(histogramByTrade.entries()).map(([trade, data]) => ({
      trade,
      peakRequired: data.peakRequired,
      peakWeek: data.peakWeek,
      weeklyLoad: data.weeks,
    })),
  };
}
