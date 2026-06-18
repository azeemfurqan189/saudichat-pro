import prisma from '../../../utils/prisma';
import { assertRecordBelongsToTenant } from '../../../security/tenantScope';
import { ToolContext } from '../../toolExecutor';
import { getConversationState, setConversationState, CartLine } from '../../conversationState';

export async function addToCart(
  ctx: ToolContext,
  args: { catalogItemId: string; quantity: number }
) {
  const item = await prisma.catalogItem.findFirst({
    where: { id: args.catalogItemId, businessId: ctx.businessId, isAvailable: true },
  });
  assertRecordBelongsToTenant(ctx.businessId, item, 'CatalogItem');

  const state = await getConversationState(ctx.businessId, ctx.conversationId);
  const cart: CartLine[] = [...(state.cart || [])];
  const existing = cart.find((l) => l.catalogItemId === args.catalogItemId);
  const unitPrice = item!.discountPrice ?? item!.price;

  if (existing) {
    existing.quantity += args.quantity;
  } else {
    cart.push({
      catalogItemId: item!.id,
      quantity: args.quantity,
      name: item!.nameAr,
      price: unitPrice,
    });
  }

  await setConversationState(ctx.businessId, ctx.conversationId, {
    state: 'viewing_cart',
    cart,
  });

  const total = cart.reduce((s, l) => s + l.price * l.quantity, 0);
  return {
    cart,
    itemCount: cart.reduce((s, l) => s + l.quantity, 0),
    subtotal: total,
  };
}

export async function confirmOrder(
  ctx: ToolContext,
  args: { paymentMethod?: string; deliveryAddress?: string; specialInstructions?: string }
) {
  const state = await getConversationState(ctx.businessId, ctx.conversationId);
  const cart = state.cart?.length ? state.cart : state.pendingOrder ? [state.pendingOrder] : [];

  if (cart.length === 0) {
    throw new Error('Cart is empty — add items before confirming');
  }

  const { createOrder } = await import('./index');
  const address = args.deliveryAddress || state.deliveryAddress;
  const payment = args.paymentMethod || state.paymentMethod || 'Cash on Delivery';

  const result = await createOrder(ctx, {
    items: cart.map((l) => ({ catalogItemId: l.catalogItemId, quantity: l.quantity })),
    paymentMethod: payment,
    deliveryAddress: address,
    specialInstructions: args.specialInstructions,
  });

  await setConversationState(ctx.businessId, ctx.conversationId, {
    state: 'idle',
    cart: [],
    pendingOrder: undefined,
    lastOrderId: (result as { orderId?: string }).orderId,
  });

  return result;
}

export async function checkAvailability(
  ctx: ToolContext,
  args: { date: string; serviceId?: string }
) {
  const date = new Date(`${args.date}T12:00:00`);
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const where: { businessId: string; date: { gte: Date; lte: Date }; serviceId?: string } = {
    businessId: ctx.businessId,
    date: { gte: dayStart, lte: dayEnd },
  };
  if (args.serviceId) where.serviceId = args.serviceId;

  const booked = await prisma.appointment.findMany({
    where,
    select: { startTime: true, endTime: true },
  });

  const slots = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
  const bookedTimes = new Set(booked.map((b) => b.startTime));
  const available = slots.filter((s) => !bookedTimes.has(s));

  return { date: args.date, availableSlots: available, bookedCount: booked.length };
}
