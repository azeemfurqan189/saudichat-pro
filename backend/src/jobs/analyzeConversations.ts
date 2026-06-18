import prisma from '../utils/prisma';
import { analyzeConversation } from '../intelligence/conversationAnalyzer';

export async function runConversationAnalysisBatch(businessId: string, limit = 20): Promise<number> {
  const since = new Date();
  since.setDate(since.getDate() - 1);

  const conversations = await prisma.conversation.findMany({
    where: { businessId, updatedAt: { gte: since } },
    select: { id: true, customerId: true },
    take: limit,
    orderBy: { updatedAt: 'desc' },
  });

  for (const conv of conversations) {
    await analyzeConversation(businessId, conv.id, conv.customerId);
  }

  return conversations.length;
}
