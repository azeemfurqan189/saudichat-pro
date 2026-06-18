import crypto from 'crypto';
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { getChannelIntegrations, upsertChannelIntegration, sendChannelMessage } from '../services/channelService';
import { getExecutiveSummary } from '../services/reportService';

// ─── Channel Integrations ─────────────────────────────────────────────────

export async function getChannels(req: AuthRequest, res: Response): Promise<void> {
  const channels = await getChannelIntegrations(req.params.businessId);
  res.json({ success: true, data: channels });
}

export async function updateChannel(req: AuthRequest, res: Response): Promise<void> {
  const { channel } = req.params;
  const { isEnabled, config } = req.body as { isEnabled?: boolean; config?: Record<string, unknown> };
  const row = await upsertChannelIntegration(req.params.businessId, channel, { isEnabled, config });
  res.json({ success: true, data: row });
}

export async function sendOmnichannelMessage(req: AuthRequest, res: Response): Promise<void> {
  const { channel, to, content } = req.body as { channel: string; to: string; content: string };
  const result = await sendChannelMessage(
    req.params.businessId,
    channel as 'whatsapp' | 'email' | 'sms' | 'instagram' | 'facebook',
    to,
    content
  );
  res.json({ success: result.success, data: result });
}

/** AI auto-reply on Instagram/Facebook/Email/SMS (same brain as WhatsApp bot) */
export async function aiOmnichannelReply(req: AuthRequest, res: Response): Promise<void> {
  const { channel, from, content } = req.body as { channel: string; from: string; content: string };
  const { processOmnichannelMessage } = await import('../agent/autonomous/multiChannel');
  const result = await processOmnichannelMessage(
    req.params.businessId,
    channel as 'instagram' | 'facebook' | 'email' | 'sms',
    from,
    content
  );
  res.json({ success: true, data: result });
}

// ─── Leads ────────────────────────────────────────────────────────────────

export async function getLeads(req: AuthRequest, res: Response): Promise<void> {
  const leads = await prisma.lead.findMany({
    where: { businessId: req.params.businessId },
    include: { customer: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: leads });
}

export async function createLead(req: AuthRequest, res: Response): Promise<void> {
  const body = req.body as Record<string, unknown>;
  const lead = await prisma.lead.create({
    data: {
      businessId: req.params.businessId,
      name: String(body.name || 'Lead'),
      phone: body.phone ? String(body.phone) : undefined,
      email: body.email ? String(body.email) : undefined,
      source: String(body.source || 'manual'),
      status: (body.status as 'NEW') || 'NEW',
      leadScore: Number(body.leadScore) || 50,
      notes: body.notes ? String(body.notes) : undefined,
      customerId: body.customerId ? String(body.customerId) : undefined,
    },
    include: { customer: true },
  });
  res.status(201).json({ success: true, data: lead });
}

export async function updateLead(req: AuthRequest, res: Response): Promise<void> {
  const updated = await prisma.lead.updateMany({
    where: { id: req.params.leadId, businessId: req.params.businessId },
    data: req.body,
  });
  if (updated.count === 0) {
    res.status(404).json({ success: false, message: 'Lead not found' });
    return;
  }
  const lead = await prisma.lead.findUnique({ where: { id: req.params.leadId }, include: { customer: true } });
  res.json({ success: true, data: lead });
}

// ─── Referrals ────────────────────────────────────────────────────────────

export async function getReferrals(req: AuthRequest, res: Response): Promise<void> {
  const referrals = await prisma.referral.findMany({
    where: { businessId: req.params.businessId },
    include: { customer: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: referrals });
}

export async function createReferral(req: AuthRequest, res: Response): Promise<void> {
  const body = req.body as Record<string, unknown>;
  const code = String(body.code || `REF-${Date.now().toString(36).toUpperCase()}`);
  const referral = await prisma.referral.create({
    data: {
      businessId: req.params.businessId,
      referrerName: String(body.referrerName || 'Customer'),
      referrerPhone: body.referrerPhone ? String(body.referrerPhone) : undefined,
      referredPhone: String(body.referredPhone || ''),
      code,
      rewardPoints: Number(body.rewardPoints) || 100,
      customerId: body.customerId ? String(body.customerId) : undefined,
    },
  });
  res.status(201).json({ success: true, data: referral });
}

// ─── Reviews & Feedback ───────────────────────────────────────────────────

export async function getReviews(req: AuthRequest, res: Response): Promise<void> {
  const reviews = await prisma.review.findMany({
    where: { businessId: req.params.businessId },
    include: { customer: true },
    orderBy: { createdAt: 'desc' },
  });
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  res.json({ success: true, data: { reviews, avgRating: Math.round(avg * 10) / 10, total: reviews.length } });
}

export async function createReview(req: AuthRequest, res: Response): Promise<void> {
  const body = req.body as Record<string, unknown>;
  const review = await prisma.review.create({
    data: {
      businessId: req.params.businessId,
      customerId: body.customerId ? String(body.customerId) : undefined,
      rating: Math.min(5, Math.max(1, Number(body.rating) || 5)),
      comment: body.comment ? String(body.comment) : undefined,
      source: String(body.source || 'dashboard'),
    },
    include: { customer: true },
  });
  res.status(201).json({ success: true, data: review });
}

export async function getFeedbacks(req: AuthRequest, res: Response): Promise<void> {
  const feedbacks = await prisma.customerFeedback.findMany({
    where: { businessId: req.params.businessId },
    include: { customer: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: feedbacks });
}

export async function createFeedback(req: AuthRequest, res: Response): Promise<void> {
  const body = req.body as Record<string, unknown>;
  const feedback = await prisma.customerFeedback.create({
    data: {
      businessId: req.params.businessId,
      customerId: body.customerId ? String(body.customerId) : undefined,
      orderId: body.orderId ? String(body.orderId) : undefined,
      rating: body.rating != null ? Number(body.rating) : undefined,
      category: body.category ? String(body.category) : undefined,
      message: String(body.message || ''),
    },
    include: { customer: true },
  });
  res.status(201).json({ success: true, data: feedback });
}

// ─── API Keys ─────────────────────────────────────────────────────────────

export async function getApiKeys(req: AuthRequest, res: Response): Promise<void> {
  const keys = await prisma.apiKey.findMany({
    where: { businessId: req.params.businessId },
    select: { id: true, name: true, keyPrefix: true, scopes: true, lastUsedAt: true, expiresAt: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: keys });
}

export async function createApiKey(req: AuthRequest, res: Response): Promise<void> {
  const { name, scopes } = req.body as { name: string; scopes?: string[] };
  const rawKey = `scp_${crypto.randomBytes(24).toString('hex')}`;
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const keyPrefix = rawKey.slice(0, 12);

  const key = await prisma.apiKey.create({
    data: {
      businessId: req.params.businessId,
      name: name || 'API Key',
      keyHash,
      keyPrefix,
      scopes: scopes || ['read'],
    },
  });

  res.status(201).json({
    success: true,
    data: { ...key, key: rawKey },
    message: 'Save this key now — it will not be shown again',
  });
}

export async function revokeApiKey(req: AuthRequest, res: Response): Promise<void> {
  await prisma.apiKey.updateMany({
    where: { id: req.params.keyId, businessId: req.params.businessId },
    data: { isActive: false },
  });
  res.json({ success: true, message: 'API key revoked' });
}

// ─── Customer Journey ─────────────────────────────────────────────────────

export async function getCustomerJourney(req: AuthRequest, res: Response): Promise<void> {
  const events = await prisma.customerJourneyEvent.findMany({
    where: { businessId: req.params.businessId, customerId: req.params.customerId },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ success: true, data: events });
}

// ─── AI Business Advisor ──────────────────────────────────────────────────

export async function getAiAdvisor(req: AuthRequest, res: Response): Promise<void> {
  const summary = await getExecutiveSummary(req.params.businessId, 30);
  const business = await prisma.business.findUnique({ where: { id: req.params.businessId } });

  const recommendations = [
    {
      id: 'revenue',
      title: 'Revenue Growth',
      impact: summary.revenueGrowth > 0 ? 'positive' : 'negative',
      action: summary.revenueGrowth < 0
        ? 'Run a win-back WhatsApp campaign for inactive customers'
        : 'Launch upsell broadcast to top 20% customers',
      expectedRoi: '15-25%',
    },
    {
      id: 'leads',
      title: 'Lead Conversion',
      impact: summary.hotLeads > 0 ? 'opportunity' : 'neutral',
      action: summary.hotLeads > 0
        ? `Follow up with ${summary.hotLeads} hot leads in pipeline within 24h`
        : 'Enable new lead welcome workflow automation',
      expectedRoi: '10-20%',
    },
    {
      id: 'inventory',
      title: 'Inventory',
      impact: summary.lowStockCount > 0 ? 'warning' : 'ok',
      action: summary.lowStockCount > 0
        ? `Restock ${summary.lowStockCount} low-inventory items`
        : 'Inventory levels healthy',
      expectedRoi: '5-10%',
    },
    {
      id: 'churn',
      title: 'Churn Prevention',
      impact: summary.churnRiskCustomers > 3 ? 'warning' : 'ok',
      action: summary.churnRiskCustomers > 3
        ? `Send loyalty offer to ${summary.churnRiskCustomers} at-risk customers`
        : 'Churn risk low — maintain engagement',
      expectedRoi: '20-30%',
    },
  ];

  let aiNarrative = summary.aiInsight;
  try {
    const provider = await import('../ai/provider');
    if (provider.isAiConfigured()) {
      const prompt = `You are a Saudi business advisor. Business: ${business?.name}, type: ${business?.type}. Health: ${summary.businessHealthScore}/100. Revenue growth: ${summary.revenueGrowth}%. Orders: ${summary.orders}. Give 3 short actionable tips in English (max 80 words).`;
      const result = await provider.createChatCompletion({
        businessId: req.params.businessId,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 200,
      });
      if (result?.content) aiNarrative = result.content;
    }
  } catch {
    // use default insight
  }

  res.json({
    success: true,
    data: {
      healthScore: summary.businessHealthScore,
      narrative: aiNarrative,
      recommendations,
      metrics: summary,
    },
  });
}

// ─── Suppliers & Deliveries ───────────────────────────────────────────────

export async function getSuppliers(req: AuthRequest, res: Response): Promise<void> {
  const suppliers = await prisma.supplier.findMany({ where: { businessId: req.params.businessId } });
  res.json({ success: true, data: suppliers });
}

export async function createSupplier(req: AuthRequest, res: Response): Promise<void> {
  const supplier = await prisma.supplier.create({
    data: { businessId: req.params.businessId, ...req.body },
  });
  res.status(201).json({ success: true, data: supplier });
}

export async function getDeliveries(req: AuthRequest, res: Response): Promise<void> {
  const deliveries = await prisma.delivery.findMany({
    where: { businessId: req.params.businessId },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: deliveries });
}

export async function createDelivery(req: AuthRequest, res: Response): Promise<void> {
  const delivery = await prisma.delivery.create({
    data: { businessId: req.params.businessId, ...req.body },
  });
  res.status(201).json({ success: true, data: delivery });
}

export async function updateDelivery(req: AuthRequest, res: Response): Promise<void> {
  const updated = await prisma.delivery.updateMany({
    where: { id: req.params.deliveryId, businessId: req.params.businessId },
    data: req.body,
  });
  if (updated.count === 0) {
    res.status(404).json({ success: false, message: 'Delivery not found' });
    return;
  }
  const delivery = await prisma.delivery.findUnique({ where: { id: req.params.deliveryId } });
  res.json({ success: true, data: delivery });
}

// ─── Unified Inbox ────────────────────────────────────────────────────────

export async function getUnifiedInbox(req: AuthRequest, res: Response): Promise<void> {
  const businessId = req.params.businessId;
  const [conversations, liveSessions] = await Promise.all([
    prisma.conversation.findMany({
      where: { businessId },
      include: { customer: true, messages: { take: 1, orderBy: { createdAt: 'desc' } } },
      orderBy: { lastMessageAt: 'desc' },
      take: 50,
    }),
    prisma.liveChatSession.findMany({
      where: { businessId, status: 'ACTIVE' },
      include: { messages: { take: 1, orderBy: { createdAt: 'desc' } } },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    }),
  ]);

  const unified = [
    ...conversations.map((c) => ({
      id: c.id,
      channel: 'whatsapp',
      customerName: c.customer?.name,
      phone: c.customer?.phone,
      lastMessage: c.messages[0]?.content,
      lastMessageAt: c.lastMessageAt,
      isBotHandling: c.isBotHandling,
      type: 'conversation' as const,
    })),
    ...liveSessions.map((s) => ({
      id: s.id,
      channel: 'livechat',
      customerName: s.visitorName || 'Website Visitor',
      phone: s.visitorEmail,
      lastMessage: s.messages[0]?.content,
      lastMessageAt: s.updatedAt,
      isBotHandling: false,
      type: 'livechat' as const,
    })),
  ].sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

  res.json({ success: true, data: unified });
}
