import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { generateSlug } from '../utils/auth';
import { validateBody, createBusinessSchema } from '../utils/validation';

export async function createBusiness(req: AuthRequest, res: Response): Promise<void> {
  const validation = validateBody(createBusinessSchema, req.body);
  if (!validation.success) {
    res.status(400).json({ success: false, errors: validation.errors });
    return;
  }

  const data = validation.data;
  const slug = generateSlug(data.name);

  const business = await prisma.business.create({
    data: {
      userId: req.user!.userId,
      name: data.name,
      nameAr: data.nameAr,
      type: data.type,
      slug,
      description: data.description,
      descriptionAr: data.descriptionAr,
      logo: data.logo,
      whatsappNumber: data.whatsappNumber,
      whatsappPhoneId: data.whatsappPhoneId,
      whatsappToken: data.whatsappToken,
      subscriptionPlan: data.subscriptionPlan || 'STARTER',
      settings: data.settings || {},
    },
  });

  // Create default catalog
  const catalogType = ['RESTAURANT', 'CAFE', 'RETAIL'].includes(data.type) ? 'MENU' : 'SERVICES';
  await prisma.catalog.create({
    data: {
      businessId: business.id,
      name: catalogType === 'MENU' ? 'Main Menu' : 'Services',
      nameAr: catalogType === 'MENU' ? 'القائمة الرئيسية' : 'الخدمات',
      type: catalogType as 'MENU' | 'SERVICES',
    },
  });

  res.status(201).json({ success: true, data: business });
}

export async function getBusiness(req: AuthRequest, res: Response): Promise<void> {
  const business = await prisma.business.findFirst({
    where: { id: req.params.businessId, userId: req.user!.userId },
  });

  if (!business) {
    res.status(404).json({ success: false, message: 'Business not found' });
    return;
  }

  res.json({ success: true, data: business });
}

export async function updateBusiness(req: AuthRequest, res: Response): Promise<void> {
  const business = await prisma.business.updateMany({
    where: { id: req.params.businessId, userId: req.user!.userId },
    data: req.body,
  });

  if (business.count === 0) {
    res.status(404).json({ success: false, message: 'Business not found' });
    return;
  }

  const updated = await prisma.business.findUnique({ where: { id: req.params.businessId } });
  res.json({ success: true, data: updated });
}

export async function getDashboardStats(req: AuthRequest, res: Response): Promise<void> {
  const businessId = req.params.businessId;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) {
    res.status(404).json({ success: false, message: 'Business not found' });
    return;
  }

  const isServiceBusiness = ['SALON', 'CLINIC', 'GYM'].includes(business.type);

  if (isServiceBusiness) {
    const [todayAppointments, revenue, servicesBooked, staffCount] = await Promise.all([
      prisma.appointment.count({
        where: { businessId, date: { gte: today }, status: { not: 'CANCELLED' } },
      }),
      prisma.appointment.count({
        where: { businessId, date: { gte: today }, status: 'COMPLETED' },
      }),
      prisma.appointment.count({ where: { businessId, date: { gte: today } } }),
      prisma.staff.count({ where: { businessId, isActive: true } }),
    ]);

    const upcomingAppointments = await prisma.appointment.findMany({
      where: { businessId, date: { gte: today } },
      include: { customer: true, staff: true },
      orderBy: { date: 'asc' },
      take: 10,
    });

    res.json({
      success: true,
      data: {
        type: business.type,
        stats: {
          todayAppointments,
          revenue: revenue * 150,
          servicesBooked,
          staffUtilized: staffCount,
        },
        upcomingAppointments,
      },
    });
  } else {
    const [todayOrders, pendingOrders, revenueResult, avgOrder] = await Promise.all([
      prisma.order.count({ where: { businessId, createdAt: { gte: today } } }),
      prisma.order.count({ where: { businessId, status: 'PENDING' } }),
      prisma.order.aggregate({
        where: { businessId, createdAt: { gte: today }, paymentStatus: 'PAID' },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: { businessId, createdAt: { gte: today } },
        _avg: { total: true },
      }),
    ]);

    const recentOrders = await prisma.order.findMany({
      where: { businessId },
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const recentConversations = await prisma.conversation.findMany({
      where: { businessId },
      include: { customer: true, messages: { take: 1, orderBy: { createdAt: 'desc' } } },
      orderBy: { lastMessageAt: 'desc' },
      take: 5,
    });

    res.json({
      success: true,
      data: {
        type: business.type,
        stats: {
          todayOrders,
          revenue: revenueResult._sum.total || 0,
          avgOrderValue: avgOrder._avg.total || 0,
          pendingOrders,
        },
        recentOrders,
        recentConversations,
      },
    });
  }
}

export async function testWhatsAppConnection(req: AuthRequest, res: Response): Promise<void> {
  const { phoneId, token } = req.body;
  if (!phoneId || !token) {
    res.status(400).json({ success: false, message: 'Phone ID and token required' });
    return;
  }

  // Simulate WhatsApp API test
  const isValid = phoneId.length > 5 && token.length > 10;
  res.json({
    success: isValid,
    message: isValid ? 'Connection successful' : 'Invalid credentials',
    data: isValid ? { phoneId, status: 'connected' } : null,
  });
}
