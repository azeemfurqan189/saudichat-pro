import prisma from '../utils/prisma';
import type { DetectedLanguage } from '../ai/language/detector';
import { isAiConfigured } from '../ai/provider';

export async function ensureDefaultCatalog(businessId: string): Promise<string> {
  const existing = await prisma.catalog.findFirst({
    where: { businessId, isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true },
  });
  if (existing) return existing.id;

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { name: true },
  });

  const catalog = await prisma.catalog.create({
    data: {
      businessId,
      name: business?.name ? `${business.name} Menu` : 'Main Menu',
      nameAr: 'القائمة الرئيسية',
      type: 'MENU',
    },
  });
  return catalog.id;
}

export async function getAvailableCatalogItems(businessId: string) {
  return prisma.catalogItem.findMany({
    where: { businessId, isAvailable: true },
    take: 40,
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
  });
}

export function formatMenuLine(item: { nameAr: string; nameEn: string; price: number; discountPrice?: number | null }, index: number, lang: DetectedLanguage = 'mixed'): string {
  const price = item.discountPrice ?? item.price;
  const name =
    lang === 'en' && item.nameEn?.trim()
      ? item.nameEn.trim()
      : lang === 'ar'
        ? item.nameAr
        : item.nameEn?.trim()
          ? `${item.nameAr} / ${item.nameEn}`
          : item.nameAr;
  return `${index + 1}. ${name} — ${price} SAR`;
}

export async function buildMenuSummary(businessId: string, lang: DetectedLanguage = 'mixed'): Promise<string | null> {
  const items = await getAvailableCatalogItems(businessId);
  if (items.length === 0) return null;

  const lines: string[] = [];
  let index = 0;
  let lastCategory: string | null = null;

  for (const item of items) {
    const cat = item.category?.trim() || '';
    if (cat && cat !== lastCategory) {
      lines.push(`\n📂 ${cat}`);
      lastCategory = cat;
    }
    lines.push(formatMenuLine(item, index, lang));
    index++;
  }

  return lines.join('\n').trim();
}

export async function getCatalogItemCount(businessId: string): Promise<number> {
  return prisma.catalogItem.count({ where: { businessId, isAvailable: true } });
}

export function touchCatalogCache(businessId: string): void {
  void import('../cache/answerCache').then(({ invalidateAllBotCaches }) => invalidateAllBotCaches(businessId));
}

export async function getBotSetupStatus(businessId: string) {
  const [business, catalogItems, knowledgeDocs, autoReplies] = await Promise.all([
    prisma.business.findUnique({
      where: { id: businessId },
      select: {
        name: true,
        whatsappPhoneId: true,
        whatsappToken: true,
        description: true,
        settings: true,
      },
    }),
    getCatalogItemCount(businessId),
    prisma.knowledgeDocument.count({ where: { businessId, isActive: true } }),
    prisma.autoReply.count({ where: { businessId, isActive: true } }),
  ]);

  if (!business) return null;

  const settings = (business.settings as Record<string, unknown>) || {};
  const profileKeys = ['city', 'address', 'deliveryTime', 'servicesSummary'];
  const hasProfile = profileKeys.some((k) => {
    const v = settings[k];
    return typeof v === 'string' && v.trim().length > 0;
  });

  const checks = {
    whatsappConnected: Boolean(business.whatsappPhoneId && business.whatsappToken),
    catalogItems: catalogItems,
    hasMenu: catalogItems > 0,
    knowledgeDocs,
    autoReplies,
    aiPaused: settings.aiPaused === true,
    aiConfigured: isAiConfigured(),
    openaiConfigured: isAiConfigured(),
    businessDescription: Boolean(business.description?.trim()),
    hasProfile,
  };

  const readyForOrders = checks.whatsappConnected && checks.hasMenu;
  const readyForChat = checks.whatsappConnected && checks.openaiConfigured && !checks.aiPaused;

  return {
    businessId,
    businessName: business.name,
    readyForChat,
    readyForOrders,
    checks,
    setupSteps: [
      !checks.whatsappConnected && 'Dashboard → Settings → WhatsApp: save Channel ID + API Token',
      !checks.businessDescription && 'Dashboard → Settings → General: add business description',
      !checks.hasProfile && 'Dashboard → Settings → Profile: fill delivery/location/services info',
      !checks.hasMenu && 'Dashboard → Catalog: add products/services (menu items)',
      checks.aiPaused && 'Dashboard → AI Bot: turn OFF "AI Paused"',
      !checks.aiConfigured && 'Railway/backend: set GROQ_API_KEY or OPENAI_API_KEY',
      checks.knowledgeDocs === 0 && 'Optional: Dashboard → AI Bot → Knowledge: add FAQs/policies',
    ].filter(Boolean),
  };
}
