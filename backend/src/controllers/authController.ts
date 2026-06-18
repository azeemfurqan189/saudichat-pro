import { Response } from 'express';
import prisma from '../utils/prisma';
import {
  hashPassword,
  comparePassword,
  signToken,
  generateOTP,
  storeOTP,
  verifyOTP,
  normalizePhone,
} from '../utils/auth';
import { AuthRequest } from '../middleware/auth';
import { validateBody, loginSchema, signupSchema, verifyOtpSchema } from '../utils/validation';
import { getAccessibleBusinesses } from '../services/membershipService';
import { acceptMemberInvite, getInvitePreview } from '../services/memberInviteService';

export async function login(req: AuthRequest, res: Response): Promise<void> {
  const validation = validateBody(loginSchema, req.body);
  if (validation.success === false) {
    res.status(400).json({ success: false, errors: validation.errors });
    return;
  }

  const phone = normalizePhone(validation.data.phone);
  const { password } = validation.data;
  const user = await prisma.user.findUnique({ where: { phone } });

  if (!user || !(await comparePassword(password, user.password))) {
    res.status(401).json({ success: false, message: 'Invalid phone or password' });
    return;
  }

  const businesses = await getAccessibleBusinesses(user.id);

  const token = signToken({ userId: user.id, email: user.email });

  res.json({
    success: true,
    data: {
      token,
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, avatar: user.avatar },
      businesses: businesses.map((b) => ({
        ...b.business,
        memberRole: b.role,
        memberId: b.memberId,
      })),
    },
  });
}

export async function signup(req: AuthRequest, res: Response): Promise<void> {
  const validation = validateBody(signupSchema, req.body);
  if (validation.success === false) {
    res.status(400).json({ success: false, errors: validation.errors });
    return;
  }

  const { name, email, password } = validation.data;
  const phone = normalizePhone(validation.data.phone);

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { phone }] },
  });

  if (existing) {
    res.status(409).json({ success: false, message: 'Email or phone already registered' });
    return;
  }

  const otp = generateOTP();
  storeOTP(phone, otp);

  const smsConfigured = Boolean(process.env.UNIFONIC_APP_SID);
  const showOtpOnScreen =
    process.env.SHOW_OTP_IN_RESPONSE === 'true' ||
    process.env.NODE_ENV === 'development' ||
    !smsConfigured;

  res.json({
    success: true,
    message: smsConfigured ? 'OTP sent to your phone' : 'OTP generated — enter the code shown below',
    ...(showOtpOnScreen && { otp }),
  });
}

export async function verifySignupOtp(req: AuthRequest, res: Response): Promise<void> {
  const otpValidation = validateBody(verifyOtpSchema, req.body);
  if (otpValidation.success === false) {
    res.status(400).json({ success: false, errors: otpValidation.errors });
    return;
  }

  const phone = normalizePhone(otpValidation.data.phone);
  const { otp } = otpValidation.data;

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
  const rawPhone = req.body?.phone as string | undefined;
  if (!rawPhone) {
    res.status(400).json({ success: false, message: 'Phone required' });
    return;
  }
  const phone = normalizePhone(rawPhone);

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    res.status(404).json({ success: false, message: 'Phone not found' });
    return;
  }

  const otp = generateOTP();
  storeOTP(phone, otp);

  const smsConfigured = Boolean(process.env.UNIFONIC_APP_SID);
  const showOtpOnScreen =
    process.env.SHOW_OTP_IN_RESPONSE === 'true' ||
    process.env.NODE_ENV === 'development' ||
    !smsConfigured;

  res.json({
    success: true,
    message: smsConfigured ? 'OTP sent' : 'OTP generated',
    ...(showOtpOnScreen && { otp }),
  });
}

export async function resetPassword(req: AuthRequest, res: Response): Promise<void> {
  const { otp, password } = req.body as { phone?: string; otp?: string; password?: string };
  const phone = req.body?.phone ? normalizePhone(String(req.body.phone)) : '';
  if (!phone || !otp || !password) {
    res.status(400).json({ success: false, message: 'Phone, OTP, and password required' });
    return;
  }
  if (String(password).length < 6) {
    res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    return;
  }

  if (!verifyOTP(phone, String(otp))) {
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

  const accessible = await getAccessibleBusinesses(req.user!.userId);

  res.json({
    success: true,
    data: {
      user,
      businesses: accessible.map((b) => ({
        ...b.business,
        memberRole: b.role,
        memberId: b.memberId,
      })),
    },
  });
}

export async function getMemberInvite(req: AuthRequest, res: Response): Promise<void> {
  const token = String(req.params.token || '');
  if (!token) {
    res.status(400).json({ success: false, message: 'Invite token required' });
    return;
  }
  const preview = await getInvitePreview(token);
  if (!preview.valid) {
    res.status(404).json({ success: false, message: 'Invalid or expired invite', reason: preview.reason });
    return;
  }
  res.json({ success: true, data: preview });
}

export async function acceptMemberInviteHandler(req: AuthRequest, res: Response): Promise<void> {
  const token = String(req.params.token || '');
  const phone = String(req.body?.phone || '');
  const password = String(req.body?.password || '');
  if (!token) {
    res.status(400).json({ success: false, message: 'Invite token required' });
    return;
  }
  try {
    const data = await acceptMemberInvite(token, phone, password);
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : 'Could not accept invite',
    });
  }
}
