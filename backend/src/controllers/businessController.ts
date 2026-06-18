import { Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { generateSlug } from '../utils/auth';
import { validateBody, createBusinessSchema } from '../utils/validation';
import {
  getWhatsAppProvider,
  isMetaPhoneNumberId,
  isWhapiChannelId,
} from '../services/whatsappProvider';
import { testWhapiConnection } from '../services/whapiClient';
import { ensureOwnerMembership } from '../services/membershipService';

export async function createBusiness(req: AuthRequest, res: Response): Promise<void> {
  const validation = validateBody(createBusinessSchema, req.body);
  if (validation.success === false) {
    res.status(400).json({ success: false, errors: validation.errors });
    return;
  }

  const data = validation.data;
  const slug = generateSlug(data.name);
  const whatsappPhoneId = data.whatsappPhoneId?.trim() || undefined;
  const whatsappToken = data.whatsappToken?.trim() || undefined;
  const baseSettings = (data.settings || {}) as Record<string, unknown>;

  try {
    let businessType = data.type;
    let settingsPayload = baseSettings as Prisma.InputJsonValue;

    let business;
    try {
      business = await prisma.business.create({
        data: {
          userId: req.user!.userId,
          name: data.name,
          nameAr: data.nameAr,
          type: businessType,
          slug,
          description: data.description,
          descriptionAr: data.descriptionAr,
          logo: data.logo,
          whatsappNumber: data.whatsappNumber?.trim() || undefined,
          whatsappPhoneId,
          whatsappToken,
          subscriptionPlan: data.subscriptionPlan || 'STARTER',
          settings: settingsPayload,
        },
      });
    } catch (createErr) {
      const msg = createErr instanceof Error ? createErr.message : '';
      const enumConflict =
        msg.includes('enum') ||
        msg.includes('BusinessType') ||
        msg.includes('invalid input value for enum');
      if (enumConflict && businessType !== 'CUSTOM') {
        businessType = 'CUSTOM';
        settingsPayload = {
          ...baseSettings,
          industryType: data.type,
        } as Prisma.InputJsonValue;
        business = await prisma.business.create({
          data: {
            userId: req.user!.userId,
            name: data.name,
            nameAr: data.nameAr,
            type: 'CUSTOM',
            slug,
            description: data.description,
            descriptionAr: data.descriptionAr,
            logo: data.logo,
            whatsappNumber: data.whatsappNumber?.trim() || undefined,
            whatsappPhoneId,
            whatsappToken,
            subscriptionPlan: data.subscriptionPlan || 'STARTER',
            settings: settingsPayload,
          },
        });
      } else {
        throw createErr;
      }
    }

    try {
      const catalogType = ['RESTAURANT', 'CAFE', 'RETAIL'].includes(businessType) ? 'MENU' : 'SERVICES';
      await prisma.catalog.create({
        data: {
          businessId: business.id,
          name: catalogType === 'MENU' ? 'Main Menu' : 'Services',
          nameAr: catalogType === 'MENU' ? 'القائمة الرئيسية' : 'الخدمات',
          type: catalogType as 'MENU' | 'SERVICES',
        },
      });
    } catch (catalogErr) {
      console.warn('createBusiness: default catalog skipped:', catalogErr);
    }

    try {
      await ensureOwnerMembership(business.id, req.user!.userId);
    } catch (memberErr) {
      console.warn('createBusiness: owner membership skipped:', memberErr);
    }

    res.status(201).json({ success: true, data: business });
  } catch (error) {
    console.error('createBusiness failed:', error);
    res.status(500).json({
      success: false,
      message: 'Could not create business. Try again in a minute or skip optional steps.',
    });
  }
}

export async function getBusiness(req: AuthRequest, res: Response): Promise<void> {
  const access = req.membership;
  if (!access) {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }

  const business = await prisma.business.findFirst({
    where: { id: req.params.businessId },
  });

  if (!business) {
    res.status(404).json({ success: false, message: 'Business not found' });
    return;
  }

  res.json({
    success: true,
    data: { ...business, memberRole: access.role, memberId: access.memberId },
  });
}

export async function updateBusiness(req: AuthRequest, res: Response): Promise<void> {
  const data = { ...req.body } as Record<string, unknown>;

  const existing = await prisma.business.findFirst({
    where: { id: req.params.businessId, userId: req.user!.userId },
    select: { settings: true },
  });
  if (!existing) {
    res.status(404).json({ success: false, message: 'Business not found' });
    return;
  }

  const mergedSettings = {
    ...((existing.settings as Record<string, unknown>) || {}),
    ...((data.settings as Record<string, unknown>) || {}),
  };
  if (data.settings !== undefined) {
    data.settings = mergedSettings;
  }

  const provider = getWhatsAppProvider(mergedSettings);

  if (typeof data.whatsappPhoneId === 'string') {
    const pid = data.whatsappPhoneId.trim();
    if (pid) {
      const validMeta = isMetaPhoneNumberId(pid);
      const validWhapi = isWhapiChannelId(pid);
      if (provider === 'whapi' && !validWhapi && !validMeta) {
        res.status(400).json({
          success: false,
          message:
            'Whapi Channel ID looks wrong (e.g. MANTIS-M72HC from panel.whapi.cloud). Not your +966 mobile number.',
        });
        return;
      }
      if (provider === 'meta' && !validMeta) {
        res.status(400).json({
          success: false,
          message:
            'Phone number ID must be digits only from Meta (e.g. 1231221340063841). Not your +966 WhatsApp number.',
        });
        return;
      }
    }
    data.whatsappPhoneId = pid;
  }
  if (typeof data.whatsappToken === 'string') {
    const trimmed = data.whatsappToken.trim();
    if (!trimmed) {
      delete data.whatsappToken;
    } else {
      data.whatsappToken = trimmed;
    }
  }

  const business = await prisma.business.updateMany({
    where: { id: req.params.businessId, userId: req.user!.userId },
    data,
  });

  if (business.count === 0) {
    res.status(404).json({ success: false, message: 'Business not found' });
    return;
  }

  const updated = await prisma.business.findUnique({ where: { id: req.params.businessId } });
  if (data.description !== undefined || data.settings !== undefined || data.name !== undefined) {
    const { invalidateAllBotCaches } = await import('../cache/answerCache');
    await invalidateAllBotCaches(req.params.businessId);
  }
  res.json({ success: true, data: updated });
}

export async function getBotSetup(req: AuthRequest, res: Response): Promise<void> {
  const { getBotSetupStatus } = await import('../services/catalogService');
  const setup = await getBotSetupStatus(req.params.businessId);
  if (!setup) {
    res.status(404).json({ success: false, message: 'Business not found' });
    return;
  }
  res.json({ success: true, data: setup });
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
  const phoneId = String(req.body.phoneId ?? '').trim();
  let token = String(req.body.token ?? '').trim();

  const business = await prisma.business.findFirst({
    where: { id: req.params.businessId, userId: req.user!.userId },
    select: { whatsappToken: true, settings: true },
  });

  if (!business) {
    res.status(404).json({ success: false, message: 'Business not found' });
    return;
  }

  const provider = getWhatsAppProvider(business.settings);

  if (!token) {
    token = business.whatsappToken?.trim() ?? '';
  }

  if (!token) {
    res.status(400).json({
      success: false,
      message:
        provider === 'whapi'
          ? 'Whapi API token required — paste token from panel.whapi.cloud and Save, or enter before Test'
          : 'Access Token required — paste Meta EAA... token and Save, or enter it before Test',
    });
    return;
  }

  if (provider === 'whapi') {
    const result = await testWhapiConnection(token);
    if (!result.ok) {
      res.status(400).json({
        success: false,
        message: result.message,
        data: { channelId: result.channelId, status: result.status },
      });
      return;
    }

    const channelId = result.channelId?.trim() || phoneId;
    if (channelId && channelId !== phoneId) {
      await prisma.business.update({
        where: { id: req.params.businessId },
        data: { whatsappPhoneId: channelId },
      });
    }

    res.json({
      success: true,
      message: result.message,
      data: {
        channelId: channelId || phoneId,
        status: result.status,
        hint: 'Save Channel ID in Settings if empty; set webhook to /webhook/whapi on your public backend URL',
      },
    });
    return;
  }

  if (!phoneId) {
    res.status(400).json({ success: false, message: 'Phone number ID is required' });
    return;
  }

  if (!isMetaPhoneNumberId(phoneId)) {
    res.status(400).json({
      success: false,
      message:
        'Phone number ID must be digits only (from Meta API Setup). Do not paste +966 mobile number here.',
    });
    return;
  }

  try {
    const apiVersion = process.env.WHATSAPP_API_VERSION || 'v25.0';
    const metaRes = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = (await metaRes.json()) as { error?: { message?: string; code?: number } };

    if (!metaRes.ok) {
      res.status(400).json({
        success: false,
        message: body.error?.message || `Meta API error (${metaRes.status})`,
        data: { phoneId, code: body.error?.code },
      });
      return;
    }

    res.json({
      success: true,
      message: 'Connection successful — token and Phone ID are valid',
      data: { phoneId, status: 'connected' },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : 'Failed to reach Meta API',
    });
  }
}
