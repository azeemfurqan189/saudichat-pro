import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/auth';
import prisma from '../utils/prisma';

export interface AuthRequest extends Request {
  user?: JwtPayload;
  businessId?: string;
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

  const business = await prisma.business.findFirst({
    where: { id: businessId, userId: req.user.userId },
  });

  if (!business) {
    res.status(403).json({ success: false, message: 'Access denied to this business' });
    return;
  }

  req.businessId = businessId;
  next();
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error('[Error]', err.message);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
  });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ success: false, message: 'Route not found' });
}
