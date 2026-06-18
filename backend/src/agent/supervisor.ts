export type AgentType = 'sales' | 'support' | 'booking' | 'marketing';

export type Intent = 'ORDER' | 'BOOKING' | 'INQUIRY' | 'COMPLAINT' | 'URGENT' | 'FAQ' | 'MARKETING';

export interface RouteDecision {
  agent: AgentType;
  intent: Intent;
  confidence: number;
}

const INTENT_TO_AGENT: Record<Intent, AgentType> = {
  ORDER: 'sales',
  BOOKING: 'booking',
  COMPLAINT: 'support',
  URGENT: 'support',
  FAQ: 'support',
  INQUIRY: 'support',
  MARKETING: 'marketing',
};

const MARKETING_KEYWORDS = ['promo', 'discount', 'offer', 'خصم', 'عرض', 'كupon', 'loyalty'];

export function routeToAgent(intent: Intent, text: string): AgentType {
  return classifyRoute(intent, text).agent;
}

export function classifyRoute(intent: Intent, text: string): RouteDecision {
  const lower = text.toLowerCase();
  if (MARKETING_KEYWORDS.some((k) => lower.includes(k))) {
    return { agent: 'marketing', intent: 'MARKETING', confidence: 0.85 };
  }

  const agent = INTENT_TO_AGENT[intent] ?? 'support';
  const confidence =
    intent === 'ORDER' || intent === 'BOOKING' || intent === 'COMPLAINT' || intent === 'URGENT'
      ? 0.9
      : intent === 'FAQ'
        ? 0.75
        : 0.65;

  return { agent, intent, confidence };
}

export function getAgentLabel(agent: AgentType): string {
  const labels: Record<AgentType, string> = {
    sales: 'Sales Agent',
    support: 'Support Agent',
    booking: 'Booking Agent',
    marketing: 'Marketing Agent',
  };
  return labels[agent];
}
