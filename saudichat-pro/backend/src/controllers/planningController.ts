import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  addActivityMaterial,
  addActivityResource,
  createActivityDependency,
  createProgram,
  createScheduleActivity,
  createScheduleBaseline,
  createScheduleProject,
  createWbsNode,
  deleteActivityDependency,
  deleteScheduleActivity,
  getPlanningDashboard,
  getResourceLeveling,
  getScheduleProject,
  listPrograms,
  listScheduleProjects,
  recalculateSchedule,
  releaseActivityToWorkOrder,
  runBatchScenarioSimulation,
  runScenarioSimulation,
  seedPlanningDemo,
  shiftActivitySchedule,
  simulateDelay,
  updateScheduleActivity,
  updateScheduleProject,
} from '../services/planningService';
import { syncTimesheetProgressToActivities } from '../services/planningEvmIntegrationService';
import { importActivitiesFromRows, parsePlanningCsv, parsePlanningXerLite } from '../services/planningImportService';
import { getPlanningAiInsights, getPlanningPortfolioSummary, getPlanningRiskReport } from '../services/planningAiService';
import {
  approveChangeOrder,
  createChangeOrder,
  listChangeOrders,
  rejectChangeOrder,
  submitChangeOrder,
} from '../services/planningChangeService';

export async function getDashboard(req: AuthRequest, res: Response) {
  const data = await getPlanningDashboard(req.params.businessId);
  res.json({ success: true, data });
}

export async function getPrograms(req: AuthRequest, res: Response) {
  const data = await listPrograms(req.params.businessId);
  res.json({ success: true, data });
}

export async function postProgram(req: AuthRequest, res: Response) {
  const data = await createProgram(req.params.businessId, req.body ?? {});
  res.status(201).json({ success: true, data });
}

export async function getProjects(req: AuthRequest, res: Response) {
  const programId = typeof req.query.programId === 'string' ? req.query.programId : undefined;
  const data = await listScheduleProjects(req.params.businessId, programId);
  res.json({ success: true, data });
}

export async function postProject(req: AuthRequest, res: Response) {
  const data = await createScheduleProject(req.params.businessId, req.body ?? {});
  res.status(201).json({ success: true, data });
}

export async function patchProject(req: AuthRequest, res: Response) {
  const data = await updateScheduleProject(req.params.businessId, req.params.projectId, req.body ?? {});
  if (!data) {
    res.status(404).json({ success: false, message: 'Project not found' });
    return;
  }
  res.json({ success: true, data });
}

export async function getProjectById(req: AuthRequest, res: Response) {
  const data = await getScheduleProject(req.params.businessId, req.params.projectId);
  if (!data) {
    res.status(404).json({ success: false, message: 'Project not found' });
    return;
  }
  res.json({ success: true, data });
}

export async function postWbs(req: AuthRequest, res: Response) {
  try {
    const data = await createWbsNode(req.params.businessId, req.params.projectId, req.body ?? {});
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed' });
  }
}

export async function postActivity(req: AuthRequest, res: Response) {
  try {
    const data = await createScheduleActivity(req.params.businessId, req.params.projectId, req.body ?? {});
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed' });
  }
}

export async function patchActivity(req: AuthRequest, res: Response) {
  const data = await updateScheduleActivity(req.params.businessId, req.params.activityId, req.body ?? {});
  if (!data) {
    res.status(404).json({ success: false, message: 'Activity not found' });
    return;
  }
  res.json({ success: true, data });
}

export async function postShiftActivity(req: AuthRequest, res: Response) {
  try {
    const { startOverrideDays } = req.body ?? {};
    const data = await shiftActivitySchedule(
      req.params.businessId,
      req.params.activityId,
      Number(startOverrideDays) || 0
    );
    if (!data) {
      res.status(404).json({ success: false, message: 'Activity not found' });
      return;
    }
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed' });
  }
}

export async function deleteActivity(req: AuthRequest, res: Response) {
  const ok = await deleteScheduleActivity(req.params.businessId, req.params.activityId);
  if (!ok) {
    res.status(404).json({ success: false, message: 'Activity not found' });
    return;
  }
  res.json({ success: true, message: 'Deleted' });
}

export async function postDependency(req: AuthRequest, res: Response) {
  try {
    const data = await createActivityDependency(req.params.businessId, req.params.projectId, req.body ?? {});
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed' });
  }
}

export async function deleteDependency(req: AuthRequest, res: Response) {
  const ok = await deleteActivityDependency(req.params.businessId, req.params.dependencyId);
  if (!ok) {
    res.status(404).json({ success: false, message: 'Dependency not found' });
    return;
  }
  res.json({ success: true, message: 'Deleted' });
}

export async function postRecalculate(req: AuthRequest, res: Response) {
  try {
    const data = await recalculateSchedule(req.params.businessId, req.params.projectId);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed' });
  }
}

export async function postBaseline(req: AuthRequest, res: Response) {
  try {
    const { name } = req.body ?? {};
    const data = await createScheduleBaseline(req.params.businessId, req.params.projectId, name);
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed' });
  }
}

export async function postSimulate(req: AuthRequest, res: Response) {
  try {
    const body = req.body ?? {};
    if (body.activityId && body.extraDays != null) {
      const data = await simulateDelay(req.params.businessId, req.params.projectId, body);
      res.json({ success: true, data });
      return;
    }
    const data = await runScenarioSimulation(req.params.businessId, req.params.projectId, body, body.label);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed' });
  }
}

export async function postSimulateBatch(req: AuthRequest, res: Response) {
  try {
    const data = await runBatchScenarioSimulation(req.params.businessId, req.params.projectId, req.body ?? {});
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed' });
  }
}

export async function postImport(req: AuthRequest, res: Response) {
  try {
    const { csv, format, clearExisting } = req.body ?? {};
    if (!csv || typeof csv !== 'string') {
      res.status(400).json({ success: false, message: 'csv text required' });
      return;
    }
    const rows = format === 'xer' ? parsePlanningXerLite(csv) : parsePlanningCsv(csv);
    const data = await importActivitiesFromRows(req.params.businessId, req.params.projectId, rows, {
      clearExisting: Boolean(clearExisting),
    });
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed' });
  }
}

export async function postReleaseActivity(req: AuthRequest, res: Response) {
  try {
    const data = await releaseActivityToWorkOrder(
      req.params.businessId,
      req.params.activityId,
      req.membership?.memberId
    );
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed' });
  }
}

export async function getLeveling(req: AuthRequest, res: Response) {
  try {
    const data = await getResourceLeveling(req.params.businessId, req.params.projectId);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed' });
  }
}

export async function postActivityResource(req: AuthRequest, res: Response) {
  try {
    const data = await addActivityResource(req.params.businessId, req.params.activityId, req.body ?? {});
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed' });
  }
}

export async function postActivityMaterial(req: AuthRequest, res: Response) {
  try {
    const data = await addActivityMaterial(req.params.businessId, req.params.activityId, req.body ?? {});
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed' });
  }
}

export async function getAiInsights(req: AuthRequest, res: Response) {
  try {
    const data = await getPlanningAiInsights(req.params.businessId, req.params.projectId);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed' });
  }
}

export async function getRiskReport(req: AuthRequest, res: Response) {
  try {
    const data = await getPlanningRiskReport(req.params.businessId, req.params.projectId);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed' });
  }
}

export async function getPortfolioSummary(req: AuthRequest, res: Response) {
  const data = await getPlanningPortfolioSummary(req.params.businessId);
  res.json({ success: true, data });
}

export async function seedPlanning(req: AuthRequest, res: Response) {
  const data = await seedPlanningDemo(req.params.businessId);
  res.json({ success: true, data });
}

export async function getEvm(req: AuthRequest, res: Response) {
  const project = await getScheduleProject(req.params.businessId, req.params.projectId);
  if (!project) {
    res.status(404).json({ success: false, message: 'Project not found' });
    return;
  }
  res.json({
    success: true,
    data: { evm: project.evm, integration: (project as { evmIntegration?: unknown }).evmIntegration },
  });
}

export async function postSyncEvm(req: AuthRequest, res: Response) {
  try {
    const data = await syncTimesheetProgressToActivities(req.params.businessId, req.params.projectId);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed' });
  }
}

export async function getChangeOrders(req: AuthRequest, res: Response) {
  const data = await listChangeOrders(req.params.businessId, req.params.projectId);
  res.json({ success: true, data });
}

export async function postChangeOrder(req: AuthRequest, res: Response) {
  try {
    const data = await createChangeOrder(
      req.params.businessId,
      req.params.projectId,
      req.body ?? {},
      req.membership?.memberId
    );
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed' });
  }
}

export async function patchChangeOrder(req: AuthRequest, res: Response) {
  try {
    const { action, rejectionReason } = req.body ?? {};
    const memberId = req.membership?.memberId;
    let data;
    if (action === 'submit') {
      data = await submitChangeOrder(req.params.businessId, req.params.changeOrderId, memberId);
    } else if (action === 'approve') {
      data = await approveChangeOrder(req.params.businessId, req.params.changeOrderId, memberId);
    } else if (action === 'reject') {
      data = await rejectChangeOrder(
        req.params.businessId,
        req.params.changeOrderId,
        rejectionReason ?? 'Rejected',
        memberId
      );
    } else {
      res.status(400).json({ success: false, message: 'action must be submit, approve, or reject' });
      return;
    }
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Failed' });
  }
}
