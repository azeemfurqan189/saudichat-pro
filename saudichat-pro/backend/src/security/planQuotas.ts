import { SubscriptionPlan } from '@prisma/client';

export interface PlanQuotas {
  messagesPerDay: number;
  tokensPerMonth: number;
  apiCallsPerMinute: number;
  maxConcurrentAgents: number;
}

export const PLAN_QUOTAS: Record<SubscriptionPlan, PlanQuotas> = {
  STARTER: { messagesPerDay: 500, tokensPerMonth: 100_000, apiCallsPerMinute: 30, maxConcurrentAgents: 2 },
  BUSINESS: { messagesPerDay: 5_000, tokensPerMonth: 1_000_000, apiCallsPerMinute: 100, maxConcurrentAgents: 5 },
  ENTERPRISE: { messagesPerDay: 999_999, tokensPerMonth: 10_000_000, apiCallsPerMinute: 500, maxConcurrentAgents: 20 },
};

export function getPlanQuotas(plan: SubscriptionPlan): PlanQuotas {
  return PLAN_QUOTAS[plan] ?? PLAN_QUOTAS.STARTER;
}
