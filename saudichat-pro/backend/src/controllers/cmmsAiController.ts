import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  getCmmsAiEngineInsights,
  runCmmsAiEngineAnalysis,
  seedCmmsAiEngineDemo,
} from '../services/cmmsAiEngineService';

export async function getAiEngine(req: AuthRequest, res: Response) {
  const data = await getCmmsAiEngineInsights(req.params.businessId);
  res.json({ success: true, data });
}

export async function postAiEngineRun(req: AuthRequest, res: Response) {
  const data = await runCmmsAiEngineAnalysis(req.params.businessId);
  res.json({ success: true, data });
}

export async function seedAiEngine(req: AuthRequest, res: Response) {
  const data = await seedCmmsAiEngineDemo(req.params.businessId);
  res.json({ success: true, data });
}
