import prisma from '../utils/prisma';
import { sendWhatsAppText } from '../services/whatsappSend';
import { validateBotResponse } from '../ai/guardrails/responseValidator';
import { trackEvent } from '../analytics/eventTracker';

export async function suggestUpsell(businessId: string, conversationId: string, customerId: string, phone: string, orderTotal: number): Promise<void> {
  const addons = await prisma.catalogItem.findMany({
    where: { businessId, isAvailable: true, isFeatured: true },
    take: 2,
    orderBy: { sortOrder: 'asc' },
  });

  if (addons.length === 0) {
    const promos = await prisma.promoCode.findFirst({
      where: { businessId, isActive: true },
    });
    if (promos && orderTotal > 50) {
      const msg = `🎁 Next order use code ${promos.code} for ${promos.discountValue}${promos.discountType === 'PERCENTAGE' ? '%' : ' SAR'} off!`;
      const { sanitized } = await validateBotResponse(msg, businessId);
      await sendWhatsAppText(businessId, phone, sanitized);
      await trackEvent({ businessId, conversationId, customerId, eventType: 'upsell_sent', metadata: { type: 'promo' } });
    }
    return;
  }

  const suggestion = addons.map((a) => `• ${a.nameAr} — ${a.price} SAR`).join('\n');
  const msg = `🛍️ Add to your order?\n${suggestion}\n\nReply with item number!`;
  const { sanitized } = await validateBotResponse(msg, businessId);
  await sendWhatsAppText(businessId, phone, sanitized);
  await trackEvent({ businessId, conversationId, customerId, eventType: 'upsell_sent', metadata: { type: 'addon' } });
}

export async function sendAbandonedCartReminder(params: {
  businessId: string;
  conversationId: string;
  customerId: string;
  phone: string;
  itemName: string;
  price: number;
}): Promise<void> {
  const msg = `👋 Still interested in ${params.itemName} (${params.price} SAR)?\n\nReply "نعم" to confirm your order!`;
  const { sanitized } = await validateBotResponse(msg, params.businessId);
  await sendWhatsAppText(params.businessId, params.phone, sanitized);
  await trackEvent({
    businessId: params.businessId,
    conversationId: params.conversationId,
    customerId: params.customerId,
    eventType: 'abandoned_cart_reminder',
  });
}

export async function sendWinBackMessage(businessId: string, customerId: string, phone: string, customerName: string): Promise<void> {
  const promo = await prisma.promoCode.findFirst({ where: { businessId, isActive: true } });
  const discount = promo ? ` Use code ${promo.code}!` : '';
  const msg = `Hi ${customerName}! 👋 We miss you!${discount}\n\nمرحباً ${customerName}! اشتقنا لك!${discount}`;
  const { sanitized } = await validateBotResponse(msg, businessId);
  await sendWhatsAppText(businessId, phone, sanitized);
  await trackEvent({ businessId, customerId, eventType: 'winback_sent' });
}
