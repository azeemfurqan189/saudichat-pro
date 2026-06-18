import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { CMMS_SECURITY_ROLES } from '../constants/cmmsSecurity';
import {
  getCmmsSecuritySummary,
  updateMemberCmmsRole,
  seedCmmsSecurityDemo,
} from '../services/cmmsSecurityService';

export async function getCmmsSecurity(req: AuthRequest, res: Response) {
  const data = await getCmmsSecuritySummary(req.params.businessId);
  res.json({ success: true, data });
}

export async function patchMemberCmmsRole(req: AuthRequest, res: Response) {
  const { cmmsRole } = req.body ?? {};
  const valid = CMMS_SECURITY_ROLES.some((r) => r.key === cmmsRole);
  if (!valid) {
    res.status(400).json({ success: false, message: 'Invalid CMMS role' });
    return;
  }
  const data = await updateMemberCmmsRole(req.params.businessId, req.params.memberId, cmmsRole);
  res.json({ success: true, data });
}

export async function seedCmmsSecurity(req: AuthRequest, res: Response) {
  const result = await seedCmmsSecurityDemo(req.params.businessId);
  res.json({ success: true, data: result });
}
