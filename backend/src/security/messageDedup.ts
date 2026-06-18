import prisma from '../utils/prisma';
import { tenantKey, redisIncr } from '../utils/redis';

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'P2002'
  );
}

/** Returns true if this inbound message should be processed (first time only). */
export async function claimInboundMessage(businessId: string, externalId: string): Promise<boolean> {
  const id = externalId.trim();
  if (!id) return true;

  try {
    await prisma.inboundMessageDedup.create({
      data: { businessId, externalId: id },
    });
    return true;
  } catch (err) {
    if (isUniqueViolation(err)) {
      console.log(`[dedup] duplicate message ${id} for business ${businessId}, skipping`);
      return false;
    }
    console.warn('[dedup] DB claim failed, falling back to Redis:', err instanceof Error ? err.message : err);
  }

  const count = await redisIncr(tenantKey(businessId, 'msg', id), 86400);
  if (count === 0) {
    // Redis unavailable — allow once rather than drop messages entirely.
    return true;
  }
  return count === 1;
}
