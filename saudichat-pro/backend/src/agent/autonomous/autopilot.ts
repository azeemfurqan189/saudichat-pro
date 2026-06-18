import prisma from '../../utils/prisma';
import { sendWhatsAppText } from '../../services/whatsappSend';
import { getExecutiveSummary } from '../../services/reportService';
import { sendCampaignBroadcast } from '../../services/campaignService';

type AutopilotSettings = {
  enabled?: boolean;
  autoMarketing?: boolean;
  ownerPhone?: string;
};

function getAutopilotSettings(settings: unknown): AutopilotSettings {
  const s = (settings as Record<string, unknown>) || {};
  const ai = (s.aiAutopilot as AutopilotSettings) || {};
  return ai;
}

async function getOwnerPhone(businessId: string, userId: string, settings: unknown): Promise<string | null> {
  const ap = getAutopilotSettings(settings);
  if (ap.ownerPhone) return ap.ownerPhone;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });
  const biz = await prisma.business.findUnique({ where: { id: businessId }, select: { whatsappNumber: true } });
  return biz?.whatsappNumber || user?.phone || null;
}

export async function runDailyBusinessManagerBriefing(): Promise<number> {
  const businesses = await prisma.business.findMany({ where: { isActive: true } });
  let sent = 0;

  for (const b of businesses) {
    const summary = await getExecutiveSummary(b.id, 7);
    const phone = await getOwnerPhone(b.id, b.userId, b.settings);
    if (!phone) continue;

    const pendingReviews = await prisma.review.count({ where: { businessId: b.id, createdAt: { gte: new Date(Date.now() - 7 * 86400000) }, rating: { lte: 3 } } });
    const pendingInvoices = await prisma.order.count({ where: { businessId: b.id, paymentStatus: 'PENDING' } });

    const items: string[] = [];
    if (summary.lowStockCount > 0) items.push(`1) ${summary.lowStockCount} items low stock — restock?`);
    if (pendingReviews > 0) items.push(`2) ${pendingReviews} low reviews — reply?`);
    if (pendingInvoices > 0) items.push(`3) ${pendingInvoices} pending payments — remind customers?`);
    if (summary.churnRiskCustomers > 3) items.push(`4) ${summary.churnRiskCustomers} at-risk customers — win-back?`);
    if (items.length === 0) items.push('All good! Business health strong.');

    const msg =
      `🤖 AI Manager — ${b.name}\n\n` +
      `Health: ${summary.businessHealthScore}/100 | Revenue growth: ${summary.revenueGrowth}%\n\n` +
      `${items.slice(0, 3).join('\n')}\n\n` +
      `Dashboard → Advisor for details.\nReply HELP for support.`;

    try {
      await sendWhatsAppText(b.id, phone, msg);
      await prisma.workflowLog.create({
        data: { businessId: b.id, entityType: 'business', entityId: b.id, step: 'ai_manager_briefing', messageSent: msg.slice(0, 500) },
      });
      sent++;
    } catch (err) {
      console.warn('[autopilot] briefing failed:', b.id, err instanceof Error ? err.message : err);
    }
  }
  return sent;
}

export async function runAutoMarketingCampaigns(): Promise<number> {
  const businesses = await prisma.business.findMany({ where: { isActive: true } });
  let launched = 0;

  for (const b of businesses) {
    const ap = getAutopilotSettings(b.settings);
    if (ap.enabled === false) continue;

    const summary = await getExecutiveSummary(b.id, 14);
    if (summary.revenueGrowth >= 0 && summary.orders > 5) continue;

    const inactive = await prisma.customer.count({
      where: { businessId: b.id, lastInteraction: { lt: new Date(Date.now() - 21 * 86400000) } },
    });
    if (inactive < 5) continue;

    const promo = await prisma.promoCode.findFirst({ where: { businessId: b.id, isActive: true } });
    const offer = promo ? `${promo.discountValue}${promo.discountType === 'PERCENTAGE' ? '%' : ' SAR'} off — code ${promo.code}` : '25% off — WAPAS25';

    const campaign = await prisma.campaign.create({
      data: {
        businessId: b.id,
        name: `AI Auto Win-back ${new Date().toISOString().slice(0, 10)}`,
        type: 'whatsapp',
        message: `Wapas aao! ${offer}\nWe miss you!`,
        status: ap.autoMarketing ? 'ACTIVE' : 'DRAFT',
        target: { segment: 'inactive' },
      },
    });

    const phone = await getOwnerPhone(b.id, b.userId, b.settings);
    if (phone) {
      await sendWhatsAppText(
        b.id,
        phone,
        `📣 AI Marketing Proposal\n\nSales down ${Math.abs(summary.revenueGrowth)}%. Send to ${inactive} inactive customers?\n\n"${campaign.message.slice(0, 120)}..."\n\n${ap.autoMarketing ? 'Auto-sent ✅' : 'Approve in Dashboard → Marketing'}`
      );
    }

    if (ap.autoMarketing) {
      await sendCampaignBroadcast(b.id, campaign.id).catch(() => undefined);
    }
    launched++;
  }
  return launched;
}

export async function generateWeeklyStaffSchedule(): Promise<number> {
  const businesses = await prisma.business.findMany({ where: { isActive: true }, select: { id: true, userId: true, name: true, settings: true } });
  let sent = 0;

  for (const b of businesses) {
    const staff = await prisma.staff.findMany({ where: { businessId: b.id, isActive: true } });
    if (staff.length < 2) continue;

    const summary = await getExecutiveSummary(b.id, 7);
    const phone = await getOwnerPhone(b.id, b.userId, b.settings);
    if (!phone) continue;

    const friBusy = summary.orders > 10;
    const schedule = staff
      .slice(0, 6)
      .map((s, i) => {
        const off = i === 1 ? 'Tue Dhuhr off' : 'Full week';
        const extra = friBusy && i < 2 ? ' (+Friday extra shift)' : '';
        return `• ${s.name} (${s.role}): ${off}${extra}`;
      })
      .join('\n');

    const msg =
      `📅 AI Staff Schedule — ${b.name}\n\n` +
      `Next week draft:\n${schedule}\n\n` +
      `${friBusy ? 'Friday peak expected — 2 extra staff suggested.\n' : ''}` +
      `Confirm in Dashboard → Staff`;

    try {
      await sendWhatsAppText(b.id, phone, msg);
      await prisma.workflowLog.create({
        data: { businessId: b.id, entityType: 'staff', entityId: b.id, step: 'ai_staff_schedule', messageSent: msg.slice(0, 500) },
      });
      sent++;
    } catch {
      // skip
    }
  }
  return sent;
}
