import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { hasMinRole } from '../services/membershipService';
import {
  approvePurchaseRequisition,
  approveWorkRequest,
  convertWorkRequestToOrder,
  createFunctionalLocation,
  createCmmsAsset,
  createMaintenancePlan,
  createPurchaseRequisition,
  createSparePart,
  createWorkRequest,
  deleteCmmsAsset,
  deleteMaintenancePlan,
  deleteFunctionalLocation,
  generateDuePreventiveWorkOrders,
  getAssetTree,
  getCmmsAsset,
  getCmmsDashboard,
  getCmmsFinanceConfig,
  getCmmsFinanceSummary,
  getFunctionalLocationById,
  getLocationTree,
  getInventorySummary,
  getMaintenancePlan,
  getPmSummary,
  getPlannerWorkload,
  issueMaterial,
  issuePartToWorkOrder,
  listCmmsAssets,
  listFunctionalLocations,
  listInventoryTransactions,
  listMaintenancePlans,
  listPmHistory,
  listPurchaseRequisitions,
  listPurchaseOrders,
  advancePurchaseOrder,
  listSpareParts,
  listWorkOrders,
  listWorkRequests,
  rejectWorkRequest,
  returnMaterial,
  receiveMaterial,
  seedAssetRegistry,
  seedCmmsDemo,
  seedCmmsFinanceDemo,
  seedFunctionalLocationHierarchy,
  seedPmPlans,
  seedPlannerDemo,
  seedStoreInventory,
  syncCmmsFinanceToErp,
  scheduleWorkOrder,
  updateCmmsFinanceConfig,
  transferMaterial,
  updateCmmsAsset,
  updateFunctionalLocation,
  updateMaintenancePlan,
  updateWorkOrder,
} from '../services/cmmsService';

function memberId(req: AuthRequest) {
  return req.membership?.memberId;
}

export async function getDashboard(req: AuthRequest, res: Response) {
  const data = await getCmmsDashboard(req.params.businessId);
  res.json({ success: true, data });
}

export async function getCmmsAlertsHandler(req: AuthRequest, res: Response) {
  const { getCmmsAlerts } = await import('../services/cmmsAlertsService');
  const data = await getCmmsAlerts(req.params.businessId);
  res.json({ success: true, data });
}

export async function getLocations(req: AuthRequest, res: Response) {
  const data = await listFunctionalLocations(req.params.businessId);
  res.json({ success: true, data });
}

export async function postLocation(req: AuthRequest, res: Response) {
  const { code, name } = req.body ?? {};
  if (!code || !name) {
    res.status(400).json({ success: false, message: 'code and name required' });
    return;
  }
  try {
    const data = await createFunctionalLocation(req.params.businessId, req.body);
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed to create location' });
  }
}

export async function getLocationTreeHandler(req: AuthRequest, res: Response) {
  const data = await getLocationTree(req.params.businessId);
  res.json({ success: true, data });
}

export async function getLocationById(req: AuthRequest, res: Response) {
  const data = await getFunctionalLocationById(req.params.businessId, req.params.locationId);
  if (!data) {
    res.status(404).json({ success: false, message: 'Location not found' });
    return;
  }
  res.json({ success: true, data });
}

export async function patchLocation(req: AuthRequest, res: Response) {
  try {
    const data = await updateFunctionalLocation(req.params.businessId, req.params.locationId, req.body ?? {});
    if (!data) {
      res.status(404).json({ success: false, message: 'Location not found' });
      return;
    }
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed to update location' });
  }
}

export async function deleteLocation(req: AuthRequest, res: Response) {
  try {
    const ok = await deleteFunctionalLocation(req.params.businessId, req.params.locationId);
    if (!ok) {
      res.status(404).json({ success: false, message: 'Location not found' });
      return;
    }
    res.json({ success: true, data: { id: req.params.locationId } });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed to deactivate location' });
  }
}

export async function seedLocations(req: AuthRequest, res: Response) {
  const data = await seedFunctionalLocationHierarchy(req.params.businessId);
  res.json({ success: true, data });
}

export async function getAssets(req: AuthRequest, res: Response) {
  const data = await listCmmsAssets(req.params.businessId);
  res.json({ success: true, data });
}

export async function getAssetTreeHandler(req: AuthRequest, res: Response) {
  const data = await getAssetTree(req.params.businessId);
  res.json({ success: true, data });
}

export async function getAssetById(req: AuthRequest, res: Response) {
  const data = await getCmmsAsset(req.params.businessId, req.params.assetId);
  if (!data) {
    res.status(404).json({ success: false, message: 'Asset not found' });
    return;
  }
  res.json({ success: true, data });
}

export async function postAsset(req: AuthRequest, res: Response) {
  const { name } = req.body ?? {};
  if (!name?.trim()) {
    res.status(400).json({ success: false, message: 'name required' });
    return;
  }
  const data = await createCmmsAsset(req.params.businessId, req.body);
  res.status(201).json({ success: true, data });
}

export async function patchAsset(req: AuthRequest, res: Response) {
  const data = await updateCmmsAsset(req.params.businessId, req.params.assetId, req.body ?? {});
  if (!data) {
    res.status(404).json({ success: false, message: 'Asset not found' });
    return;
  }
  res.json({ success: true, data });
}

export async function deleteAsset(req: AuthRequest, res: Response) {
  const ok = await deleteCmmsAsset(req.params.businessId, req.params.assetId);
  if (!ok) {
    res.status(404).json({ success: false, message: 'Asset not found' });
    return;
  }
  res.json({ success: true, data: { id: req.params.assetId } });
}

export async function seedAssets(req: AuthRequest, res: Response) {
  const data = await seedAssetRegistry(req.params.businessId);
  res.json({ success: true, data });
}

export async function getWorkRequests(req: AuthRequest, res: Response) {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const data = await listWorkRequests(req.params.businessId, status);
  res.json({ success: true, data });
}

export async function postWorkRequest(req: AuthRequest, res: Response) {
  const { title } = req.body ?? {};
  if (!title?.trim()) {
    res.status(400).json({ success: false, message: 'title required' });
    return;
  }
  const data = await createWorkRequest(req.params.businessId, memberId(req), req.body);
  res.status(201).json({ success: true, data });
}

export async function patchWorkRequest(req: AuthRequest, res: Response) {
  const { businessId, requestId } = req.params;
  const action = req.body?.action as string;
  const mid = memberId(req);
  if (!mid) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  let data = null;
  if (action === 'approve') data = await approveWorkRequest(businessId, requestId, mid);
  else if (action === 'reject') data = await rejectWorkRequest(businessId, requestId, mid, req.body?.reason);
  else if (action === 'convert') data = await convertWorkRequestToOrder(businessId, requestId, mid);
  else {
    res.status(400).json({ success: false, message: 'Invalid action' });
    return;
  }

  if (!data) {
    res.status(404).json({ success: false, message: 'Work request not found or invalid state' });
    return;
  }
  res.json({ success: true, data });
}

export async function getWorkOrders(req: AuthRequest, res: Response) {
  const role = req.membership?.role;
  const filters: { status?: string; assignedMemberId?: string } = {};
  if (typeof req.query.status === 'string') filters.status = req.query.status;
  if (role === 'FIELD_WORKER' && memberId(req)) {
    filters.assignedMemberId = memberId(req);
  }
  const data = await listWorkOrders(req.params.businessId, filters);
  res.json({ success: true, data });
}

export async function patchWorkOrder(req: AuthRequest, res: Response) {
  const data = await updateWorkOrder(req.params.businessId, req.params.workOrderId, req.body ?? {});
  if (!data) {
    res.status(404).json({ success: false, message: 'Work order not found' });
    return;
  }
  res.json({ success: true, data });
}

export async function postIssuePart(req: AuthRequest, res: Response) {
  const { sparePartId, qty } = req.body ?? {};
  if (!sparePartId || !qty) {
    res.status(400).json({ success: false, message: 'sparePartId and qty required' });
    return;
  }
  const data = await issuePartToWorkOrder(
    req.params.businessId,
    req.params.workOrderId,
    sparePartId,
    Number(qty)
  );
  if (!data) {
    res.status(400).json({ success: false, message: 'Cannot issue part — check stock' });
    return;
  }
  res.json({ success: true, data });
}

export async function getPlanner(req: AuthRequest, res: Response) {
  const weekStart = typeof req.query.weekStart === 'string' ? req.query.weekStart : undefined;
  const data = await getPlannerWorkload(req.params.businessId, weekStart);
  res.json({ success: true, data });
}

export async function patchPlannerSchedule(req: AuthRequest, res: Response) {
  const { date, startTime, endTime, assignedMemberId } = req.body ?? {};
  if (!date || typeof date !== 'string') {
    res.status(400).json({ success: false, message: 'date required (YYYY-MM-DD)' });
    return;
  }
  const data = await scheduleWorkOrder(req.params.businessId, req.params.workOrderId, {
    date,
    startTime,
    endTime,
    assignedMemberId,
  });
  if (!data) {
    res.status(404).json({ success: false, message: 'Work order not found' });
    return;
  }
  res.json({ success: true, data });
}

export async function seedPlanner(req: AuthRequest, res: Response) {
  const data = await seedPlannerDemo(req.params.businessId);
  res.json({ success: true, data });
}

export async function getMaintenancePlans(req: AuthRequest, res: Response) {
  const data = await listMaintenancePlans(req.params.businessId);
  res.json({ success: true, data });
}

export async function getPmSummaryHandler(req: AuthRequest, res: Response) {
  const data = await getPmSummary(req.params.businessId);
  res.json({ success: true, data });
}

export async function getPmHistoryHandler(req: AuthRequest, res: Response) {
  const data = await listPmHistory(req.params.businessId);
  res.json({ success: true, data });
}

export async function getMaintenancePlanById(req: AuthRequest, res: Response) {
  const data = await getMaintenancePlan(req.params.businessId, req.params.planId);
  if (!data) {
    res.status(404).json({ success: false, message: 'PM plan not found' });
    return;
  }
  res.json({ success: true, data });
}

export async function postMaintenancePlan(req: AuthRequest, res: Response) {
  const { name } = req.body ?? {};
  if (!name?.trim()) {
    res.status(400).json({ success: false, message: 'name required' });
    return;
  }
  const data = await createMaintenancePlan(req.params.businessId, req.body);
  res.status(201).json({ success: true, data });
}

export async function patchMaintenancePlan(req: AuthRequest, res: Response) {
  const data = await updateMaintenancePlan(req.params.businessId, req.params.planId, req.body ?? {});
  if (!data) {
    res.status(404).json({ success: false, message: 'PM plan not found' });
    return;
  }
  res.json({ success: true, data });
}

export async function deleteMaintenancePlanHandler(req: AuthRequest, res: Response) {
  const ok = await deleteMaintenancePlan(req.params.businessId, req.params.planId);
  if (!ok) {
    res.status(404).json({ success: false, message: 'PM plan not found' });
    return;
  }
  res.json({ success: true, data: { id: req.params.planId } });
}

export async function seedPmHandler(req: AuthRequest, res: Response) {
  const data = await seedPmPlans(req.params.businessId);
  res.json({ success: true, data });
}

export async function postRunPm(req: AuthRequest, res: Response) {
  const data = await generateDuePreventiveWorkOrders(req.params.businessId);
  res.json({ success: true, data });
}

export async function getSpareParts(req: AuthRequest, res: Response) {
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  const data = await listSpareParts(req.params.businessId, category);
  res.json({ success: true, data });
}

export async function getInventorySummaryHandler(req: AuthRequest, res: Response) {
  const data = await getInventorySummary(req.params.businessId);
  res.json({ success: true, data });
}

export async function getInventoryTransactions(req: AuthRequest, res: Response) {
  const type = typeof req.query.type === 'string' ? req.query.type : undefined;
  const data = await listInventoryTransactions(req.params.businessId, 50, type);
  res.json({ success: true, data });
}

export async function postInventoryTransaction(req: AuthRequest, res: Response) {
  const { type, sparePartId, qty } = req.body ?? {};
  if (!type || !sparePartId || !qty) {
    res.status(400).json({ success: false, message: 'type, sparePartId, and qty required' });
    return;
  }
  const payload = { ...req.body, performedByMemberId: memberId(req) };
  try {
    let data;
    if (type === 'RECEIVE') data = await receiveMaterial(req.params.businessId, payload);
    else if (type === 'ISSUE') data = await issueMaterial(req.params.businessId, payload);
    else if (type === 'TRANSFER') data = await transferMaterial(req.params.businessId, payload);
    else if (type === 'RETURN') data = await returnMaterial(req.params.businessId, payload);
    else {
      res.status(400).json({ success: false, message: 'Invalid transaction type' });
      return;
    }
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Transaction failed' });
  }
}

export async function seedInventory(req: AuthRequest, res: Response) {
  const data = await seedStoreInventory(req.params.businessId);
  res.json({ success: true, data });
}

export async function postSparePart(req: AuthRequest, res: Response) {
  const { sku, name } = req.body ?? {};
  if (!sku || !name) {
    res.status(400).json({ success: false, message: 'sku and name required' });
    return;
  }
  const data = await createSparePart(req.params.businessId, req.body);
  res.status(201).json({ success: true, data });
}

export async function getProcurement(req: AuthRequest, res: Response) {
  const data = await listPurchaseRequisitions(req.params.businessId);
  res.json({ success: true, data });
}

export async function getPurchaseOrders(req: AuthRequest, res: Response) {
  const data = await listPurchaseOrders(req.params.businessId);
  res.json({ success: true, data });
}

export async function patchPurchaseOrder(req: AuthRequest, res: Response) {
  const { action } = req.body ?? {};
  if (!action || typeof action !== 'string') {
    res.status(400).json({ success: false, message: 'action required (send_to_vendor, in_transit, deliver)' });
    return;
  }
  try {
    const data = await advancePurchaseOrder(req.params.businessId, req.params.orderId, action);
    if (!data) {
      res.status(404).json({ success: false, message: 'Purchase order not found' });
      return;
    }
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed' });
  }
}

export async function postProcurement(req: AuthRequest, res: Response) {
  const { lines } = req.body ?? {};
  if (!Array.isArray(lines) || lines.length === 0) {
    res.status(400).json({ success: false, message: 'lines required' });
    return;
  }
  const data = await createPurchaseRequisition(req.params.businessId, memberId(req), req.body);
  res.status(201).json({ success: true, data });
}

export async function patchProcurement(req: AuthRequest, res: Response) {
  const mid = memberId(req);
  if (!mid) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }
  if (req.body?.action !== 'approve') {
    res.status(400).json({ success: false, message: 'Invalid action' });
    return;
  }
  const data = await approvePurchaseRequisition(req.params.businessId, req.params.requisitionId, mid);
  if (!data) {
    res.status(404).json({ success: false, message: 'Requisition not found' });
    return;
  }
  res.json({ success: true, data });
}

export async function getFinanceConfig(req: AuthRequest, res: Response) {
  const data = await getCmmsFinanceConfig(req.params.businessId);
  res.json({ success: true, data });
}

export async function patchFinanceConfig(req: AuthRequest, res: Response) {
  const data = await updateCmmsFinanceConfig(req.params.businessId, req.body ?? {});
  res.json({ success: true, data });
}

export async function getFinanceSummary(req: AuthRequest, res: Response) {
  const year = req.query.year ? Number(req.query.year) : undefined;
  const month = req.query.month ? Number(req.query.month) : undefined;
  const data = await getCmmsFinanceSummary(req.params.businessId, year, month);
  res.json({ success: true, data });
}

export async function postFinanceSync(req: AuthRequest, res: Response) {
  try {
    const data = await syncCmmsFinanceToErp(req.params.businessId);
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : 'ERP sync failed',
    });
  }
}

export async function seedFinance(req: AuthRequest, res: Response) {
  const data = await seedCmmsFinanceDemo(req.params.businessId);
  res.json({ success: true, data });
}

export async function seedCmms(req: AuthRequest, res: Response) {
  const data = await seedCmmsDemo(req.params.businessId);
  res.json({ success: true, data });
}

export async function getCmmsAccessLevel(req: AuthRequest, res: Response) {
  const role = req.membership?.role ?? 'FIELD_WORKER';
  let level: 'OWNER' | 'OFFICE' | 'SITE' = 'SITE';
  if (role === 'OWNER') level = 'OWNER';
  else if (hasMinRole(role, 'MANAGER') || role === 'OFFICE_STAFF') level = 'OFFICE';

  res.json({
    success: true,
    data: {
      role,
      level,
      layers: {
        owner: ['Dashboard', 'Cost', 'Performance', 'Downtime'],
        office: ['Assets', 'Approvals', 'Planning', 'Procurement', 'Vendors'],
        site: ['Work execution', 'Repairs', 'Inventory use', 'Condition monitoring'],
      },
    },
  });
}
