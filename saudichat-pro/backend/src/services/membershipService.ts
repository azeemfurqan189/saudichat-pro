import { MemberRole } from '@prisma/client';
import prisma from '../utils/prisma';

export type ResolvedAccess = {
  businessId: string;
  userId: string;
  role: MemberRole;
  memberId: string;
  isOwner: boolean;
};

function isSchemaNotReadyError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('BusinessMember') ||
    msg.includes('does not exist') ||
    msg.includes('P2021') ||
    msg.includes('relation') ||
    msg.includes('invalid input value for enum') ||
    msg.includes('BusinessType')
  );
}

/** Fallback when BusinessMember table is not migrated yet */
function legacyOwnerAccess(businessId: string, userId: string): ResolvedAccess {
  return {
    businessId,
    userId,
    role: 'OWNER',
    memberId: businessId,
    isOwner: true,
  };
}

export async function ensureOwnerMembership(businessId: string, userId: string) {
  try {
    const existing = await prisma.businessMember.findUnique({
      where: { businessId_userId: { businessId, userId } },
    });
    if (existing) {
      if (existing.role !== 'OWNER') {
        return prisma.businessMember.update({
          where: { id: existing.id },
          data: { role: 'OWNER', joinedAt: existing.joinedAt ?? new Date() },
        });
      }
      return existing;
    }
    return prisma.businessMember.create({
      data: {
        businessId,
        userId,
        role: 'OWNER',
        department: 'Management',
        joinedAt: new Date(),
      },
    });
  } catch (err) {
    if (isSchemaNotReadyError(err)) {
      console.warn('[membership] BusinessMember unavailable — legacy owner mode');
      return {
        id: businessId,
        businessId,
        userId,
        role: 'OWNER' as MemberRole,
        department: 'Management',
        isActive: true,
        joinedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        managerId: null,
        permissions: {},
      };
    }
    throw err;
  }
}

export async function resolveBusinessAccess(userId: string, businessId: string): Promise<ResolvedAccess | null> {
  const owned = await prisma.business.findFirst({
    where: { id: businessId, userId },
    select: { id: true, userId: true },
  });
  if (owned) {
    try {
      const member = await ensureOwnerMembership(businessId, userId);
      return {
        businessId,
        userId,
        role: 'OWNER',
        memberId: member.id,
        isOwner: true,
      };
    } catch (err) {
      if (isSchemaNotReadyError(err)) {
        return legacyOwnerAccess(businessId, userId);
      }
      throw err;
    }
  }

  try {
    const membership = await prisma.businessMember.findFirst({
      where: { businessId, userId, isActive: true },
    });
    if (!membership) return null;

    return {
      businessId,
      userId,
      role: membership.role,
      memberId: membership.id,
      isOwner: membership.role === 'OWNER',
    };
  } catch (err) {
    if (isSchemaNotReadyError(err)) return null;
    throw err;
  }
}

export async function getAccessibleBusinesses(userId: string) {
  const owned = await prisma.business.findMany({
    where: { userId },
    select: { id: true, name: true, type: true, slug: true, logo: true, nameAr: true },
  });

  try {
    for (const b of owned) {
      await ensureOwnerMembership(b.id, userId);
    }

    const memberships = await prisma.businessMember.findMany({
      where: { userId, isActive: true },
      include: {
        business: { select: { id: true, name: true, type: true, slug: true, logo: true, nameAr: true } },
      },
    });

    const map = new Map<string, { business: (typeof owned)[0]; role: MemberRole; memberId: string }>();

    for (const b of owned) {
      const m = memberships.find((x) => x.businessId === b.id);
      map.set(b.id, { business: b, role: 'OWNER', memberId: m?.id ?? b.id });
    }

    for (const m of memberships) {
      if (!map.has(m.businessId)) {
        map.set(m.businessId, { business: m.business, role: m.role, memberId: m.id });
      }
    }

    return Array.from(map.values());
  } catch (err) {
    if (isSchemaNotReadyError(err)) {
      console.warn('[membership] Using legacy business list (schema not fully migrated)');
      return owned.map((b) => ({
        business: b,
        role: 'OWNER' as MemberRole,
        memberId: b.id,
      }));
    }
    throw err;
  }
}

export function roleRank(role: MemberRole): number {
  const ranks: Record<MemberRole, number> = {
    OWNER: 4,
    MANAGER: 3,
    OFFICE_STAFF: 2,
    FIELD_WORKER: 1,
  };
  return ranks[role] ?? 0;
}

export function hasMinRole(userRole: MemberRole, minRole: MemberRole): boolean {
  return roleRank(userRole) >= roleRank(minRole);
}
