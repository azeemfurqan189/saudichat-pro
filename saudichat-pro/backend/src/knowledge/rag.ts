import prisma from '../utils/prisma';
import { createEmbedding, cosineSimilarity } from './embeddings';

const CHUNK_SIZE = 500;

export function splitIntoChunks(text: string): string[] {
  const paragraphs = text.split(/\n\n+/).filter(Boolean);
  const chunks: string[] = [];
  let current = '';

  for (const p of paragraphs) {
    if ((current + p).length > CHUNK_SIZE && current) {
      chunks.push(current.trim());
      current = p;
    } else {
      current = current ? `${current}\n\n${p}` : p;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  if (chunks.length === 0 && text.trim()) {
    for (let i = 0; i < text.length; i += CHUNK_SIZE) {
      chunks.push(text.slice(i, i + CHUNK_SIZE));
    }
  }
  return chunks;
}

export async function ingestDocument(businessId: string, title: string, content: string, sourceType = 'manual') {
  const doc = await prisma.knowledgeDocument.create({
    data: { businessId, title, content, sourceType },
  });

  const chunks = splitIntoChunks(content);
  for (const chunkText of chunks) {
    const embedding = await createEmbedding(chunkText);
    await prisma.knowledgeChunk.create({
      data: {
        businessId,
        documentId: doc.id,
        content: chunkText,
        embedding: embedding ?? undefined,
      },
    });
  }
  return doc;
}

export async function searchKnowledge(businessId: string, query: string, topK = 3): Promise<string[]> {
  const { getCachedEmbed, setCachedEmbed } = await import('../cache/answerCache');
  const cached = await getCachedEmbed(businessId, query);
  if (cached?.length) return cached.slice(0, topK);

  const queryEmbedding = await createEmbedding(query);
  const chunks = await prisma.knowledgeChunk.findMany({
    where: { businessId, document: { isActive: true } },
    include: { document: { select: { title: true } } },
    take: 100,
  });

  if (chunks.length === 0) return [];

  if (!queryEmbedding) {
    const lower = query.toLowerCase();
    const results = chunks
      .filter((c) => c.content.toLowerCase().includes(lower))
      .slice(0, topK)
      .map((c) => c.content);
    if (results.length) await setCachedEmbed(businessId, query, results);
    return results;
  }

  const scored = chunks
    .map((c) => {
      const emb = c.embedding as number[] | null;
      const score = emb ? cosineSimilarity(queryEmbedding, emb) : 0;
      return { content: c.content, score };
    })
    .filter((s) => s.score > 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  const results = scored.map((s) => s.content);
  if (results.length) await setCachedEmbed(businessId, query, results);
  return results;
}
