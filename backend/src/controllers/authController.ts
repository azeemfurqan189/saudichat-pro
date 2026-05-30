import { Response } from 'express';
import prisma from '../utils/prisma';
import {
  hashPassword,
  comparePassword,
  signToken,
  generateOTP,
  storeOTP,
  verifyOTP,
} from '../utils/auth';
import { AuthRequest } from '../middleware/auth';
import { validateBody, loginSchema, signupSchema, verifyOtpSchema } from '../utils/validation';

export async function login(req: AuthRequest, res: Response): Promise<void> {
  const validation = validateBody(loginSchema, req.body);
  if (!validation.success) {
    res.status(400).json({ success: false, errors: validation.errors });
    return;
  }

  const { phone, password } = validation.data;
  const user = await prisma.user.findUnique({ where: { phone } });

  if (!user || !(await comparePassword(password, user.password))) {
    res.status(401).json({ success: false, message: 'Invalid phone or password' });
    return;
  }

  const businesses = await prisma.business.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, type: true, slug: true, logo: true },
  });

  const token = signToken({ userId: user.id, email: user.email });

  res.json({
    success: true,
    data: {
      token,
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, avatar: user.avatar },
      businesses,
    },
  });
}

export async function signup(req: AuthRequest, res: Response): Promise<void> {
  const validation = validateBody(signupSchema, req.body);
  if (!validation.success) {
    res.status(400).json({ success: false, errors: validation.errors });
    return;
  }

  const { name, email, phone, password } = validation.data;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { phone }] },
  });

  if (existing) {
    res.status(409).json({ success: false, message: 'Email or phone already registered' });
    return;
  }

  const otp = generateOTP();
  storeOTP(phone, otp);

  // In production, send OTP via SMS
  res.json({
    success: true,
    message: 'OTP sent to your phone',
    ...(process.env.NODE_ENV === 'development' && { otp }),
  });
}

export async function verifySignupOtp(req: AuthRequest, res: Response): Promise<void> {
  const otpValidation = validateBody(verifyOtpSchema, req.body);
  if (!otpValidation.success) {
    res.status(400).json({ success: false, errors: otpValidation.errors });
    return;
  }

  const { phone, otp } = otpValidation.data;

  if (!verifyOTP(phone, otp)) {
    res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    return;
  }

  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ success: false, message: 'Missing registration data' });
    return;
  }

  const hashedPassword = await hashPassword(password);
  const user = await prisma.user.create({
    data: { name, email, phone, password: hashedPassword },
  });

  const token = signToken({ userId: user.id, email: user.email });

  res.status(201).json({
    success: true,
    data: {
      token,
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone },
      businesses: [],
    },
  });
}

export async function forgotPassword(req: AuthRequest, res: Response): Promise<void> {
  const { phone } = req.body;
  if (!phone) {
    res.status(400).json({ success: false, message: 'Phone required' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    res.status(404).json({ success: false, message: 'Phone not found' });
    return;
  }

  const otp = generateOTP();
  storeOTP(phone, otp);

  res.json({
    success: true,
    message: 'OTP sent',
    ...(process.env.NODE_ENV === 'development' && { otp }),
  });
}

export async function resetPassword(req: AuthRequest, res: Response): Promise<void> {
  const { phone, otp, password } = req.body;
  if (!phone || !otp || !password) {
    res.status(400).json({ success: false, message: 'Phone, OTP, and password required' });
    return;
  }

  if (!verifyOTP(phone, otp)) {
    res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    return;
  }

  const hashedPassword = await hashPassword(password);
  await prisma.user.update({
    where: { phone },
    data: { password: hashedPassword },
  });

  res.json({ success: true, message: 'Password reset successfully' });
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, name: true, email: true, phone: true, avatar: true, createdAt: true },
  });

  const businesses = await prisma.business.findMany({
    where: { userId: req.user!.userId },
  });

  res.json({ success: true, data: { user, businesses } });
}
