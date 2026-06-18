import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  createAgencyEquipment,
  deleteAgencyEquipment,
  EQUIPMENT_COLUMNS,
  EquipmentColumn,
  listAgencyEquipment,
  moveAgencyEquipment,
  reorderAgencyEquipmentColumn,
  updateAgencyEquipment,
} from '../services/equipmentService';

function parseColumn(value: unknown): EquipmentColumn | null {
  if (typeof value !== 'string') return null;
  return EQUIPMENT_COLUMNS.includes(value as EquipmentColumn) ? (value as EquipmentColumn) : null;
}

export async function getEquipmentBoard(req: AuthRequest, res: Response) {
  const { businessId } = req.params;
  const data = await listAgencyEquipment(businessId);
  res.json({ success: true, data });
}

export async function createEquipment(req: AuthRequest, res: Response) {
  const { businessId } = req.params;
  const { name } = req.body ?? {};
  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ success: false, message: 'Equipment name is required' });
    return;
  }

  const boardColumn = parseColumn(req.body?.boardColumn) ?? 'STOCK';
  const row = await createAgencyEquipment(businessId, {
    name,
    category: req.body?.category,
    serialNumber: req.body?.serialNumber,
    quantity: req.body?.quantity,
    boardColumn,
    projectId: req.body?.projectId,
    functionalLocationId: req.body?.functionalLocationId,
    workerProfileId: req.body?.workerProfileId,
    issuedAt: req.body?.issuedAt,
    expectedReturnAt: req.body?.expectedReturnAt,
    lastInspectionAt: req.body?.lastInspectionAt,
    nextInspectionAt: req.body?.nextInspectionAt,
    condition: req.body?.condition,
    notes: req.body?.notes,
  });

  res.status(201).json({ success: true, data: row });
}

export async function updateEquipment(req: AuthRequest, res: Response) {
  const { businessId, equipmentId } = req.params;
  const boardColumn = req.body?.boardColumn ? parseColumn(req.body.boardColumn) : undefined;
  if (req.body?.boardColumn && !boardColumn) {
    res.status(400).json({ success: false, message: 'Invalid board column' });
    return;
  }

  const row = await updateAgencyEquipment(businessId, equipmentId, {
    name: req.body?.name,
    category: req.body?.category,
    serialNumber: req.body?.serialNumber,
    quantity: req.body?.quantity,
    boardColumn: boardColumn ?? undefined,
    projectId: req.body?.projectId,
    functionalLocationId: req.body?.functionalLocationId,
    workerProfileId: req.body?.workerProfileId,
    issuedAt: req.body?.issuedAt,
    expectedReturnAt: req.body?.expectedReturnAt,
    lastInspectionAt: req.body?.lastInspectionAt,
    nextInspectionAt: req.body?.nextInspectionAt,
    condition: req.body?.condition,
    notes: req.body?.notes,
  });

  if (!row) {
    res.status(404).json({ success: false, message: 'Equipment not found' });
    return;
  }
  res.json({ success: true, data: row });
}

export async function moveEquipment(req: AuthRequest, res: Response) {
  const { businessId, equipmentId } = req.params;
  const boardColumn = parseColumn(req.body?.boardColumn);
  if (!boardColumn) {
    res.status(400).json({ success: false, message: 'Invalid board column' });
    return;
  }

  const row = await moveAgencyEquipment(
    businessId,
    equipmentId,
    boardColumn,
    typeof req.body?.sortOrder === 'number' ? req.body.sortOrder : undefined
  );

  if (!row) {
    res.status(404).json({ success: false, message: 'Equipment not found' });
    return;
  }
  res.json({ success: true, data: row });
}

export async function reorderEquipment(req: AuthRequest, res: Response) {
  const { businessId } = req.params;
  const boardColumn = parseColumn(req.body?.boardColumn);
  const orderedIds = req.body?.orderedIds;

  if (!boardColumn || !Array.isArray(orderedIds)) {
    res.status(400).json({ success: false, message: 'boardColumn and orderedIds required' });
    return;
  }

  const data = await reorderAgencyEquipmentColumn(businessId, boardColumn, orderedIds);
  res.json({ success: true, data });
}

export async function deleteEquipment(req: AuthRequest, res: Response) {
  const { businessId, equipmentId } = req.params;
  const ok = await deleteAgencyEquipment(businessId, equipmentId);
  if (!ok) {
    res.status(404).json({ success: false, message: 'Equipment not found' });
    return;
  }
  res.json({ success: true });
}
