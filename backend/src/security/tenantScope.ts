import prisma from '../utils/prisma';

export class TenantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenantError';
  }
}

export async function assertActiveBusiness(businessId: string): Promise<{ id: string; subscriptionPlan: string; settings: Record<string, unknown> }> {
  const business = await prisma.business.findFirst({
    where: { id: businessId, isActive: true },
    select: { id: true, subscriptionPlan: true, settings: true },
  });
  if (!business) {
    throw new TenantError(`Business ${businessId} not found or inactive`);
  }
  return {
    id: business.id,
    subscriptionPlan: business.subscriptionPlan,
    settings: (business.settings as Record<string, unknown>) || {},
  };
}

export function assertRecordBelongsToTenant<T extends { businessId: string }>(
  businessId: string,
  record: T | null,
  label = 'Record'
): T {
  if (!record || record.businessId !== businessId) {
    throw new TenantError(`${label} does not belong to business ${businessId}`);
  }
  return record;
}

/** Merge businessId into any Prisma where clause */
export function withTenant<T extends Record<string, unknown>>(
  businessId: string,
  where: T = {} as T
): T & { businessId: string } {
  return { ...where, businessId };
}

export function validateBusinessIdInPayload(businessId: string, payloadBusinessId?: string): void {
  if (payloadBusinessId && payloadBusinessId !== businessId) {
    throw new TenantError('Payload businessId mismatch');
  }
}
