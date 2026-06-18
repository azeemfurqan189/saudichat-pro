import { Request, Response, NextFunction } from 'express';
import { MemberRole } from '@prisma/client';
import { verifyToken, JwtPayload } from '../utils/auth';
import { resolveBusinessAccess, hasMinRole } from '../services/membershipService';
import { formatPrismaError } from '../utils/prismaErrors';

export interface AuthRequest extends Request {
  user?: JwtPayload;
  businessId?: string;
  membership?: {
    businessId: string;
    userId: string;
    role: MemberRole;
    memberId: string;
    isOwner: boolean;
  };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  try {
    const token = authHeader.split(' ')[1];
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

export async function businessAccessMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const businessId = req.params.businessId || req.body.businessId;
  if (!businessId || !req.user) {
    res.status(400).json({ success: false, message: 'Business ID required' });
    return;
  }

  const access = await resolveBusinessAccess(req.user.userId, businessId);
  if (!access) {
    res.status(403).json({ success: false, message: 'Access denied to this business' });
    return;
  }

  req.businessId = businessId;
  req.membership = access;
  next();
}

export function requireMinRole(minRole: MemberRole) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.membership || !hasMinRole(req.membership.role, minRole)) {
      res.status(403).json({ success: false, message: 'Insufficient role permissions' });
      return;
    }
    next();
  };
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error('[Error]', err.message, err);

  if (!process.env.DATABASE_URL) {
    res.status(503).json({
      success: false,
      message: 'Database not configured. Set DATABASE_URL on Railway.',
    });
    return;
  }

  if (err.message.includes("Can't reach database") || err.message.includes('P1001')) {
    res.status(503).json({
      success: false,
      message: 'Database connection failed. Check DATABASE_URL on Railway.',
    });
    return;
  }

  const formatted = formatPrismaError(err);
  res.status(formatted.status).json({
    success: false,
    message: formatted.message,
  });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ success: false, message: 'Route not found' });
}
