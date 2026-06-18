import prisma from '../utils/prisma';
import { detectSentiment } from '../whatsapp/services/ai';
import { trackEvent } from '../analytics/eventTracker';

const BUYING_SIGNALS = ['price', 'سعر', 'how much', 'كم', 'order', 'طلب', 'buy', 'اشتري', 'menu', 'قائمة'];
const CHURN_DAYS = 30;

export async function analyzeConversation(businessId: string, conversationId: string, customerId: string): Promise<void> {
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: 30,
  });

  if (messages.length === 0) return;

  const customerText = messages.filter((m) => m.senderType === 'CUSTOMER').map((m) => m.content).join(' ');
  const sentiment = await detectSentiment(customerText);

  let leadScore = 0;
  const lower = customerText.toLowerCase();

  if (BUYING_SIGNALS.some((s) => lower.includes(s))) leadScore += 30;
  if (messages.length > 5) leadScore += 15;
  if (sentiment === 'HAPPY') leadScore += 20;
  if (sentiment === 'ANGRY') leadScore -= 20;

  const orders = await prisma.order.count({ where: { businessId, customerId } });
  if (orders > 0) leadScore += 25;
  leadScore = Math.max(0, Math.min(100, leadScore));

  const customer = await prisma.customer.findFirst({ where: { id: customerId, businessId } });
  let churnRisk = 'LOW';
  if (customer?.lastInteraction) {
    const daysSince = (Date.now() - customer.lastInteraction.getTime()) / (86400000);
    if (daysSince > CHURN_DAYS) churnRisk = 'HIGH';
    else if (daysSince > 14) churnRisk = 'MEDIUM';
  }
  if (sentiment === 'ANGRY') churnRisk = 'HIGH';

  const tags: string[] = [];
  if (leadScore >= 70) tags.push('hot-lead');
  if (churnRisk === 'HIGH') tags.push('churn-risk');
  if (sentiment === 'ANGRY') tags.push('angry');

  await prisma.customer.update({
    where: { id: customerId },
    data: {
      leadScore,
      churnRisk,
      intelligence: {
        lastSentiment: sentiment,
        messageCount: messages.length,
        analyzedAt: new Date().toISOString(),
      },
      ...(tags.length ? { tags: { push: tags } } : {}),
    },
  });

  await trackEvent({
    businessId,
    conversationId,
    customerId,
    eventType: 'conversation_analyzed',
    metadata: { leadScore, churnRisk, sentiment },
  });
}

export async function getIntelligenceSummary(businessId: string) {
  const [hotLeads, churnRisk, avgScore] = await Promise.all([
    prisma.customer.count({ where: { businessId, leadScore: { gte: 70 } } }),
    prisma.customer.count({ where: { businessId, churnRisk: 'HIGH' } }),
    prisma.customer.aggregate({ where: { businessId }, _avg: { leadScore: true } }),
  ]);

  const topLeads = await prisma.customer.findMany({
    where: { businessId, leadScore: { gte: 50 } },
    orderBy: { leadScore: 'desc' },
    take: 10,
    select: { id: true, name: true, phone: true, leadScore: true, churnRisk: true, tags: true },
  });

  return {
    hotLeads,
    churnRiskCustomers: churnRisk,
    avgLeadScore: Math.round(avgScore._avg.leadScore ?? 0),
    topLeads,
  };
}
