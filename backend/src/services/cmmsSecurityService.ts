import prisma from '../utils/prisma';
import {
  CMMS_PERMISSION_ACTIONS,
  CMMS_SECURITY_MODULES,
  CMMS_SECURITY_ROLES,
  DEFAULT_CMMS_ROLE_MATRIX,
  DEFAULT_MEMBER_ROLE_MAP,
  CmmsPermissionAction,
  CmmsSecurityModule,
  CmmsSecurityRole,
  RolePermissionMatrix,
  resolveCmmsRole,
} from '../constants/cmmsSecurity';

type StoredConfig = {
  roleMatrix?: Record<string, RolePermissionMatrix>;
  memberAssignments?: Record<string, string>;
};

async function getOrCreateConfig(businessId: string) {
  const existing = await prisma.cmmsSecurityConfig.findUnique({ where: { businessId } });
  if (existing) return existing;
  return prisma.cmmsSecurityConfig.create({
    data: {
      businessId,
      roleMatrix: DEFAULT_CMMS_ROLE_MATRIX,
      memberAssignments: {},
    },
  });
}

function mergeMatrix(stored: StoredConfig): Record<CmmsSecurityRole, RolePermissionMatrix> {
  return { ...DEFAULT_CMMS_ROLE_MATRIX, ...(stored.roleMatrix as Record<CmmsSecurityRole, RolePermissionMatrix> | undefined) };
}

export async function getCmmsSecuritySummary(businessId: string) {
  const config = await getOrCreateConfig(businessId);
  const roleMatrix = mergeMatrix(config as StoredConfig);
  const memberAssignments = (config.memberAssignments as Record<string, string>) ?? {};

  const members = await prisma.businessMember.findMany({
    where: { businessId, isActive: true },
    include: { user: { select: { id: true, name: true, email: true, phone: true } } },
    orderBy: { role: 'asc' },
  });

  const team = members.map((m) => {
    const cmmsRole = resolveCmmsRole(m.role, memberAssignments, m.id);
    const permissions = roleMatrix[cmmsRole] ?? {};
    const permissionCount = CMMS_SECURITY_MODULES.reduce((sum, mod) => {
      const p = permissions[mod.key];
      if (!p) return sum;
      return sum + CMMS_PERMISSION_ACTIONS.filter((a) => p[a]).length;
    }, 0);
    return {
      memberId: m.id,
      name: m.user.name,
      email: m.user.email,
      systemRole: m.role,
      cmmsRole,
      permissionCount,
    };
  });

  const matrixRows = CMMS_SECURITY_ROLES.map((role) => ({
    role: role.key,
    labelEn: role.labelEn,
    labelAr: role.labelAr,
    layer: role.layer,
    modules: CMMS_SECURITY_MODULES.map((mod) => ({
      module: mod.key,
      labelEn: mod.labelEn,
      labelAr: mod.labelAr,
      permissions: CMMS_PERMISSION_ACTIONS.reduce(
        (acc, action) => {
          acc[action] = roleMatrix[role.key]?.[mod.key]?.[action] === true;
          return acc;
        },
        {} as Record<CmmsPermissionAction, boolean>
      ),
    })),
  }));

  return {
    roles: CMMS_SECURITY_ROLES,
    modules: CMMS_SECURITY_MODULES,
    actions: CMMS_PERMISSION_ACTIONS,
    roleMatrix: matrixRows,
    defaultRoleMap: DEFAULT_MEMBER_ROLE_MAP,
    team,
    stats: {
      members: team.length,
      roles: CMMS_SECURITY_ROLES.length,
      modules: CMMS_SECURITY_MODULES.length,
      actions: CMMS_PERMISSION_ACTIONS.length,
    },
  };
}

export async function updateMemberCmmsRole(
  businessId: string,
  memberId: string,
  cmmsRole: CmmsSecurityRole
) {
  const config = await getOrCreateConfig(businessId);
  const assignments = { ...((config.memberAssignments as Record<string, string>) ?? {}) };
  assignments[memberId] = cmmsRole;
  await prisma.cmmsSecurityConfig.update({
    where: { businessId },
    data: { memberAssignments: assignments },
  });
  return getCmmsSecuritySummary(businessId);
}

export async function checkMemberCmmsPermission(
  businessId: string,
  memberId: string,
  memberRole: string,
  module: CmmsSecurityModule,
  action: CmmsPermissionAction
) {
  const config = await getOrCreateConfig(businessId);
  const roleMatrix = mergeMatrix(config as StoredConfig);
  const assignments = (config.memberAssignments as Record<string, string>) ?? {};
  const cmmsRole = resolveCmmsRole(memberRole, assignments, memberId);
  const perms = roleMatrix[cmmsRole]?.[module];
  return perms?.[action] === true;
}

export async function seedCmmsSecurityDemo(businessId: string) {
  const assignments: Record<string, string> = {};
  const members = await prisma.businessMember.findMany({
    where: { businessId, isActive: true },
    orderBy: { createdAt: 'asc' },
  });

  const demoRoles: CmmsSecurityRole[] = [
    'MANAGER',
    'PLANNER',
    'STOREKEEPER',
    'SUPERVISOR',
    'TECHNICIAN',
    'OPERATOR',
  ];

  let roleIdx = 0;
  for (const m of members) {
    if (m.role === 'OWNER') {
      assignments[m.id] = 'ADMIN';
    } else {
      assignments[m.id] =
        demoRoles[roleIdx % demoRoles.length] ?? DEFAULT_MEMBER_ROLE_MAP[m.role] ?? 'OPERATOR';
      roleIdx += 1;
    }
  }

  await prisma.cmmsSecurityConfig.upsert({
    where: { businessId },
    create: { businessId, roleMatrix: DEFAULT_CMMS_ROLE_MATRIX, memberAssignments: assignments },
    update: { roleMatrix: DEFAULT_CMMS_ROLE_MATRIX, memberAssignments: assignments },
  });

  return { skipped: false, assigned: Object.keys(assignments).length };
}
