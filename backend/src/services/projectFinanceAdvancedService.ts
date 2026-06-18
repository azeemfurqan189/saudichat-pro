import prisma from '../utils/prisma';

export async function getProjectFinancialControl(businessId: string, agencyProjectId: string) {
  const project = await prisma.agencyProject.findFirst({
    where: { id: agencyProjectId, businessId },
    include: {
      scheduleProjects: { select: { id: true } },
    },
  });
  if (!project) throw new Error('Project not found');

  const [entries, pos, subcontractorPos, timesheets, invoices, milestones, workOrders, purchaseOrders] =
    await Promise.all([
      prisma.projectFinancialEntry.findMany({
        where: { businessId, agencyProjectId },
        orderBy: { recordedAt: 'desc' },
      }),
      prisma.purchaseOrder.findMany({
        where: { businessId, status: { not: 'CANCELLED' } },
        select: { id: true, number: true, totalCost: true, status: true, issuedAt: true },
      }),
      prisma.subcontractorPurchaseOrder.findMany({
        where: { businessId, projectId: agencyProjectId },
      }),
      prisma.subcontractorTimesheet.findMany({
        where: { businessId, projectId: agencyProjectId, status: 'APPROVED' },
      }),
      prisma.subcontractorInvoice.findMany({
        where: { businessId, status: { in: ['PENDING', 'PAID'] } },
        include: { subcontractor: { select: { name: true } } },
      }),
      prisma.projectMilestone.findMany({
        where: { businessId, agencyProjectId },
        orderBy: { triggerPercent: 'asc' },
      }),
      prisma.workOrder.findMany({
        where: { businessId, projectId: agencyProjectId, status: 'COMPLETED' },
        select: { laborCost: true, partsCost: true },
      }),
      prisma.purchaseOrder.findMany({
        where: { businessId, status: 'DELIVERED' },
        select: { totalCost: true },
      }),
    ]);

  const budgetFromEntries = entries
    .filter((e) => e.category === 'BUDGET')
    .reduce((s, e) => s + e.amountSar, 0);
  const financeConfig = await prisma.cmmsFinanceConfig.findUnique({ where: { businessId } });
  const budget = budgetFromEntries > 0 ? budgetFromEntries : financeConfig?.annualBudget ?? 0;

  const commitmentFromPo =
    pos.reduce((s, p) => s + (p.totalCost ?? 0), 0) +
    subcontractorPos.reduce((s, p) => s + p.amountSar, 0);
  const commitmentFromEntries = entries
    .filter((e) => e.category === 'COMMITMENT')
    .reduce((s, e) => s + e.amountSar, 0);
  const commitment = commitmentFromEntries > 0 ? commitmentFromEntries : commitmentFromPo;

  const actualFromWo = workOrders.reduce(
    (s, wo) => s + (wo.laborCost ?? 0) + (wo.partsCost ?? 0),
    0
  );
  const actualFromDelivered = purchaseOrders.reduce((s, p) => s + (p.totalCost ?? 0), 0);
  const actualFromSubTs = timesheets.reduce((s, t) => s + (t.amountSar ?? t.hours * 85), 0);
  const actualFromEntries = entries
    .filter((e) => e.category === 'ACTUAL')
    .reduce((s, e) => s + e.amountSar, 0);
  const actual =
    actualFromEntries > 0 ? actualFromEntries : actualFromWo + actualFromDelivered + actualFromSubTs;

  const revenueFromEntries = entries
    .filter((e) => e.category === 'REVENUE')
    .reduce((s, e) => s + e.amountSar, 0);
  const revenueFromMilestones = milestones
    .filter((m) => m.status === 'INVOICED')
    .reduce((s, m) => s + m.invoiceAmountSar * (1 - m.retentionPct / 100), 0);
  const revenue = revenueFromEntries > 0 ? revenueFromEntries : revenueFromMilestones;

  const retentionHeld = milestones
    .filter((m) => m.status === 'INVOICED')
    .reduce((s, m) => s + m.invoiceAmountSar * (m.retentionPct / 100), 0);

  return {
    projectId: agencyProjectId,
    projectName: project.name,
    budget: Math.round(budget),
    commitment: Math.round(commitment),
    actual: Math.round(actual),
    revenue: Math.round(revenue),
    retentionHeld: Math.round(retentionHeld),
    varianceBudgetActual: Math.round(budget - actual),
    varianceCommitmentActual: Math.round(commitment - actual),
    utilizationPct: budget > 0 ? Math.round((actual / budget) * 1000) / 10 : 0,
    entries,
    milestones,
    subcontractors: {
      pos: subcontractorPos,
      timesheets,
      invoices,
    },
    threeWayMatch: {
      budget,
      commitment,
      actual,
      status:
        actual <= budget && commitment <= budget * 1.05
          ? 'GREEN'
          : actual <= budget * 1.1
            ? 'YELLOW'
            : 'RED',
    },
  };
}

export async function addFinancialEntry(
  businessId: string,
  input: {
    agencyProjectId?: string;
    scheduleProjectId?: string;
    category: string;
    amountSar: number;
    reference?: string;
    description?: string;
  }
) {
  return prisma.projectFinancialEntry.create({
    data: {
      businessId,
      agencyProjectId: input.agencyProjectId || null,
      scheduleProjectId: input.scheduleProjectId || null,
      category: input.category.toUpperCase(),
      amountSar: input.amountSar,
      reference: input.reference?.trim() || null,
      description: input.description?.trim() || null,
    },
  });
}

export async function createMilestone(
  businessId: string,
  agencyProjectId: string,
  input: {
    name: string;
    triggerPercent?: number;
    invoiceAmountSar: number;
    retentionPct?: number;
  }
) {
  return prisma.projectMilestone.create({
    data: {
      businessId,
      agencyProjectId,
      name: input.name.trim(),
      triggerPercent: input.triggerPercent ?? 50,
      invoiceAmountSar: input.invoiceAmountSar,
      retentionPct: input.retentionPct ?? 10,
      status: 'PENDING',
    },
  });
}

export async function invoiceMilestone(businessId: string, milestoneId: string, physicalProgressPct: number) {
  const milestone = await prisma.projectMilestone.findFirst({
    where: { id: milestoneId, businessId },
  });
  if (!milestone) throw new Error('Milestone not found');
  if (physicalProgressPct < milestone.triggerPercent) {
    throw new Error(`Physical progress ${physicalProgressPct}% below trigger ${milestone.triggerPercent}%`);
  }

  const retentionAmount = milestone.invoiceAmountSar * (milestone.retentionPct / 100);
  const netInvoice = milestone.invoiceAmountSar - retentionAmount;

  const updated = await prisma.projectMilestone.update({
    where: { id: milestoneId },
    data: { status: 'INVOICED', invoicedAt: new Date() },
  });

  await prisma.projectFinancialEntry.create({
    data: {
      businessId,
      agencyProjectId: milestone.agencyProjectId,
      category: 'REVENUE',
      amountSar: netInvoice,
      reference: `MILESTONE-${milestone.id.slice(0, 8)}`,
      description: `${milestone.name} — retention ${retentionAmount.toFixed(0)} SAR held`,
    },
  });

  return { milestone: updated, netInvoice, retentionAmount };
}

export async function releaseMilestoneRetention(businessId: string, milestoneId: string) {
  const milestone = await prisma.projectMilestone.findFirst({
    where: { id: milestoneId, businessId },
  });
  if (!milestone) throw new Error('Milestone not found');
  if (milestone.status === 'RETENTION_RELEASED') throw new Error('Retention already released');
  if (milestone.status !== 'INVOICED') throw new Error('Milestone must be invoiced before releasing retention');

  const retentionAmount = milestone.invoiceAmountSar * (milestone.retentionPct / 100);

  const updated = await prisma.projectMilestone.update({
    where: { id: milestoneId },
    data: { status: 'RETENTION_RELEASED' },
  });

  await prisma.projectFinancialEntry.create({
    data: {
      businessId,
      agencyProjectId: milestone.agencyProjectId,
      category: 'REVENUE',
      amountSar: retentionAmount,
      reference: `RET-RELEASE-${milestone.id.slice(0, 8)}`,
      description: `${milestone.name} — retention release (${milestone.retentionPct}%)`,
    },
  });

  return { milestone: updated, retentionReleased: retentionAmount };
}

export async function createClientInvoice(
  businessId: string,
  input: {
    agencyProjectId: string;
    clientCompanyId?: string;
    amountSar: number;
    description?: string;
    dueAt?: string;
  }
) {
  const count = await prisma.projectFinancialEntry.count({
    where: { businessId, reference: { startsWith: 'CLIENT-INV-' } },
  });
  const number = `CLIENT-INV-${String(count + 1).padStart(4, '0')}`;

  const entry = await prisma.projectFinancialEntry.create({
    data: {
      businessId,
      agencyProjectId: input.agencyProjectId,
      category: 'REVENUE',
      amountSar: input.amountSar,
      reference: number,
      description:
        input.description?.trim() ||
        `Client invoice${input.dueAt ? ` due ${input.dueAt.slice(0, 10)}` : ''}`,
    },
  });

  return {
    id: entry.id,
    number,
    agencyProjectId: input.agencyProjectId,
    amountSar: input.amountSar,
    status: 'ISSUED',
    dueAt: input.dueAt ?? null,
    createdAt: entry.recordedAt,
  };
}

export async function listClientInvoices(businessId: string, agencyProjectId?: string) {
  const entries = await prisma.projectFinancialEntry.findMany({
    where: {
      businessId,
      category: 'REVENUE',
      reference: { startsWith: 'CLIENT-INV-' },
      ...(agencyProjectId ? { agencyProjectId } : {}),
    },
    orderBy: { recordedAt: 'desc' },
    take: 50,
  });

  return entries.map((e) => ({
    id: e.id,
    number: e.reference ?? 'CLIENT-INV',
    agencyProjectId: e.agencyProjectId,
    amountSar: e.amountSar,
    description: e.description,
    status: 'ISSUED',
    createdAt: e.recordedAt,
  }));
}

export async function listSubcontractors(businessId: string) {
  return prisma.subcontractor.findMany({
    where: { businessId },
    include: {
      _count: { select: { pos: true, timesheets: true, invoices: true } },
    },
    orderBy: { name: 'asc' },
  });
}

export async function createSubcontractor(
  businessId: string,
  input: { name: string; trade?: string; contactEmail?: string; contactPhone?: string }
) {
  return prisma.subcontractor.create({
    data: {
      businessId,
      name: input.name.trim(),
      trade: input.trade?.trim() || null,
      contactEmail: input.contactEmail?.trim() || null,
      contactPhone: input.contactPhone?.trim() || null,
    },
  });
}

export async function createSubcontractorPo(
  businessId: string,
  input: { subcontractorId: string; projectId?: string; amountSar: number; description?: string }
) {
  const count = await prisma.subcontractorPurchaseOrder.count({ where: { businessId } });
  const number = `SCPO-${String(count + 1).padStart(4, '0')}`;

  const po = await prisma.subcontractorPurchaseOrder.create({
    data: {
      businessId,
      subcontractorId: input.subcontractorId,
      projectId: input.projectId || null,
      number,
      amountSar: input.amountSar,
      description: input.description?.trim() || null,
    },
    include: { subcontractor: true, project: { select: { name: true } } },
  });

  if (input.projectId) {
    await prisma.projectFinancialEntry.create({
      data: {
        businessId,
        agencyProjectId: input.projectId,
        category: 'COMMITMENT',
        amountSar: input.amountSar,
        reference: number,
        description: `Subcontractor PO — ${po.subcontractor.name}`,
      },
    });
  }

  return po;
}

export async function createSubcontractorTimesheet(
  businessId: string,
  input: {
    subcontractorId: string;
    projectId?: string;
    workDate: string;
    hours: number;
    amountSar?: number;
  }
) {
  return prisma.subcontractorTimesheet.create({
    data: {
      businessId,
      subcontractorId: input.subcontractorId,
      projectId: input.projectId || null,
      workDate: new Date(input.workDate),
      hours: input.hours,
      amountSar: input.amountSar ?? input.hours * 85,
      status: 'PENDING',
    },
    include: { subcontractor: { select: { name: true } } },
  });
}

export async function approveSubcontractorTimesheet(businessId: string, timesheetId: string) {
  const ts = await prisma.subcontractorTimesheet.update({
    where: { id: timesheetId },
    data: { status: 'APPROVED' },
    include: { subcontractor: true },
  });

  if (ts.projectId && ts.amountSar) {
    await prisma.projectFinancialEntry.create({
      data: {
        businessId,
        agencyProjectId: ts.projectId,
        category: 'ACTUAL',
        amountSar: ts.amountSar,
        reference: `SUB-TS-${ts.id.slice(0, 8)}`,
        description: `Subcontractor timesheet — ${ts.subcontractor.name}`,
      },
    });
  }

  return ts;
}

export async function createSubcontractorInvoice(
  businessId: string,
  input: { subcontractorId: string; amountSar: number; dueAt?: string }
) {
  const count = await prisma.subcontractorInvoice.count({ where: { businessId } });
  const number = `SCINV-${String(count + 1).padStart(4, '0')}`;
  return prisma.subcontractorInvoice.create({
    data: {
      businessId,
      subcontractorId: input.subcontractorId,
      number,
      amountSar: input.amountSar,
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
    },
    include: { subcontractor: { select: { name: true } } },
  });
}

export async function seedProjectFinanceDemo(businessId: string, agencyProjectId: string) {
  const existing = await prisma.projectMilestone.count({ where: { businessId, agencyProjectId } });
  if (existing > 0) return { skipped: true };

  await prisma.projectFinancialEntry.createMany({
    data: [
      { businessId, agencyProjectId, category: 'BUDGET', amountSar: 2500000, description: 'Approved project budget' },
      { businessId, agencyProjectId, category: 'COMMITMENT', amountSar: 450000, description: 'Initial PO commitment' },
    ],
  });

  await prisma.projectMilestone.createMany({
    data: [
      {
        businessId,
        agencyProjectId,
        name: '50% Physical Progress',
        triggerPercent: 50,
        invoiceAmountSar: 800000,
        retentionPct: 10,
      },
      {
        businessId,
        agencyProjectId,
        name: '100% Completion',
        triggerPercent: 100,
        invoiceAmountSar: 1200000,
        retentionPct: 10,
      },
    ],
  });

  const sub = await prisma.subcontractor.create({
    data: { businessId, name: 'Gulf Scaffolding Co.', trade: 'SCAFFOLDING', contactEmail: 'po@gulfscaff.sa' },
  });

  await createSubcontractorPo(businessId, {
    subcontractorId: sub.id,
    projectId: agencyProjectId,
    amountSar: 120000,
    description: 'Scaffolding package — Phase 1',
  });

  return { skipped: false, subcontractorId: sub.id };
}
