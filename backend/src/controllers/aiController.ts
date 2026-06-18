import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { ingestDocument, searchKnowledge } from '../knowledge/rag';
import { getIntelligenceSummary } from '../intelligence/conversationAnalyzer';
import { extractFaqCandidates, approveFaqCandidate } from '../learning/faqExtractor';
import { scheduleWinBackCampaign } from '../jobs/scheduler';
import { getPlanQuotas } from '../security/planQuotas';
import { SubscriptionPlan } from '@prisma/client';
import { redisGet, tenantKey } from '../utils/redis';

export async function getKnowledgeDocuments(req: AuthRequest, res: Response): Promise<void> {
  const docs = await prisma.knowledgeDocument.findMany({
    where: { businessId: req.params.businessId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, sourceType: true, isActive: true, createdAt: true, _count: { select: { chunks: true } } },
  });
  res.json({ success: true, data: docs });
}

export async function createKnowledgeDocument(req: AuthRequest, res: Response): Promise<void> {
  const { title, content } = req.body as { title?: string; content?: string };
  if (!title?.trim() || !content?.trim()) {
    res.status(400).json({ success: false, message: 'Title and content required' });
    return;
  }
  const doc = await ingestDocument(req.params.businessId, title.trim(), content.trim());
  const { invalidateAllBotCaches } = await import('../cache/answerCache');
  await invalidateAllBotCaches(req.params.businessId);
  res.status(201).json({ success: true, data: doc });
}

export async function deleteKnowledgeDocument(req: AuthRequest, res: Response): Promise<void> {
  await prisma.knowledgeDocument.deleteMany({
    where: { id: req.params.docId, businessId: req.params.businessId },
  });
  res.json({ success: true });
}

export async function searchKnowledgeApi(req: AuthRequest, res: Response): Promise<void> {
  const q = String(req.query.q || '');
  const results = await searchKnowledge(req.params.businessId, q);
  res.json({ success: true, data: results });
}

export async function getFaqCandidates(req: AuthRequest, res: Response): Promise<void> {
  const candidates = await prisma.faqCandidate.findMany({
    where: { businessId: req.params.businessId, status: 'pending' },
    orderBy: { frequency: 'desc' },
  });
  res.json({ success: true, data: candidates });
}

export async function approveFaq(req: AuthRequest, res: Response): Promise<void> {
  const { answer } = req.body as { answer?: string };
  if (!answer?.trim()) {
    res.status(400).json({ success: false, message: 'Answer required' });
    return;
  }
  await approveFaqCandidate(req.params.businessId, req.params.candidateId, answer.trim());
  res.json({ success: true });
}

export async function runFaqLearning(req: AuthRequest, res: Response): Promise<void> {
  const count = await extractFaqCandidates(req.params.businessId);
  res.json({ success: true, data: { newCandidates: count } });
}

export async function getIntelligence(req: AuthRequest, res: Response): Promise<void> {
  const data = await getIntelligenceSummary(req.params.businessId);
  res.json({ success: true, data });
}

export async function getBotAnalytics(req: AuthRequest, res: Response): Promise<void> {
  const days = req.query.days ? parseInt(String(req.query.days), 10) : 30;
  const { getAggregatedAnalytics } = await import('../analytics/aggregator');
  const { getFunnelAnalytics } = await import('../analytics/funnelTracker');
  const [aggregated, intelligence, workflowCount, funnel] = await Promise.all([
    getAggregatedAnalytics(req.params.businessId, days),
    getIntelligenceSummary(req.params.businessId),
    prisma.workflowLog.count({ where: { businessId: req.params.businessId } }),
    getFunnelAnalytics(req.params.businessId, days),
  ]);
  res.json({
    success: true,
    data: { ...aggregated.live, funnel, daily: aggregated.daily, intelligence, workflowStepsRun: workflowCount },
  });
}

export async function getQuotaUsage(req: AuthRequest, res: Response): Promise<void> {
  const business = await prisma.business.findFirst({
    where: { id: req.params.businessId },
    select: { subscriptionPlan: true },
  });
  if (!business) {
    res.status(404).json({ success: false, message: 'Business not found' });
    return;
  }
  const { getQuotaUsage: getUsage } = await import('../security/rateLimiter');
  const usage = await getUsage(req.params.businessId, business.subscriptionPlan as SubscriptionPlan);
  res.json({ success: true, data: usage });
}

export async function getDlqJobs(req: AuthRequest, res: Response): Promise<void> {
  const { listDlqJobs, getDlqStats } = await import('../queue/dlq');
  const [jobs, stats] = await Promise.all([
    listDlqJobs(50, req.params.businessId),
    getDlqStats(req.params.businessId),
  ]);
  res.json({ success: true, data: { jobs, stats } });
}

export async function replayDlqJob(req: AuthRequest, res: Response): Promise<void> {
  const { replayDlqJob: replay, replayAllDlqForBusiness } = await import('../queue/dlq');
  const { jobId, all } = req.body as { jobId?: string; all?: boolean };
  if (all) {
    const count = await replayAllDlqForBusiness(req.params.businessId);
    res.json({ success: true, data: { replayed: count } });
    return;
  }
  if (!jobId) {
    res.status(400).json({ success: false, message: 'jobId or all=true required' });
    return;
  }
  const result = await replay(jobId);
  res.json({ success: result.ok, data: result });
}

export async function resumeBot(req: AuthRequest, res: Response): Promise<void> {
  const { conversationId } = req.body as { conversationId?: string };
  if (!conversationId) {
    res.status(400).json({ success: false, message: 'conversationId required' });
    return;
  }
  const { returnToBot } = await import('../agent/handoff/handoffManager');
  await returnToBot(req.params.businessId, conversationId);
  res.json({ success: true });
}

export async function getAiSettings(req: AuthRequest, res: Response): Promise<void> {
  const business = await prisma.business.findFirst({
    where: { id: req.params.businessId },
    select: { settings: true, subscriptionPlan: true },
  });
  if (!business) {
    res.status(404).json({ success: false, message: 'Business not found' });
    return;
  }
  const settings = (business.settings as Record<string, unknown>) || {};
  const quotas = getPlanQuotas(business.subscriptionPlan as SubscriptionPlan);
  const monthKey = tenantKey(req.params.businessId, 'quota', 'tokens', new Date().toISOString().slice(0, 7));
  const tokensUsed = parseInt((await redisGet(monthKey)) || '0', 10);

  res.json({
    success: true,
    data: {
      aiPersona: settings.aiPersona || { tone: 'friendly', language: 'auto' },
      aiPaused: settings.aiPaused || false,
      refundPolicy: settings.refundPolicy || 'no_auto_refund',
      quotas,
      usage: { tokensThisMonth: tokensUsed },
    },
  });
}

export async function updateAiSettings(req: AuthRequest, res: Response): Promise<void> {
  const business = await prisma.business.findFirst({ where: { id: req.params.businessId } });
  if (!business) {
    res.status(404).json({ success: false, message: 'Business not found' });
    return;
  }
  const current = (business.settings as Record<string, unknown>) || {};
  const { aiPersona, aiPaused, refundPolicy } = req.body as Record<string, unknown>;

  const updatedSettings: Record<string, unknown> = { ...current };
  if (aiPersona !== undefined) updatedSettings.aiPersona = aiPersona;
  if (aiPaused !== undefined) updatedSettings.aiPaused = aiPaused;
  if (refundPolicy !== undefined) updatedSettings.refundPolicy = refundPolicy;

  await prisma.business.update({
    where: { id: req.params.businessId },
    data: { settings: updatedSettings as object },
  });
  const { invalidateAllBotCaches } = await import('../cache/answerCache');
  await invalidateAllBotCaches(req.params.businessId);
  res.json({ success: true });
}

export async function clearBotCache(req: AuthRequest, res: Response): Promise<void> {
  const { invalidateAllBotCaches } = await import('../cache/answerCache');
  await invalidateAllBotCaches(req.params.businessId);
  res.json({
    success: true,
    message: 'Bot cache cleared — next WhatsApp replies will use latest catalog and settings',
  });
}

export async function testBot(req: AuthRequest, res: Response): Promise<void> {
  const { message } = req.body as { message?: string };
  if (!message?.trim()) {
    res.status(400).json({ success: false, message: 'Message required' });
    return;
  }
  const { searchKnowledge } = await import('../knowledge/rag');
  const { detectIntent } = await import('../whatsapp/services/ai');
  const { routeToAgent } = await import('../agent/supervisor');

  const intent = await detectIntent(message);
  const agent = routeToAgent(intent, message);
  const knowledge = await searchKnowledge(req.params.businessId, message);

  res.json({
    success: true,
    data: { intent, agent, knowledgeMatches: knowledge, wouldUseCache: knowledge.length > 0 },
  });
}

export async function triggerWinBack(req: AuthRequest, res: Response): Promise<void> {
  const count = await scheduleWinBackCampaign(req.params.businessId);
  res.json({ success: true, data: { customersTargeted: count } });
}

export async function getWorkflowLogs(req: AuthRequest, res: Response): Promise<void> {
  const logs = await prisma.workflowLog.findMany({
    where: { businessId: req.params.businessId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json({ success: true, data: logs });
}
