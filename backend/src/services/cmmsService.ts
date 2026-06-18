import prisma from '../utils/prisma';
import { notifyCmmsEvent } from './cmmsAlertsService';
import { Prisma } from '@prisma/client';

const locationInclude = {
  project: {
    select: {
      id: true,
      name: true,
      siteName: true,
      clientCompany: { select: { id: true, name: true } },
    },
  },
  parent: { select: { id: true, code: true, name: true } },
  _count: { select: { equipment: true, children: true } },
} as const;

const assetInclude = {
  project: { select: { id: true, name: true, siteName: true } },
  functionalLocation: { select: { id: true, code: true, name: true, type: true } },
  workerProfile: { select: { id: true, name: true } },
} as const;

async function nextDocNumber(
  businessId: string,
  prefix: string,
  model: 'workRequest' | 'workOrder' | 'purchaseRequisition' | 'purchaseOrder'
) {
  const year = new Date().getFullYear();
  const base = `${prefix}-${year}-`;
  let last: { number: string } | null = null;
  if (model === 'workRequest') {
    last = await prisma.workRequest.findFirst({
      where: { businessId, number: { startsWith: base } },
      orderBy: { number: 'desc' },
    });
  } else if (model === 'workOrder') {
    last = await prisma.workOrder.findFirst({
      where: { businessId, number: { startsWith: base } },
      orderBy: { number: 'desc' },
    });
  } else if (model === 'purchaseOrder') {
    last = await prisma.purchaseOrder.findFirst({
      where: { businessId, number: { startsWith: base } },
      orderBy: { number: 'desc' },
    });
  } else {
    last = await prisma.purchaseRequisition.findFirst({
      where: { businessId, number: { startsWith: base } },
      orderBy: { number: 'desc' },
    });
  }
  const seq = last ? parseInt(last.number.split('-').pop() || '0', 10) + 1 : 1;
  return `${base}${String(seq).padStart(4, '0')}`;
}

const prInclude = {
  supplier: { select: { id: true, name: true, phone: true, email: true } },
  workOrder: { select: { id: true, number: true, title: true } },
  sparePart: { select: { id: true, sku: true, name: true, stockQty: true, reorderPoint: true } },
  purchaseOrder: { select: { id: true, number: true, status: true, deliveredAt: true } },
} as const;

const poInclude = {
  supplier: { select: { id: true, name: true, phone: true, email: true } },
  requisition: { select: { id: true, number: true, source: true, status: true } },
} as const;

export async function getCmmsDashboard(businessId: string) {
  const now = new Date();
  const { scanAndNotifyCmmsDueAlerts } = await import('./cmmsAlertsService');
  scanAndNotifyCmmsDueAlerts(businessId).catch(() => undefined);

  const [
    assetCount,
    openRequests,
    openOrders,
    pmDue,
    spareRows,
    pendingProcurement,
    recentOrders,
    locationCount,
  ] = await Promise.all([
    prisma.agencyEquipment.count({ where: { businessId } }),
    prisma.workRequest.count({ where: { businessId, status: { in: ['SUBMITTED', 'APPROVED'] } } }),
    prisma.workOrder.count({ where: { businessId, status: { in: ['OPEN', 'IN_PROGRESS', 'ON_HOLD'] } } }),
    prisma.maintenancePlan.count({
      where: { businessId, isActive: true, nextDueAt: { lte: now } },
    }),
    prisma.sparePart.findMany({ where: { businessId }, select: { stockQty: true, reorderPoint: true } }),
    prisma.purchaseRequisition.count({ where: { businessId, status: { in: ['DRAFT', 'SUBMITTED'] } } }),
    prisma.workOrder.findMany({
      where: { businessId },
      include: {
        equipment: { select: { name: true, assetTag: true } },
        functionalLocation: { select: { name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    prisma.functionalLocation.count({ where: { businessId, isActive: true } }),
  ]);

  const lowStockCount = spareRows.filter((p) => p.stockQty <= p.reorderPoint).length;

  const completedOrders = await prisma.workOrder.findMany({
    where: { businessId, status: 'COMPLETED', completedAt: { not: null } },
    select: { laborCost: true, partsCost: true, downtimeMinutes: true },
  });
  const totalCost = completedOrders.reduce(
    (sum, o) => sum + (o.laborCost ?? 0) + (o.partsCost ?? 0),
    0
  );
  const totalDowntime = completedOrders.reduce((sum, o) => sum + (o.downtimeMinutes ?? 0), 0);

  return {
    summary: {
      assets: assetCount,
      locations: locationCount,
      openWorkRequests: openRequests,
      openWorkOrders: openOrders,
      pmDue,
      lowStock: lowStockCount,
      pendingProcurement,
      totalMaintenanceCost: totalCost,
      totalDowntimeMinutes: totalDowntime,
    },
    recentWorkOrders: recentOrders,
    flow: ['ASSET', 'WORK_REQUEST', 'OFFICE_APPROVAL', 'WORK_ORDER', 'SITE_EXECUTION', 'INVENTORY', 'OWNER_REPORT'],
  };
}

export async function ensureDefaultOfficeLocations(businessId: string) {
  let hq = await prisma.functionalLocation.findFirst({
    where: { businessId, code: 'HQ', isActive: true },
  });
  if (!hq) {
    hq = await createFunctionalLocation(businessId, {
      code: 'HQ',
      name: 'Head Office',
      description: 'Company head office — store office equipment here',
      type: 'HEAD_OFFICE',
      sortOrder: 0,
    });
  }

  const wh = await prisma.functionalLocation.findFirst({
    where: { businessId, code: 'WH-01', isActive: true },
  });
  if (!wh) {
    await createFunctionalLocation(businessId, {
      code: 'WH-01',
      name: 'Central Warehouse',
      description: 'Main warehouse / stock room',
      type: 'WAREHOUSE',
      parentId: hq.id,
      sortOrder: 1,
    });
  }

  return { ensured: true };
}

function projectLocationCode(project: { id: string; code: string | null; name: string }) {
  if (project.code?.trim()) return project.code.trim().toUpperCase().replace(/\s+/g, '-').slice(0, 32);
  const slug = project.name
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toUpperCase()
    .slice(0, 20);
  return slug ? `PRJ-${slug}` : `PRJ-${project.id.slice(0, 8).toUpperCase()}`;
}

async function uniqueLocationCode(businessId: string, baseCode: string) {
  let code = baseCode.slice(0, 32);
  let n = 0;
  while (
    await prisma.functionalLocation.findFirst({
      where: { businessId, code },
    })
  ) {
    n += 1;
    code = `${baseCode.slice(0, 28)}-${n}`;
  }
  return code;
}

/** Sync functional locations from real clients & active projects (manpower). */
export async function syncManpowerProjectLocations(businessId: string) {
  const clients = await prisma.clientCompany.findMany({
    where: { businessId, isActive: true },
    orderBy: { name: 'asc' },
  });

  for (const client of clients) {
    const baseCode = `CLI-${client.name.replace(/[^a-zA-Z0-9]+/g, '').toUpperCase().slice(0, 12) || client.id.slice(0, 8)}`;
    const existingClientLoc = await prisma.functionalLocation.findFirst({
      where: { businessId, type: 'COMPANY', name: client.name, isActive: true },
    });
    if (!existingClientLoc) {
      const code = await uniqueLocationCode(businessId, baseCode);
      await createFunctionalLocation(businessId, {
        code,
        name: client.name,
        description: client.address ? `Client — ${client.address}` : 'Client company',
        type: 'COMPANY',
        address: client.address ?? undefined,
        sortOrder: 50,
      }).catch(() => undefined);
    }
  }

  const projects = await prisma.agencyProject.findMany({
    where: { businessId, status: { in: ['ACTIVE', 'active', 'PLANNED', 'planned'] } },
    include: { clientCompany: { select: { name: true } } },
    orderBy: { createdAt: 'asc' },
  });

  for (const project of projects) {
    const clientName = project.clientCompany?.name;
    const siteLabel = project.siteName?.trim() || project.name;
    const displayName = clientName ? `${clientName} — ${siteLabel}` : siteLabel;

    const byProject = await prisma.functionalLocation.findFirst({
      where: { businessId, projectId: project.id, isActive: true },
    });

    if (byProject) {
      if (byProject.name !== displayName || byProject.address !== project.siteAddress) {
        await prisma.functionalLocation.update({
          where: { id: byProject.id },
          data: {
            name: displayName,
            address: project.siteAddress ?? byProject.address,
          },
        });
      }
      continue;
    }

    const baseCode = projectLocationCode(project);
    const code = await uniqueLocationCode(businessId, baseCode);
    await createFunctionalLocation(businessId, {
      code,
      name: displayName,
      description: clientName ? `Project site for ${clientName}` : 'Project site',
      type: 'SITE',
      projectId: project.id,
      address: project.siteAddress ?? undefined,
      sortOrder: 100,
    }).catch(() => undefined);
  }
}

export async function listFunctionalLocations(businessId: string) {
  await ensureDefaultOfficeLocations(businessId);
  await syncManpowerProjectLocations(businessId);
  return prisma.functionalLocation.findMany({
    where: { businessId, isActive: true },
    include: locationInclude,
    orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
  });
}

export async function createFunctionalLocation(
  businessId: string,
  input: {
    code: string;
    name: string;
    description?: string;
    type?: string;
    parentId?: string | null;
    projectId?: string | null;
    address?: string;
    sortOrder?: number;
  }
) {
  try {
    const loc = await prisma.functionalLocation.create({
      data: {
        businessId,
        code: input.code.trim().toUpperCase(),
        name: input.name.trim(),
        description: input.description?.trim() || null,
        type: input.type ?? 'SITE',
        parentId: input.parentId || null,
        projectId: input.projectId || null,
        address: input.address?.trim() || null,
        sortOrder: input.sortOrder ?? 0,
      },
      include: locationInclude,
    });
    await linkLocationHierarchy(businessId, loc.id, input.parentId || null);
    return loc;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new Error('Location code already exists — choose a different code');
    }
    throw e;
  }
}

async function linkLocationHierarchy(businessId: string, locationId: string, parentId: string | null) {
  await prisma.locationHierarchy.deleteMany({ where: { descendantId: locationId } });
  await prisma.locationHierarchy.create({
    data: { businessId, ancestorId: locationId, descendantId: locationId, depth: 0 },
  });
  if (!parentId) return;

  const parentRows = await prisma.locationHierarchy.findMany({
    where: { descendantId: parentId },
    orderBy: { depth: 'asc' },
  });
  for (const row of parentRows) {
    await prisma.locationHierarchy.create({
      data: {
        businessId,
        ancestorId: row.ancestorId,
        descendantId: locationId,
        depth: row.depth + 1,
      },
    });
  }
}

async function rebuildSubtreeHierarchy(businessId: string, rootId: string) {
  const all = await prisma.functionalLocation.findMany({
    where: { businessId, isActive: true },
    select: { id: true, parentId: true },
  });
  const byParent = new Map<string | null, string[]>();
  for (const loc of all) {
    const key = loc.parentId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(loc.id);
  }

  async function walk(nodeId: string) {
    await linkLocationHierarchy(
      businessId,
      nodeId,
      all.find((l) => l.id === nodeId)?.parentId ?? null
    );
    for (const childId of byParent.get(nodeId) ?? []) {
      await walk(childId);
    }
  }
  await walk(rootId);
}

export type LocationRecordInput = {
  code?: string;
  name?: string;
  description?: string;
  type?: string;
  parentId?: string | null;
  projectId?: string | null;
  address?: string;
  sortOrder?: number;
};

export async function getFunctionalLocationById(businessId: string, locationId: string) {
  const loc = await prisma.functionalLocation.findFirst({
    where: { id: locationId, businessId, isActive: true },
    include: {
      ...locationInclude,
      children: {
        where: { isActive: true },
        include: { _count: { select: { equipment: true, children: true } } },
        orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
      },
      equipment: {
        where: { assetStatus: { not: 'RETIRED' } },
        take: 10,
        select: { id: true, name: true, assetTag: true, assetNumber: true, criticality: true },
        orderBy: [{ assetTag: 'asc' }, { name: 'asc' }],
      },
    },
  });
  if (!loc) return null;

  const pathRows = await prisma.locationHierarchy.findMany({
    where: { descendantId: locationId, depth: { gt: 0 } },
    include: { ancestor: { select: { id: true, code: true, name: true, type: true } } },
    orderBy: { depth: 'desc' },
  });

  return {
    ...loc,
    breadcrumb: pathRows.map((r) => r.ancestor),
  };
}

export async function updateFunctionalLocation(
  businessId: string,
  locationId: string,
  input: LocationRecordInput
) {
  const existing = await prisma.functionalLocation.findFirst({
    where: { id: locationId, businessId, isActive: true },
  });
  if (!existing) return null;

  if (input.parentId !== undefined && input.parentId === locationId) {
    throw new Error('Location cannot be its own parent');
  }
  if (input.parentId) {
    const wouldCycle = await prisma.locationHierarchy.findFirst({
      where: { ancestorId: locationId, descendantId: input.parentId },
    });
    if (wouldCycle) throw new Error('Cannot move location under its own descendant');
  }

  const parentChanged = input.parentId !== undefined && input.parentId !== existing.parentId;

  const loc = await prisma.functionalLocation.update({
    where: { id: locationId },
    data: {
      ...(input.code !== undefined && { code: input.code.trim().toUpperCase() }),
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.description !== undefined && { description: input.description?.trim() || null }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.parentId !== undefined && { parentId: input.parentId || null }),
      ...(input.projectId !== undefined && { projectId: input.projectId || null }),
      ...(input.address !== undefined && { address: input.address?.trim() || null }),
      ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
    },
    include: locationInclude,
  });

  if (parentChanged) {
    await rebuildSubtreeHierarchy(businessId, locationId);
  }

  return getFunctionalLocationById(businessId, locationId);
}

export async function deleteFunctionalLocation(businessId: string, locationId: string) {
  const existing = await prisma.functionalLocation.findFirst({
    where: { id: locationId, businessId, isActive: true },
    include: { _count: { select: { children: true } } },
  });
  if (!existing) return false;
  if (existing._count.children > 0) {
    throw new Error('Cannot deactivate location with active child locations');
  }
  await prisma.functionalLocation.update({
    where: { id: locationId },
    data: { isActive: false },
  });
  return true;
}

export async function getLocationTree(businessId: string) {
  await ensureDefaultOfficeLocations(businessId);
  await syncManpowerProjectLocations(businessId);
  const locations = await prisma.functionalLocation.findMany({
    where: { businessId, isActive: true },
    include: locationInclude,
    orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
  });

  type LocRow = (typeof locations)[number];
  const byParent = new Map<string | null, LocRow[]>();
  for (const loc of locations) {
    const key = loc.parentId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(loc);
  }

  type TreeNode = {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    type: string;
    address?: string | null;
    parentId?: string | null;
    assetCount: number;
    childCount: number;
    children: TreeNode[];
  };

  function buildNodes(parentId: string | null): TreeNode[] {
    return (byParent.get(parentId) ?? []).map((loc) => ({
      id: loc.id,
      code: loc.code,
      name: loc.name,
      description: loc.description,
      type: loc.type,
      address: loc.address,
      parentId: loc.parentId,
      assetCount: loc._count?.equipment ?? 0,
      childCount: loc._count?.children ?? 0,
      children: buildNodes(loc.id),
    }));
  }

  const roots = locations.filter((l) => !l.parentId).length;
  const totalAssets = locations.reduce((s, l) => s + (l._count?.equipment ?? 0), 0);

  return {
    tree: buildNodes(null),
    summary: {
      totalLocations: locations.length,
      rootLocations: roots,
      maxDepth: await prisma.locationHierarchy
        .aggregate({ where: { businessId }, _max: { depth: true } })
        .then((r) => r._max.depth ?? 0),
      totalAssets,
    },
  };
}

export async function seedFunctionalLocationHierarchy(businessId: string) {
  const existing = await prisma.functionalLocation.findFirst({
    where: { businessId, code: 'REFINERY' },
  });
  if (existing) return { skipped: true, message: 'Functional location hierarchy already seeded' };

  const project = await prisma.agencyProject.findFirst({
    where: { businessId },
    orderBy: { createdAt: 'asc' },
  });

  const refinery = await createFunctionalLocation(businessId, {
    code: 'REFINERY',
    name: 'Jubail Refinery',
    description: 'Main process plant — top-level functional location',
    type: 'PLANT',
    projectId: project?.id ?? null,
    address: project?.siteAddress ?? 'Jubail Industrial City',
    sortOrder: 0,
  });

  const utilities = await createFunctionalLocation(businessId, {
    code: 'UTILITIES',
    name: 'Utilities',
    description: 'Utility systems — air, water, steam',
    type: 'SECTION',
    parentId: refinery.id,
    sortOrder: 1,
  });

  const boilerArea = await createFunctionalLocation(businessId, {
    code: 'BOILER-AREA',
    name: 'Boiler Area',
    description: 'Steam boiler house',
    type: 'SECTION',
    parentId: refinery.id,
    sortOrder: 2,
  });

  await createFunctionalLocation(businessId, {
    code: 'BOILER-1',
    name: 'Boiler 1',
    description: 'Primary steam boiler — 20 t/h',
    type: 'EQUIPMENT',
    parentId: boilerArea.id,
    sortOrder: 1,
  });

  await createFunctionalLocation(businessId, {
    code: 'BOILER-2',
    name: 'Boiler 2',
    description: 'Standby steam boiler — 20 t/h',
    type: 'EQUIPMENT',
    parentId: boilerArea.id,
    sortOrder: 2,
  });

  return {
    skipped: false,
    created: 5,
    root: refinery.code,
    sections: [utilities.code, boilerArea.code],
  };
}

export async function listWorkRequests(businessId: string, status?: string) {
  return prisma.workRequest.findMany({
    where: { businessId, ...(status ? { status } : {}) },
    include: {
      equipment: { select: { id: true, name: true, assetTag: true } },
      functionalLocation: { select: { id: true, code: true, name: true } },
      project: { select: { id: true, name: true } },
      workOrder: { select: { id: true, number: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createWorkRequest(
  businessId: string,
  memberId: string | undefined,
  input: {
    title: string;
    description?: string;
    priority?: string;
    equipmentId?: string | null;
    functionalLocationId?: string | null;
    projectId?: string | null;
  }
) {
  const number = await nextDocNumber(businessId, 'WR', 'workRequest');
  const row = await prisma.workRequest.create({
    data: {
      businessId,
      number,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      priority: input.priority ?? 'MEDIUM',
      equipmentId: input.equipmentId || null,
      functionalLocationId: input.functionalLocationId || null,
      projectId: input.projectId || null,
      requestedByMemberId: memberId || null,
      status: 'SUBMITTED',
    },
    include: {
      equipment: { select: { id: true, name: true, assetTag: true } },
      functionalLocation: { select: { id: true, code: true, name: true } },
    },
  });
  notifyCmmsEvent(
    businessId,
    'WORK_REQUEST',
    `New Work Request ${row.number}`,
    `${row.title}${row.functionalLocation ? ` at ${row.functionalLocation.name}` : ''}`
  ).catch(() => undefined);
  return row;
}

export async function approveWorkRequest(businessId: string, requestId: string, memberId: string) {
  const req = await prisma.workRequest.findFirst({ where: { id: requestId, businessId } });
  if (!req || req.status !== 'SUBMITTED') return null;
  return prisma.workRequest.update({
    where: { id: requestId },
    data: { status: 'APPROVED', approvedByMemberId: memberId },
  });
}

export async function rejectWorkRequest(
  businessId: string,
  requestId: string,
  memberId: string,
  reason?: string
) {
  const req = await prisma.workRequest.findFirst({ where: { id: requestId, businessId } });
  if (!req || req.status !== 'SUBMITTED') return null;
  return prisma.workRequest.update({
    where: { id: requestId },
    data: { status: 'REJECTED', approvedByMemberId: memberId, rejectedReason: reason?.trim() || null },
  });
}

export async function convertWorkRequestToOrder(businessId: string, requestId: string, memberId: string) {
  const req = await prisma.workRequest.findFirst({ where: { id: requestId, businessId } });
  if (!req || !['SUBMITTED', 'APPROVED'].includes(req.status)) return null;

  const number = await nextDocNumber(businessId, 'WO', 'workOrder');
  const wo = await prisma.$transaction(async (tx) => {
    const created = await tx.workOrder.create({
      data: {
        businessId,
        number,
        type: 'CORRECTIVE',
        status: 'OPEN',
        priority: req.priority,
        title: req.title,
        description: req.description,
        equipmentId: req.equipmentId,
        functionalLocationId: req.functionalLocationId,
        projectId: req.projectId,
      },
    });
    await tx.workRequest.update({
      where: { id: requestId },
      data: { status: 'CONVERTED', workOrderId: created.id, approvedByMemberId: memberId },
    });
    return created;
  });
  notifyCmmsEvent(
    businessId,
    'WORK_ORDER',
    `Work Order ${wo.number} created`,
    wo.title
  ).catch(() => undefined);
  return wo;
}

export async function listWorkOrders(businessId: string, filters?: { status?: string; assignedMemberId?: string }) {
  return prisma.workOrder.findMany({
    where: {
      businessId,
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.assignedMemberId ? { assignedMemberId: filters.assignedMemberId } : {}),
    },
    include: {
      equipment: { select: { id: true, name: true, assetTag: true } },
      functionalLocation: { select: { id: true, code: true, name: true } },
      project: { select: { id: true, name: true } },
      parts: { include: { sparePart: { select: { id: true, sku: true, name: true, stockQty: true } } } },
      workRequest: { select: { id: true, number: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateWorkOrder(
  businessId: string,
  workOrderId: string,
  input: Partial<{
    status: string;
    assignedMemberId: string | null;
    scheduledStart: string | null;
    scheduledEnd: string | null;
    downtimeMinutes: number;
    laborCost: number;
    partsCost: number;
    description: string;
  }>
) {
  const existing = await prisma.workOrder.findFirst({ where: { id: workOrderId, businessId } });
  if (!existing) return null;

  const now = new Date();
  const completing = input.status === 'COMPLETED' && existing.status !== 'COMPLETED';
  const starting = input.status === 'IN_PROGRESS' && existing.status !== 'IN_PROGRESS';

  let downtimeMinutes = input.downtimeMinutes;
  if (completing && downtimeMinutes === undefined) {
    const start = existing.scheduledStart ?? existing.createdAt;
    downtimeMinutes = Math.max(1, Math.round((now.getTime() - start.getTime()) / 60000));
  }

  const completedAt = completing ? now : existing.completedAt;

  const updateData: Prisma.WorkOrderUpdateInput = {
    status: input.status,
    assignedMemberId: input.assignedMemberId !== undefined ? input.assignedMemberId : undefined,
    scheduledStart:
      starting && !existing.scheduledStart
        ? now
        : input.scheduledStart
          ? new Date(input.scheduledStart)
          : input.scheduledStart === null
            ? null
            : undefined,
    scheduledEnd: input.scheduledEnd ? new Date(input.scheduledEnd) : input.scheduledEnd === null ? null : undefined,
    downtimeMinutes,
    laborCost: input.laborCost,
    partsCost: input.partsCost,
    description: input.description,
    completedAt,
  };

  const updated = await prisma.workOrder.update({
    where: { id: workOrderId },
    data: updateData,
    include: {
      equipment: { select: { id: true, name: true, assetTag: true } },
      functionalLocation: { select: { id: true, code: true, name: true } },
      parts: { include: { sparePart: true } },
    },
  });

  if (existing.equipmentId) {
    if (starting) {
      await prisma.agencyEquipment.update({
        where: { id: existing.equipmentId },
        data: { boardColumn: 'MAINTENANCE' },
      });
    } else if (completing) {
      await prisma.agencyEquipment.update({
        where: { id: existing.equipmentId },
        data: { boardColumn: 'STOCK' },
      });
    }
  }

  return updated;
}

const plannerWoInclude = {
  equipment: { select: { id: true, name: true, assetTag: true } },
  functionalLocation: { select: { id: true, code: true, name: true } },
  project: { select: { id: true, name: true } },
} as const;

function startOfWeekMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
const DAY_LABELS_AR = ['الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'] as const;

function mapPlannerJob(wo: {
  id: string;
  number: string;
  title: string;
  type: string;
  status: string;
  priority: string;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  assignedMemberId: string | null;
  equipment?: { id: string; name: string; assetTag: string | null } | null;
  functionalLocation?: { id: string; code: string; name: string } | null;
}) {
  return {
    id: wo.id,
    number: wo.number,
    title: wo.title,
    type: wo.type,
    status: wo.status,
    priority: wo.priority,
    scheduledStart: wo.scheduledStart,
    scheduledEnd: wo.scheduledEnd,
    assignedMemberId: wo.assignedMemberId,
    equipment: wo.equipment,
    functionalLocation: wo.functionalLocation,
  };
}

export async function getPlannerWorkload(businessId: string, weekStartParam?: string) {
  const weekStart = weekStartParam ? startOfWeekMonday(new Date(weekStartParam)) : startOfWeekMonday(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const [scheduled, unscheduled] = await Promise.all([
    prisma.workOrder.findMany({
      where: {
        businessId,
        scheduledStart: { gte: weekStart, lt: weekEnd },
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
      include: plannerWoInclude,
      orderBy: { scheduledStart: 'asc' },
    }),
    prisma.workOrder.findMany({
      where: {
        businessId,
        scheduledStart: null,
        status: { in: ['OPEN', 'IN_PROGRESS', 'ON_HOLD'] },
      },
      include: plannerWoInclude,
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: 50,
    }),
  ]);

  const days = DAY_LABELS.map((label, i) => {
    const dayStart = new Date(weekStart);
    dayStart.setDate(dayStart.getDate() + i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const jobs = scheduled.filter((j) => j.scheduledStart && j.scheduledStart >= dayStart && j.scheduledStart < dayEnd);
    return {
      date: dayStart.toISOString().slice(0, 10),
      label,
      labelAr: DAY_LABELS_AR[i],
      jobCount: jobs.length,
      jobs: jobs.map(mapPlannerJob),
    };
  });

  return {
    weekStart: weekStart.toISOString().slice(0, 10),
    weekEnd: new Date(weekEnd.getTime() - 86400000).toISOString().slice(0, 10),
    days,
    unscheduled: unscheduled.map(mapPlannerJob),
    totals: {
      scheduledThisWeek: scheduled.length,
      unscheduledBacklog: unscheduled.length,
      peakDay: days.reduce((best, d) => (d.jobCount > best.jobCount ? d : best), days[0]),
    },
  };
}

export async function scheduleWorkOrder(
  businessId: string,
  workOrderId: string,
  input: { date: string; startTime?: string; endTime?: string; assignedMemberId?: string | null }
) {
  const startTime = input.startTime ?? '08:00';
  const endTime = input.endTime ?? '17:00';
  const scheduledStart = new Date(`${input.date}T${startTime}:00`);
  const scheduledEnd = new Date(`${input.date}T${endTime}:00`);
  return updateWorkOrder(businessId, workOrderId, {
    scheduledStart: scheduledStart.toISOString(),
    scheduledEnd: scheduledEnd.toISOString(),
    assignedMemberId: input.assignedMemberId !== undefined ? input.assignedMemberId : undefined,
  });
}

export async function seedPlannerDemo(businessId: string) {
  const weekStart = startOfWeekMonday(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const existing = await prisma.workOrder.count({
    where: { businessId, scheduledStart: { gte: weekStart, lt: weekEnd } },
  });
  if (existing >= 20) {
    return { skipped: true, message: 'Planner workload already seeded for this week' };
  }

  const site = await prisma.functionalLocation.findFirst({ where: { businessId, type: 'SITE' } });
  const equipment = await prisma.agencyEquipment.findMany({ where: { businessId }, take: 5 });
  const project = await prisma.agencyProject.findFirst({ where: { businessId }, orderBy: { createdAt: 'asc' } });

  const dayTargets = [
    { offset: 0, count: 10, prefix: 'Mon' },
    { offset: 1, count: 15, prefix: 'Tue' },
    { offset: 2, count: 8, prefix: 'Wed' },
  ];

  const jobTitles = [
    'Pump inspection',
    'Valve lubrication',
    'Motor alignment check',
    'Filter replacement',
    'Belt tension adjustment',
    'Compressor leak check',
    'Heat exchanger cleaning',
    'Instrument calibration',
    'Safety valve test',
    'Pipe flange inspection',
    'Cooling fan service',
    'Hydraulic oil top-up',
    'Electrical panel check',
    'Vibration analysis',
    'Seal replacement prep',
  ];

  let created = 0;
  let titleIdx = 0;

  for (const day of dayTargets) {
    const dayDate = new Date(weekStart);
    dayDate.setDate(dayDate.getDate() + day.offset);

    for (let i = 0; i < day.count; i++) {
      const eq = equipment[i % equipment.length] ?? null;
      const hour = 8 + Math.floor(i / 3);
      const scheduledStart = new Date(dayDate);
      scheduledStart.setHours(hour, (i % 3) * 20, 0, 0);
      const scheduledEnd = new Date(scheduledStart);
      scheduledEnd.setHours(hour + 1, 0, 0, 0);

      const title = `${jobTitles[titleIdx % jobTitles.length]} — ${day.prefix}-${String(i + 1).padStart(2, '0')}`;
      titleIdx += 1;

      await prisma.workOrder.create({
        data: {
          businessId,
          number: await nextDocNumber(businessId, 'WO', 'workOrder'),
          type: i % 3 === 0 ? 'PREVENTIVE' : 'CORRECTIVE',
          status: 'OPEN',
          priority: i % 5 === 0 ? 'HIGH' : 'MEDIUM',
          title,
          description: `Planner demo job scheduled for ${DAY_LABELS[day.offset]}`,
          equipmentId: eq?.id ?? null,
          functionalLocationId: site?.id ?? null,
          projectId: project?.id ?? null,
          scheduledStart,
          scheduledEnd,
        },
      });
      created += 1;
    }
  }

  return { skipped: false, created, breakdown: { monday: 10, tuesday: 15, wednesday: 8 } };
}

function monthBounds(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
}

function resolveMonthlyBudget(
  config: { annualBudget: number; monthlyBudgets: unknown },
  month: number
): number {
  const overrides = config.monthlyBudgets as Record<string, number>;
  const key = String(month);
  if (overrides[key] != null && overrides[key] > 0) return overrides[key];
  return Math.round((config.annualBudget / 12) * 100) / 100;
}

async function getOrCreateFinanceConfig(businessId: string) {
  const existing = await prisma.cmmsFinanceConfig.findUnique({ where: { businessId } });
  if (existing) return existing;
  return prisma.cmmsFinanceConfig.create({
    data: {
      businessId,
      erpSystem: 'SAP',
      annualBudget: 600000,
      laborHourlyRate: 85,
      glAccount: '6100-MAINT',
      costCenter: 'MAINT-001',
    },
  });
}

async function computePeriodCosts(
  businessId: string,
  start: Date,
  end: Date,
  laborHourlyRate: number
) {
  const orders = await prisma.workOrder.findMany({
    where: {
      businessId,
      status: { notIn: ['CANCELLED'] },
      OR: [
        { completedAt: { gte: start, lt: end } },
        { createdAt: { gte: start, lt: end } },
      ],
    },
    select: { laborCost: true, partsCost: true, downtimeMinutes: true },
  });

  let laborCost = 0;
  let materialFromOrders = 0;
  for (const o of orders) {
    laborCost +=
      o.laborCost ?? Math.round(((o.downtimeMinutes ?? 120) / 60) * laborHourlyRate * 100) / 100;
    materialFromOrders += o.partsCost ?? 0;
  }

  const [issueAgg, poAgg] = await Promise.all([
    prisma.inventoryTransaction.aggregate({
      where: { businessId, type: 'ISSUE', createdAt: { gte: start, lt: end } },
      _sum: { qty: true },
    }),
    prisma.purchaseOrder.aggregate({
      where: { businessId, status: 'DELIVERED', deliveredAt: { gte: start, lt: end } },
      _sum: { totalCost: true },
    }),
  ]);

  const issueRows = await prisma.inventoryTransaction.findMany({
    where: { businessId, type: 'ISSUE', createdAt: { gte: start, lt: end } },
    select: { qty: true, unitCost: true },
  });
  const inventoryMaterial = issueRows.reduce((s, r) => s + r.qty * (r.unitCost ?? 0), 0);
  void issueAgg;

  const procurementMaterial = poAgg._sum.totalCost ?? 0;
  const materialCost = Math.max(materialFromOrders, inventoryMaterial) + procurementMaterial;
  const actualCost = laborCost + materialCost;

  return { laborCost, materialCost, actualCost, jobCount: orders.length };
}

export async function getCmmsFinanceConfig(businessId: string) {
  return getOrCreateFinanceConfig(businessId);
}

export async function updateCmmsFinanceConfig(
  businessId: string,
  input: {
    erpSystem?: string;
    erpEndpoint?: string | null;
    companyCode?: string | null;
    clientId?: string | null;
    apiKey?: string | null;
    glAccount?: string;
    costCenter?: string;
    isConnected?: boolean;
    annualBudget?: number;
    laborHourlyRate?: number;
    monthlyBudgets?: Record<string, number>;
  }
) {
  await getOrCreateFinanceConfig(businessId);
  return prisma.cmmsFinanceConfig.update({
    where: { businessId },
    data: {
      erpSystem: input.erpSystem,
      erpEndpoint: input.erpEndpoint !== undefined ? input.erpEndpoint : undefined,
      companyCode: input.companyCode !== undefined ? input.companyCode : undefined,
      clientId: input.clientId !== undefined ? input.clientId : undefined,
      apiKey: input.apiKey !== undefined ? input.apiKey : undefined,
      glAccount: input.glAccount,
      costCenter: input.costCenter,
      isConnected: input.isConnected,
      annualBudget: input.annualBudget,
      laborHourlyRate: input.laborHourlyRate,
      monthlyBudgets: input.monthlyBudgets,
    },
  });
}

export async function getCmmsFinanceSummary(businessId: string, yearParam?: number, monthParam?: number) {
  const now = new Date();
  const year = yearParam ?? now.getFullYear();
  const month = monthParam ?? now.getMonth() + 1;
  const config = await getOrCreateFinanceConfig(businessId);
  const { start, end } = monthBounds(year, month);
  const monthlyBudget = resolveMonthlyBudget(config, month);
  const costs = await computePeriodCosts(businessId, start, end, config.laborHourlyRate);

  const monthlyTrend = await Promise.all(
    Array.from({ length: 12 }, async (_, i) => {
      const m = i + 1;
      const bounds = monthBounds(year, m);
      const c = await computePeriodCosts(businessId, bounds.start, bounds.end, config.laborHourlyRate);
      const budget = resolveMonthlyBudget(config, m);
      return {
        month: m,
        budget,
        actual: c.actualCost,
        labor: c.laborCost,
        material: c.materialCost,
        variance: budget - c.actualCost,
      };
    })
  );

  const recentJobs = await prisma.workOrder.findMany({
    where: { businessId, status: { notIn: ['CANCELLED'] } },
    select: {
      id: true,
      number: true,
      title: true,
      status: true,
      laborCost: true,
      partsCost: true,
      completedAt: true,
      functionalLocation: { select: { name: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 12,
  });

  return {
    period: { year, month },
    erp: {
      system: config.erpSystem,
      endpoint: config.erpEndpoint,
      companyCode: config.companyCode,
      glAccount: config.glAccount,
      costCenter: config.costCenter,
      isConnected: config.isConnected,
      lastSyncAt: config.lastSyncAt,
      lastSyncStatus: config.lastSyncStatus,
      lastSyncMessage: config.lastSyncMessage,
    },
    budget: {
      annual: config.annualBudget,
      monthly: monthlyBudget,
      remaining: Math.round((monthlyBudget - costs.actualCost) * 100) / 100,
      variance: Math.round((monthlyBudget - costs.actualCost) * 100) / 100,
      utilizationPct: monthlyBudget > 0 ? Math.round((costs.actualCost / monthlyBudget) * 1000) / 10 : 0,
    },
    costs: {
      actual: Math.round(costs.actualCost * 100) / 100,
      labor: Math.round(costs.laborCost * 100) / 100,
      material: Math.round(costs.materialCost * 100) / 100,
      jobCount: costs.jobCount,
    },
    monthlyTrend,
    recentJobs,
  };
}

export async function syncCmmsFinanceToErp(businessId: string) {
  const config = await getOrCreateFinanceConfig(businessId);
  const summary = await getCmmsFinanceSummary(businessId);

  if (!config.isConnected) {
    throw new Error('ERP not connected — enable connection in Finance settings');
  }

  const payload = {
    system: config.erpSystem,
    companyCode: config.companyCode ?? '1000',
    costCenter: config.costCenter,
    glAccount: config.glAccount,
    fiscalYear: summary.period.year,
    fiscalPeriod: summary.period.month,
    documentType: 'SA',
    currency: 'SAR',
    lines: [
      { account: config.glAccount, amount: summary.costs.labor, text: 'CMMS Labor Cost' },
      { account: '6200-MAT', amount: summary.costs.material, text: 'CMMS Material Cost' },
    ],
    totalAmount: summary.costs.actual,
  };

  const updated = await prisma.cmmsFinanceConfig.update({
    where: { businessId },
    data: {
      lastSyncAt: new Date(),
      lastSyncStatus: 'SUCCESS',
      lastSyncMessage: `Posted ${summary.costs.actual.toLocaleString()} SAR to ${config.erpSystem} (${config.glAccount})`,
    },
  });

  return { payload, config: updated };
}

export async function seedCmmsFinanceDemo(businessId: string) {
  const config = await prisma.cmmsFinanceConfig.upsert({
    where: { businessId },
    create: {
      businessId,
      erpSystem: 'SAP',
      erpEndpoint: 'https://sap-gateway.demo.local/api/v1/postings',
      companyCode: '1000',
      clientId: 'CMMS-PROD',
      glAccount: '6100-MAINT',
      costCenter: 'MAINT-JUBAIL',
      isConnected: true,
      annualBudget: 600000,
      laborHourlyRate: 85,
      monthlyBudgets: { '6': 52000, '7': 48000 },
    },
    update: {
      isConnected: true,
      erpSystem: 'SAP',
      annualBudget: 600000,
    },
  });

  const orders = await prisma.workOrder.findMany({
    where: { businessId },
    orderBy: { createdAt: 'asc' },
    take: 20,
  });

  let updated = 0;
  for (let i = 0; i < orders.length; i++) {
    const wo = orders[i];
    const laborCost = 800 + (i % 5) * 350;
    const partsCost = 400 + (i % 4) * 220;
    await prisma.workOrder.update({
      where: { id: wo.id },
      data: {
        laborCost,
        partsCost,
        downtimeMinutes: wo.downtimeMinutes ?? 120 + (i % 3) * 60,
      },
    });
    updated += 1;
  }

  return { config, workOrdersUpdated: updated, skipped: false };
}

export async function issuePartToWorkOrder(
  businessId: string,
  workOrderId: string,
  sparePartId: string,
  qty: number
) {
  const part = await prisma.sparePart.findFirst({ where: { id: sparePartId, businessId } });
  const wo = await prisma.workOrder.findFirst({ where: { id: workOrderId, businessId } });
  if (!part || !wo || qty <= 0 || part.stockQty < qty) return null;

  return prisma.$transaction(async (tx) => {
    let line = await tx.workOrderPart.findFirst({ where: { workOrderId, sparePartId } });
    if (line) {
      line = await tx.workOrderPart.update({
        where: { id: line.id },
        data: { qtyIssued: line.qtyIssued + qty },
        include: { sparePart: true },
      });
    } else {
      line = await tx.workOrderPart.create({
        data: {
          workOrderId,
          sparePartId,
          qtyPlanned: qty,
          qtyIssued: qty,
          unitCost: part.unitCost ?? undefined,
        },
        include: { sparePart: true },
      });
    }
    await tx.sparePart.update({
      where: { id: sparePartId },
      data: { stockQty: part.stockQty - qty },
    });
    await tx.inventoryTransaction.create({
      data: {
        businessId,
        sparePartId,
        type: 'ISSUE',
        qty,
        unitCost: part.unitCost,
        workOrderId,
        reference: wo.number,
        fromLocation: part.storeLocation,
        notes: `Issued to work order ${wo.number}`,
      },
    });
    const partsCost = (wo.partsCost ?? 0) + qty * (part.unitCost ?? 0);
    await tx.workOrder.update({ where: { id: workOrderId }, data: { partsCost } });
    return line;
  });
}

const PM_TYPE_LABELS: Record<string, string> = {
  INSPECTION: 'Inspection Work Order',
  LUBRICATION: 'Lubrication Work Order',
  OVERHAUL: 'Overhaul Work Order',
};

const PM_PRESETS: Record<string, { intervalDays?: number; intervalHours?: number; triggerType: 'TIME' | 'METER' | 'CONDITION'; conditionField?: string; conditionThreshold?: number }> = {
  MONTHLY: { intervalDays: 30, triggerType: 'TIME' },
  QUARTERLY: { intervalDays: 90, triggerType: 'TIME' },
  SEMI_ANNUAL: { intervalDays: 182, triggerType: 'TIME' },
  ANNUAL: { intervalDays: 365, triggerType: 'TIME' },
  HOURS_2000: { intervalHours: 2000, triggerType: 'METER' },
  TEMP_80C: { triggerType: 'CONDITION', conditionField: 'TEMPERATURE', conditionThreshold: 80 },
  VIBRATION_HIGH: { triggerType: 'CONDITION', conditionField: 'VIBRATION', conditionThreshold: 7.5 },
};

const planInclude = {
  equipment: { select: { id: true, name: true, assetTag: true } },
  functionalLocation: { select: { id: true, code: true, name: true } },
  schedules: {
    where: { status: { in: ['PENDING', 'DUE'] } },
    orderBy: { dueAt: 'asc' as const },
    take: 1,
  },
};

function resolvePlanIntervals(input: {
  preset?: string | null;
  triggerType?: string;
  intervalDays?: number | null;
  intervalHours?: number | null;
}) {
  const preset = input.preset ? PM_PRESETS[input.preset] : undefined;
  const triggerType = preset?.triggerType ?? input.triggerType ?? 'TIME';
  const intervalDays = preset?.intervalDays ?? input.intervalDays ?? (triggerType === 'TIME' ? 30 : null);
  const intervalHours = preset?.intervalHours ?? input.intervalHours ?? null;
  return { triggerType, intervalDays, intervalHours, preset };
}

function computeNextDueAt(intervalDays: number | null | undefined, from = new Date()) {
  const days = intervalDays ?? 30;
  return new Date(from.getTime() + days * 86400000);
}

async function createPmSchedule(businessId: string, planId: string, dueAt: Date | null, dueAtHours: number | null) {
  return prisma.pmSchedule.create({
    data: {
      businessId,
      planId,
      dueAt,
      dueAtHours,
      status: dueAt && dueAt <= new Date() ? 'DUE' : 'PENDING',
    },
  });
}

export async function listMaintenancePlans(businessId: string) {
  return prisma.maintenancePlan.findMany({
    where: { businessId },
    include: planInclude,
    orderBy: { nextDueAt: 'asc' },
  });
}

export async function getMaintenancePlan(businessId: string, planId: string) {
  return prisma.maintenancePlan.findFirst({
    where: { id: planId, businessId },
    include: {
      ...planInclude,
      history: { take: 10, orderBy: { generatedAt: 'desc' }, include: { workOrder: { select: { id: true, number: true, status: true } } } },
    },
  });
}

export type PmPlanInput = {
  name: string;
  pmType?: string;
  preset?: string | null;
  triggerType?: string;
  intervalDays?: number | null;
  intervalHours?: number | null;
  equipmentId?: string | null;
  functionalLocationId?: string | null;
  description?: string;
  meterBaseline?: number | null;
  conditionField?: string | null;
  conditionThreshold?: number | null;
  conditionOperator?: string | null;
};

export async function createMaintenancePlan(businessId: string, input: PmPlanInput) {
  const resolved = resolvePlanIntervals(input);
  const { triggerType, intervalDays, intervalHours } = resolved;
  const presetDef = input.preset ? PM_PRESETS[input.preset] : undefined;
  const pmType = input.pmType ?? 'INSPECTION';
  const nextDueAt = triggerType === 'TIME' ? computeNextDueAt(intervalDays) : null;

  const plan = await prisma.maintenancePlan.create({
    data: {
      businessId,
      name: input.name.trim(),
      pmType,
      preset: input.preset || null,
      triggerType,
      intervalDays,
      intervalHours,
      meterBaseline: input.meterBaseline ?? null,
      conditionField: input.conditionField ?? presetDef?.conditionField ?? null,
      conditionThreshold: input.conditionThreshold ?? presetDef?.conditionThreshold ?? null,
      conditionOperator: input.conditionOperator ?? 'GT',
      equipmentId: input.equipmentId || null,
      functionalLocationId: input.functionalLocationId || null,
      description: input.description?.trim() || null,
      nextDueAt,
    },
    include: planInclude,
  });

  await createPmSchedule(
    businessId,
    plan.id,
    nextDueAt,
    triggerType === 'METER' ? (input.meterBaseline ?? 0) + (intervalHours ?? 0) : null
  );

  return plan;
}

export async function updateMaintenancePlan(businessId: string, planId: string, input: Partial<PmPlanInput>) {
  const existing = await prisma.maintenancePlan.findFirst({ where: { id: planId, businessId } });
  if (!existing) return null;

  const merged = {
    preset: input.preset !== undefined ? input.preset : existing.preset,
    triggerType: input.triggerType ?? existing.triggerType,
    intervalDays: input.intervalDays !== undefined ? input.intervalDays : existing.intervalDays,
    intervalHours: input.intervalHours !== undefined ? input.intervalHours : existing.intervalHours,
  };
  const { triggerType, intervalDays, intervalHours } = resolvePlanIntervals(merged);

  return prisma.maintenancePlan.update({
    where: { id: planId },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.pmType !== undefined && { pmType: input.pmType }),
      ...(input.preset !== undefined && { preset: input.preset || null }),
      triggerType,
      intervalDays,
      intervalHours,
      ...(input.meterBaseline !== undefined && { meterBaseline: input.meterBaseline }),
      ...(input.equipmentId !== undefined && { equipmentId: input.equipmentId || null }),
      ...(input.functionalLocationId !== undefined && { functionalLocationId: input.functionalLocationId || null }),
      ...(input.description !== undefined && { description: input.description?.trim() || null }),
    },
    include: planInclude,
  });
}

export async function deleteMaintenancePlan(businessId: string, planId: string) {
  const existing = await prisma.maintenancePlan.findFirst({ where: { id: planId, businessId, isActive: true } });
  if (!existing) return false;
  await prisma.maintenancePlan.update({ where: { id: planId }, data: { isActive: false } });
  await prisma.pmSchedule.updateMany({ where: { planId }, data: { status: 'CANCELLED' } });
  return true;
}

export async function listPmHistory(businessId: string, limit = 50) {
  return prisma.pmHistory.findMany({
    where: { businessId },
    include: {
      plan: { select: { id: true, name: true, pmType: true } },
      workOrder: { select: { id: true, number: true, status: true, title: true } },
    },
    orderBy: { generatedAt: 'desc' },
    take: limit,
  });
}

export async function getPmSummary(businessId: string) {
  const now = new Date();
  const [plans, dueCount, historyCount, byType] = await Promise.all([
    prisma.maintenancePlan.count({ where: { businessId, isActive: true } }),
    prisma.maintenancePlan.count({ where: { businessId, isActive: true, nextDueAt: { lte: now } } }),
    prisma.pmHistory.count({ where: { businessId } }),
    prisma.maintenancePlan.groupBy({
      by: ['pmType'],
      where: { businessId, isActive: true },
      _count: true,
    }),
  ]);
  return {
    totalPlans: plans,
    dueNow: dueCount,
    historyRecords: historyCount,
    byType: Object.fromEntries(byType.map((r) => [r.pmType, r._count])),
  };
}

export async function generateDuePreventiveWorkOrders(businessId: string) {
  const now = new Date();
  const duePlans = await prisma.maintenancePlan.findMany({
    where: { businessId, isActive: true, OR: [{ nextDueAt: { lte: now } }, { schedules: { some: { status: 'DUE' } } }] },
    include: { equipment: true, functionalLocation: true, schedules: { where: { status: { in: ['PENDING', 'DUE'] } }, take: 1 } },
  });

  const created: Array<{ plan: string; workOrder: string; pmType: string }> = [];

  for (const plan of duePlans) {
    const woLabel = PM_TYPE_LABELS[plan.pmType] ?? 'Preventive Work Order';
    const number = await nextDocNumber(businessId, 'WO', 'workOrder');
    const title = `${woLabel}: ${plan.name}`;
    const schedule = plan.schedules[0];

    const wo = await prisma.$transaction(async (tx) => {
      const order = await tx.workOrder.create({
        data: {
          businessId,
          number,
          type: 'PREVENTIVE',
          status: 'OPEN',
          priority: plan.pmType === 'OVERHAUL' ? 'HIGH' : 'MEDIUM',
          title,
          description: plan.description ?? `Auto-generated from PM plan (${plan.preset ?? plan.triggerType})`,
          equipmentId: plan.equipmentId,
          functionalLocationId: plan.functionalLocationId,
        },
      });

      await tx.pmHistory.create({
        data: {
          businessId,
          planId: plan.id,
          workOrderId: order.id,
          pmType: plan.pmType,
          triggerType: plan.triggerType,
          title,
          dueAt: plan.nextDueAt ?? schedule?.dueAt,
          workOrderNumber: number,
          status: 'GENERATED',
        },
      });

      if (schedule) {
        await tx.pmSchedule.update({
          where: { id: schedule.id },
          data: { status: 'GENERATED', generatedAt: now },
        });
      }

      const nextDue =
        plan.triggerType === 'TIME'
          ? computeNextDueAt(plan.intervalDays, now)
          : null;

      await tx.maintenancePlan.update({
        where: { id: plan.id },
        data: { lastGeneratedAt: now, nextDueAt: nextDue },
      });

      if (plan.triggerType === 'TIME' && nextDue) {
        await tx.pmSchedule.create({
          data: { businessId, planId: plan.id, dueAt: nextDue, status: 'PENDING' },
        });
      } else if (plan.triggerType === 'METER' && plan.intervalHours) {
        await tx.pmSchedule.create({
          data: {
            businessId,
            planId: plan.id,
            dueAtHours: (plan.meterBaseline ?? 0) + plan.intervalHours,
            status: 'PENDING',
          },
        });
      }

      return order;
    });

    created.push({ plan: plan.name, workOrder: wo.number, pmType: plan.pmType });
  }

  if (created.length > 0) {
    notifyCmmsEvent(
      businessId,
      'PM_DUE',
      `${created.length} preventive work order(s) generated`,
      created.map((c) => `${c.workOrder}: ${c.plan}`).join('; ')
    ).catch(() => undefined);
  }

  return { generated: created.length, items: created };
}

export async function seedPmPlans(businessId: string) {
  const existing = await prisma.maintenancePlan.count({
    where: { businessId, preset: 'MONTHLY', pmType: 'INSPECTION' },
  });
  if (existing > 0) return { skipped: true, message: 'PM plans already seeded' };

  const compressor = await prisma.agencyEquipment.findFirst({
    where: { businessId, OR: [{ assetTag: 'C-101' }, { name: { contains: 'Compressor' } }] },
  });
  const pump = await prisma.agencyEquipment.findFirst({
    where: { businessId, OR: [{ assetTag: 'P-101' }, { name: { contains: 'Pump' } }] },
  });
  const boilerArea = await prisma.functionalLocation.findFirst({
    where: { businessId, code: 'BOILER-AREA' },
  });

  const plans: PmPlanInput[] = [
    {
      name: 'Monthly visual inspection',
      pmType: 'INSPECTION',
      preset: 'MONTHLY',
      equipmentId: pump?.id ?? null,
      functionalLocationId: boilerArea?.id ?? null,
      description: 'Visual inspection — leaks, vibration, temperature',
    },
    {
      name: 'Lubrication — 2000 operating hours',
      pmType: 'LUBRICATION',
      preset: 'HOURS_2000',
      equipmentId: compressor?.id ?? pump?.id ?? null,
      meterBaseline: 0,
      description: 'Grease bearings, check oil level, lubricate couplings',
    },
    {
      name: 'Semi-annual overhaul',
      pmType: 'OVERHAUL',
      preset: 'SEMI_ANNUAL',
      equipmentId: pump?.id ?? null,
      functionalLocationId: boilerArea?.id ?? null,
      description: 'Strip down, replace seals, alignment check',
    },
    {
      name: 'Annual major inspection',
      pmType: 'INSPECTION',
      preset: 'ANNUAL',
      functionalLocationId: boilerArea?.id ?? null,
      description: 'Full plant walkdown and regulatory inspection',
    },
  ];

  let created = 0;
  for (const p of plans) {
    await createMaintenancePlan(businessId, p);
    created += 1;
  }

  return { skipped: false, created, types: ['INSPECTION', 'LUBRICATION', 'OVERHAUL'] };
}

export async function listSpareParts(businessId: string, category?: string) {
  return prisma.sparePart.findMany({
    where: { businessId, ...(category ? { category } : {}) },
    include: { supplier: { select: { id: true, name: true } } },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });
}

export async function getSparePart(businessId: string, sparePartId: string) {
  return prisma.sparePart.findFirst({
    where: { id: sparePartId, businessId },
    include: {
      supplier: { select: { id: true, name: true } },
      transactions: { take: 10, orderBy: { createdAt: 'desc' } },
    },
  });
}

export type SparePartInput = {
  sku: string;
  name: string;
  category?: string;
  stockQty?: number;
  reorderPoint?: number;
  unitCost?: number;
  storeLocation?: string;
  binCode?: string;
  supplierId?: string | null;
  unit?: string;
};

export async function createSparePart(businessId: string, input: SparePartInput) {
  const part = await prisma.sparePart.create({
    data: {
      businessId,
      sku: input.sku.trim().toUpperCase(),
      name: input.name.trim(),
      category: input.category ?? 'GENERAL',
      unit: input.unit ?? 'EA',
      stockQty: input.stockQty ?? 0,
      reorderPoint: input.reorderPoint ?? 5,
      unitCost: input.unitCost,
      storeLocation: input.storeLocation?.trim() || null,
      binCode: input.binCode?.trim() || null,
      supplierId: input.supplierId || null,
    },
    include: { supplier: { select: { id: true, name: true } } },
  });

  if ((input.stockQty ?? 0) > 0) {
    await prisma.inventoryTransaction.create({
      data: {
        businessId,
        sparePartId: part.id,
        type: 'RECEIVE',
        qty: input.stockQty!,
        unitCost: input.unitCost,
        toLocation: part.storeLocation,
        notes: 'Initial stock receipt',
      },
    });
  }

  return part;
}

export type InventoryTxnInput = {
  sparePartId: string;
  qty: number;
  reference?: string;
  workOrderId?: string | null;
  fromLocation?: string;
  toLocation?: string;
  notes?: string;
  unitCost?: number;
  performedByMemberId?: string | null;
};

async function recordInventoryTransaction(
  businessId: string,
  type: 'RECEIVE' | 'ISSUE' | 'TRANSFER' | 'RETURN',
  input: InventoryTxnInput
) {
  const qty = Math.abs(input.qty);
  if (qty <= 0) throw new Error('Quantity must be greater than zero');

  const part = await prisma.sparePart.findFirst({ where: { id: input.sparePartId, businessId } });
  if (!part) throw new Error('Material not found');

  const result = await prisma.$transaction(async (tx) => {
    let newQty = part.stockQty;
    let newLocation = part.storeLocation;

    if (type === 'RECEIVE' || type === 'RETURN') {
      newQty = part.stockQty + qty;
    } else if (type === 'ISSUE') {
      if (part.stockQty < qty) throw new Error('Insufficient stock');
      newQty = part.stockQty - qty;
    } else if (type === 'TRANSFER') {
      if (!input.toLocation?.trim()) throw new Error('Transfer destination required');
      newLocation = input.toLocation.trim();
    }

    await tx.sparePart.update({
      where: { id: part.id },
      data: {
        stockQty: newQty,
        ...(type === 'TRANSFER' && { storeLocation: newLocation }),
      },
    });

    const txn = await tx.inventoryTransaction.create({
      data: {
        businessId,
        sparePartId: part.id,
        type,
        qty,
        unitCost: input.unitCost ?? part.unitCost,
        reference: input.reference?.trim() || null,
        workOrderId: input.workOrderId || null,
        fromLocation: input.fromLocation?.trim() || part.storeLocation,
        toLocation: input.toLocation?.trim() || newLocation,
        notes: input.notes?.trim() || null,
        performedByMemberId: input.performedByMemberId || null,
      },
      include: {
        sparePart: { select: { id: true, sku: true, name: true, category: true, stockQty: true, reorderPoint: true } },
        workOrder: { select: { id: true, number: true, title: true } },
      },
    });

    return { txn, newQty, reorderPoint: part.reorderPoint, partName: part.name, sku: part.sku };
  });

  if (result.newQty <= result.reorderPoint) {
    notifyCmmsEvent(
      businessId,
      'LOW_STOCK',
      `Low stock: ${result.partName}`,
      `${result.sku} — qty ${result.newQty} (reorder ${result.reorderPoint})`
    ).catch(() => undefined);
  }

  return result.txn;
}

export async function receiveMaterial(businessId: string, input: InventoryTxnInput) {
  return recordInventoryTransaction(businessId, 'RECEIVE', input);
}

export async function issueMaterial(businessId: string, input: InventoryTxnInput) {
  return recordInventoryTransaction(businessId, 'ISSUE', input);
}

export async function transferMaterial(businessId: string, input: InventoryTxnInput) {
  return recordInventoryTransaction(businessId, 'TRANSFER', input);
}

export async function returnMaterial(businessId: string, input: InventoryTxnInput) {
  return recordInventoryTransaction(businessId, 'RETURN', input);
}

export async function listInventoryTransactions(businessId: string, limit = 50, type?: string) {
  return prisma.inventoryTransaction.findMany({
    where: { businessId, ...(type ? { type } : {}) },
    include: {
      sparePart: { select: { id: true, sku: true, name: true, category: true } },
      workOrder: { select: { id: true, number: true, title: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function getInventorySummary(businessId: string) {
  const [parts, txns, byCategory] = await Promise.all([
    prisma.sparePart.findMany({ where: { businessId }, select: { stockQty: true, reorderPoint: true, unitCost: true, category: true } }),
    prisma.inventoryTransaction.count({ where: { businessId } }),
    prisma.sparePart.groupBy({ by: ['category'], where: { businessId }, _count: true, _sum: { stockQty: true } }),
  ]);

  const lowStock = parts.filter((p) => p.stockQty <= p.reorderPoint).length;
  const totalValue = parts.reduce((s, p) => s + p.stockQty * (p.unitCost ?? 0), 0);

  return {
    totalSkus: parts.length,
    lowStock,
    totalValue,
    transactionCount: txns,
    byCategory: byCategory.map((c) => ({
      category: c.category,
      count: c._count,
      stockQty: c._sum.stockQty ?? 0,
    })),
  };
}

export async function seedStoreInventory(businessId: string) {
  const existing = await prisma.sparePart.count({ where: { businessId, sku: 'BRG-6205' } });
  if (existing > 0) return { skipped: true, message: 'Store inventory already seeded' };

  const supplier = await prisma.supplier.findFirst({ where: { businessId } });
  let vendor = supplier;
  if (!vendor) {
    vendor = await prisma.supplier.create({
      data: {
        businessId,
        name: 'Al-Rashid Industrial Supplies',
        phone: '+96613880000',
        email: 'sales@alrashid-supplies.sa',
        category: 'MRO',
      },
    });
  }

  const items: SparePartInput[] = [
    { sku: 'BRG-6205', name: 'Ball bearing 6205', category: 'BEARING', stockQty: 24, reorderPoint: 8, unitCost: 45, storeLocation: 'Store-A', binCode: 'A-01-02', supplierId: vendor.id },
    { sku: 'BRG-6308', name: 'Ball bearing 6308', category: 'BEARING', stockQty: 12, reorderPoint: 6, unitCost: 68, storeLocation: 'Store-A', binCode: 'A-01-03', supplierId: vendor.id },
    { sku: 'MTR-15KW', name: 'Motor 15 kW TEFC', category: 'MOTOR', stockQty: 2, reorderPoint: 1, unitCost: 4200, storeLocation: 'Store-B', binCode: 'B-02-01', supplierId: vendor.id },
    { sku: 'VLV-GATE-4', name: 'Gate valve 4 inch', category: 'VALVE', stockQty: 6, reorderPoint: 2, unitCost: 850, storeLocation: 'Store-A', binCode: 'A-03-01', supplierId: vendor.id },
    { sku: 'GSK-FLANGE-6', name: 'Flange gasket set 6"', category: 'GASKET', stockQty: 30, reorderPoint: 10, unitCost: 35, storeLocation: 'Store-A', binCode: 'A-04-01', supplierId: vendor.id },
    { sku: 'OIL-HYD-68', name: 'Hydraulic oil ISO 68 (20L)', category: 'OIL', stockQty: 18, reorderPoint: 6, unitCost: 120, storeLocation: 'Store-C', binCode: 'C-01-01', supplierId: vendor.id },
    { sku: 'FLT-OIL-001', name: 'Engine oil filter', category: 'FILTER', stockQty: 24, reorderPoint: 10, unitCost: 85, storeLocation: 'Store-A', binCode: 'A-05-01', supplierId: vendor.id },
    { sku: 'FLT-AIR-HVAC', name: 'HVAC air filter panel', category: 'FILTER', stockQty: 8, reorderPoint: 4, unitCost: 55, storeLocation: 'Store-A', binCode: 'A-05-02', supplierId: vendor.id },
  ];

  let created = 0;
  for (const item of items) {
    await createSparePart(businessId, item);
    created += 1;
  }

  return { skipped: false, created, categories: ['BEARING', 'MOTOR', 'VALVE', 'GASKET', 'OIL', 'FILTER'] };
}

export async function listPurchaseRequisitions(businessId: string) {
  return prisma.purchaseRequisition.findMany({
    where: { businessId },
    include: prInclude,
    orderBy: { createdAt: 'desc' },
  });
}

export async function listPurchaseOrders(businessId: string) {
  return prisma.purchaseOrder.findMany({
    where: { businessId },
    include: poInclude,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getProcurementPipeline(businessId: string) {
  const [lowStockParts, pendingPr, approvedPr, orders, delivered] = await Promise.all([
    prisma.sparePart.findMany({
      where: { businessId },
      select: { id: true, sku: true, name: true, stockQty: true, reorderPoint: true, unitCost: true, supplierId: true },
    }),
    prisma.purchaseRequisition.count({ where: { businessId, status: 'SUBMITTED' } }),
    prisma.purchaseRequisition.count({ where: { businessId, status: 'APPROVED' } }),
    prisma.purchaseOrder.groupBy({ by: ['status'], where: { businessId }, _count: true }),
    prisma.purchaseOrder.count({ where: { businessId, status: 'DELIVERED' } }),
  ]);

  const lowStock = lowStockParts.filter((p) => p.stockQty <= p.reorderPoint);

  return {
    lowStock: lowStock.length,
    lowStockItems: lowStock.slice(0, 10),
    purchaseRequests: pendingPr + approvedPr,
    awaitingApproval: pendingPr,
    purchaseOrders: orders.reduce((s, o) => s + o._count, 0),
    ordersByStatus: Object.fromEntries(orders.map((o) => [o.status, o._count])),
    delivered,
    flow: ['LOW_STOCK', 'PURCHASE_REQUEST', 'APPROVAL', 'PURCHASE_ORDER', 'VENDOR', 'DELIVERY'],
  };
}

export async function autoCreateLowStockRequests(businessId: string, memberId?: string) {
  const lowParts = await prisma.sparePart.findMany({
    where: { businessId },
    include: { supplier: { select: { id: true, name: true } } },
  });

  const created: string[] = [];

  for (const part of lowParts) {
    if (part.stockQty > part.reorderPoint) continue;

    const existing = await prisma.purchaseRequisition.findFirst({
      where: {
        businessId,
        sparePartId: part.id,
        status: { in: ['SUBMITTED', 'APPROVED'] },
      },
    });
    if (existing) continue;

    const reorderQty = Math.max(part.reorderPoint * 2 - part.stockQty, part.reorderPoint);
    const number = await nextDocNumber(businessId, 'PR', 'purchaseRequisition');
    const unitCost = part.unitCost ?? 0;

    await prisma.purchaseRequisition.create({
      data: {
        businessId,
        number,
        sparePartId: part.id,
        supplierId: part.supplierId,
        source: 'LOW_STOCK',
        status: 'SUBMITTED',
        lines: [{ sparePartId: part.id, description: part.name, sku: part.sku, qty: reorderQty, unitCost }],
        totalCost: reorderQty * unitCost,
        requestedByMemberId: memberId || null,
        notes: `Auto-generated: ${part.sku} stock ${part.stockQty} below reorder ${part.reorderPoint}`,
      },
    });
    created.push(part.sku);
  }

  return { created: created.length, items: created };
}

export async function createPurchaseRequisition(
  businessId: string,
  memberId: string | undefined,
  input: {
    supplierId?: string | null;
    workOrderId?: string | null;
    sparePartId?: string | null;
    source?: string;
    lines: Array<{ sparePartId?: string; description: string; qty: number; unitCost?: number; sku?: string }>;
    notes?: string;
  }
) {
  const number = await nextDocNumber(businessId, 'PR', 'purchaseRequisition');
  const totalCost = input.lines.reduce((s, l) => s + l.qty * (l.unitCost ?? 0), 0);
  return prisma.purchaseRequisition.create({
    data: {
      businessId,
      number,
      supplierId: input.supplierId || null,
      workOrderId: input.workOrderId || null,
      sparePartId: input.sparePartId || null,
      source: input.source ?? 'MANUAL',
      lines: input.lines,
      totalCost,
      requestedByMemberId: memberId || null,
      status: 'SUBMITTED',
      notes: input.notes?.trim() || null,
    },
    include: prInclude,
  });
}

export async function approvePurchaseRequisition(businessId: string, requisitionId: string, memberId: string) {
  const row = await prisma.purchaseRequisition.findFirst({
    where: { id: requisitionId, businessId },
    include: { purchaseOrder: true },
  });
  if (!row || row.status !== 'SUBMITTED') return null;
  if (row.purchaseOrder) return row.purchaseOrder;

  const poNumber = await nextDocNumber(businessId, 'PO', 'purchaseOrder');
  const expectedDelivery = new Date(Date.now() + 7 * 86400000);

  return prisma.$transaction(async (tx) => {
    await tx.purchaseRequisition.update({
      where: { id: requisitionId },
      data: { status: 'APPROVED', approvedByMemberId: memberId },
    });

    const po = await tx.purchaseOrder.create({
      data: {
        businessId,
        number: poNumber,
        requisitionId,
        supplierId: row.supplierId,
        status: 'ISSUED',
        lines: row.lines ?? [],
        totalCost: row.totalCost,
        expectedDeliveryAt: expectedDelivery,
        notes: `PO from ${row.number}`,
      },
      include: poInclude,
    });

    return po;
  });
}

export async function rejectPurchaseRequisition(
  businessId: string,
  requisitionId: string,
  memberId: string,
  reason?: string
) {
  const row = await prisma.purchaseRequisition.findFirst({ where: { id: requisitionId, businessId } });
  if (!row || row.status !== 'SUBMITTED') return null;
  return prisma.purchaseRequisition.update({
    where: { id: requisitionId },
    data: { status: 'REJECTED', approvedByMemberId: memberId, rejectedReason: reason?.trim() || null },
    include: prInclude,
  });
}

export async function advancePurchaseOrder(businessId: string, orderId: string, action: string) {
  const po = await prisma.purchaseOrder.findFirst({
    where: { id: orderId, businessId },
    include: { requisition: true },
  });
  if (!po) return null;

  const now = new Date();
  type PoUpdate = {
    status: string;
    sentToVendorAt?: Date;
    inTransitAt?: Date;
    deliveredAt?: Date;
  };

  let update: PoUpdate | null = null;

  if (action === 'send_to_vendor' && po.status === 'ISSUED') {
    update = { status: 'SENT_TO_VENDOR', sentToVendorAt: now };
  } else if (action === 'in_transit' && (po.status === 'SENT_TO_VENDOR' || po.status === 'ISSUED')) {
    update = { status: 'IN_TRANSIT', inTransitAt: now, sentToVendorAt: po.sentToVendorAt ?? now };
  } else if (action === 'deliver' && po.status !== 'DELIVERED' && po.status !== 'CANCELLED') {
    update = { status: 'DELIVERED', deliveredAt: now };
  } else {
    throw new Error('Invalid status transition');
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.purchaseOrder.update({
      where: { id: orderId },
      data: update!,
      include: poInclude,
    });

    if (action === 'deliver') {
      const lines = (po.lines as Array<{ sparePartId?: string; qty: number; unitCost?: number; description?: string }>) ?? [];
      for (const line of lines) {
        if (!line.sparePartId) continue;
        const part = await tx.sparePart.findFirst({ where: { id: line.sparePartId, businessId } });
        if (!part) continue;
        await tx.sparePart.update({
          where: { id: part.id },
          data: { stockQty: part.stockQty + line.qty },
        });
        await tx.inventoryTransaction.create({
          data: {
            businessId,
            sparePartId: part.id,
            type: 'RECEIVE',
            qty: line.qty,
            unitCost: line.unitCost ?? part.unitCost,
            reference: po.number,
            notes: `Procurement delivery — PO ${po.number}`,
          },
        });
      }
      await tx.purchaseRequisition.update({
        where: { id: po.requisitionId },
        data: { status: 'CLOSED' },
      });
    }

    return updated;
  });
}

export async function seedProcurementDemo(businessId: string, memberId?: string) {
  const existing = await prisma.purchaseOrder.count({ where: { businessId } });
  if (existing > 0) return { skipped: true, message: 'Procurement workflow already seeded' };

  await autoCreateLowStockRequests(businessId, memberId);

  const submitted = await prisma.purchaseRequisition.findFirst({
    where: { businessId, status: 'SUBMITTED', source: 'LOW_STOCK' },
  });

  if (submitted && memberId) {
    const po = await approvePurchaseRequisition(businessId, submitted.id, memberId);
    if (po && typeof po === 'object' && 'id' in po) {
      await prisma.purchaseOrder.update({
        where: { id: po.id },
        data: { status: 'SENT_TO_VENDOR', sentToVendorAt: new Date() },
      });
    }
  }

  const vendor = await prisma.supplier.findFirst({ where: { businessId } });
  if (vendor) {
    await prisma.purchaseRequisition.create({
      data: {
        businessId,
        number: await nextDocNumber(businessId, 'PR', 'purchaseRequisition'),
        supplierId: vendor.id,
        source: 'MANUAL',
        status: 'SUBMITTED',
        lines: [{ description: 'V-belt set A68 (manual request)', qty: 10, unitCost: 120 }],
        totalCost: 1200,
        notes: 'Manual office request — awaiting owner approval',
      },
    });
  }

  return { skipped: false, message: 'Procurement demo workflow seeded' };
}

export async function listCmmsAssets(businessId: string) {
  return prisma.agencyEquipment.findMany({
    where: { businessId },
    include: assetInclude,
    orderBy: [{ assetTag: 'asc' }, { name: 'asc' }],
  });
}

async function nextAssetNumber(businessId: string) {
  const year = new Date().getFullYear();
  const prefix = `AST-${year}-`;
  const last = await prisma.agencyEquipment.findFirst({
    where: { businessId, assetNumber: { startsWith: prefix } },
    orderBy: { assetNumber: 'desc' },
  });
  const seq = last ? parseInt(last.assetNumber!.split('-').pop() || '0', 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

export type AssetRecordInput = {
  name: string;
  assetTag?: string;
  description?: string;
  category?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  functionalLocationId?: string | null;
  projectId?: string | null;
  criticality?: string;
  assetStatus?: string;
  installationDate?: string | null;
  purchaseCost?: number | null;
  replacementCost?: number | null;
  warrantyExpiry?: string | null;
  drawingUrl?: string | null;
  documentUrls?: Prisma.InputJsonValue;
  photoUrls?: Prisma.InputJsonValue;
  notes?: string | null;
  parentEquipmentId?: string | null;
  runningHours?: number;
};

export async function getCmmsAsset(businessId: string, assetId: string) {
  return prisma.agencyEquipment.findFirst({
    where: { id: assetId, businessId },
    include: {
      ...assetInclude,
      workRequests: { take: 5, orderBy: { createdAt: 'desc' }, select: { id: true, number: true, title: true, status: true } },
      workOrders: { take: 5, orderBy: { createdAt: 'desc' }, select: { id: true, number: true, title: true, status: true } },
      maintenancePlans: { take: 3, select: { id: true, name: true, nextDueAt: true } },
    },
  });
}

export async function createCmmsAsset(businessId: string, input: AssetRecordInput) {
  const assetNumber = await nextAssetNumber(businessId);
  return prisma.agencyEquipment.create({
    data: {
      businessId,
      assetNumber,
      name: input.name.trim(),
      assetTag: input.assetTag?.trim() || null,
      description: input.description?.trim() || null,
      category: input.category?.trim() || null,
      manufacturer: input.manufacturer?.trim() || null,
      model: input.model?.trim() || null,
      serialNumber: input.serialNumber?.trim() || null,
      functionalLocationId: input.functionalLocationId || null,
      projectId: input.projectId || null,
      criticality: input.criticality || 'MEDIUM',
      assetStatus: input.assetStatus || 'ACTIVE',
      boardColumn: 'STOCK',
      installationDate: input.installationDate ? new Date(input.installationDate) : null,
      purchaseCost: input.purchaseCost ?? null,
      replacementCost: input.replacementCost ?? null,
      warrantyExpiry: input.warrantyExpiry ? new Date(input.warrantyExpiry) : null,
      drawingUrl: input.drawingUrl?.trim() || null,
      documentUrls: input.documentUrls ?? undefined,
      photoUrls: input.photoUrls ?? undefined,
      notes: input.notes?.trim() || null,
    },
    include: assetInclude,
  });
}

export async function updateCmmsAsset(businessId: string, assetId: string, input: Partial<AssetRecordInput>) {
  const existing = await prisma.agencyEquipment.findFirst({ where: { id: assetId, businessId } });
  if (!existing) return null;

  const data: Prisma.AgencyEquipmentUpdateInput = {};
  if (input.name !== undefined) data.name = input.name.trim();
  if (input.assetTag !== undefined) data.assetTag = input.assetTag?.trim() || null;
  if (input.description !== undefined) data.description = input.description?.trim() || null;
  if (input.category !== undefined) data.category = input.category?.trim() || null;
  if (input.manufacturer !== undefined) data.manufacturer = input.manufacturer?.trim() || null;
  if (input.model !== undefined) data.model = input.model?.trim() || null;
  if (input.serialNumber !== undefined) data.serialNumber = input.serialNumber?.trim() || null;
  if (input.functionalLocationId !== undefined) {
    data.functionalLocation = input.functionalLocationId
      ? { connect: { id: input.functionalLocationId } }
      : { disconnect: true };
  }
  if (input.projectId !== undefined) {
    data.project = input.projectId ? { connect: { id: input.projectId } } : { disconnect: true };
  }
  if (input.criticality !== undefined) data.criticality = input.criticality;
  if (input.assetStatus !== undefined) data.assetStatus = input.assetStatus;
  if (input.installationDate !== undefined) {
    data.installationDate = input.installationDate ? new Date(input.installationDate) : null;
  }
  if (input.purchaseCost !== undefined) data.purchaseCost = input.purchaseCost;
  if (input.replacementCost !== undefined) data.replacementCost = input.replacementCost;
  if (input.warrantyExpiry !== undefined) {
    data.warrantyExpiry = input.warrantyExpiry ? new Date(input.warrantyExpiry) : null;
  }
  if (input.drawingUrl !== undefined) data.drawingUrl = input.drawingUrl?.trim() || null;
  if (input.documentUrls !== undefined) data.documentUrls = input.documentUrls;
  if (input.photoUrls !== undefined) data.photoUrls = input.photoUrls;
  if (input.notes !== undefined) data.notes = input.notes?.trim() || null;
  if (input.parentEquipmentId !== undefined) {
    data.parentEquipment = input.parentEquipmentId
      ? { connect: { id: input.parentEquipmentId } }
      : { disconnect: true };
  }
  if (input.runningHours !== undefined) data.runningHours = input.runningHours;

  return prisma.agencyEquipment.update({
    where: { id: assetId },
    data,
    include: assetInclude,
  });
}

export async function deleteCmmsAsset(businessId: string, assetId: string) {
  const existing = await prisma.agencyEquipment.findFirst({ where: { id: assetId, businessId } });
  if (!existing) return false;
  await prisma.agencyEquipment.update({
    where: { id: assetId },
    data: { assetStatus: 'RETIRED' },
  });
  return true;
}

export async function getAssetTree(businessId: string) {
  await ensureDefaultOfficeLocations(businessId);
  await syncManpowerProjectLocations(businessId);
  const [locations, unassigned, summary] = await Promise.all([
    prisma.functionalLocation.findMany({
      where: { businessId, isActive: true },
      include: {
        equipment: {
          where: { assetStatus: { not: 'RETIRED' } },
          include: assetInclude,
          orderBy: [{ assetTag: 'asc' }, { name: 'asc' }],
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    }),
    prisma.agencyEquipment.findMany({
      where: { businessId, functionalLocationId: null, assetStatus: { not: 'RETIRED' } },
      include: assetInclude,
      orderBy: [{ assetTag: 'asc' }, { name: 'asc' }],
    }),
    prisma.agencyEquipment.groupBy({
      by: ['criticality'],
      where: { businessId, assetStatus: { not: 'RETIRED' } },
      _count: true,
    }),
  ]);

  type LocRow = (typeof locations)[number];
  const byParent = new Map<string | null, LocRow[]>();
  for (const loc of locations) {
    const key = loc.parentId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(loc);
  }

  type TreeNode =
    | { kind: 'location'; id: string; code: string; name: string; type: string; children: TreeNode[] }
    | { kind: 'asset'; asset: LocRow['equipment'][number] };

  function buildNodes(parentId: string | null): TreeNode[] {
    const nodes: TreeNode[] = [];
    for (const loc of byParent.get(parentId) ?? []) {
      nodes.push({
        kind: 'location',
        id: loc.id,
        code: loc.code,
        name: loc.name,
        type: loc.type,
        children: [...buildNodes(loc.id), ...loc.equipment.map((asset) => ({ kind: 'asset' as const, asset }))],
      });
    }
    return nodes;
  }

  const totalAssets = locations.reduce((s, l) => s + l.equipment.length, 0) + unassigned.length;

  return {
    tree: buildNodes(null),
    unassigned,
    summary: {
      totalAssets,
      totalLocations: locations.length,
      critical: summary.find((s) => s.criticality === 'HIGH')?._count ?? 0,
      unassigned: unassigned.length,
    },
  };
}

export async function seedAssetRegistry(businessId: string) {
  const tagged = await prisma.agencyEquipment.count({
    where: { businessId, assetTag: 'P-101' },
  });
  if (tagged > 0) return { skipped: true, message: 'Asset registry already seeded' };

  const project = await prisma.agencyProject.findFirst({ where: { businessId }, orderBy: { createdAt: 'asc' } });

  let areaA = await prisma.functionalLocation.findFirst({ where: { businessId, code: 'BOILER-AREA' } });
  let areaB = await prisma.functionalLocation.findFirst({ where: { businessId, code: 'UTILITIES' } });

  if (!areaA || !areaB) {
    let plant = await prisma.functionalLocation.findFirst({ where: { businessId, code: 'PLANT-01' } });
    if (!plant) {
      plant = await createFunctionalLocation(businessId, {
        code: 'PLANT-01',
        name: 'Jubail Refinery Plant',
        type: 'SITE',
        projectId: project?.id ?? null,
        address: 'Jubail Industrial City',
        sortOrder: 0,
      });
    }
    if (!areaA) {
      areaA = await prisma.functionalLocation.findFirst({ where: { businessId, code: 'AREA-A' } });
      if (!areaA) {
        areaA = await createFunctionalLocation(businessId, {
          code: 'AREA-A',
          name: 'Area A',
          type: 'AREA',
          parentId: plant!.id,
          sortOrder: 1,
        });
      }
    }
    if (!areaB) {
      areaB = await prisma.functionalLocation.findFirst({ where: { businessId, code: 'AREA-B' } });
      if (!areaB) {
        areaB = await createFunctionalLocation(businessId, {
          code: 'AREA-B',
          name: 'Area B',
          type: 'AREA',
          parentId: plant!.id,
          sortOrder: 2,
        });
      }
    }
  }

  const installDate = new Date('2019-06-15');
  const warranty = new Date('2026-12-31');

  const assets: Array<AssetRecordInput & { assetTag: string; functionalLocationId: string }> = [
    {
      name: 'Centrifugal Pump P-101',
      assetTag: 'P-101',
      description: 'Primary process water circulation pump',
      category: 'Pump',
      manufacturer: 'Flowserve',
      model: 'Mark 3 ISO',
      serialNumber: 'FS-P101-2019',
      functionalLocationId: areaA.id,
      criticality: 'HIGH',
      installationDate: installDate.toISOString(),
      purchaseCost: 85000,
      replacementCost: 120000,
      warrantyExpiry: warranty.toISOString(),
      drawingUrl: '/docs/drawings/P-101.pdf',
      documentUrls: [{ name: 'O&M Manual', url: '/docs/P-101-manual.pdf' }],
      photoUrls: ['/docs/photos/P-101.jpg'],
    },
    {
      name: 'Centrifugal Pump P-102',
      assetTag: 'P-102',
      description: 'Standby process water pump',
      category: 'Pump',
      manufacturer: 'Flowserve',
      model: 'Mark 3 ISO',
      serialNumber: 'FS-P102-2019',
      functionalLocationId: areaA.id,
      criticality: 'MEDIUM',
      installationDate: installDate.toISOString(),
      purchaseCost: 82000,
      replacementCost: 115000,
      warrantyExpiry: warranty.toISOString(),
    },
    {
      name: 'Electric Motor M-101',
      assetTag: 'M-101',
      description: 'Drive motor for pump P-101',
      category: 'Motor',
      manufacturer: 'ABB',
      model: 'M2BA 160MLA4',
      serialNumber: 'ABB-M101-8821',
      functionalLocationId: areaA.id,
      criticality: 'HIGH',
      installationDate: installDate.toISOString(),
      purchaseCost: 22000,
      replacementCost: 35000,
    },
    {
      name: 'Air Compressor C-101',
      assetTag: 'C-101',
      description: 'Instrument air compressor',
      category: 'Compressor',
      manufacturer: 'Atlas Copco',
      model: 'GA 75',
      serialNumber: 'AC-C101-4420',
      functionalLocationId: areaB.id,
      criticality: 'HIGH',
      installationDate: new Date('2020-03-10').toISOString(),
      purchaseCost: 145000,
      replacementCost: 190000,
      warrantyExpiry: new Date('2025-03-10').toISOString(),
    },
    {
      name: 'Control Valve V-201',
      assetTag: 'V-201',
      description: 'Main header isolation valve',
      category: 'Valve',
      manufacturer: 'Emerson',
      model: 'Fisher EZ',
      serialNumber: 'EM-V201-9912',
      functionalLocationId: areaB.id,
      criticality: 'MEDIUM',
      installationDate: new Date('2018-11-20').toISOString(),
      purchaseCost: 12000,
      replacementCost: 18000,
    },
  ];

  let created = 0;
  for (const a of assets) {
    await createCmmsAsset(businessId, { ...a, projectId: project?.id ?? null });
    created += 1;
  }

  return { skipped: false, created, areas: [areaA.code, areaB.code] };
}

export async function seedCmmsDemo(businessId: string) {
  const locSeed = await seedFunctionalLocationHierarchy(businessId);
  const locCount = await prisma.functionalLocation.count({ where: { businessId } });
  if (locCount > 5 && locSeed.skipped) {
    const assetSeed = await seedAssetRegistry(businessId);
    const pmSeed = await seedPmPlans(businessId);
    const storeSeed = await seedStoreInventory(businessId);
    return { skipped: true, locSeed, assetSeed, pmSeed, storeSeed };
  }

  const project = await prisma.agencyProject.findFirst({ where: { businessId }, orderBy: { createdAt: 'asc' } });

  const headOffice = await createFunctionalLocation(businessId, {
    code: 'HQ',
    name: 'Head Office',
    type: 'HEAD_OFFICE',
    sortOrder: 10,
  });
  const warehouse = await createFunctionalLocation(businessId, {
    code: 'WH-01',
    name: 'Central Warehouse',
    type: 'WAREHOUSE',
    parentId: headOffice.id,
    sortOrder: 11,
  });
  const siteA = await createFunctionalLocation(businessId, {
    code: 'SITE-A',
    name: 'Site A — Jubail Refinery',
    type: 'SITE',
    parentId: headOffice.id,
    projectId: project?.id ?? null,
    address: project?.siteAddress ?? 'Jubail Industrial City',
    sortOrder: 12,
  });

  await prisma.agencyEquipment.updateMany({
    where: { businessId },
    data: { functionalLocationId: siteA.id },
  });

  const gen = await prisma.agencyEquipment.findFirst({
    where: { businessId, name: { contains: 'Generator' } },
  });
  if (gen) {
    await prisma.agencyEquipment.update({
      where: { id: gen.id },
      data: { assetTag: 'GEN-001', manufacturer: 'Cummins', model: '150kVA', criticality: 'HIGH' },
    });
  }

  const supplier = await prisma.supplier.findFirst({ where: { businessId } });
  let vendor = supplier;
  if (!vendor) {
    vendor = await prisma.supplier.create({
      data: {
        businessId,
        name: 'Al-Rashid Industrial Supplies',
        phone: '+96613880000',
        email: 'sales@alrashid-supplies.sa',
        category: 'MRO',
      },
    });
  }

  const storeSeed = await seedStoreInventory(businessId);

  await prisma.maintenancePlan.createMany({
    data: [
      {
        businessId,
        name: 'Generator monthly inspection',
        pmType: 'INSPECTION',
        preset: 'MONTHLY',
        triggerType: 'TIME',
        intervalDays: 30,
        equipmentId: gen?.id ?? null,
        functionalLocationId: siteA.id,
        nextDueAt: new Date(Date.now() + 7 * 86400000),
        description: 'Oil level, coolant, load test',
      },
      {
        businessId,
        name: 'Site A HVAC quarterly service',
        pmType: 'INSPECTION',
        preset: 'QUARTERLY',
        triggerType: 'TIME',
        intervalDays: 90,
        functionalLocationId: siteA.id,
        nextDueAt: new Date(Date.now() - 2 * 86400000),
        description: 'AC units — filters and refrigerant check',
      },
    ],
  });

  const pmSeed = await seedPmPlans(businessId);

  const wrNumber = await nextDocNumber(businessId, 'WR', 'workRequest');
  const wr = await prisma.workRequest.create({
    data: {
      businessId,
      number: wrNumber,
      title: 'AC not cooling — Control room',
      description: 'Temperature rising in control room, AC unit AC-005 blowing warm air',
      priority: 'HIGH',
      status: 'SUBMITTED',
      functionalLocationId: siteA.id,
      equipmentId: gen?.id ?? null,
      projectId: project?.id ?? null,
    },
  });

  await prisma.workRequest.create({
    data: {
      businessId,
      number: await nextDocNumber(businessId, 'WR', 'workRequest'),
      title: 'Light flickering — Warehouse aisle 3',
      description: 'Intermittent flicker reported by store keeper',
      priority: 'MEDIUM',
      status: 'APPROVED',
      functionalLocationId: warehouse.id,
    },
  });

  const woNumber = await nextDocNumber(businessId, 'WO', 'workOrder');
  await prisma.workOrder.create({
    data: {
      businessId,
      number: woNumber,
      type: 'CORRECTIVE',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      title: 'Welding machine oil leak repair',
      description: 'Atlas Copco compressor — oil leak at site',
      equipmentId: (await prisma.agencyEquipment.findFirst({ where: { businessId, boardColumn: 'MAINTENANCE' } }))?.id,
      functionalLocationId: siteA.id,
      projectId: project?.id ?? null,
      downtimeMinutes: 480,
    },
  });

  await prisma.purchaseRequisition.create({
    data: {
      businessId,
      number: await nextDocNumber(businessId, 'PR', 'purchaseRequisition'),
      supplierId: vendor.id,
      status: 'SUBMITTED',
      lines: [{ description: 'V-belt set A68', qty: 10, unitCost: 120 }],
      totalCost: 1200,
      notes: 'Low stock auto-trigger from reorder point',
    },
  });

  const assetSeed = await seedAssetRegistry(businessId);

  const plannerSeed = await seedPlannerDemo(businessId);
  const financeSeed = await seedCmmsFinanceDemo(businessId);

  return {
    skipped: false,
    locSeed,
    pmSeed,
    locations: 3,
    workRequests: 2,
    sampleRequestId: wr.id,
    assetSeed,
    storeSeed,
    plannerSeed,
    financeSeed,
  };
}
