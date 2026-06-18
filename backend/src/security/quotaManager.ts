import { SubscriptionPlan } from '@prisma/client';
import { getPlanQuotas } from './planQuotas';
import { redisIncr, tenantKey } from '../utils/redis';

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  fallbackMode?: 'autoreply_only' | 'rate_limited';
}

export async function checkMessageQuota(
  businessId: string,
  plan: SubscriptionPlan
): Promise<QuotaCheckResult> {
  const quotas = getPlanQuotas(plan);
  const dayKey = tenantKey(businessId, 'quota', 'msgs', new Date().toISOString().slice(0, 10));
  const count = await redisIncr(dayKey, 86400);

  if (count === 0) return { allowed: true };

  if (count > quotas.messagesPerDay) {
    return {
      allowed: false,
      reason: 'Daily message quota exceeded',
      fallbackMode: 'autoreply_only',
    };
  }
  return { allowed: true };
}

export async function checkCustomerRateLimit(
  businessId: string,
  phone: string,
  maxPerMinute = 10
): Promise<QuotaCheckResult> {
  const key = tenantKey(businessId, 'ratelimit', 'phone', phone);
  const count = await redisIncr(key, 60);

  if (count === 0) return { allowed: true };

  if (count > maxPerMinute) {
    return {
      allowed: false,
      reason: 'Customer sending too many messages',
      fallbackMode: 'rate_limited',
    };
  }
  return { allowed: true };
}

export async function checkAiTokenBudget(
  businessId: string,
  plan: SubscriptionPlan,
  settings: Record<string, unknown>
): Promise<QuotaCheckResult> {
  if (settings.aiPaused === true) {
    return { allowed: false, reason: 'AI paused due to budget', fallbackMode: 'autoreply_only' };
  }

  const quotas = getPlanQuotas(plan);
  const monthKey = tenantKey(businessId, 'quota', 'tokens', new Date().toISOString().slice(0, 7));
  const { redisGet } = await import('../utils/redis');
  const usedStr = await redisGet(monthKey);
  const used = parseInt(usedStr || '0', 10);

  if (used >= quotas.tokensPerMonth) {
    return { allowed: false, reason: 'Monthly AI token quota exceeded', fallbackMode: 'autoreply_only' };
  }
  return { allowed: true };
}

export async function recordTokenUsage(businessId: string, tokens: number): Promise<void> {
  if (tokens <= 0) return;
  const monthKey = tenantKey(businessId, 'quota', 'tokens', new Date().toISOString().slice(0, 7));
  await redisIncr(monthKey, 86400 * 32);
  const { getRedis } = await import('../utils/redis');
  const redis = getRedis();
  if (redis) {
    try {
      if (redis.status !== 'ready') await redis.connect();
      await redis.incrby(monthKey, tokens);
    } catch {
      // ignore
    }
  }
}

export async function checkIdempotency(businessId: string, messageId: string): Promise<boolean> {
  const { claimInboundMessage } = await import('./messageDedup');
  return claimInboundMessage(businessId, messageId);
}
