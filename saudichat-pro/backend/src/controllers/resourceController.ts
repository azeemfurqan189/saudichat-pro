import { Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { generateOrderNumber } from '../utils/auth';
import { validateBody, orderSchema, appointmentSchema } from '../utils/validation';
import { ensureDefaultCatalog, touchCatalogCache } from '../services/catalogService';

// Orders
export async function getOrders(req: AuthRequest, res: Response): Promise<void> {
  const { status, search, from, to } = req.query;
  const businessId = req.params.businessId;

  const where: Record<string, unknown> = { businessId };
  if (status && status !== 'all') where.status = status;
  if (from || to) {
    where.createdAt = {};
    if (from) (where.createdAt as Record<string, Date>).gte = new Date(from as string);
    if (to) (where.createdAt as Record<string, Date>).lte = new Date(to as string);
  }

  const orders = await prisma.order.findMany({
    where,
    include: { customer: true },
    orderBy: { createdAt: 'desc' },
  });

  let filtered = orders;
  if (search) {
    const q = (search as string).toLowerCase();
    filtered = orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.customer.name.toLowerCase().includes(q)
    );
  }

  res.json({ success: true, data: filtered });
}

export async function getOrder(req: AuthRequest, res: Response): Promise<void> {
  const order = await prisma.order.findFirst({
    where: { id: req.params.orderId, businessId: req.params.businessId },
    include: { customer: true },
  });

  if (!order) {
    res.status(404).json({ success: false, message: 'Order not found' });
    return;
  }

  res.json({ success: true, data: order });
}

export async function createOrder(req: AuthRequest, res: Response): Promise<void> {
  const validation = validateBody(orderSchema, req.body);
  if (validation.success === false) {
    res.status(400).json({ success: false, errors: validation.errors });
    return;
  }

  const order = await prisma.order.create({
    data: {
      businessId: req.params.businessId,
      orderNumber: generateOrderNumber(),
      customerId: validation.data.customerId,
      items: validation.data.items as Prisma.InputJsonValue,
      subtotal: validation.data.subtotal,
      tax: validation.data.tax ?? 0,
      deliveryFee: validation.data.deliveryFee ?? 0,
      discount: validation.data.discount ?? 0,
      total: validation.data.total,
      paymentMethod: validation.data.paymentMethod,
      deliveryAddress: validation.data.deliveryAddress as Prisma.InputJsonValue | undefined,
      specialInstructions: validation.data.specialInstructions,
    },
    include: { customer: true },
  });

  await prisma.customer.update({
    where: { id: validation.data.customerId },
    data: {
      totalOrders: { increment: 1 },
      totalSpent: { increment: validation.data.total },
      lastInteraction: new Date(),
    },
  });

  res.status(201).json({ success: true, data: order });
}

export async function updateOrderStatus(req: AuthRequest, res: Response): Promise<void> {
  const { status } = req.body;
  const order = await prisma.order.updateMany({
    where: { id: req.params.orderId, businessId: req.params.businessId },
    data: { status },
  });

  if (order.count === 0) {
    res.status(404).json({ success: false, message: 'Order not found' });
    return;
  }

  const updated = await prisma.order.findUnique({
    where: { id: req.params.orderId },
    include: { customer: true },
  });

  if (updated?.customer?.phone && status) {
    try {
      const { runOrderWorkflow } = await import('../workflows/engine');
      await runOrderWorkflow(req.params.businessId, req.params.orderId, status, updated.customer.phone);
    } catch (err) {
      console.error('[workflow] order status notification failed:', err);
    }
  }

  res.json({ success: true, data: updated });
}

// Appointments
export async function getAppointments(req: AuthRequest, res: Response): Promise<void> {
  const { status, staffId, from, to } = req.query;
  const businessId = req.params.businessId;

  const where: Record<string, unknown> = { businessId };
  if (status && status !== 'all') where.status = status;
  if (staffId) where.staffId = staffId;
  if (from || to) {
    where.date = {};
    if (from) (where.date as Record<string, Date>).gte = new Date(from as string);
    if (to) (where.date as Record<string, Date>).lte = new Date(to as string);
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: { customer: true, staff: true },
    orderBy: { date: 'asc' },
  });

  res.json({ success: true, data: appointments });
}

export async function createAppointment(req: AuthRequest, res: Response): Promise<void> {
  const validation = validateBody(appointmentSchema, req.body);
  if (validation.success === false) {
    res.status(400).json({ success: false, errors: validation.errors });
    return;
  }

  const { customerId, staffId, serviceId, serviceName, date, startTime, endTime, notes } =
    validation.data;

  const appointment = await prisma.appointment.create({
    data: {
      businessId: req.params.businessId,
      customerId,
      staffId,
      serviceId,
      serviceName,
      date: new Date(date),
      startTime,
      endTime,
      notes,
    },
    include: { customer: true, staff: true },
  });

  res.status(201).json({ success: true, data: appointment });
}

export async function updateAppointment(req: AuthRequest, res: Response): Promise<void> {
  const { status, date, startTime, endTime, staffId } = req.body;

  const appointment = await prisma.appointment.updateMany({
    where: { id: req.params.appointmentId, businessId: req.params.businessId },
    data: {
      ...(status && { status }),
      ...(date && { date: new Date(date) }),
      ...(startTime && { startTime }),
      ...(endTime && { endTime }),
      ...(staffId && { staffId }),
    },
  });

  if (appointment.count === 0) {
    res.status(404).json({ success: false, message: 'Appointment not found' });
    return;
  }

  const updated = await prisma.appointment.findUnique({
    where: { id: req.params.appointmentId },
    include: { customer: true, staff: true },
  });

  if (updated?.customer?.phone && status) {
    try {
      const { runAppointmentWorkflow } = await import('../workflows/engine');
      await runAppointmentWorkflow(req.params.businessId, req.params.appointmentId, status, updated.customer.phone);
    } catch (err) {
      console.error('[workflow] appointment notification failed:', err);
    }
  }

  res.json({ success: true, data: updated });
}

// Customers
export async function getCustomers(req: AuthRequest, res: Response): Promise<void> {
  const { search, segment, tag } = req.query;
  const businessId = req.params.businessId;

  let customers = await prisma.customer.findMany({
    where: { businessId },
    orderBy: { lastInteraction: 'desc' },
  });

  if (search) {
    const q = (search as string).toLowerCase();
    customers = customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q as string)
    );
  }

  if (segment === 'vip') {
    customers = customers.filter((c) => c.totalSpent > 5000);
  } else if (segment === 'new') {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    customers = customers.filter((c) => c.createdAt >= weekAgo);
  } else if (segment === 'inactive') {
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    customers = customers.filter((c) => !c.lastInteraction || c.lastInteraction < monthAgo);
  }

  if (tag) {
    customers = customers.filter((c) => c.tags.includes(tag as string));
  }

  res.json({ success: true, data: customers });
}

export async function getCustomer(req: AuthRequest, res: Response): Promise<void> {
  const customer = await prisma.customer.findFirst({
    where: { id: req.params.customerId, businessId: req.params.businessId },
  });

  if (!customer) {
    res.status(404).json({ success: false, message: 'Customer not found' });
    return;
  }

  const [orders, appointments, conversations] = await Promise.all([
    prisma.order.findMany({ where: { customerId: customer.id }, orderBy: { createdAt: 'desc' } }),
    prisma.appointment.findMany({ where: { customerId: customer.id }, orderBy: { date: 'desc' } }),
    prisma.conversation.findMany({
      where: { customerId: customer.id },
      include: { messages: { take: 5, orderBy: { createdAt: 'desc' } } },
    }),
  ]);

  res.json({ success: true, data: { ...customer, orders, appointments, conversations } });
}

export async function updateCustomer(req: AuthRequest, res: Response): Promise<void> {
  const customer = await prisma.customer.updateMany({
    where: { id: req.params.customerId, businessId: req.params.businessId },
    data: req.body,
  });

  if (customer.count === 0) {
    res.status(404).json({ success: false, message: 'Customer not found' });
    return;
  }

  const updated = await prisma.customer.findUnique({ where: { id: req.params.customerId } });
  res.json({ success: true, data: updated });
}

// Catalog
export async function getCatalog(req: AuthRequest, res: Response): Promise<void> {
  let catalogs = await prisma.catalog.findMany({
    where: { businessId: req.params.businessId },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  });

  if (catalogs.length === 0) {
    const catalogId = await ensureDefaultCatalog(req.params.businessId);
    const catalog = await prisma.catalog.findUnique({
      where: { id: catalogId },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
    if (catalog) catalogs = [catalog];
  }

  res.json({ success: true, data: catalogs });
}

export async function createCatalogItem(req: AuthRequest, res: Response): Promise<void> {
  const body = req.body as Record<string, unknown>;
  const catalogId = String(body.catalogId || '').trim() || (await ensureDefaultCatalog(req.params.businessId));

  const item = await prisma.catalogItem.create({
    data: {
      businessId: req.params.businessId,
      catalogId,
      nameAr: String(body.nameAr || body.nameEn || 'Product'),
      nameEn: String(body.nameEn || body.nameAr || 'Product'),
      descriptionAr: body.descriptionAr ? String(body.descriptionAr) : undefined,
      descriptionEn: body.descriptionEn ? String(body.descriptionEn) : undefined,
      price: Number(body.price) || 0,
      discountPrice: body.discountPrice != null ? Number(body.discountPrice) : undefined,
      category: body.category ? String(body.category) : undefined,
      duration: body.duration != null ? Number(body.duration) : undefined,
      image: body.image ? String(body.image) : undefined,
      isAvailable: body.isAvailable !== false,
      sortOrder: body.sortOrder != null ? Number(body.sortOrder) : 0,
    },
  });

  touchCatalogCache(req.params.businessId);
  res.status(201).json({ success: true, data: item });
}

export async function updateCatalogItem(req: AuthRequest, res: Response): Promise<void> {
  const item = await prisma.catalogItem.updateMany({
    where: { id: req.params.itemId, businessId: req.params.businessId },
    data: req.body,
  });

  if (item.count === 0) {
    res.status(404).json({ success: false, message: 'Item not found' });
    return;
  }

  const updated = await prisma.catalogItem.findUnique({ where: { id: req.params.itemId } });
  touchCatalogCache(req.params.businessId);
  res.json({ success: true, data: updated });
}

export async function deleteCatalogItem(req: AuthRequest, res: Response): Promise<void> {
  await prisma.catalogItem.deleteMany({
    where: { id: req.params.itemId, businessId: req.params.businessId },
  });

  touchCatalogCache(req.params.businessId);
  res.json({ success: true, message: 'Item deleted' });
}

// Conversations
export async function getConversations(req: AuthRequest, res: Response): Promise<void> {
  const { status } = req.query;
  const where: Record<string, unknown> = { businessId: req.params.businessId };
  if (status && status !== 'all') where.status = status;

  const conversations = await prisma.conversation.findMany({
    where,
    include: {
      customer: true,
      messages: { take: 1, orderBy: { createdAt: 'desc' } },
    },
    orderBy: { lastMessageAt: 'desc' },
  });

  res.json({ success: true, data: conversations });
}

export async function getConversationMessages(req: AuthRequest, res: Response): Promise<void> {
  const messages = await prisma.message.findMany({
    where: { conversationId: req.params.conversationId },
    orderBy: { createdAt: 'asc' },
  });

  res.json({ success: true, data: messages });
}

export async function sendMessage(req: AuthRequest, res: Response): Promise<void> {
  const { content, messageType = 'TEXT' } = req.body;
  const businessId = req.params.businessId;
  const conversationId = req.params.conversationId;

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, businessId },
    include: { customer: true },
  });

  if (!conversation) {
    res.status(404).json({ success: false, message: 'Conversation not found' });
    return;
  }

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderType: 'AGENT',
      messageType,
      content,
    },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date(), isBotHandling: false, status: 'ACTIVE' },
  });

  if (conversation.customer?.phone && content?.trim()) {
    try {
      const { sendWhatsAppText } = await import('../services/whatsappSend');
      await sendWhatsAppText(businessId, conversation.customer.phone, content.trim());
    } catch (err) {
      console.error('[sendMessage] WhatsApp delivery failed:', err);
      res.status(201).json({
        success: true,
        data: message,
        warning: 'Message saved but WhatsApp delivery failed',
      });
      return;
    }
  }

  res.status(201).json({ success: true, data: message });
}

export async function toggleBotHandling(req: AuthRequest, res: Response): Promise<void> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: req.params.conversationId },
  });

  if (!conversation) {
    res.status(404).json({ success: false, message: 'Conversation not found' });
    return;
  }

  const updated = await prisma.conversation.update({
    where: { id: req.params.conversationId },
    data: { isBotHandling: !conversation.isBotHandling },
  });

  res.json({ success: true, data: updated });
}

// Marketing
export async function getCampaigns(req: AuthRequest, res: Response): Promise<void> {
  const campaigns = await prisma.campaign.findMany({
    where: { businessId: req.params.businessId },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: campaigns });
}

export async function createCampaign(req: AuthRequest, res: Response): Promise<void> {
  const body = req.body as Record<string, unknown>;
  const status = String(body.status || 'DRAFT').toUpperCase();
  const scheduledAt = body.scheduledAt ? new Date(String(body.scheduledAt)) : undefined;

  const campaign = await prisma.campaign.create({
    data: {
      businessId: req.params.businessId,
      name: String(body.name || 'Campaign'),
      type: String(body.type || 'broadcast'),
      message: String(body.message || ''),
      target: (body.target as Prisma.InputJsonValue) || {},
      status: status === 'SENT' || status === 'ACTIVE' ? 'ACTIVE' : status === 'SCHEDULED' ? 'SCHEDULED' : 'DRAFT',
      scheduledAt,
    },
  });

  if (campaign.status === 'ACTIVE') {
    const { sendCampaignBroadcast } = await import('../services/campaignService');
    const result = await sendCampaignBroadcast(req.params.businessId, campaign.id);
    const updated = await prisma.campaign.findUnique({ where: { id: campaign.id } });
    res.status(201).json({ success: true, data: updated, sendResult: result });
    return;
  }

  if (campaign.status === 'SCHEDULED' && scheduledAt && scheduledAt > new Date()) {
    const { scheduleCampaignSend } = await import('../services/campaignService');
    await scheduleCampaignSend(req.params.businessId, campaign.id, scheduledAt);
  }

  res.status(201).json({ success: true, data: campaign });
}

export async function sendCampaign(req: AuthRequest, res: Response): Promise<void> {
  const { sendCampaignBroadcast } = await import('../services/campaignService');
  const result = await sendCampaignBroadcast(req.params.businessId, req.params.campaignId);
  const campaign = await prisma.campaign.findUnique({ where: { id: req.params.campaignId } });
  res.json({ success: true, data: campaign, sendResult: result });
}

export async function getPromoCodes(req: AuthRequest, res: Response): Promise<void> {
  const codes = await prisma.promoCode.findMany({
    where: { businessId: req.params.businessId },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: codes });
}

export async function createPromoCode(req: AuthRequest, res: Response): Promise<void> {
  const code = await prisma.promoCode.create({
    data: { businessId: req.params.businessId, ...req.body },
  });

  res.status(201).json({ success: true, data: code });
}

export async function updatePromoCode(req: AuthRequest, res: Response): Promise<void> {
  const updated = await prisma.promoCode.updateMany({
    where: { id: req.params.promoId, businessId: req.params.businessId },
    data: req.body,
  });
  if (updated.count === 0) {
    res.status(404).json({ success: false, message: 'Promo code not found' });
    return;
  }
  const code = await prisma.promoCode.findUnique({ where: { id: req.params.promoId } });
  res.json({ success: true, data: code });
}

export async function deletePromoCode(req: AuthRequest, res: Response): Promise<void> {
  await prisma.promoCode.deleteMany({
    where: { id: req.params.promoId, businessId: req.params.businessId },
  });
  res.json({ success: true, message: 'Promo code deleted' });
}

export async function getLoyaltyRewards(req: AuthRequest, res: Response): Promise<void> {
  const rewards = await prisma.loyaltyReward.findMany({
    where: { businessId: req.params.businessId },
  });

  res.json({ success: true, data: rewards });
}

export async function createLoyaltyReward(req: AuthRequest, res: Response): Promise<void> {
  const reward = await prisma.loyaltyReward.create({
    data: { businessId: req.params.businessId, ...req.body },
  });
  res.status(201).json({ success: true, data: reward });
}

export async function updateLoyaltyReward(req: AuthRequest, res: Response): Promise<void> {
  const updated = await prisma.loyaltyReward.updateMany({
    where: { id: req.params.rewardId, businessId: req.params.businessId },
    data: req.body,
  });
  if (updated.count === 0) {
    res.status(404).json({ success: false, message: 'Reward not found' });
    return;
  }
  const reward = await prisma.loyaltyReward.findUnique({ where: { id: req.params.rewardId } });
  res.json({ success: true, data: reward });
}

// Analytics
export async function getAnalytics(req: AuthRequest, res: Response): Promise<void> {
  const businessId = req.params.businessId;
  const { range = '7d' } = req.query;

  const days = range === '30d' ? 30 : range === 'today' ? 1 : 7;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const { getBusinessAnalytics } = await import('../analytics/eventTracker');
  const { getIntelligenceSummary } = await import('../intelligence/conversationAnalyzer');
  const { getFunnelAnalytics } = await import('../analytics/funnelTracker');

  const [orders, customers, revenue, conversations, botAnalytics, intelligence, funnel] = await Promise.all([
    prisma.order.findMany({
      where: { businessId, createdAt: { gte: startDate } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.customer.count({ where: { businessId, createdAt: { gte: startDate } } }),
    prisma.order.aggregate({
      where: { businessId, createdAt: { gte: startDate }, paymentStatus: 'PAID' },
      _sum: { total: true },
    }),
    prisma.conversation.count({ where: { businessId, createdAt: { gte: startDate } } }),
    getBusinessAnalytics(businessId, days),
    getIntelligenceSummary(businessId),
    getFunnelAnalytics(businessId, days),
  ]);

  const ordersByDay: Record<string, number> = {};
  const revenueByDay: Record<string, number> = {};

  orders.forEach((o) => {
    const day = o.createdAt.toISOString().slice(0, 10);
    ordersByDay[day] = (ordersByDay[day] || 0) + 1;
    revenueByDay[day] = (revenueByDay[day] || 0) + o.total;
  });

  const statusDistribution = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  res.json({
    success: true,
    data: {
      totalOrders: orders.length,
      newCustomers: customers,
      totalRevenue: revenue._sum.total || 0,
      totalConversations: conversations,
      ordersByDay,
      revenueByDay,
      statusDistribution,
      avgOrderValue: orders.length ? (revenue._sum.total || 0) / orders.length : 0,
      bot: { ...botAnalytics, intelligence, funnel },
    },
  });
}

// Settings
export async function getAutoReplies(req: AuthRequest, res: Response): Promise<void> {
  const rules = await prisma.autoReply.findMany({
    where: { businessId: req.params.businessId },
    orderBy: { priority: 'asc' },
  });

  res.json({ success: true, data: rules });
}

export async function createAutoReply(req: AuthRequest, res: Response): Promise<void> {
  const rule = await prisma.autoReply.create({
    data: { businessId: req.params.businessId, ...req.body },
  });

  res.status(201).json({ success: true, data: rule });
}

export async function updateAutoReply(req: AuthRequest, res: Response): Promise<void> {
  const rule = await prisma.autoReply.updateMany({
    where: { id: req.params.ruleId, businessId: req.params.businessId },
    data: req.body,
  });

  if (rule.count === 0) {
    res.status(404).json({ success: false, message: 'Rule not found' });
    return;
  }

  const updated = await prisma.autoReply.findUnique({ where: { id: req.params.ruleId } });
  res.json({ success: true, data: updated });
}

export async function deleteAutoReply(req: AuthRequest, res: Response): Promise<void> {
  await prisma.autoReply.deleteMany({
    where: { id: req.params.ruleId, businessId: req.params.businessId },
  });

  res.json({ success: true, message: 'Rule deleted' });
}

export async function getStaff(req: AuthRequest, res: Response): Promise<void> {
  const staff = await prisma.staff.findMany({
    where: { businessId: req.params.businessId },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: staff });
}

export async function createStaff(req: AuthRequest, res: Response): Promise<void> {
  const member = await prisma.staff.create({
    data: { businessId: req.params.businessId, ...req.body },
  });

  res.status(201).json({ success: true, data: member });
}

export async function updateStaff(req: AuthRequest, res: Response): Promise<void> {
  const updated = await prisma.staff.updateMany({
    where: { id: req.params.staffId, businessId: req.params.businessId },
    data: req.body,
  });
  if (updated.count === 0) {
    res.status(404).json({ success: false, message: 'Staff not found' });
    return;
  }
  const member = await prisma.staff.findUnique({ where: { id: req.params.staffId } });
  res.json({ success: true, data: member });
}

export async function deleteStaff(req: AuthRequest, res: Response): Promise<void> {
  await prisma.staff.updateMany({
    where: { id: req.params.staffId, businessId: req.params.businessId },
    data: { isActive: false },
  });
  res.json({ success: true, message: 'Staff deactivated' });
}

export async function getNotifications(req: AuthRequest, res: Response): Promise<void> {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.userId, businessId: req.params.businessId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  res.json({ success: true, data: notifications });
}

export async function markNotificationRead(req: AuthRequest, res: Response): Promise<void> {
  await prisma.notification.updateMany({
    where: { id: req.params.notificationId, userId: req.user!.userId },
    data: { isRead: true },
  });

  res.json({ success: true });
}
