import { SubscriptionPlan } from '@prisma/client';
import { getPlanQuotas } from './planQuotas';
import { QuotaCheckResult } from './quotaManager';
import { redisGet, redisIncr, tenantKey } from '../utils/redis';

export async function checkApiCallQuota(
  businessId: string,
  plan: SubscriptionPlan
): Promise<QuotaCheckResult> {
  const quotas = getPlanQuotas(plan);
  const minuteKey = tenantKey(businessId, 'quota', 'api', new Date().toISOString().slice(0, 16));
  const count = await redisIncr(minuteKey, 120);

  if (count === 0) return { allowed: true };

  if (count > quotas.apiCallsPerMinute) {
    return {
      allowed: false,
      reason: 'API calls per minute exceeded',
      fallbackMode: 'rate_limited',
    };
  }
  return { allowed: true };
}

export async function acquireConcurrentAgent(
  businessId: string,
  plan: SubscriptionPlan
): Promise<QuotaCheckResult> {
  const quotas = getPlanQuotas(plan);
  const key = tenantKey(businessId, 'quota', 'concurrent_agents');
  const { getRedis } = await import('../utils/redis');
  const redis = getRedis();
  if (!redis) return { allowed: true };

  try {
    if (redis.status !== 'ready') await redis.connect();
    const count = await redis.incr(key);
    await redis.expire(key, 300);
    if (count > quotas.maxConcurrentAgents) {
      await redis.decr(key);
      return {
        allowed: false,
        reason: 'Max concurrent agent sessions exceeded',
        fallbackMode: 'rate_limited',
      };
    }
    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}

export async function releaseConcurrentAgent(businessId: string): Promise<void> {
  const key = tenantKey(businessId, 'quota', 'concurrent_agents');
  const { getRedis } = await import('../utils/redis');
  const redis = getRedis();
  if (!redis) return;
  try {
    if (redis.status !== 'ready') await redis.connect();
    const val = await redis.decr(key);
    if (val < 0) await redis.set(key, '0', 'EX', 300);
  } catch {
    // ignore
  }
}

export async function getQuotaUsage(businessId: string, plan: SubscriptionPlan) {
  const quotas = getPlanQuotas(plan);
  const day = new Date().toISOString().slice(0, 10);
  const month = new Date().toISOString().slice(0, 7);
  const minute = new Date().toISOString().slice(0, 16);

  const [msgs, tokens, apiCalls, agents] = await Promise.all([
    redisGet(tenantKey(businessId, 'quota', 'msgs', day)),
    redisGet(tenantKey(businessId, 'quota', 'tokens', month)),
    redisGet(tenantKey(businessId, 'quota', 'api', minute)),
    redisGet(tenantKey(businessId, 'quota', 'concurrent_agents')),
  ]);

  return {
    messagesToday: parseInt(msgs || '0', 10),
    messagesLimit: quotas.messagesPerDay,
    tokensThisMonth: parseInt(tokens || '0', 10),
    tokensLimit: quotas.tokensPerMonth,
    apiCallsThisMinute: parseInt(apiCalls || '0', 10),
    apiCallsLimit: quotas.apiCallsPerMinute,
    concurrentAgents: parseInt(agents || '0', 10),
    concurrentAgentsLimit: quotas.maxConcurrentAgents,
  };
}
