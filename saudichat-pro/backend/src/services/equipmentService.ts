import prisma from '../utils/prisma';

export const EQUIPMENT_COLUMNS = ['STOCK', 'ISSUED', 'INSPECTION', 'MAINTENANCE'] as const;
export type EquipmentColumn = (typeof EQUIPMENT_COLUMNS)[number];

const equipmentInclude = {
  project: { select: { id: true, name: true, siteName: true } },
  workerProfile: { select: { id: true, name: true } },
  functionalLocation: { select: { id: true, code: true, name: true, type: true, projectId: true } },
} as const;

export async function listAgencyEquipment(businessId: string) {
  const rows = await prisma.agencyEquipment.findMany({
    where: { businessId },
    include: equipmentInclude,
    orderBy: [{ boardColumn: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
  });

  const grouped: Record<EquipmentColumn, typeof rows> = {
    STOCK: [],
    ISSUED: [],
    INSPECTION: [],
    MAINTENANCE: [],
  };

  for (const row of rows) {
    const col = (EQUIPMENT_COLUMNS.includes(row.boardColumn as EquipmentColumn)
      ? row.boardColumn
      : 'STOCK') as EquipmentColumn;
    grouped[col].push(row);
  }

  const now = new Date();
  const inspectionOverdue = rows.filter(
    (r) => r.nextInspectionAt && r.nextInspectionAt < now && r.boardColumn !== 'MAINTENANCE'
  ).length;

  return {
    columns: grouped,
    summary: {
      total: rows.length,
      stock: grouped.STOCK.length,
      issued: grouped.ISSUED.length,
      inspection: grouped.INSPECTION.length,
      maintenance: grouped.MAINTENANCE.length,
      inspectionOverdue,
    },
  };
}

export async function createAgencyEquipment(
  businessId: string,
  input: {
    name: string;
    category?: string;
    serialNumber?: string;
    quantity?: number;
    boardColumn?: EquipmentColumn;
    projectId?: string | null;
    functionalLocationId?: string | null;
    workerProfileId?: string | null;
    issuedAt?: string | null;
    expectedReturnAt?: string | null;
    lastInspectionAt?: string | null;
    nextInspectionAt?: string | null;
    condition?: string;
    notes?: string;
  }
) {
  const boardColumn = input.boardColumn ?? 'STOCK';
  const maxOrder = await prisma.agencyEquipment.aggregate({
    where: { businessId, boardColumn },
    _max: { sortOrder: true },
  });

  return prisma.agencyEquipment.create({
    data: {
      businessId,
      name: input.name.trim(),
      category: input.category?.trim() || null,
      serialNumber: input.serialNumber?.trim() || null,
      quantity: input.quantity ?? 1,
      boardColumn,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      projectId: input.projectId || null,
      functionalLocationId: input.functionalLocationId || null,
      workerProfileId: input.workerProfileId || null,
      issuedAt: input.issuedAt ? new Date(input.issuedAt) : boardColumn === 'ISSUED' ? new Date() : null,
      expectedReturnAt: input.expectedReturnAt ? new Date(input.expectedReturnAt) : null,
      lastInspectionAt: input.lastInspectionAt ? new Date(input.lastInspectionAt) : null,
      nextInspectionAt: input.nextInspectionAt ? new Date(input.nextInspectionAt) : null,
      condition: input.condition ?? 'GOOD',
      notes: input.notes?.trim() || null,
    },
    include: equipmentInclude,
  });
}

export async function updateAgencyEquipment(
  businessId: string,
  equipmentId: string,
  input: Partial<{
    name: string;
    category: string | null;
    serialNumber: string | null;
    quantity: number;
    boardColumn: EquipmentColumn;
    projectId: string | null;
    functionalLocationId: string | null;
    workerProfileId: string | null;
    issuedAt: string | null;
    expectedReturnAt: string | null;
    lastInspectionAt: string | null;
    nextInspectionAt: string | null;
    condition: string;
    notes: string | null;
  }>
) {
  const existing = await prisma.agencyEquipment.findFirst({
    where: { id: equipmentId, businessId },
  });
  if (!existing) return null;

  const boardColumn = input.boardColumn ?? existing.boardColumn;
  let issuedAt = existing.issuedAt;
  if (input.issuedAt !== undefined) {
    issuedAt = input.issuedAt ? new Date(input.issuedAt) : null;
  } else if (boardColumn === 'ISSUED' && !existing.issuedAt && existing.boardColumn !== 'ISSUED') {
    issuedAt = new Date();
  }

  return prisma.agencyEquipment.update({
    where: { id: equipmentId },
    data: {
      name: input.name?.trim() ?? undefined,
      category: input.category !== undefined ? input.category : undefined,
      serialNumber: input.serialNumber !== undefined ? input.serialNumber : undefined,
      quantity: input.quantity ?? undefined,
      boardColumn,
      projectId: input.projectId !== undefined ? input.projectId : undefined,
      functionalLocationId:
        input.functionalLocationId !== undefined ? input.functionalLocationId : undefined,
      workerProfileId: input.workerProfileId !== undefined ? input.workerProfileId : undefined,
      issuedAt,
      expectedReturnAt:
        input.expectedReturnAt !== undefined
          ? input.expectedReturnAt
            ? new Date(input.expectedReturnAt)
            : null
          : undefined,
      lastInspectionAt:
        input.lastInspectionAt !== undefined
          ? input.lastInspectionAt
            ? new Date(input.lastInspectionAt)
            : null
          : undefined,
      nextInspectionAt:
        input.nextInspectionAt !== undefined
          ? input.nextInspectionAt
            ? new Date(input.nextInspectionAt)
            : null
          : undefined,
      condition: input.condition ?? undefined,
      notes: input.notes !== undefined ? input.notes : undefined,
    },
    include: equipmentInclude,
  });
}

export async function moveAgencyEquipment(
  businessId: string,
  equipmentId: string,
  boardColumn: EquipmentColumn,
  sortOrder?: number
) {
  const existing = await prisma.agencyEquipment.findFirst({
    where: { id: equipmentId, businessId },
  });
  if (!existing) return null;

  let nextOrder = sortOrder;
  if (nextOrder === undefined) {
    const maxOrder = await prisma.agencyEquipment.aggregate({
      where: { businessId, boardColumn },
      _max: { sortOrder: true },
    });
    nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;
  }

  const issuedAt =
    boardColumn === 'ISSUED' && !existing.issuedAt ? new Date() : existing.issuedAt;
  const lastInspectionAt =
    boardColumn === 'INSPECTION' && !existing.lastInspectionAt ? new Date() : existing.lastInspectionAt;

  return prisma.agencyEquipment.update({
    where: { id: equipmentId },
    data: { boardColumn, sortOrder: nextOrder, issuedAt, lastInspectionAt },
    include: equipmentInclude,
  });
}

export async function reorderAgencyEquipmentColumn(
  businessId: string,
  boardColumn: EquipmentColumn,
  orderedIds: string[]
) {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.agencyEquipment.updateMany({
        where: { id, businessId, boardColumn },
        data: { sortOrder: index },
      })
    )
  );
  return listAgencyEquipment(businessId);
}

export async function deleteAgencyEquipment(businessId: string, equipmentId: string) {
  const existing = await prisma.agencyEquipment.findFirst({
    where: { id: equipmentId, businessId },
  });
  if (!existing) return false;
  await prisma.agencyEquipment.delete({ where: { id: equipmentId } });
  return true;
}

export async function seedDemoEquipment(businessId: string) {
  const count = await prisma.agencyEquipment.count({ where: { businessId } });
  if (count > 0) return count;

  const project = await prisma.agencyProject.findFirst({
    where: { businessId },
    orderBy: { createdAt: 'asc' },
  });
  const worker = await prisma.workerProfile.findFirst({
    where: { businessId },
    orderBy: { createdAt: 'asc' },
  });

  const now = Date.now();
  const items = [
    {
      name: 'Welding machine — Lincoln 400A',
      category: 'Welding',
      serialNumber: 'WM-28491',
      quantity: 2,
      boardColumn: 'ISSUED',
      sortOrder: 0,
      projectId: project?.id ?? null,
      workerProfileId: worker?.id ?? null,
      issuedAt: new Date(now - 12 * 86400000),
      expectedReturnAt: new Date(now + 18 * 86400000),
      lastInspectionAt: new Date(now - 45 * 86400000),
      nextInspectionAt: new Date(now + 15 * 86400000),
      condition: 'GOOD',
      notes: 'Jubail refinery shutdown — need 2 units on site',
    },
    {
      name: 'Safety harness set (10 pcs)',
      category: 'PPE',
      serialNumber: 'PPE-H-110',
      quantity: 10,
      boardColumn: 'STOCK',
      sortOrder: 0,
      lastInspectionAt: new Date(now - 20 * 86400000),
      nextInspectionAt: new Date(now + 70 * 86400000),
      condition: 'GOOD',
    },
    {
      name: 'Diesel generator 150kVA',
      category: 'Power',
      serialNumber: 'GEN-7720',
      quantity: 1,
      boardColumn: 'INSPECTION',
      sortOrder: 0,
      projectId: project?.id ?? null,
      lastInspectionAt: new Date(now - 95 * 86400000),
      nextInspectionAt: new Date(now - 5 * 86400000),
      condition: 'FAIR',
      notes: 'Inspection overdue — schedule before next mobilization',
    },
    {
      name: 'Air compressor Atlas Copco',
      category: 'Tools',
      serialNumber: 'AC-33901',
      quantity: 1,
      boardColumn: 'MAINTENANCE',
      sortOrder: 0,
      issuedAt: new Date(now - 60 * 86400000),
      lastInspectionAt: new Date(now - 30 * 86400000),
      condition: 'POOR',
      notes: 'Oil leak — workshop repair ETA 5 days',
    },
    {
      name: 'Scaffolding clamps (box 50)',
      category: 'Scaffolding',
      quantity: 50,
      boardColumn: 'STOCK',
      sortOrder: 1,
      condition: 'GOOD',
    },
  ];

  await prisma.agencyEquipment.createMany({
    data: items.map((item) => ({
      businessId,
      ...item,
    })),
  });

  return items.length;
}
