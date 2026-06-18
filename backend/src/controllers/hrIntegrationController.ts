import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  getHrIntegrationConfig,
  getHrIntegrationSummary,
  seedHrIntegrationDemo,
  syncHrIntegration,
  updateHrIntegrationConfig,
} from '../services/hrIntegrationService';

export async function getHrSummary(req: AuthRequest, res: Response) {
  const data = await getHrIntegrationSummary(req.params.businessId);
  res.json({ success: true, data });
}

export async function getHrConfig(req: AuthRequest, res: Response) {
  const data = await getHrIntegrationConfig(req.params.businessId);
  res.json({ success: true, data });
}

export async function patchHrConfig(req: AuthRequest, res: Response) {
  const data = await updateHrIntegrationConfig(req.params.businessId, req.body ?? {});
  res.json({ success: true, data });
}

export async function postHrSync(req: AuthRequest, res: Response) {
  try {
    const data = await syncHrIntegration(req.params.businessId);
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : 'HR sync failed',
    });
  }
}

export async function seedHr(req: AuthRequest, res: Response) {
  const data = await seedHrIntegrationDemo(req.params.businessId);
  res.json({ success: true, data });
}
