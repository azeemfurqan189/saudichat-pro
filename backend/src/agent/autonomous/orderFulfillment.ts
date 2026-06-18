import prisma from '../../utils/prisma';
import { sendBotMessage } from '../../whatsapp/flows/router-helpers';
import { ToolContext, executeTool } from '../toolExecutor';
import { DetectedLanguage, pickLocalized } from '../../ai/language/detector';
import { getConversationState, setConversationState } from '../conversationState';
import { trackEvent } from '../../analytics/eventTracker';
import { getPaymentSettings } from '../../services/paymentConfigService';

function generateTrackingCode(): string {
  return `TRK-${Date.now().toString(36).toUpperCase().slice(-8)}`;
}

function getTrackUrl(code: string): string {
  const base = process.env.FRONTEND_URL || process.env.PUBLIC_API_URL || 'https://saudichat-pro.vercel.app';
  return `${base.replace(/\/$/, '')}/track/${code}`;
}

export function parseNaturalOrder(text: string): { quantity: number; query: string } | null {
  const lower = text.toLowerCase().trim();
  const patterns = [
    /(\d+)\s*(?:kg|kilo|pcs|piece|pieces|x|×)?\s*(.+?)(?:\s+chahiye|\s+chahye|\s+chahie|\s+do|\s*$)/i,
    /(?:mujhe|mujhy|mujhay|i want|need|order|give me|dedo|dena)\s*(\d+)?\s*(.+)/i,
    /(.+?)\s+(\d+)\s*(?:kg|kilo|pcs|piece|pieces)?/i,
  ];

  for (const p of patterns) {
    const m = lower.match(p);
    if (!m) continue;
    let quantity = 1;
    let query = '';
    if (p === patterns[2]) {
      query = m[1].trim();
      quantity = m[2] ? parseInt(m[2], 10) : 1;
    } else {
      quantity = m[1] ? parseInt(m[1], 10) : 1;
      query = m[2]?.trim() || m[1]?.trim() || '';
    }
    if (query.length >= 2 && quantity > 0 && quantity <= 99) {
      return { quantity, query };
    }
  }
  return null;
}

export function isNaturalOrderRequest(text: string): boolean {
  if (parseNaturalOrder(text)) return true;
  return /\b(chahiye|chahye|order|mujhe|mujhy|dedo|give me|need|kg|gosht|meat|burger|pizza|shawarma)\b/i.test(text);
}

async function matchCatalogItem(businessId: string, query: string) {
  const items = await prisma.catalogItem.findMany({
    where: { businessId, isAvailable: true },
    take: 50,
  });
  const q = query.toLowerCase();
  const scored = items
    .map((item) => {
      const hay = `${item.nameEn} ${item.nameAr} ${item.category || ''}`.toLowerCase();
      let score = 0;
      if (hay.includes(q)) score += 10;
      q.split(/\s+/).forEach((w) => {
        if (w.length > 2 && hay.includes(w)) score += 3;
      });
      return { item, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.item;
}

export async function fulfillOrderAfterCreate(
  businessId: string,
  orderId: string,
  customerPhone: string,
  lang: DetectedLanguage = 'mixed'
): Promise<{ trackingCode: string; driverName?: string } | null> {
  const order = await prisma.order.findFirst({
    where: { id: orderId, businessId },
    include: { customer: true },
  });
  if (!order) return null;

  const trackingCode = generateTrackingCode();
  const address =
    typeof order.deliveryAddress === 'object' && order.deliveryAddress && 'text' in (order.deliveryAddress as object)
      ? String((order.deliveryAddress as { text: string }).text)
      : typeof order.deliveryAddress === 'string'
        ? order.deliveryAddress
        : undefined;

  const drivers = await prisma.staff.findMany({
    where: { businessId, isActive: true },
    take: 5,
  });
  const driver = drivers.find((d) => /driver|delivery|courier|توصيل/i.test(d.role)) || drivers[0];

  const eta = new Date(Date.now() + 45 * 60 * 1000);

  await prisma.delivery.create({
    data: {
      businessId,
      orderId: order.id,
      trackingCode,
      driverName: driver?.name,
      driverPhone: driver?.phone || undefined,
      address,
      status: 'ASSIGNED',
      estimatedAt: eta,
    },
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { status: 'CONFIRMED', estimatedTime: 45 },
  });

  const trackUrl = getTrackUrl(trackingCode);
  const { sendWhatsAppText } = await import('../../services/whatsappSend');
  const msg = pickLocalized(
    lang,
    `🎉 Order confirmed!\n\n#${order.orderNumber}\nTotal: ${order.total} SAR\n\n🚚 Delivery in ~45 min\nDriver: ${driver?.name || 'Assigned'}\n\nTrack: ${trackUrl}`,
    `🎉 تم تأكيد الطلب!\n\n#${order.orderNumber}\nالمجموع: ${order.total} ريال\n\n🚚 التوصيل خلال ~45 دقيقة\n\nتتبع: ${trackUrl}`
  );
  await sendWhatsAppText(businessId, customerPhone, msg);

  return { trackingCode, driverName: driver?.name };
}

export async function tryNaturalLanguageOrder(
  ctx: ToolContext,
  text: string,
  lang: DetectedLanguage = 'mixed'
): Promise<boolean> {
  const state = await getConversationState(ctx.businessId, ctx.conversationId);

  if (state.pendingNlOrder?.needsAddress) {
    const address = text.trim();
    if (address.length < 5) {
      await sendBotMessage(ctx.conversationId, pickLocalized(lang, 'Please send full delivery address.', 'أرسل عنوان التوصيل الكامل.'), ctx.businessId, ctx.phone);
      return true;
    }
    await setConversationState(ctx.businessId, ctx.conversationId, {
      deliveryAddress: address,
      pendingNlOrder: { ...state.pendingNlOrder, needsAddress: false },
    });
    return finalizeNlOrder(ctx, lang);
  }

  const parsed = parseNaturalOrder(text);
  if (!parsed) return false;

  const item = await matchCatalogItem(ctx.businessId, parsed.query);
  if (!item) {
    await sendBotMessage(
      ctx.conversationId,
      pickLocalized(lang, `Could not find "${parsed.query}". Type "menu" to see items.`, `لم نجد "${parsed.query}". اكتب "menu" للقائمة.`),
      ctx.businessId,
      ctx.phone
    );
    return true;
  }

  if (item.stockQty != null && item.stockQty < parsed.quantity) {
    await sendBotMessage(
      ctx.conversationId,
      pickLocalized(
        lang,
        `Sorry, only ${item.stockQty} ${item.nameAr} in stock.`,
        `عذراً، متوفر فقط ${item.stockQty} من ${item.nameAr}.`
      ),
      ctx.businessId,
      ctx.phone
    );
    return true;
  }

  const price = item.discountPrice ?? item.price;
  const line = { catalogItemId: item.id, name: item.nameAr, quantity: parsed.quantity, price };

  if (!state.deliveryAddress) {
    await setConversationState(ctx.businessId, ctx.conversationId, {
      pendingNlOrder: { items: [line], needsAddress: true },
      state: 'collecting_address',
    });
    const pay = await getPaymentSettings(ctx.businessId);
    const subtotal = price * parsed.quantity;
    await sendBotMessage(
      ctx.conversationId,
      pickLocalized(
        lang,
        `✅ ${parsed.quantity}x ${item.nameAr} — ${subtotal + pay.deliveryFee} SAR (incl. delivery)\n\nSend your delivery address.`,
        `✅ ${parsed.quantity}x ${item.nameAr} — ${subtotal + pay.deliveryFee} ريال\n\nأرسل عنوان التوصيل.`
      ),
      ctx.businessId,
      ctx.phone
    );
    return true;
  }

  await setConversationState(ctx.businessId, ctx.conversationId, {
    pendingNlOrder: { items: [line], needsAddress: false },
    deliveryAddress: state.deliveryAddress,
  });
  return finalizeNlOrder(ctx, lang);
}

async function finalizeNlOrder(ctx: ToolContext, lang: DetectedLanguage): Promise<boolean> {
  const state = await getConversationState(ctx.businessId, ctx.conversationId);
  const lines = state.pendingNlOrder?.items;
  if (!lines?.length) return false;

  const result = await executeTool(ctx, 'createOrder', {
    items: lines.map((l) => ({ catalogItemId: l.catalogItemId, quantity: l.quantity })),
    deliveryAddress: state.deliveryAddress,
    paymentMethod: 'Cash on Delivery',
  });

  await setConversationState(ctx.businessId, ctx.conversationId, {
    pendingNlOrder: undefined,
    state: 'idle',
    lastOrderId: (result.result as { orderId?: string })?.orderId,
  });

  if (result.success && result.result) {
    const orderId = (result.result as { orderId: string }).orderId;
    await fulfillOrderAfterCreate(ctx.businessId, orderId, ctx.phone, lang);
    await trackEvent({
      businessId: ctx.businessId,
      conversationId: ctx.conversationId,
      customerId: ctx.customerId,
      eventType: 'nl_order_fulfilled',
      metadata: { orderId },
    });
  } else {
    await sendBotMessage(ctx.conversationId, pickLocalized(lang, 'Order failed. Please try again.', 'فشل الطلب.'), ctx.businessId, ctx.phone);
  }
  return true;
}
