import prisma from '../utils/prisma';
import { emitToBusiness } from '../realtime/io';

export interface NewOrderAlertPayload {
  orderId: string;
  orderNumber: string;
  total: number;
  paymentMethod?: string;
  customerName?: string;
  customerPhone?: string;
  createdAt: string;
}

export async function notifyNewOrder(
  businessId: string,
  order: {
    id: string;
    orderNumber: string;
    total: number;
    paymentMethod?: string | null;
    createdAt: Date;
    customer?: { name?: string | null; phone?: string | null } | null;
  }
): Promise<void> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { userId: true },
  });
  if (!business) return;

  const customerLabel = order.customer?.name || order.customer?.phone || 'Customer';
  const message = `Order ${order.orderNumber} — ${order.total} SAR (${order.paymentMethod || 'COD'}) from ${customerLabel}`;

  await prisma.notification.create({
    data: {
      businessId,
      userId: business.userId,
      type: 'ORDER',
      title: 'New Order',
      message: message.slice(0, 500),
    },
  });

  emitToBusiness(businessId, 'new-order', {
    orderId: order.id,
    orderNumber: order.orderNumber,
    total: order.total,
    paymentMethod: order.paymentMethod ?? 'Cash on Delivery',
    customerName: order.customer?.name ?? undefined,
    customerPhone: order.customer?.phone ?? undefined,
    createdAt: order.createdAt.toISOString(),
  } satisfies NewOrderAlertPayload);
}
