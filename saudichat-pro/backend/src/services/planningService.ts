import prisma from '../utils/prisma';
import { addDays, daysBetween, runCpm, type DepType } from './planningCpm';
import { computeProjectEvm } from './planningEvmService';
import { buildIntegratedEvmActivities } from './planningEvmIntegrationService';

export type { DepType };

async function applyCpmToProject(businessId: string, projectId: string) {
  const project = await prisma.scheduleProject.findFirst({
    where: { id: projectId, businessId },
  });
  if (!project) throw new Error('Schedule project not found');

  const projectStart = project.plannedStart ?? new Date();
  const activities = await prisma.scheduleActivity.findMany({ where: { projectId, businessId } });
  const deps = await prisma.activityDependency.findMany({ where: { projectId, businessId } });

  if (activities.length === 0) {
    return { projectFinish: projectStart, criticalCount: 0 };
  }

  const cpm = runCpm(
    activities.map((a) => ({ id: a.id, durationDays: a.durationDays })),
    deps.map((d) => ({
      predecessorId: d.predecessorId,
      successorId: d.successorId,
      type: d.type,
      lagDays: d.lagDays,
    }))
  );

  for (const act of activities) {
    const esDays = cpm.es.get(act.id) ?? 0;
    const efDays = cpm.ef.get(act.id) ?? act.durationDays;
    const lsDays = cpm.ls.get(act.id) ?? esDays;
    const lfDays = cpm.lf.get(act.id) ?? efDays;
    const override = act.startOverrideDays;
    const startDays = override != null ? override : esDays;
    const finishDays = startDays + act.durationDays;
    await prisma.scheduleActivity.update({
      where: { id: act.id },
      data: {
        earlyStart: addDays(projectStart, esDays),
        earlyFinish: addDays(projectStart, efDays),
        lateStart: addDays(projectStart, lsDays),
        lateFinish: addDays(projectStart, lfDays),
        plannedStart: addDays(projectStart, startDays),
        plannedFinish: addDays(projectStart, finishDays),
        totalFloat: cpm.float.get(act.id) ?? 0,
        isCritical: cpm.critical.has(act.id),
      },
    });
  }

  const finishDate = addDays(projectStart, cpm.projectFinish);
  await prisma.scheduleProject.update({
    where: { id: projectId },
    data: { plannedFinish: finishDate },
  });

  return { projectFinish: finishDate, criticalCount: cpm.critical.size, cpm };
}

const projectInclude = {
  program: { select: { id: true, name: true, code: true } },
  agencyProject: { select: { id: true, name: true, code: true, headcount: true } },
  wbsNodes: { orderBy: { sortOrder: 'asc' as const } },
  activities: {
    orderBy: { sortOrder: 'asc' as const },
    include: {
      wbsNode: { select: { id: true, code: true, name: true } },
      workOrder: { select: { id: true, number: true, status: true, laborCost: true, partsCost: true } },
      resources: {
        include: { workerProfile: { select: { id: true, name: true, category: true } } },
      },
      materials: {
        include: { sparePart: { select: { id: true, sku: true, name: true, unitCost: true } } },
      },
      predecessors: { include: { predecessor: { select: { id: true, code: true, name: true } } } },
      successors: { include: { successor: { select: { id: true, code: true, name: true } } } },
    },
  },
  dependencies: true,
  baselines: { where: { isActive: true }, take: 1, orderBy: { createdAt: 'desc' as const } },
};

export async function listPrograms(businessId: string) {
  return prisma.program.findMany({
    where: { businessId },
    include: { _count: { select: { projects: true } } },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
}

export async function createProgram(
  businessId: string,
  input: { name: string; code?: string; description?: string }
) {
  return prisma.program.create({
    data: {
      businessId,
      name: input.name.trim(),
      code: input.code?.trim() || null,
      description: input.description?.trim() || null,
    },
  });
}

export async function listScheduleProjects(businessId: string, programId?: string) {
  return prisma.scheduleProject.findMany({
    where: { businessId, ...(programId ? { programId } : {}) },
    include: {
      program: { select: { id: true, name: true } },
      agencyProject: { select: { id: true, name: true } },
      _count: { select: { activities: true, wbsNodes: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getScheduleProject(businessId: string, projectId: string) {
  const project = await prisma.scheduleProject.findFirst({
    where: { id: projectId, businessId },
    include: projectInclude,
  });
  if (!project) return null;

  const baseline = project.baselines[0];
  let baselineVariance: Array<{
    activityId: string;
    name: string;
    scheduleVarianceDays: number;
    costVariance: number;
  }> = [];

  if (baseline?.snapshot) {
    const snap = baseline.snapshot as Record<
      string,
      { plannedFinish?: string; laborCost?: number; materialCost?: number }
    >;
    for (const act of project.activities) {
      const b = snap[act.id];
      if (!b?.plannedFinish || !act.plannedFinish) continue;
      const sv = daysBetween(new Date(b.plannedFinish), act.plannedFinish);
      const plannedCost = (b.laborCost ?? 0) + (b.materialCost ?? 0);
      const actualCost = (act.laborCost ?? 0) + (act.materialCost ?? 0);
      baselineVariance.push({
        activityId: act.id,
        name: act.name,
        scheduleVarianceDays: Math.round(sv * 10) / 10,
        costVariance: Math.round((actualCost - plannedCost) * 100) / 100,
      });
    }
  }

  const { activities: evmActivities, integration } = await buildIntegratedEvmActivities(businessId, project);
  const evm = computeProjectEvm(evmActivities);

  return {
    ...project,
    evm,
    evmIntegration: integration,
    baselineVariance,
  };
}

export async function createScheduleProject(
  businessId: string,
  input: {
    name: string;
    code?: string;
    programId?: string;
    agencyProjectId?: string;
    plannedStart?: string;
  }
) {
  return prisma.scheduleProject.create({
    data: {
      businessId,
      name: input.name.trim(),
      code: input.code?.trim() || null,
      programId: input.programId || null,
      agencyProjectId: input.agencyProjectId || null,
      plannedStart: input.plannedStart ? new Date(input.plannedStart) : new Date(),
      status: 'PLANNING',
    },
  });
}

export async function createWbsNode(
  businessId: string,
  projectId: string,
  input: { code: string; name: string; parentId?: string; sortOrder?: number }
) {
  const project = await prisma.scheduleProject.findFirst({ where: { id: projectId, businessId } });
  if (!project) throw new Error('Project not found');
  return prisma.wbsNode.create({
    data: {
      businessId,
      projectId,
      parentId: input.parentId || null,
      code: input.code.trim(),
      name: input.name.trim(),
      sortOrder: input.sortOrder ?? 0,
    },
  });
}

export async function createScheduleActivity(
  businessId: string,
  projectId: string,
  input: {
    name: string;
    code?: string;
    wbsNodeId?: string;
    durationDays?: number;
    laborCost?: number;
    materialCost?: number;
    equipmentTag?: string;
    sortOrder?: number;
  }
) {
  const project = await prisma.scheduleProject.findFirst({ where: { id: projectId, businessId } });
  if (!project) throw new Error('Project not found');
  const act = await prisma.scheduleActivity.create({
    data: {
      businessId,
      projectId,
      wbsNodeId: input.wbsNodeId || null,
      code: input.code?.trim() || null,
      name: input.name.trim(),
      durationDays: input.durationDays ?? 1,
      laborCost: input.laborCost,
      materialCost: input.materialCost,
      equipmentTag: input.equipmentTag?.trim() || null,
      sortOrder: input.sortOrder ?? 0,
    },
  });
  await applyCpmToProject(businessId, projectId);
  return act;
}

export async function updateScheduleActivity(
  businessId: string,
  activityId: string,
  input: Partial<{
    name: string;
    durationDays: number;
    percentComplete: number;
    status: string;
    laborCost: number;
    materialCost: number;
    wbsNodeId: string | null;
    startOverrideDays: number | null;
    equipmentTag: string | null;
  }>
) {
  const act = await prisma.scheduleActivity.findFirst({ where: { id: activityId, businessId } });
  if (!act) return null;
  const updated = await prisma.scheduleActivity.update({
    where: { id: activityId },
    data: input,
  });
  await applyCpmToProject(businessId, act.projectId);
  return updated;
}

export async function deleteScheduleActivity(businessId: string, activityId: string) {
  const act = await prisma.scheduleActivity.findFirst({ where: { id: activityId, businessId } });
  if (!act) return false;
  await prisma.activityDependency.deleteMany({
    where: { OR: [{ predecessorId: activityId }, { successorId: activityId }] },
  });
  await prisma.scheduleActivity.delete({ where: { id: activityId } });
  await applyCpmToProject(businessId, act.projectId);
  return true;
}

export async function createActivityDependency(
  businessId: string,
  projectId: string,
  input: { predecessorId: string; successorId: string; type?: DepType; lagDays?: number }
) {
  if (input.predecessorId === input.successorId) {
    throw new Error('Activity cannot depend on itself');
  }
  const dep = await prisma.activityDependency.create({
    data: {
      businessId,
      projectId,
      predecessorId: input.predecessorId,
      successorId: input.successorId,
      type: input.type ?? 'FS',
      lagDays: input.lagDays ?? 0,
    },
  });
  await applyCpmToProject(businessId, projectId);
  return dep;
}

export async function deleteActivityDependency(businessId: string, dependencyId: string) {
  const dep = await prisma.activityDependency.findFirst({
    where: { id: dependencyId, businessId },
  });
  if (!dep) return false;
  await prisma.activityDependency.delete({ where: { id: dependencyId } });
  await applyCpmToProject(businessId, dep.projectId);
  return true;
}

export async function recalculateSchedule(businessId: string, projectId: string) {
  return applyCpmToProject(businessId, projectId);
}

export async function createScheduleBaseline(
  businessId: string,
  projectId: string,
  name?: string
) {
  const project = await getScheduleProject(businessId, projectId);
  if (!project) throw new Error('Project not found');

  await prisma.scheduleBaseline.updateMany({
    where: { projectId, businessId },
    data: { isActive: false },
  });

  const snapshot: Record<string, unknown> = {};
  for (const act of project.activities) {
    snapshot[act.id] = {
      plannedStart: act.plannedStart?.toISOString(),
      plannedFinish: act.plannedFinish?.toISOString(),
      laborCost: act.laborCost,
      materialCost: act.materialCost,
      durationDays: act.durationDays,
    };
  }

  return prisma.scheduleBaseline.create({
    data: {
      businessId,
      projectId,
      name: name?.trim() || `Baseline ${new Date().toISOString().slice(0, 10)}`,
      snapshot: snapshot as object,
      isActive: true,
    },
  });
}

export { simulateDelay, runScenarioSimulation, runBatchScenarioSimulation } from './planningSimulationService';
export type { ScenarioParams, ScenarioResult } from './planningSimulationService';

export async function releaseActivityToWorkOrder(
  businessId: string,
  activityId: string,
  memberId?: string
) {
  const act = await prisma.scheduleActivity.findFirst({
    where: { id: activityId, businessId },
    include: {
      project: true,
      materials: { include: { sparePart: { select: { id: true, unitCost: true, stockQty: true } } } },
    },
  });
  if (!act) throw new Error('Activity not found');
  if (act.workOrderId) throw new Error('Activity already released to work order');

  const last = await prisma.workOrder.findFirst({
    where: { businessId },
    orderBy: { createdAt: 'desc' },
    select: { number: true },
  });
  const num = last?.number ? parseInt(last.number.replace(/\D/g, ''), 10) + 1 : 1001;
  const number = `WO-${num}`;

  const materialCost = act.materials.reduce(
    (s, m) => s + (m.plannedQty ?? 1) * (m.unitCost ?? m.sparePart?.unitCost ?? 0),
    0
  );

  return prisma.$transaction(async (tx) => {
    const wo = await tx.workOrder.create({
      data: {
        businessId,
        number,
        type: 'PLANNED',
        title: act.name,
        description: `Released from schedule activity ${act.code ?? act.id.slice(0, 8)}`,
        projectId: act.project.agencyProjectId,
        scheduledStart: act.plannedStart,
        scheduledEnd: act.plannedFinish,
        laborCost: act.laborCost,
        partsCost: materialCost || act.materialCost,
        assignedMemberId: memberId || null,
        status: 'OPEN',
      },
    });

    await tx.scheduleActivity.update({
      where: { id: activityId },
      data: { workOrderId: wo.id, status: 'RELEASED' },
    });

    for (const mat of act.materials) {
      if (!mat.sparePartId) continue;
      const part = await tx.sparePart.findFirst({ where: { id: mat.sparePartId, businessId } });
      if (!part || part.stockQty < mat.plannedQty) continue;
      await tx.sparePart.update({
        where: { id: part.id },
        data: { stockQty: part.stockQty - mat.plannedQty },
      });
      await tx.inventoryTransaction.create({
        data: {
          businessId,
          sparePartId: part.id,
          type: 'ISSUE',
          qty: mat.plannedQty,
          unitCost: part.unitCost,
          workOrderId: wo.id,
          reference: number,
          notes: `Planned issue from activity ${act.name}`,
        },
      });
    }

    return wo;
  });
}

export async function getResourceLeveling(businessId: string, projectId: string) {
  const project = await prisma.scheduleProject.findFirst({
    where: { id: projectId, businessId },
    include: {
      activities: { include: { resources: true } },
      agencyProject: { select: { id: true, headcount: true } },
    },
  });
  if (!project) throw new Error('Project not found');

  const byTradeDay = new Map<string, number>();
  for (const act of project.activities) {
    if (!act.plannedStart) continue;
    const dayKey = act.plannedStart.toISOString().slice(0, 10);
    for (const res of act.resources) {
      const trade = res.tradeRole ?? 'GENERAL';
      const key = `${dayKey}|${trade}`;
      byTradeDay.set(key, (byTradeDay.get(key) ?? 0) + (res.units ?? 1));
    }
  }

  const headcount = project.agencyProject?.headcount ?? 20;
  const overloads: Array<{ date: string; trade: string; required: number; available: number }> =
    [];

  for (const [key, required] of byTradeDay) {
    const [date, trade] = key.split('|');
    if (required > headcount) {
      overloads.push({ date, trade, required, available: headcount });
    }
  }

  let placementPool: Array<{ id: string; name: string; category: string | null }> = [];
  if (project.agencyProjectId) {
    const placements = await prisma.placement.findMany({
      where: { businessId, projectId: project.agencyProjectId, status: 'ACTIVE' },
      include: { workerProfile: { select: { id: true, name: true, category: true } } },
    });
    placementPool = placements.map((p) => p.workerProfile);
  }

  const suggestions = overloads.map((o) => ({
    ...o,
    suggestion: `Shift non-critical activities or add ${o.required - o.available} ${o.trade} workers`,
  }));

  return {
    headcount,
    placementPoolSize: placementPool.length,
    placementPool,
    overloads: suggestions,
    histogram: Array.from(byTradeDay.entries()).map(([key, units]) => {
      const [date, trade] = key.split('|');
      return { date, trade, units, capacity: headcount, overloaded: units > headcount };
    }),
  };
}

export async function addActivityResource(
  businessId: string,
  activityId: string,
  input: { workerProfileId?: string; tradeRole?: string; units?: number; hours?: number }
) {
  const act = await prisma.scheduleActivity.findFirst({ where: { id: activityId, businessId } });
  if (!act) throw new Error('Activity not found');
  return prisma.activityResource.create({
    data: {
      businessId,
      activityId,
      workerProfileId: input.workerProfileId || null,
      tradeRole: input.tradeRole?.trim() || null,
      units: input.units ?? 1,
      hours: input.hours,
    },
    include: { workerProfile: { select: { id: true, name: true, category: true } } },
  });
}

export async function addActivityMaterial(
  businessId: string,
  activityId: string,
  input: { sparePartId?: string; description?: string; plannedQty?: number; unitCost?: number }
) {
  const act = await prisma.scheduleActivity.findFirst({ where: { id: activityId, businessId } });
  if (!act) throw new Error('Activity not found');
  return prisma.activityMaterial.create({
    data: {
      businessId,
      activityId,
      sparePartId: input.sparePartId || null,
      description: input.description?.trim() || null,
      plannedQty: input.plannedQty ?? 1,
      unitCost: input.unitCost,
    },
    include: { sparePart: { select: { id: true, sku: true, name: true } } },
  });
}

export async function seedPlanningDemo(businessId: string) {
  const existing = await prisma.program.findFirst({
    where: { businessId, code: 'SHUTDOWN-2026' },
  });
  if (existing) {
    const proj = await prisma.scheduleProject.findFirst({
      where: { businessId, programId: existing.id },
    });
    if (proj) return { skipped: true, programId: existing.id, projectId: proj.id };
  }

  const program = await prisma.program.create({
    data: {
      businessId,
      name: 'Shutdown 2026',
      code: 'SHUTDOWN-2026',
      description: 'Turnaround maintenance portfolio',
    },
  });

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const scheduleProject = await prisma.scheduleProject.create({
    data: {
      businessId,
      programId: program.id,
      name: 'Unit 4 Shutdown',
      code: 'U4-SD',
      plannedStart: start,
      status: 'ACTIVE',
    },
  });

  const wbsData = [
    { code: 'MECH', name: 'Mechanical' },
    { code: 'ELEC', name: 'Electrical' },
    { code: 'INST', name: 'Instrument' },
    { code: 'CIVIL', name: 'Civil' },
  ];

  const wbsNodes: Record<string, string> = {};
  for (let i = 0; i < wbsData.length; i++) {
    const node = await prisma.wbsNode.create({
      data: {
        businessId,
        projectId: scheduleProject.id,
        code: wbsData[i].code,
        name: wbsData[i].name,
        sortOrder: i,
      },
    });
    wbsNodes[wbsData[i].code] = node.id;
  }

  const actDefs = [
    { code: 'M01', name: 'Remove Pump', wbs: 'MECH', dur: 2, labor: 5000, mat: 0 },
    { code: 'M02', name: 'Overhaul Pump', wbs: 'MECH', dur: 5, labor: 15000, mat: 20000 },
    { code: 'M03', name: 'Install Pump', wbs: 'MECH', dur: 2, labor: 5000, mat: 0 },
    { code: 'M04', name: 'Alignment & Testing', wbs: 'MECH', dur: 1, labor: 3000, mat: 500 },
    { code: 'E01', name: 'Isolate Electrical', wbs: 'ELEC', dur: 1, labor: 2000, mat: 0 },
    { code: 'E02', name: 'Motor Rewind', wbs: 'ELEC', dur: 4, labor: 12000, mat: 8000 },
    { code: 'I01', name: 'Calibrate Instruments', wbs: 'INST', dur: 3, labor: 8000, mat: 2000 },
    { code: 'C01', name: 'Civil Inspection', wbs: 'CIVIL', dur: 2, labor: 4000, mat: 1000 },
  ];

  const actIds: Record<string, string> = {};
  for (let i = 0; i < actDefs.length; i++) {
    const d = actDefs[i];
    const act = await prisma.scheduleActivity.create({
      data: {
        businessId,
        projectId: scheduleProject.id,
        wbsNodeId: wbsNodes[d.wbs],
        code: d.code,
        name: d.name,
        durationDays: d.dur,
        laborCost: d.labor,
        materialCost: d.mat,
        sortOrder: i,
      },
    });
    actIds[d.code] = act.id;
  }

  const depDefs: Array<[string, string, DepType]> = [
    ['M01', 'M02', 'FS'],
    ['M02', 'M03', 'FS'],
    ['M03', 'M04', 'FS'],
    ['E01', 'E02', 'FS'],
    ['E02', 'M03', 'SS'],
    ['M04', 'I01', 'FS'],
    ['I01', 'C01', 'FS'],
  ];

  for (const [pred, succ, type] of depDefs) {
    await prisma.activityDependency.create({
      data: {
        businessId,
        projectId: scheduleProject.id,
        predecessorId: actIds[pred],
        successorId: actIds[succ],
        type,
        lagDays: 0,
      },
    });
  }

  await applyCpmToProject(businessId, scheduleProject.id);
  await createScheduleBaseline(businessId, scheduleProject.id, 'Original Plan');

  return {
    skipped: false,
    programId: program.id,
    projectId: scheduleProject.id,
    activities: actDefs.length,
    dependencies: depDefs.length,
  };
}

export async function updateScheduleProject(
  businessId: string,
  projectId: string,
  input: Partial<{
    name: string;
    code: string;
    plannedStart: string;
    status: string;
    calendarConfig: object;
    penaltyPerDay: number;
    shiftHours: number;
    agencyProjectId: string | null;
  }>
) {
  const project = await prisma.scheduleProject.findFirst({ where: { id: projectId, businessId } });
  if (!project) return null;
  const data: Record<string, unknown> = {};
  if (input.name != null) data.name = input.name.trim();
  if (input.code != null) data.code = input.code.trim() || null;
  if (input.plannedStart != null) data.plannedStart = new Date(input.plannedStart);
  if (input.status != null) data.status = input.status;
  if (input.calendarConfig != null) data.calendarConfig = input.calendarConfig;
  if (input.penaltyPerDay != null) data.penaltyPerDay = input.penaltyPerDay;
  if (input.shiftHours != null) data.shiftHours = input.shiftHours;
  if (input.agencyProjectId !== undefined) data.agencyProjectId = input.agencyProjectId;
  const updated = await prisma.scheduleProject.update({ where: { id: projectId }, data });
  await applyCpmToProject(businessId, projectId);
  return updated;
}

/** Drag Gantt: shift activity start in working days */
export async function shiftActivitySchedule(
  businessId: string,
  activityId: string,
  startOverrideDays: number
) {
  const act = await prisma.scheduleActivity.findFirst({ where: { id: activityId, businessId } });
  if (!act) return null;
  await prisma.scheduleActivity.update({
    where: { id: activityId },
    data: { startOverrideDays: Math.max(0, startOverrideDays) },
  });
  await applyCpmToProject(businessId, act.projectId);
  return prisma.scheduleActivity.findFirst({ where: { id: activityId } });
}

export async function getPlanningDashboard(businessId: string) {
  const [programs, projects, portfolio] = await Promise.all([
    prisma.program.count({ where: { businessId } }),
    prisma.scheduleProject.findMany({
      where: { businessId },
      include: { _count: { select: { activities: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 8,
    }),
    import('./planningAiService').then((m) => m.getPlanningPortfolioSummary(businessId)),
  ]);

  let totalCritical = 0;
  let avgSpi = 0;
  let avgCpi = 0;
  let spiCount = 0;
  for (const p of portfolio.projects) {
    if (!p) continue;
    totalCritical += p.criticalCount ?? 0;
    if (p.spi != null) {
      avgSpi += p.spi;
      spiCount++;
    }
    if (p.cpi != null) avgCpi += p.cpi;
  }

  return {
    programCount: programs,
    projectCount: projects.length,
    totalActivities: projects.reduce((s, p) => s + p._count.activities, 0),
    criticalPathActivities: totalCritical,
    scheduleCompliancePct: spiCount ? Math.round((avgSpi / spiCount) * 100) : 100,
    avgSpi: spiCount ? Math.round((avgSpi / spiCount) * 1000) / 1000 : 1,
    avgCpi: spiCount ? Math.round((avgCpi / spiCount) * 1000) / 1000 : 1,
    recentProjects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      status: p.status,
      plannedFinish: p.plannedFinish,
      activityCount: p._count.activities,
    })),
    portfolio,
  };
}
