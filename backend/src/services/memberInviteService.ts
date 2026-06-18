import crypto from 'crypto';
import prisma from '../utils/prisma';
import { hashPassword, normalizePhone, signToken } from '../utils/auth';
import { sendEmail } from './emailService';
import { sendSms } from './smsService';
import { getAccessibleBusinesses } from './membershipService';

const INVITE_DAYS = 7;
const DEFAULT_TEMP_PASSWORD = 'Welcome123!';

export function getFrontendUrl(): string {
  return (process.env.FRONTEND_URL || 'https://saudichat-pro.vercel.app').replace(/\/$/, '');
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '****';
  return `${phone.slice(0, 4)} *** ${digits.slice(-4)}`;
}

export type InviteDelivery = {
  token: string;
  inviteUrl: string;
  phone: string;
  tempPassword: string;
  smsAttempted: boolean;
  emailAttempted: boolean;
};

export async function createAndSendMemberInvite(input: {
  businessId: string;
  memberId: string;
  userId: string;
  tempPassword?: string;
  contextLabel?: string;
}): Promise<InviteDelivery> {
  const tempPassword = input.tempPassword || DEFAULT_TEMP_PASSWORD;
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000);

  await prisma.memberInvite.updateMany({
    where: { memberId: input.memberId, usedAt: null },
    data: { usedAt: new Date() },
  });

  await prisma.memberInvite.create({
    data: {
      token,
      businessId: input.businessId,
      userId: input.userId,
      memberId: input.memberId,
      expiresAt,
    },
  });

  const [business, user, member] = await Promise.all([
    prisma.business.findUnique({ where: { id: input.businessId }, select: { name: true } }),
    prisma.user.findUnique({ where: { id: input.userId }, select: { name: true, phone: true, email: true } }),
    prisma.businessMember.findUnique({ where: { id: input.memberId }, select: { role: true } }),
  ]);

  if (!business || !user) {
    throw new Error('Invite user or business not found');
  }

  const inviteUrl = `${getFrontendUrl()}/join/${token}`;
  const roleLabel = member?.role || 'MEMBER';
  const ctx = input.contextLabel || business.name;

  const smsBody = [
    `SaudiChat Pro — ${ctx}`,
    `${business.name} invited you (${roleLabel}).`,
    `Link: ${inviteUrl}`,
    `Phone: ${user.phone}`,
    `Password: ${tempPassword}`,
    'Open link → confirm phone → set password → login.',
  ].join('\n');

  const emailSubject = `You're invited to ${business.name} on SaudiChat Pro`;
  const emailBody = [
    `Hello ${user.name},`,
    '',
    `You have been invited to join ${business.name} on SaudiChat Pro.`,
    input.contextLabel ? `Access: ${input.contextLabel}` : '',
    '',
    `Open this link to activate your account:`,
    inviteUrl,
    '',
    `Login phone: ${user.phone}`,
    `Temporary password: ${tempPassword}`,
    '',
    'On the link page, confirm your phone number and choose a new password.',
    '',
    `This link expires in ${INVITE_DAYS} days.`,
  ]
    .filter(Boolean)
    .join('\n');

  let smsAttempted = false;
  let emailAttempted = false;

  try {
    await sendSms(input.businessId, user.phone, smsBody);
    smsAttempted = true;
  } catch (err) {
    console.warn('[invite] SMS failed:', err instanceof Error ? err.message : err);
  }

  if (user.email && !user.email.endsWith('@member.saudichat.app')) {
    try {
      await sendEmail(input.businessId, user.email, emailSubject, emailBody);
      emailAttempted = true;
    } catch (err) {
      console.warn('[invite] Email failed:', err instanceof Error ? err.message : err);
    }
  }

  await prisma.analyticsEvent.create({
    data: {
      businessId: input.businessId,
      eventType: 'member_invite_sent',
      metadata: {
        memberId: input.memberId,
        userId: input.userId,
        inviteUrl,
        smsAttempted,
        emailAttempted,
      },
    },
  });

  return {
    token,
    inviteUrl,
    phone: user.phone,
    tempPassword,
    smsAttempted,
    emailAttempted,
  };
}

export async function getInvitePreview(token: string) {
  const invite = await prisma.memberInvite.findUnique({
    where: { token },
    include: {
      business: { select: { id: true, name: true, nameAr: true } },
      user: { select: { id: true, name: true, phone: true, email: true } },
      member: { select: { role: true, isActive: true } },
    },
  });

  if (!invite) {
    return { valid: false as const, reason: 'not_found' as const };
  }
  if (invite.usedAt) {
    return { valid: false as const, reason: 'used' as const };
  }
  if (invite.expiresAt < new Date()) {
    return { valid: false as const, reason: 'expired' as const };
  }
  if (!invite.member.isActive) {
    return { valid: false as const, reason: 'inactive' as const };
  }

  return {
    valid: true as const,
    businessId: invite.businessId,
    businessName: invite.business.name,
    businessNameAr: invite.business.nameAr,
    userName: invite.user.name,
    phone: invite.user.phone,
    phoneMasked: maskPhone(invite.user.phone),
    role: invite.member.role,
    expiresAt: invite.expiresAt.toISOString(),
  };
}

export async function acceptMemberInvite(token: string, phone: string, password: string) {
  const normalized = normalizePhone(phone);
  if (!normalized || password.length < 6) {
    throw new Error('Valid phone and password (min 6 characters) required');
  }

  const invite = await prisma.memberInvite.findUnique({
    where: { token },
    include: { user: true, member: true },
  });

  if (!invite) throw new Error('Invite link not found');
  if (invite.usedAt) throw new Error('This invite link was already used');
  if (invite.expiresAt < new Date()) throw new Error('Invite link expired — ask owner for a new invite');
  if (!invite.member.isActive) throw new Error('Account access was deactivated');

  if (normalizePhone(invite.user.phone) !== normalized) {
    throw new Error('Phone number does not match this invite');
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: invite.userId },
      data: { password: await hashPassword(password) },
    }),
    prisma.memberInvite.update({
      where: { id: invite.id },
      data: { usedAt: new Date() },
    }),
    prisma.businessMember.update({
      where: { id: invite.memberId },
      data: { joinedAt: new Date() },
    }),
  ]);

  const businesses = await getAccessibleBusinesses(invite.userId);
  const jwt = signToken({ userId: invite.userId, email: invite.user.email });

  return {
    token: jwt,
    user: {
      id: invite.user.id,
      name: invite.user.name,
      email: invite.user.email,
      phone: invite.user.phone,
    },
    businesses: businesses.map((b) => ({
      ...b.business,
      memberRole: b.role,
      memberId: b.memberId,
    })),
  };
}
