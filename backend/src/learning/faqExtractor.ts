import prisma from '../utils/prisma';

export async function extractFaqCandidates(businessId: string): Promise<number> {
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const messages = await prisma.message.findMany({
    where: {
      conversation: { businessId },
      senderType: 'CUSTOMER',
      createdAt: { gte: since },
    },
    select: { content: true },
    take: 500,
  });

  const questionCounts: Record<string, number> = {};
  for (const m of messages) {
    const text = m.content.trim();
    if (text.length < 10 || text.length > 200) continue;
    if (!text.includes('?') && !text.includes('؟') && !['how', 'what', 'where', 'when', 'why', 'كيف', 'ماذا', 'أين', 'متى'].some((w) => text.toLowerCase().includes(w))) continue;
    const key = text.toLowerCase().slice(0, 100);
    questionCounts[key] = (questionCounts[key] || 0) + 1;
  }

  let created = 0;
  for (const [question, count] of Object.entries(questionCounts)) {
    if (count < 2) continue;

    const existing = await prisma.faqCandidate.findFirst({
      where: { businessId, question: { equals: question, mode: 'insensitive' } },
    });

    if (existing) {
      await prisma.faqCandidate.update({
        where: { id: existing.id },
        data: { frequency: count },
      });
    } else {
      await prisma.faqCandidate.create({
        data: { businessId, question, frequency: count },
      });
      created++;
    }
  }
  return created;
}

export async function approveFaqCandidate(businessId: string, candidateId: string, answer: string): Promise<void> {
  const candidate = await prisma.faqCandidate.findFirst({
    where: { id: candidateId, businessId },
  });
  if (!candidate) throw new Error('FAQ candidate not found');

  const { ingestDocument } = await import('../knowledge/rag');
  await ingestDocument(businessId, `FAQ: ${candidate.question.slice(0, 50)}`, `Q: ${candidate.question}\nA: ${answer}`, 'auto_learn');

  await prisma.autoReply.create({
    data: {
      businessId,
      triggerKeywords: [candidate.question.slice(0, 30)],
      triggerType: 'CONTAINS',
      responseAr: answer,
      responseEn: answer,
      priority: 5,
    },
  });

  await prisma.faqCandidate.update({
    where: { id: candidateId },
    data: { status: 'approved', suggestedAnswer: answer },
  });
}
