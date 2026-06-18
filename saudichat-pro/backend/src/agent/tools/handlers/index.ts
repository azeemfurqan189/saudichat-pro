import prisma from '../../../utils/prisma';
import { Prisma } from '@prisma/client';
import { assertRecordBelongsToTenant } from '../../../security/tenantScope';
import { ToolContext } from '../../toolExecutor';

export async function searchKnowledgeTool(ctx: ToolContext, args: { query: string }) {
  const { searchKnowledge } = await import('../../../knowledge/rag');
  const results = await searchKnowledge(ctx.businessId, args.query);
  return { results };
}

export async function searchCatalog(ctx: ToolContext, args: { query?: string }) {
  const where: { businessId: string; isAvailable: boolean; OR?: Array<{ nameAr?: { contains: string; mode: 'insensitive' }; nameEn?: { contains: string; mode: 'insensitive' } }> } = {
    businessId: ctx.businessId,
    isAvailable: true,
  };
  if (args.query?.trim()) {
    const q = args.query.trim();
    where.OR = [
      { nameAr: { contains: q, mode: 'insensitive' } },
      { nameEn: { contains: q, mode: 'insensitive' } },
    ];
  }
  const items = await prisma.catalogItem.findMany({
    where,
    take: 10,
    orderBy: { sortOrder: 'asc' },
  });
  return {
    items: items.map((item, i) => ({
      index: i + 1,
      id: item.id,
      nameAr: item.nameAr,
      nameEn: item.nameEn,
      price: item.price,
    })),
  };
}

export async function createOrder(
  ctx: ToolContext,
  args: {
    items: Array<{ catalogItemId: string; quantity: number }>;
    specialInstructions?: string;
    paymentMethod?: string;
    deliveryAddress?: string | Record<string, unknown>;
    deliveryFee?: number;
  }
) {
  const orderItems = [];
  let subtotal = 0;

  for (const line of args.items) {
    const item = await prisma.catalogItem.findFirst({
      where: { id: line.catalogItemId, businessId: ctx.businessId, isAvailable: true },
    });
    assertRecordBelongsToTenant(ctx.businessId, item, 'CatalogItem');
    const unitPrice = item!.discountPrice ?? item!.price;
    const lineTotal = unitPrice * line.quantity;
    subtotal += lineTotal;
    orderItems.push({
      catalogItemId: item!.id,
      name: item!.nameAr,
      quantity: line.quantity,
      price: unitPrice,
      total: lineTotal,
    });
  }

  const { getPaymentSettings } = await import('../../../services/paymentConfigService');
  const paySettings = await getPaymentSettings(ctx.businessId);
  let deliveryFee = args.deliveryFee ?? paySettings.deliveryFee;
  const vatRate = paySettings.vatEnabled ? paySettings.vatRate : 0;
  const tax = Math.round(subtotal * vatRate * 100) / 100;
  const total = subtotal + deliveryFee + tax;

  for (const line of args.items) {
    const item = await prisma.catalogItem.findFirst({
      where: { id: line.catalogItemId, businessId: ctx.businessId },
      select: { stockQty: true },
    });
    if (item?.stockQty != null) {
      await prisma.catalogItem.update({
        where: { id: line.catalogItemId },
        data: { stockQty: Math.max(0, item.stockQty - line.quantity) },
      });
    }
  }

  const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
  const deliveryJson =
    typeof args.deliveryAddress === 'string'
      ? { text: args.deliveryAddress }
      : args.deliveryAddress;

  const order = await prisma.order.create({
    data: {
      businessId: ctx.businessId,
      customerId: ctx.customerId,
      orderNumber,
      items: orderItems,
      subtotal,
      tax,
      deliveryFee,
      total,
      specialInstructions: args.specialInstructions,
      paymentMethod: args.paymentMethod || 'Cash on Delivery',
      paymentStatus: 'PENDING',
      deliveryAddress: deliveryJson as Prisma.InputJsonValue,
      status: 'PENDING',
    },
    include: { customer: { select: { name: true, phone: true } } },
  });

  await prisma.customer.update({
    where: { id: ctx.customerId },
    data: { totalOrders: { increment: 1 }, totalSpent: { increment: total } },
  });

  const { notifyNewOrder } = await import('../../../services/orderNotificationService');
  await notifyNewOrder(ctx.businessId, order).catch((err) =>
    console.warn('[createOrder] notify failed:', err instanceof Error ? err.message : err)
  );

  if (order.customer?.phone) {
    const { runWorkflowsForTrigger } = await import('../../../services/workflowRunner');
    await runWorkflowsForTrigger(ctx.businessId, 'order_status_changed', {
      phone: order.customer.phone,
      name: order.customer.name,
      orderNumber,
    }).catch(() => undefined);
  }

  return { orderId: order.id, orderNumber, total, status: order.status, deliveryFee, tax };
}

export async function createAppointment(
  ctx: ToolContext,
  args: { serviceId?: string; serviceName?: string; date: string; startTime: string; notes?: string }
) {
  let serviceName = args.serviceName;
  if (args.serviceId) {
    const service = await prisma.catalogItem.findFirst({
      where: { id: args.serviceId, businessId: ctx.businessId },
    });
    assertRecordBelongsToTenant(ctx.businessId, service, 'Service');
    serviceName = service!.nameAr;
  }

  const [hours, minutes] = args.startTime.split(':').map(Number);
  const endHour = hours + 1;
  const appointment = await prisma.appointment.create({
    data: {
      businessId: ctx.businessId,
      customerId: ctx.customerId,
      serviceId: args.serviceId,
      serviceName: serviceName || 'Consultation',
      date: new Date(`${args.date}T12:00:00`),
      startTime: args.startTime,
      endTime: `${String(endHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
      notes: args.notes,
      status: 'CONFIRMED',
    },
  });

  const { scheduleAppointmentReminderBefore } = await import('../../../services/appointmentReminderService');
  await scheduleAppointmentReminderBefore(appointment.id, ctx.businessId, 60).catch(() => undefined);

  return { appointmentId: appointment.id, date: args.date, time: args.startTime, service: serviceName };
}

export async function escalateToHuman(
  ctx: ToolContext,
  args: { reason: string; tags?: string[] }
) {
  await prisma.conversation.update({
    where: { id: ctx.conversationId },
    data: { isBotHandling: false, status: 'WAITING' },
  });

  const business = await prisma.business.findFirst({ where: { id: ctx.businessId } });
  if (business) {
    await prisma.notification.create({
      data: {
        businessId: ctx.businessId,
        userId: business.userId,
        type: 'MESSAGE',
        title: 'Agent handoff required',
        message: args.reason.slice(0, 200),
      },
    });
  }

  if (args.tags?.length) {
    await prisma.customer.update({
      where: { id: ctx.customerId },
      data: { tags: { push: args.tags } },
    });
  }

  return { escalated: true };
}
