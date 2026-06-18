import { extractFaqCandidates } from '../learning/faqExtractor';
import prisma from '../utils/prisma';

/** Weekly FAQ learning with basic question clustering */
export async function runWeeklyLearning(businessId: string): Promise<number> {
  const created = await extractFaqCandidates(businessId);

  const pending = await prisma.faqCandidate.findMany({
    where: { businessId, status: 'pending' },
    orderBy: { frequency: 'desc' },
    take: 100,
  });

  const clusters: Record<string, typeof pending> = {};
  for (const c of pending) {
    const key = c.question
      .toLowerCase()
      .replace(/[^\w\s\u0600-\u06FF]/g, '')
      .split(/\s+/)
      .slice(0, 5)
      .join(' ');
    if (!clusters[key]) clusters[key] = [];
    clusters[key].push(c);
  }

  for (const group of Object.values(clusters)) {
    if (group.length < 2) continue;
    const primary = group[0];
    const totalFreq = group.reduce((s, g) => s + g.frequency, 0);
    await prisma.faqCandidate.update({
      where: { id: primary.id },
      data: { frequency: totalFreq },
    });
    for (const dup of group.slice(1)) {
      await prisma.faqCandidate.delete({ where: { id: dup.id } }).catch(() => undefined);
    }
  }

  return created;
}
