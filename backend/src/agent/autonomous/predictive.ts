import prisma from '../../utils/prisma';
import { sendWhatsAppText } from '../../services/whatsappSend';
import { validateBotResponse } from '../../ai/guardrails/responseValidator';
import { getExecutiveSummary } from '../../services/reportService';
import { trackEvent } from '../../analytics/eventTracker';

export async function runProactiveChurnOffers(): Promise<number> {
  const customers = await prisma.customer.findMany({
    where: { churnRisk: 'HIGH' },
    take: 80,
  });

  let sent = 0;
  for (const c of customers) {
    const intel = (c.intelligence as Record<string, unknown>) || {};
    if (intel.lastChurnOfferAt && Date.now() - new Date(String(intel.lastChurnOfferAt)).getTime() < 14 * 86400000) {
      continue;
    }

    const daysSince = c.lastInteraction
      ? Math.floor((Date.now() - c.lastInteraction.getTime()) / 86400000)
      : 999;

    const promo = await prisma.promoCode.findFirst({ where: { businessId: c.businessId, isActive: true } });
    const discount = promo ? ` Code: ${promo.code} (${promo.discountValue}${promo.discountType === 'PERCENTAGE' ? '%' : ' SAR'} off)` : ' 20% discount today!';

    const msg = `${c.name}, aapko miss kar rahe hain! 👋\n${daysSince} din se nahi aaye.${discount}\n\n${c.name}، اشتقنا لك!`;
    const { sanitized } = await validateBotResponse(msg, c.businessId);
    try {
      await sendWhatsAppText(c.businessId, c.phone, sanitized);
      await prisma.customer.update({
        where: { id: c.id },
        data: {
          intelligence: { ...intel, lastChurnOfferAt: new Date().toISOString() },
        },
      });
      await trackEvent({ businessId: c.businessId, customerId: c.id, eventType: 'proactive_churn_offer' });
      sent++;
    } catch (err) {
      console.warn('[predictive] churn offer failed:', c.id, err instanceof Error ? err.message : err);
    }
  }
  return sent;
}

export async function runSmartUpsellCampaigns(): Promise<number> {
  const businesses = await prisma.business.findMany({ where: { isActive: true }, select: { id: true } });
  let sent = 0;
  const today = new Date().getDay();
  const targetDay = (today + 1) % 7;

  for (const b of businesses) {
    const orders = await prisma.order.findMany({
      where: { businessId: b.id, createdAt: { gte: new Date(Date.now() - 90 * 86400000) } },
      include: { customer: true },
      take: 500,
    });

    const byCustomerDay = new Map<string, number>();
    for (const o of orders) {
      const dow = o.createdAt.getDay();
      const key = `${o.customerId}:${dow}`;
      byCustomerDay.set(key, (byCustomerDay.get(key) || 0) + 1);
    }

    const candidates: Array<{ customerId: string; phone: string; name: string; count: number }> = [];
    for (const o of orders) {
      const key = `${o.customerId}:${targetDay}`;
      const count = byCustomerDay.get(key) || 0;
      if (count >= 2 && o.customer?.phone) {
        candidates.push({ customerId: o.customerId, phone: o.customer.phone, name: o.customer.name, count });
      }
    }

    const unique = new Map(candidates.map((c) => [c.customerId, c]));
    for (const c of unique.values()) {
      const featured = await prisma.catalogItem.findFirst({
        where: { businessId: b.id, isFeatured: true, isAvailable: true },
      });
      const item = featured?.nameAr || 'special combo';
      const msg = `Hi ${c.name}! 📅 Kal ke liye pehle se order karein?\n${item} available hai — aap usually is din order karte hain.\n\n${c.name}، احجز مسبقاً للغد!`;
      const { sanitized } = await validateBotResponse(msg, b.id);
      try {
        await sendWhatsAppText(b.id, c.phone, sanitized);
        await trackEvent({ businessId: b.id, customerId: c.customerId, eventType: 'smart_upsell_timing' });
        sent++;
      } catch {
        // skip
      }
    }
  }
  return sent;
}

export async function runStockPredictionAlerts(): Promise<number> {
  const businesses = await prisma.business.findMany({ where: { isActive: true }, select: { id: true, userId: true, name: true } });
  let alerts = 0;
  const now = new Date();
  const ramadanApprox = now.getMonth() === 2 || now.getMonth() === 3;

  for (const b of businesses) {
    const items = await prisma.catalogItem.findMany({
      where: { businessId: b.id, stockQty: { not: null } },
      take: 100,
    });

    const low = items.filter((i) => (i.stockQty ?? 0) <= (i.lowStockThreshold ?? 5));
    const velocity = await prisma.order.findMany({
      where: { businessId: b.id, createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
      take: 200,
    });

    if (low.length === 0 && !ramadanApprox) continue;

    const owner = await prisma.user.findUnique({ where: { id: b.userId }, select: { phone: true } });
    const business = await prisma.business.findUnique({ where: { id: b.id }, select: { whatsappNumber: true } });
    const to = business?.whatsappNumber || owner?.phone;
    if (!to) continue;

    let msg = `📦 Stock AI Alert — ${b.name}\n\n`;
    if (low.length) msg += `${low.length} items low stock: ${low.slice(0, 3).map((i) => i.nameAr).join(', ')}\n`;
    if (ramadanApprox) msg += `Ramadan/Eid season — consider 2-3x stock on dates, juice, rice.\n`;
    msg += `Orders last 30d: ${velocity.length}. Reorder suggested.`;

    try {
      await sendWhatsAppText(b.id, to, msg);
      alerts++;
    } catch {
      // skip
    }
  }
  return alerts;
}

export async function sendOwnerRevenueForecast(): Promise<number> {
  const businesses = await prisma.business.findMany({ where: { isActive: true }, select: { id: true, userId: true, name: true } });
  let sent = 0;

  for (const b of businesses) {
    const summary = await getExecutiveSummary(b.id, 30);
    const owner = await prisma.user.findUnique({ where: { id: b.userId }, select: { phone: true } });
    const biz = await prisma.business.findUnique({ where: { id: b.id }, select: { whatsappNumber: true } });
    const to = biz?.whatsappNumber || owner?.phone;
    if (!to) continue;

    const forecast = Math.round(summary.revenue * (1 + summary.revenueGrowth / 100));
    const appts = await prisma.appointment.count({
      where: { businessId: b.id, status: 'PENDING', date: { gte: new Date() } },
    });

    const msg =
      `☀️ Good morning! ${b.name}\n\n` +
      `Today's forecast: ~SAR ${forecast.toLocaleString()}\n` +
      `Peak: 12-2pm | Health: ${summary.businessHealthScore}/100\n` +
      `${summary.lowStockCount ? `⚠️ ${summary.lowStockCount} items slow/low stock\n` : ''}` +
      `${appts ? `📅 ${appts} appointments pending confirm\n` : ''}` +
      `Growth: ${summary.revenueGrowth}%`;

    try {
      await sendWhatsAppText(b.id, to, msg);
      sent++;
    } catch {
      // skip
    }
  }
  return sent;
}
