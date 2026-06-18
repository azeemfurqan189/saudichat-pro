import prisma from '../utils/prisma';
import { searchKnowledge } from '../knowledge/rag';
import { createChatCompletion, isAiConfigured } from '../ai/provider';
import { getCmmsDashboard } from './cmmsService';

async function buildCmmsContext(businessId: string) {
  const [dashboard, openWo, pmDue, spareLow, assets] = await Promise.all([
    getCmmsDashboard(businessId).catch(() => null),
    prisma.workOrder.count({ where: { businessId, status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    prisma.maintenancePlan.count({
      where: { businessId, isActive: true, nextDueAt: { lte: new Date(Date.now() + 7 * 86400000) } },
    }),
    prisma.sparePart.count({ where: { businessId, stockQty: { lte: 5 } } }),
    prisma.agencyEquipment.count({ where: { businessId, assetStatus: 'ACTIVE' } }),
  ]);

  return {
    openWorkOrders: openWo,
    pmDueThisWeek: pmDue,
    lowStockSpareParts: spareLow,
    activeAssets: assets,
    dashboardKpis: dashboard
      ? {
          openWorkOrders: dashboard.summary.openWorkOrders,
          overduePm: dashboard.summary.pmDue,
          lowStock: dashboard.summary.lowStock,
          maintenanceCostMtd: dashboard.summary.totalMaintenanceCost,
          assets: dashboard.summary.assets,
        }
      : null,
  };
}

export async function askCompanyAnything(businessId: string, question: string) {
  const q = question.trim();
  if (!q) return { answer: 'Please ask a question.', sources: [] };

  const [workers, projects, pendingTs, placements, knowledgeSnippets, clients, cmmsContext] = await Promise.all([
    prisma.workerProfile.findMany({
      where: { businessId },
      select: { name: true, category: true, status: true, iqamaExpiry: true, iqamaNumber: true },
      take: 50,
    }),
    prisma.agencyProject.findMany({
      where: { businessId },
      select: { name: true, status: true, city: true, endDate: true, headcount: true },
      take: 30,
    }),
    prisma.timesheet.count({
      where: { businessId, status: { in: ['PENDING', 'PENDING_ADMIN', 'PENDING_PAYROLL'] } },
    }),
    prisma.placement.findMany({
      where: { businessId, status: 'ACTIVE' },
      select: {
        siteName: true,
        workerProfile: { select: { name: true } },
        clientCompany: { select: { name: true } },
        project: { select: { name: true } },
      },
      take: 40,
    }),
    searchKnowledge(businessId, q, 5),
    prisma.clientCompany.findMany({
      where: { businessId },
      select: { name: true, contactName: true },
      take: 20,
    }),
    buildCmmsContext(businessId),
  ]);

  const contextBlock = {
    question: q,
    workersSummary: workers.slice(0, 25),
    projectsSummary: projects,
    activePlacements: placements.slice(0, 20),
    pendingTimesheetApprovals: pendingTs,
    clients,
    knowledgeDocs: knowledgeSnippets,
    cmms: cmmsContext,
  };

  const sources: string[] = [];
  if (knowledgeSnippets.length) sources.push('Company knowledge base');
  if (workers.length) sources.push('Worker pool');
  if (projects.length) sources.push('Projects');
  if (placements.length) sources.push('Active placements');
  if (cmmsContext.openWorkOrders > 0 || cmmsContext.activeAssets > 0) sources.push('CMMS maintenance');

  if (!isAiConfigured()) {
    return {
      answer: buildFallbackAnswer(q, contextBlock),
      sources,
      aiPowered: false,
    };
  }

  const ai = await createChatCompletion({
    businessId,
    maxTokens: 500,
    messages: [
      {
        role: 'system',
        content:
          'You are an internal company assistant for a Saudi manpower + CMMS agency. Answer ONLY from the provided JSON context (workers, projects, timesheets, placements, CMMS maintenance KPIs, knowledge base). If data is missing, say so. Be concise. Use SAR when mentioning money. Support Arabic names as given.',
      },
      { role: 'user', content: JSON.stringify(contextBlock) },
    ],
  });

  return {
    answer: ai?.content || buildFallbackAnswer(q, contextBlock),
    sources,
    aiPowered: Boolean(ai),
  };
}

function buildFallbackAnswer(
  q: string,
  ctx: {
    pendingTimesheetApprovals: number;
    projectsSummary: Array<{ name: string; status: string }>;
    workersSummary: Array<{ name: string; status: string }>;
    knowledgeDocs: string[];
  }
): string {
  const lower = q.toLowerCase();
  if (lower.includes('approval') || lower.includes('pending') || lower.includes('timesheet')) {
    return `You have ${ctx.pendingTimesheetApprovals} timesheet(s) pending approval. Check Timesheets or Command Center.`;
  }
  if (lower.includes('project') || lower.includes('site')) {
    const active = ctx.projectsSummary.filter((p) => p.status === 'ACTIVE');
    return active.length
      ? `Active projects (${active.length}): ${active.map((p) => p.name).join(', ')}.`
      : 'No active projects found in your account.';
  }
  if (lower.includes('worker') || lower.includes('available')) {
    const avail = ctx.workersSummary.filter((w) => w.status === 'AVAILABLE');
    return `${avail.length} worker(s) marked AVAILABLE out of ${ctx.workersSummary.length} total.`;
  }
  if (lower.includes('work order') || lower.includes('maintenance') || lower.includes('cmms') || lower.includes('asset')) {
    const cmms = (ctx as { cmms?: { openWorkOrders: number; pmDueThisWeek: number; activeAssets: number } }).cmms;
    if (cmms) {
      return `CMMS: ${cmms.openWorkOrders} open work order(s), ${cmms.pmDueThisWeek} PM due this week, ${cmms.activeAssets} active assets. Check Maintenance hub or CMMS dashboard.`;
    }
  }
  if (ctx.knowledgeDocs.length) {
    return `From your knowledge base:\n${ctx.knowledgeDocs[0].slice(0, 400)}`;
  }
  return 'AI is not configured. Enable GROQ_API_KEY or OPENAI_API_KEY for smarter answers, or browse Workers, Projects, and Timesheets directly.';
}
