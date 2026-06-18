import { randomBytes } from 'crypto';
import prisma from '../utils/prisma';
import { getCmmsAiEngineInsights } from './cmmsAiEngineService';

export async function getAssetMtbfMttr(businessId: string, equipmentId?: string) {
  const where = {
    businessId,
    type: 'CORRECTIVE',
    status: 'COMPLETED' as const,
    ...(equipmentId ? { equipmentId } : {}),
  };

  const orders = await prisma.workOrder.findMany({
    where,
    orderBy: { completedAt: 'asc' },
    include: {
      equipment: { select: { id: true, name: true, assetTag: true } },
    },
  });

  const byAsset = new Map<
    string,
    { name: string; tag: string | null; failures: Date[]; repairMinutes: number[] }
  >();

  for (const wo of orders) {
    if (!wo.equipmentId || !wo.completedAt) continue;
    const cur = byAsset.get(wo.equipmentId) ?? {
      name: wo.equipment?.name ?? 'Unknown',
      tag: wo.equipment?.assetTag ?? null,
      failures: [],
      repairMinutes: [],
    };
    cur.failures.push(wo.completedAt);
    if (wo.downtimeMinutes != null) cur.repairMinutes.push(wo.downtimeMinutes);
    byAsset.set(wo.equipmentId, cur);
  }

  return Array.from(byAsset.entries()).map(([assetId, data]) => {
    let mtbfHours: number | null = null;
    if (data.failures.length >= 2) {
      const gaps: number[] = [];
      for (let i = 1; i < data.failures.length; i++) {
        gaps.push((data.failures[i].getTime() - data.failures[i - 1].getTime()) / 3600000);
      }
      mtbfHours = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
    }

    const mttrMinutes =
      data.repairMinutes.length > 0
        ? Math.round(data.repairMinutes.reduce((a, b) => a + b, 0) / data.repairMinutes.length)
        : null;

    return {
      equipmentId: assetId,
      assetName: data.name,
      assetTag: data.tag,
      failureCount: data.failures.length,
      mtbfHours,
      mttrMinutes,
      mttrHours: mttrMinutes != null ? Math.round((mttrMinutes / 60) * 10) / 10 : null,
      healthScore:
        mtbfHours != null && mttrMinutes != null
          ? Math.min(100, Math.round((mtbfHours / 100) * 50 + (120 / Math.max(mttrMinutes, 1)) * 50))
          : data.failures.length === 0
            ? 100
            : 50,
    };
  });
}

export async function ensureAssetQrToken(businessId: string, equipmentId: string) {
  const asset = await prisma.agencyEquipment.findFirst({ where: { id: equipmentId, businessId } });
  if (!asset) throw new Error('Asset not found');
  if (asset.assetQrToken) return asset.assetQrToken;
  const token = randomBytes(16).toString('hex');
  await prisma.agencyEquipment.update({ where: { id: equipmentId }, data: { assetQrToken: token } });
  return token;
}

export async function getAssetByQrToken(token: string) {
  const asset = await prisma.agencyEquipment.findFirst({
    where: { assetQrToken: token },
    include: {
      functionalLocation: { select: { code: true, name: true } },
      maintenancePlans: { where: { isActive: true }, take: 5 },
      workOrders: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          number: true,
          title: true,
          type: true,
          status: true,
          completedAt: true,
          createdAt: true,
        },
      },
      components: {
        include: { bomItems: { include: { sparePart: { select: { sku: true, name: true } } } } },
        orderBy: { sortOrder: 'asc' },
      },
      calibrations: { orderBy: { nextDueAt: 'asc' }, take: 5 },
    },
  });
  if (!asset) return null;

  const pmHistory = await prisma.pmHistory.findMany({
    where: { businessId: asset.businessId, plan: { equipmentId: asset.id } },
    orderBy: { generatedAt: 'desc' },
    take: 5,
  });

  const mtbf = await getAssetMtbfMttr(asset.businessId, asset.id);

  return {
    id: asset.id,
    businessId: asset.businessId,
    name: asset.name,
    assetTag: asset.assetTag,
    assetNumber: asset.assetNumber,
    category: asset.category,
    condition: asset.condition,
    criticality: asset.criticality,
    runningHours: asset.runningHours,
    warrantyExpiry: asset.warrantyExpiry,
    documentUrls: asset.documentUrls,
    location: asset.functionalLocation,
    maintenancePlans: asset.maintenancePlans,
    workOrders: asset.workOrders,
    pmHistory,
    components: asset.components,
    calibrations: asset.calibrations,
    reliability: mtbf[0] ?? null,
  };
}

export async function listAssetHierarchy(businessId: string, equipmentId: string) {
  const equipment = await prisma.agencyEquipment.findFirst({
    where: { id: equipmentId, businessId },
    include: {
      childEquipment: { select: { id: true, name: true, assetTag: true, condition: true } },
      parentEquipment: { select: { id: true, name: true, assetTag: true } },
      components: {
        include: {
          childComponents: true,
          sparePart: { select: { id: true, sku: true, name: true } },
          bomItems: { include: { sparePart: { select: { id: true, sku: true, name: true, stockQty: true } } } },
        },
        where: { parentComponentId: null },
        orderBy: { sortOrder: 'asc' },
      },
      bomItems: {
        where: { componentId: null },
        include: { sparePart: { select: { id: true, sku: true, name: true, stockQty: true } } },
      },
    },
  });
  if (!equipment) throw new Error('Asset not found');
  return equipment;
}

export async function addAssetComponent(
  businessId: string,
  equipmentId: string,
  input: { name: string; partNumber?: string; sparePartId?: string; parentComponentId?: string }
) {
  return prisma.assetComponent.create({
    data: {
      businessId,
      equipmentId,
      name: input.name.trim(),
      partNumber: input.partNumber?.trim() || null,
      sparePartId: input.sparePartId || null,
      parentComponentId: input.parentComponentId || null,
    },
    include: { sparePart: { select: { sku: true, name: true } } },
  });
}

export async function addBomItem(
  businessId: string,
  equipmentId: string,
  input: { sparePartId: string; qty?: number; componentId?: string; notes?: string }
) {
  return prisma.assetBomItem.create({
    data: {
      businessId,
      equipmentId,
      sparePartId: input.sparePartId,
      qty: input.qty ?? 1,
      componentId: input.componentId || null,
      notes: input.notes?.trim() || null,
    },
    include: { sparePart: { select: { sku: true, name: true, stockQty: true } } },
  });
}

export async function suggestPartsForWorkOrder(businessId: string, equipmentId: string) {
  const bom = await prisma.assetBomItem.findMany({
    where: { businessId, equipmentId },
    include: { sparePart: true, component: { select: { name: true } } },
  });
  return bom.map((b) => ({
    sparePartId: b.sparePartId,
    sku: b.sparePart.sku,
    name: b.sparePart.name,
    qty: b.qty,
    unitCost: b.sparePart.unitCost,
    stockQty: b.sparePart.stockQty,
    component: b.component?.name ?? null,
    inStock: b.sparePart.stockQty >= b.qty,
  }));
}

export async function recordMeterReading(
  businessId: string,
  equipmentId: string,
  input: { readingType?: string; value: number; source?: string; notes?: string }
) {
  const reading = await prisma.equipmentMeterReading.create({
    data: {
      businessId,
      equipmentId,
      readingType: input.readingType ?? 'HOURS',
      value: input.value,
      source: input.source ?? 'MANUAL',
      notes: input.notes?.trim() || null,
    },
  });

  if (input.readingType === 'HOURS' || !input.readingType) {
    await prisma.agencyEquipment.update({
      where: { id: equipmentId },
      data: { runningHours: input.value },
    });
    await evaluateMeterAndConditionPm(businessId, equipmentId, input.value, input.readingType ?? 'HOURS');
  } else {
    await evaluateMeterAndConditionPm(businessId, equipmentId, input.value, input.readingType);
  }

  return reading;
}

async function evaluateMeterAndConditionPm(
  businessId: string,
  equipmentId: string,
  value: number,
  readingType: string
) {
  const plans = await prisma.maintenancePlan.findMany({
    where: { businessId, equipmentId, isActive: true },
  });

  for (const plan of plans) {
    if (plan.triggerType === 'METER' && readingType === 'HOURS' && plan.intervalHours) {
      const baseline = plan.meterBaseline ?? 0;
      if (value >= baseline + plan.intervalHours) {
        await generatePmWorkOrder(businessId, plan.id, `Meter reading ${value}h exceeded interval`);
        await prisma.maintenancePlan.update({
          where: { id: plan.id },
          data: { meterBaseline: value, lastGeneratedAt: new Date() },
        });
      }
    }

    if (plan.triggerType === 'CONDITION' && plan.conditionField === readingType && plan.conditionThreshold != null) {
      const op = plan.conditionOperator ?? 'GT';
      const triggered =
        (op === 'GT' && value > plan.conditionThreshold) ||
        (op === 'GTE' && value >= plan.conditionThreshold) ||
        (op === 'LT' && value < plan.conditionThreshold);
      if (triggered) {
        await generatePmWorkOrder(
          businessId,
          plan.id,
          `Condition ${readingType}=${value} triggered threshold ${plan.conditionThreshold}`
        );
      }
    }
  }
}

async function generatePmWorkOrder(businessId: string, planId: string, reason: string) {
  const plan = await prisma.maintenancePlan.findFirst({
    where: { id: planId, businessId },
    include: { equipment: true },
  });
  if (!plan) return null;

  const existingOpen = await prisma.workOrder.findFirst({
    where: {
      businessId,
      equipmentId: plan.equipmentId ?? undefined,
      status: { in: ['OPEN', 'IN_PROGRESS'] },
      title: { contains: plan.name },
    },
  });
  if (existingOpen) return existingOpen;

  const count = await prisma.workOrder.count({ where: { businessId } });
  const number = `WO-${String(count + 1).padStart(5, '0')}`;

  const wo = await prisma.workOrder.create({
    data: {
      businessId,
      number,
      type: 'PREVENTIVE',
      status: 'OPEN',
      priority: 'MEDIUM',
      equipmentId: plan.equipmentId,
      functionalLocationId: plan.functionalLocationId,
      title: `PM: ${plan.name}`,
      description: `${reason}. Auto-generated from ${plan.triggerType} trigger.`,
    },
  });

  await prisma.pmHistory.create({
    data: {
      businessId,
      planId: plan.id,
      workOrderId: wo.id,
      pmType: plan.pmType,
      triggerType: plan.triggerType,
      title: plan.name,
      generatedAt: new Date(),
      status: 'GENERATED',
      workOrderNumber: wo.number,
    },
  });

  return wo;
}

export async function listCalibrations(businessId: string) {
  const now = new Date();
  const records = await prisma.calibrationRecord.findMany({
    where: { businessId },
    include: { equipment: { select: { id: true, name: true, assetTag: true } } },
    orderBy: { nextDueAt: 'asc' },
  });

  return {
    records,
    dueCount: records.filter((r) => r.nextDueAt && r.nextDueAt <= now).length,
    upcoming: records.filter((r) => r.nextDueAt && r.nextDueAt > now).slice(0, 10),
  };
}

export async function createCalibrationRecord(
  businessId: string,
  input: {
    equipmentId?: string;
    instrumentName: string;
    lastCalibratedAt?: string;
    nextDueAt?: string;
    certNumber?: string;
  }
) {
  return prisma.calibrationRecord.create({
    data: {
      businessId,
      equipmentId: input.equipmentId || null,
      instrumentName: input.instrumentName.trim(),
      lastCalibratedAt: input.lastCalibratedAt ? new Date(input.lastCalibratedAt) : null,
      nextDueAt: input.nextDueAt ? new Date(input.nextDueAt) : null,
      certNumber: input.certNumber?.trim() || null,
      status: 'VALID',
    },
    include: { equipment: { select: { name: true, assetTag: true } } },
  });
}

export async function autoWorkOrdersFromPredictions(businessId: string, minRisk: 'HIGH' | 'CRITICAL' = 'HIGH') {
  const insights = await getCmmsAiEngineInsights(businessId);
  const predictions = insights.failurePrediction.items.filter((p) =>
    minRisk === 'CRITICAL' ? p.risk === 'CRITICAL' : p.risk === 'CRITICAL' || p.risk === 'HIGH'
  );

  const created: Array<{ assetId: string; assetName: string; workOrderNumber: string }> = [];

  for (const pred of predictions) {
    const existing = await prisma.workOrder.findFirst({
      where: {
        businessId,
        equipmentId: pred.assetId,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        type: 'CORRECTIVE',
      },
    });
    if (existing) continue;

    const count = await prisma.workOrder.count({ where: { businessId } });
    const number = `WO-${String(count + 1).padStart(5, '0')}`;

    const wo = await prisma.workOrder.create({
      data: {
        businessId,
        number,
        type: 'CORRECTIVE',
        status: 'OPEN',
        priority: pred.risk === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
        equipmentId: pred.assetId,
        title: `Predictive: ${pred.assetName} — ${pred.predictedWindowDays}d window`,
        description: `AI prediction score ${pred.score}. Factors: ${pred.factors.join('; ')}. ${pred.recommendation}`,
      },
    });

    created.push({ assetId: pred.assetId, assetName: pred.assetName, workOrderNumber: wo.number });
  }

  return { created, count: created.length, evaluated: predictions.length };
}

export async function listMeterReadings(businessId: string, equipmentId?: string, limit = 50) {
  return prisma.equipmentMeterReading.findMany({
    where: { businessId, ...(equipmentId ? { equipmentId } : {}) },
    include: { equipment: { select: { id: true, name: true, assetTag: true } } },
    orderBy: { recordedAt: 'desc' },
    take: limit,
  });
}

export async function getIotMonitoringSummary(businessId: string) {
  const [readings, plans, assets] = await Promise.all([
    prisma.equipmentMeterReading.findMany({
      where: { businessId },
      include: { equipment: { select: { id: true, name: true, assetTag: true } } },
      orderBy: { recordedAt: 'desc' },
      take: 200,
    }),
    prisma.maintenancePlan.findMany({
      where: { businessId, isActive: true, triggerType: 'CONDITION' },
      select: { equipmentId: true, conditionField: true, conditionThreshold: true, conditionOperator: true, name: true },
    }),
    prisma.agencyEquipment.findMany({
      where: { businessId, assetStatus: 'ACTIVE' },
      select: { id: true, name: true, assetTag: true, runningHours: true },
      take: 100,
    }),
  ]);

  const latestByAsset = new Map<string, (typeof readings)[0]>();
  for (const r of readings) {
    const key = `${r.equipmentId}|${r.readingType}`;
    if (!latestByAsset.has(key)) latestByAsset.set(key, r);
  }

  const anomalies: Array<{
    equipmentId: string;
    assetName: string;
    readingType: string;
    value: number;
    threshold: number;
    planName: string;
    severity: 'HIGH' | 'MEDIUM';
  }> = [];

  for (const plan of plans) {
    if (!plan.equipmentId || !plan.conditionField || plan.conditionThreshold == null) continue;
    const latest = latestByAsset.get(`${plan.equipmentId}|${plan.conditionField}`);
    if (!latest) continue;
    const op = plan.conditionOperator ?? 'GT';
    const triggered =
      (op === 'GT' && latest.value > plan.conditionThreshold) ||
      (op === 'GTE' && latest.value >= plan.conditionThreshold) ||
      (op === 'LT' && latest.value < plan.conditionThreshold);
    if (triggered) {
      anomalies.push({
        equipmentId: plan.equipmentId,
        assetName: latest.equipment.name,
        readingType: plan.conditionField,
        value: latest.value,
        threshold: plan.conditionThreshold,
        planName: plan.name,
        severity: latest.value > plan.conditionThreshold * 1.2 ? 'HIGH' : 'MEDIUM',
      });
    }
  }

  const assetSummaries = assets.map((a) => {
    const hours = readings.find((r) => r.equipmentId === a.id && r.readingType === 'HOURS');
    const temp = readings.find((r) => r.equipmentId === a.id && r.readingType === 'TEMPERATURE');
    const vib = readings.find((r) => r.equipmentId === a.id && r.readingType === 'VIBRATION');
    return {
      ...a,
      runningHours: a.runningHours,
      lastHoursReading: hours?.value ?? null,
      lastTemp: temp?.value ?? null,
      lastVibration: vib?.value ?? null,
      lastReadingAt: hours?.recordedAt ?? temp?.recordedAt ?? vib?.recordedAt ?? null,
      hasAnomaly: anomalies.some((x) => x.equipmentId === a.id),
    };
  });

  return {
    totalReadings: readings.length,
    anomalyCount: anomalies.length,
    anomalies,
    recentReadings: readings.slice(0, 30),
    assets: assetSummaries.filter((a) => a.lastReadingAt || a.runningHours > 0),
  };
}

export async function ingestIotReadings(
  businessId: string,
  readings: Array<{ equipmentId: string; readingType: string; value: number; source?: string }>
) {
  const results = [];
  for (const r of readings) {
    const row = await recordMeterReading(businessId, r.equipmentId, {
      readingType: r.readingType,
      value: r.value,
      source: r.source ?? 'IOT',
    });
    results.push(row);
  }
  return { ingested: results.length, readings: results };
}
