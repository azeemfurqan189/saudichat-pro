import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { getProjectSCurve, getResourceForecast3Months } from '../services/planningAdvancedService';
import {
  addAssetComponent,
  addBomItem,
  autoWorkOrdersFromPredictions,
  createCalibrationRecord,
  ensureAssetQrToken,
  getAssetByQrToken,
  getAssetMtbfMttr,
  listAssetHierarchy,
  listCalibrations,
  recordMeterReading,
  suggestPartsForWorkOrder,
  listMeterReadings,
  getIotMonitoringSummary,
  ingestIotReadings,
} from '../services/cmmsAdvancedService';
import {
  addFinancialEntry,
  approveSubcontractorTimesheet,
  createClientInvoice,
  createMilestone,
  createSubcontractor,
  createSubcontractorInvoice,
  createSubcontractorPo,
  createSubcontractorTimesheet,
  getProjectFinancialControl,
  invoiceMilestone,
  listClientInvoices,
  listSubcontractors,
  releaseMilestoneRetention,
  seedProjectFinanceDemo,
} from '../services/projectFinanceAdvancedService';
import {
  approveLeaveRequest,
  completeTraining,
  createLeaveRequest,
  createSuccessionPlan,
  createTrainingRecord,
  getHrAdvancedSummary,
  markAbsentWithAlert,
  seedHrAdvancedDemo,
  upsertCompetency,
} from '../services/hrAdvancedService';

// ─── Planning Advanced ───────────────────────────────────────────────────────

export async function getSCurve(req: AuthRequest, res: Response) {
  try {
    const data = await getProjectSCurve(req.params.businessId, req.params.projectId);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed' });
  }
}

export async function getResourceForecast(req: AuthRequest, res: Response) {
  try {
    const data = await getResourceForecast3Months(req.params.businessId, req.params.projectId);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed' });
  }
}

// ─── CMMS Advanced ───────────────────────────────────────────────────────────

export async function getMtbfMttr(req: AuthRequest, res: Response) {
  const equipmentId = typeof req.query.equipmentId === 'string' ? req.query.equipmentId : undefined;
  const data = await getAssetMtbfMttr(req.params.businessId, equipmentId);
  res.json({ success: true, data });
}

export async function getAssetHierarchy(req: AuthRequest, res: Response) {
  try {
    const data = await listAssetHierarchy(req.params.businessId, req.params.equipmentId);
    res.json({ success: true, data });
  } catch (e) {
    res.status(404).json({ success: false, message: e instanceof Error ? e.message : 'Not found' });
  }
}

export async function postAssetComponent(req: AuthRequest, res: Response) {
  try {
    const data = await addAssetComponent(req.params.businessId, req.params.equipmentId, req.body ?? {});
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed' });
  }
}

export async function postBomItem(req: AuthRequest, res: Response) {
  try {
    const data = await addBomItem(req.params.businessId, req.params.equipmentId, req.body ?? {});
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed' });
  }
}

export async function getBomSuggestions(req: AuthRequest, res: Response) {
  const data = await suggestPartsForWorkOrder(req.params.businessId, req.params.equipmentId);
  res.json({ success: true, data });
}

export async function postMeterReading(req: AuthRequest, res: Response) {
  try {
    const data = await recordMeterReading(req.params.businessId, req.params.equipmentId, req.body ?? {});
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed' });
  }
}

export async function getCalibrations(req: AuthRequest, res: Response) {
  const data = await listCalibrations(req.params.businessId);
  res.json({ success: true, data });
}

export async function postCalibration(req: AuthRequest, res: Response) {
  try {
    const data = await createCalibrationRecord(req.params.businessId, req.body ?? {});
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed' });
  }
}

export async function postAssetQrToken(req: AuthRequest, res: Response) {
  try {
    const token = await ensureAssetQrToken(req.params.businessId, req.params.equipmentId);
    const frontend = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    res.json({ success: true, data: { token, scanUrl: `${frontend}/asset/${token}` } });
  } catch (e) {
    res.status(404).json({ success: false, message: e instanceof Error ? e.message : 'Not found' });
  }
}

export async function postAutoWoFromPredictions(req: AuthRequest, res: Response) {
  const minRisk = req.body?.minRisk === 'CRITICAL' ? 'CRITICAL' : 'HIGH';
  const data = await autoWorkOrdersFromPredictions(req.params.businessId, minRisk);
  res.json({ success: true, data });
}

export async function getMeterReadings(req: AuthRequest, res: Response) {
  const equipmentId = typeof req.query.equipmentId === 'string' ? req.query.equipmentId : undefined;
  const data = await listMeterReadings(req.params.businessId, equipmentId);
  res.json({ success: true, data });
}

export async function getIotMonitoring(req: AuthRequest, res: Response) {
  const data = await getIotMonitoringSummary(req.params.businessId);
  res.json({ success: true, data });
}

export async function postIotIngest(req: AuthRequest, res: Response) {
  try {
    const readings = Array.isArray(req.body?.readings) ? req.body.readings : [req.body];
    const data = await ingestIotReadings(req.params.businessId, readings);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed' });
  }
}

export async function publicAssetScan(req: AuthRequest, res: Response) {
  const data = await getAssetByQrToken(req.params.token);
  if (!data) {
    res.status(404).json({ success: false, message: 'Invalid asset QR code' });
    return;
  }
  res.json({ success: true, data });
}

// ─── Finance Advanced ────────────────────────────────────────────────────────

export async function getProjectFinancials(req: AuthRequest, res: Response) {
  try {
    const data = await getProjectFinancialControl(req.params.businessId, req.params.projectId);
    res.json({ success: true, data });
  } catch (e) {
    res.status(404).json({ success: false, message: e instanceof Error ? e.message : 'Not found' });
  }
}

export async function postFinancialEntry(req: AuthRequest, res: Response) {
  try {
    const data = await addFinancialEntry(req.params.businessId, req.body ?? {});
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed' });
  }
}

export async function postMilestone(req: AuthRequest, res: Response) {
  try {
    const data = await createMilestone(req.params.businessId, req.params.projectId, req.body ?? {});
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed' });
  }
}

export async function postInvoiceMilestone(req: AuthRequest, res: Response) {
  try {
    const { physicalProgressPct } = req.body ?? {};
    const data = await invoiceMilestone(req.params.businessId, req.params.milestoneId, Number(physicalProgressPct) || 0);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed' });
  }
}

export async function postReleaseRetention(req: AuthRequest, res: Response) {
  try {
    const data = await releaseMilestoneRetention(req.params.businessId, req.params.milestoneId);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed' });
  }
}

export async function getClientInvoices(req: AuthRequest, res: Response) {
  const agencyProjectId = typeof req.query.agencyProjectId === 'string' ? req.query.agencyProjectId : undefined;
  const data = await listClientInvoices(req.params.businessId, agencyProjectId);
  res.json({ success: true, data });
}

export async function postClientInvoice(req: AuthRequest, res: Response) {
  try {
    const data = await createClientInvoice(req.params.businessId, req.body ?? {});
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed' });
  }
}

export async function getSubcontractors(req: AuthRequest, res: Response) {
  const data = await listSubcontractors(req.params.businessId);
  res.json({ success: true, data });
}

export async function postSubcontractor(req: AuthRequest, res: Response) {
  try {
    const data = await createSubcontractor(req.params.businessId, req.body ?? {});
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed' });
  }
}

export async function postSubcontractorPo(req: AuthRequest, res: Response) {
  try {
    const data = await createSubcontractorPo(req.params.businessId, req.body ?? {});
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed' });
  }
}

export async function postSubcontractorTimesheet(req: AuthRequest, res: Response) {
  try {
    const data = await createSubcontractorTimesheet(req.params.businessId, req.body ?? {});
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed' });
  }
}

export async function patchSubcontractorTimesheet(req: AuthRequest, res: Response) {
  try {
    const { action } = req.body ?? {};
    if (action === 'approve') {
      const data = await approveSubcontractorTimesheet(req.params.businessId, req.params.timesheetId);
      res.json({ success: true, data });
      return;
    }
    res.status(400).json({ success: false, message: 'Unknown action' });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed' });
  }
}

export async function postSubcontractorInvoice(req: AuthRequest, res: Response) {
  try {
    const data = await createSubcontractorInvoice(req.params.businessId, req.body ?? {});
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed' });
  }
}

export async function seedFinanceAdvanced(req: AuthRequest, res: Response) {
  const data = await seedProjectFinanceDemo(req.params.businessId, req.params.projectId);
  res.json({ success: true, data });
}

// ─── HR Advanced ─────────────────────────────────────────────────────────────

export async function getHrAdvanced(req: AuthRequest, res: Response) {
  const data = await getHrAdvancedSummary(req.params.businessId);
  res.json({ success: true, data });
}

export async function postLeaveRequest(req: AuthRequest, res: Response) {
  try {
    const data = await createLeaveRequest(req.params.businessId, req.body ?? {});
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed' });
  }
}

export async function patchLeaveRequest(req: AuthRequest, res: Response) {
  try {
    const { action } = req.body ?? {};
    if (action === 'approve') {
      const data = await approveLeaveRequest(req.params.businessId, req.params.requestId);
      res.json({ success: true, data });
      return;
    }
    res.status(400).json({ success: false, message: 'Unknown action' });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed' });
  }
}

export async function postMarkAbsent(req: AuthRequest, res: Response) {
  try {
    const { workerProfileId, projectId } = req.body ?? {};
    const data = await markAbsentWithAlert(req.params.businessId, workerProfileId, projectId);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed' });
  }
}

export async function postCompetency(req: AuthRequest, res: Response) {
  try {
    const data = await upsertCompetency(req.params.businessId, {
      ...req.body,
      ratedByMemberId: req.membership?.memberId,
    });
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed' });
  }
}

export async function postSuccession(req: AuthRequest, res: Response) {
  try {
    const data = await createSuccessionPlan(req.params.businessId, req.body ?? {});
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed' });
  }
}

export async function postTrainingRecord(req: AuthRequest, res: Response) {
  try {
    const data = await createTrainingRecord(req.params.businessId, req.body ?? {});
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed' });
  }
}

export async function patchTrainingRecord(req: AuthRequest, res: Response) {
  try {
    const data = await completeTraining(req.params.businessId, req.params.trainingId);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed' });
  }
}

export async function seedHrAdvanced(req: AuthRequest, res: Response) {
  const data = await seedHrAdvancedDemo(req.params.businessId);
  res.json({ success: true, data });
}
