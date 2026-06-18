import prisma from '../utils/prisma';

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

function riskFromScore(score: number): RiskLevel {
  if (score >= 75) return 'CRITICAL';
  if (score >= 55) return 'HIGH';
  if (score >= 35) return 'MEDIUM';
  return 'LOW';
}

export async function getCmmsAiEngineInsights(businessId: string) {
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000);

  const [assets, openOrders, pmPlans, spareParts, issueTxns, pmHistory] = await Promise.all([
    prisma.agencyEquipment.findMany({
      where: { businessId },
      include: { functionalLocation: { select: { id: true, code: true, name: true } } },
    }),
    prisma.workOrder.findMany({
      where: { businessId, status: { in: ['OPEN', 'IN_PROGRESS', 'ON_HOLD'] } },
      include: {
        equipment: { select: { id: true, name: true, assetTag: true, criticality: true } },
        functionalLocation: { select: { id: true, name: true } },
      },
    }),
    prisma.maintenancePlan.findMany({
      where: { businessId, isActive: true },
      include: {
        equipment: { select: { id: true, name: true, assetTag: true } },
        functionalLocation: { select: { id: true, name: true } },
      },
    }),
    prisma.sparePart.findMany({ where: { businessId } }),
    prisma.inventoryTransaction.findMany({
      where: { businessId, type: 'ISSUE', createdAt: { gte: ninetyDaysAgo } },
      select: { sparePartId: true, qty: true, createdAt: true },
    }),
    prisma.pmHistory.findMany({
      where: { businessId },
      include: { plan: { select: { equipmentId: true } } },
      orderBy: { generatedAt: 'desc' },
      take: 50,
    }),
  ]);

  const ordersByAsset = new Map<string, typeof openOrders>();
  for (const wo of openOrders) {
    if (!wo.equipmentId) continue;
    const list = ordersByAsset.get(wo.equipmentId) ?? [];
    list.push(wo);
    ordersByAsset.set(wo.equipmentId, list);
  }

  const pmDueByAsset = new Map<string, (typeof pmPlans)[number]>();
  for (const plan of pmPlans) {
    if (!plan.equipmentId) continue;
    if (plan.nextDueAt && plan.nextDueAt <= now) {
      pmDueByAsset.set(plan.equipmentId, plan);
    }
  }

  const failurePredictions = assets
    .map((asset) => {
      let score = 0;
      const factors: string[] = [];

      if (asset.criticality === 'HIGH') {
        score += 25;
        factors.push('High criticality asset');
      } else if (asset.criticality === 'MEDIUM') {
        score += 10;
      }

      if (asset.boardColumn === 'MAINTENANCE') {
        score += 22;
        factors.push('Currently in maintenance column');
      }
      if (asset.condition === 'POOR' || asset.condition === 'FAIR') {
        score += 18;
        factors.push(`Condition: ${asset.condition}`);
      }

      const assetOrders = ordersByAsset.get(asset.id) ?? [];
      if (assetOrders.some((o) => o.priority === 'HIGH')) {
        score += 20;
        factors.push('Open high-priority work order');
      } else if (assetOrders.length > 0) {
        score += 12;
        factors.push(`${assetOrders.length} open work order(s)`);
      }

      if (pmDueByAsset.has(asset.id)) {
        score += 15;
        factors.push('PM plan overdue');
      }

      if (asset.nextInspectionAt && asset.nextInspectionAt <= now) {
        score += 10;
        factors.push('Inspection overdue');
      }

      const historyCount = pmHistory.filter((h) => h.plan?.equipmentId === asset.id).length;
      if (historyCount >= 3) {
        score += 8;
        factors.push('Repeated PM history — wear pattern');
      }

      score = Math.min(100, score);
      const risk = riskFromScore(score);
      const failureProbability = Math.round(score * 0.9);

      return {
        assetId: asset.id,
        assetName: asset.name,
        assetTag: asset.assetTag,
        location: asset.functionalLocation?.name ?? null,
        risk,
        score,
        failureProbability,
        predictedWindowDays: risk === 'CRITICAL' ? 7 : risk === 'HIGH' ? 14 : risk === 'MEDIUM' ? 30 : 60,
        factors,
        recommendation:
          risk === 'CRITICAL' || risk === 'HIGH'
            ? 'Schedule inspection within 7 days — consider preventive overhaul'
            : risk === 'MEDIUM'
              ? 'Monitor vibration/temperature — plan PM soon'
              : 'Continue routine monitoring',
      };
    })
    .filter((p) => p.score >= 25)
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);

  const issuesByPart = new Map<string, number>();
  for (const txn of issueTxns) {
    issuesByPart.set(txn.sparePartId, (issuesByPart.get(txn.sparePartId) ?? 0) + txn.qty);
  }

  const spareDemandForecast = spareParts
    .map((part) => {
      const issued90d = issuesByPart.get(part.id) ?? 0;
      const monthlyAvg = issued90d / 3;
      const forecast30d = Math.ceil(monthlyAvg * 1.15 + (part.stockQty <= part.reorderPoint ? part.reorderPoint * 0.5 : 0));
      const suggestedOrder = Math.max(0, forecast30d - part.stockQty + part.reorderPoint);
      const urgency =
        part.stockQty <= part.reorderPoint ? 'CRITICAL' : suggestedOrder > part.reorderPoint ? 'HIGH' : monthlyAvg > 0 ? 'MEDIUM' : 'LOW';

      return {
        sparePartId: part.id,
        sku: part.sku,
        name: part.name,
        category: part.category,
        stockQty: part.stockQty,
        reorderPoint: part.reorderPoint,
        monthlyUsage: Math.round(monthlyAvg * 10) / 10,
        forecast30d,
        suggestedOrderQty: Math.round(suggestedOrder),
        estimatedCost: Math.round(suggestedOrder * (part.unitCost ?? 0)),
        urgency: urgency as RiskLevel,
      };
    })
    .filter((p) => p.urgency !== 'LOW' || p.monthlyUsage > 0)
    .sort((a, b) => {
      const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      return order[a.urgency] - order[b.urgency];
    })
    .slice(0, 12);

  const priorityDowntime = (priority: string) =>
    priority === 'HIGH' ? 480 : priority === 'MEDIUM' ? 240 : 120;

  let predictedDowntimeMinutes = 0;
  const downtimeByAsset: Array<{
    assetId: string | null;
    assetName: string;
    location: string | null;
    predictedMinutes: number;
    predictedHours: number;
    drivers: string[];
  }> = [];

  for (const wo of openOrders) {
    const mins = wo.downtimeMinutes ?? priorityDowntime(wo.priority);
    predictedDowntimeMinutes += mins;
    downtimeByAsset.push({
      assetId: wo.equipmentId,
      assetName: wo.equipment?.name ?? wo.title,
      location: wo.functionalLocation?.name ?? null,
      predictedMinutes: mins,
      predictedHours: Math.round((mins / 60) * 10) / 10,
      drivers: [`Open WO ${wo.number}`, wo.priority],
    });
  }

  for (const plan of pmPlans) {
    if (!plan.nextDueAt || plan.nextDueAt > now) continue;
    const mins = 180;
    predictedDowntimeMinutes += mins;
    downtimeByAsset.push({
      assetId: plan.equipmentId,
      assetName: plan.equipment?.name ?? plan.name,
      location: plan.functionalLocation?.name ?? null,
      predictedMinutes: mins,
      predictedHours: 3,
      drivers: ['Overdue PM plan', plan.pmType],
    });
  }

  const downtimePrediction = {
    predictedMinutes: predictedDowntimeMinutes,
    predictedHours: Math.round((predictedDowntimeMinutes / 60) * 10) / 10,
    predictedDays: Math.round((predictedDowntimeMinutes / 480) * 10) / 10,
    horizonDays: 14,
    items: downtimeByAsset.slice(0, 10),
    trend:
      predictedDowntimeMinutes > 2000 ? 'INCREASING' : predictedDowntimeMinutes > 800 ? 'STABLE' : 'DECREASING',
  };

  const recommendations: Array<{
    type: string;
    priority: RiskLevel;
    title: string;
    detail: string;
    savingsEstimate?: string;
  }> = [];

  const pmByLocation = new Map<string, typeof pmPlans>();
  for (const plan of pmPlans) {
    const locId = plan.functionalLocationId ?? 'unassigned';
    const list = pmByLocation.get(locId) ?? [];
    list.push(plan);
    pmByLocation.set(locId, list);
  }

  for (const [locId, plans] of pmByLocation) {
    if (plans.length >= 2) {
      const locName = plans[0].functionalLocation?.name ?? 'Site';
      recommendations.push({
        type: 'BUNDLE_PM',
        priority: 'MEDIUM',
        title: `Bundle ${plans.length} PM plans at ${locName}`,
        detail: 'Single site visit reduces travel & permit costs',
        savingsEstimate: `~${plans.length * 2}h labor saved`,
      });
    }
    void locId;
  }

  const highRiskCount = failurePredictions.filter((p) => p.risk === 'HIGH' || p.risk === 'CRITICAL').length;
  if (highRiskCount >= 2) {
    recommendations.push({
      type: 'PRIORITIZE_INSPECTION',
      priority: 'HIGH',
      title: `Prioritize ${highRiskCount} high-risk assets this week`,
      detail: 'AI detected correlated failure signals — schedule inspections before production peak',
    });
  }

  const criticalSpares = spareDemandForecast.filter((p) => p.urgency === 'CRITICAL');
  if (criticalSpares.length > 0) {
    recommendations.push({
      type: 'PROCUREMENT',
      priority: 'CRITICAL',
      title: `Auto-create PR for ${criticalSpares.length} critical spare(s)`,
      detail: criticalSpares.map((p) => p.sku).join(', '),
      savingsEstimate: 'Avoid stock-out downtime',
    });
  }

  if (openOrders.length > 15) {
    recommendations.push({
      type: 'PLANNER',
      priority: 'MEDIUM',
      title: 'Rebalance planner workload — spread jobs across week',
      detail: `${openOrders.length} open work orders — peak day overload risk`,
      savingsEstimate: '~15% downtime reduction',
    });
  }

  const overduePm = pmPlans.filter((p) => p.nextDueAt && p.nextDueAt <= now).length;
  if (overduePm > 0) {
    recommendations.push({
      type: 'RUN_PM',
      priority: overduePm >= 3 ? 'HIGH' : 'MEDIUM',
      title: `Run ${overduePm} overdue PM plan(s)`,
      detail: 'Use Preventive Maintenance → Run Due to auto-generate work orders',
    });
  }

  return {
    generatedAt: now.toISOString(),
    engineVersion: '1.0',
    capabilities: [
      'FAILURE_PREDICTION',
      'SPARE_DEMAND_FORECAST',
      'DOWNTIME_PREDICTION',
      'MAINTENANCE_OPTIMIZATION',
    ],
    summary: {
      assetsAnalyzed: assets.length,
      highRiskAssets: failurePredictions.filter((p) => p.risk === 'HIGH' || p.risk === 'CRITICAL').length,
      partsToReorder: spareDemandForecast.filter((p) => p.suggestedOrderQty > 0).length,
      predictedDowntimeHours: downtimePrediction.predictedHours,
      optimizationActions: recommendations.length,
      confidencePct: assets.length > 0 ? 78 : 45,
    },
    failurePrediction: {
      items: failurePredictions,
      topRisk: failurePredictions[0] ?? null,
    },
    spareDemandForecast: {
      items: spareDemandForecast,
      totalReorderValue: spareDemandForecast.reduce((s, p) => s + p.estimatedCost, 0),
      horizonDays: 30,
    },
    downtimePrediction,
    maintenanceOptimization: {
      recommendations: recommendations.slice(0, 8),
    },
  };
}

export async function runCmmsAiEngineAnalysis(businessId: string) {
  const insights = await getCmmsAiEngineInsights(businessId);
  return {
    runAt: new Date().toISOString(),
    status: 'COMPLETED',
    insights,
  };
}

export async function seedCmmsAiEngineDemo(businessId: string) {
  const assetCount = await prisma.agencyEquipment.count({ where: { businessId } });
  if (assetCount === 0) {
    const { seedCmmsDemo } = await import('./cmmsService');
    await seedCmmsDemo(businessId);
  }

  const insights = await getCmmsAiEngineInsights(businessId);
  return {
    skipped: false,
    message: 'AI engine analyzed CMMS data',
    assetsAnalyzed: insights.summary.assetsAnalyzed,
    highRisk: insights.summary.highRiskAssets,
  };
}
