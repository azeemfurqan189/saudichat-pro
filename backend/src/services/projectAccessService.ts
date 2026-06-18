import { MemberRole } from '@prisma/client';
import prisma from '../utils/prisma';
import { hashPassword, normalizePhone } from '../utils/auth';
import type { ResolvedAccess } from './membershipService';
import {
  ALL_PROJECT_PERMISSION_KEYS,
  DEFAULT_MANAGER_PERMISSIONS,
  sanitizePermissionList,
} from '../constants/projectPermissions';

export async function businessUsesStrictProjectAccess(businessId: string): Promise<boolean> {
  try {
    const count = await prisma.projectMemberAccess.count({ where: { businessId, isActive: true } });
    return count > 0;
  } catch {
    return false;
  }
}

export async function getMemberProjectPermissions(
  businessId: string,
  memberId: string,
  projectId: string,
  role: MemberRole
): Promise<string[]> {
  if (role === 'OWNER') return ALL_PROJECT_PERMISSION_KEYS;

  try {
    const row = await prisma.projectMemberAccess.findUnique({
      where: { projectId_memberId: { projectId, memberId } },
    });
    if (row?.isActive) {
      return sanitizePermissionList(row.permissions);
    }
  } catch {
    /* table may not exist yet */
  }

  const project = await prisma.agencyProject.findFirst({
    where: { id: projectId, businessId, managerMemberId: memberId },
    select: { id: true },
  });
  if (project) return DEFAULT_MANAGER_PERMISSIONS;

  const strict = await businessUsesStrictProjectAccess(businessId);
  if (!strict && role === 'MANAGER') return ALL_PROJECT_PERMISSION_KEYS;

  return [];
}

export async function hasProjectPermission(
  access: ResolvedAccess,
  projectId: string,
  permission: string
): Promise<boolean> {
  const perms = await getMemberProjectPermissions(
    access.businessId,
    access.memberId,
    projectId,
    access.role
  );
  return perms.includes(permission);
}

export async function getAccessibleProjectIds(access: ResolvedAccess): Promise<string[] | null> {
  if (access.role === 'OWNER') return null;

  const strict = await businessUsesStrictProjectAccess(access.businessId);
  if (!strict && access.role === 'MANAGER') return null;

  const ids = new Set<string>();

  try {
    const rows = await prisma.projectMemberAccess.findMany({
      where: { businessId: access.businessId, memberId: access.memberId, isActive: true },
      select: { projectId: true, permissions: true },
    });
    for (const row of rows) {
      const perms = sanitizePermissionList(row.permissions);
      if (perms.includes('project.view') || perms.length > 0) ids.add(row.projectId);
    }
  } catch {
    if (access.role === 'MANAGER') return null;
  }

  const managed = await prisma.agencyProject.findMany({
    where: { businessId: access.businessId, managerMemberId: access.memberId },
    select: { id: true },
  });
  for (const p of managed) ids.add(p.id);

  return [...ids];
}

export async function upsertProjectAccessByPhone(input: {
  businessId: string;
  projectId: string;
  phone: string;
  name?: string;
  permissions: string[];
}) {
  const normalizedPhone = normalizePhone(input.phone);
  if (!normalizedPhone) throw new Error('Valid phone number required');

  const permissions = sanitizePermissionList(input.permissions);
  const displayName = (input.name || 'Project Manager').trim();

  let user = await prisma.user.findFirst({ where: { phone: normalizedPhone } });
  if (!user) {
    const digits = normalizedPhone.replace(/\D/g, '');
    const email = `mgr.${digits}@member.saudichat.app`;
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    user = await prisma.user.create({
      data: {
        name: displayName,
        email: existingEmail ? `mgr.${digits}.${Date.now()}@member.saudichat.app` : email,
        phone: normalizedPhone,
        password: await hashPassword('Welcome123!'),
      },
    });
  } else if (displayName && user.name === 'Team Member') {
    await prisma.user.update({ where: { id: user.id }, data: { name: displayName } });
  }

  let member = await prisma.businessMember.findUnique({
    where: { businessId_userId: { businessId: input.businessId, userId: user.id } },
  });

  if (!member) {
    member = await prisma.businessMember.create({
      data: {
        businessId: input.businessId,
        userId: user.id,
        role: 'MANAGER',
        department: 'Project Management',
        joinedAt: new Date(),
      },
    });
  } else if (member.role === 'FIELD_WORKER') {
    member = await prisma.businessMember.update({
      where: { id: member.id },
      data: { role: 'MANAGER' },
    });
  }

  const row = await prisma.projectMemberAccess.upsert({
    where: { projectId_memberId: { projectId: input.projectId, memberId: member.id } },
    create: {
      businessId: input.businessId,
      projectId: input.projectId,
      memberId: member.id,
      permissions,
    },
    update: { permissions, isActive: true },
    include: {
      member: { include: { user: { select: { id: true, name: true, phone: true, email: true } } } },
    },
  });

  return row;
}
