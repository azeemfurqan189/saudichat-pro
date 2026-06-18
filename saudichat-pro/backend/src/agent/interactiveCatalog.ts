import prisma from '../utils/prisma';
import { DetectedLanguage } from '../ai/language/detector';
import { formatMenuLine } from '../services/catalogService';
import { WhapiListSection } from '../services/whapiClient';

export const PAYLOAD = {
  order: 'btn:order',
  track: 'btn:track',
  help: 'btn:help',
  confirmItem: 'btn:confirm_item',
  changeItem: 'btn:change_item',
  cancelOrder: 'btn:cancel_order',
  category: (slug: string) => `cat:${slug}`,
  item: (id: string) => `item:${id}`,
  payCod: 'pay:cod',
  confirmOrder: 'btn:confirm_order',
  addMore: 'btn:add_more',
  checkout: 'btn:checkout',
  qty: (n: number) => `qty:${n}`,
  payCard: 'pay:card',
  payTransfer: 'pay:transfer',
  moreCategories: (page: number) => `btn:more:cats:${page}`,
  moreItems: (slug: string, page: number) => `btn:more:items:${slug}:${page}`,
} as const;

const LIST_PAGE_SIZE = 9;

export function slugifyCategory(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'general';
}

export function parsePayload(text: string): { type: string; value: string } | null {
  const t = text.trim();
  const m = t.match(/^(btn|cat|item|pay|qty):(.+)$/i);
  if (m) return { type: m[1].toLowerCase(), value: m[2] };

  // Whapi sometimes returns button title instead of payload id
  const lower = t.toLowerCase();
  if (['view menu', 'menu', 'القائمة', 'منيو'].includes(lower)) return { type: 'btn', value: 'order' };
  if (['track order', 'track', 'تتبع'].includes(lower)) return { type: 'btn', value: 'track' };
  if (['help', 'مساعدة'].includes(lower)) return { type: 'btn', value: 'help' };
  if (['confirm order', 'confirm', 'تأكيد الطلب', 'تأكيد'].includes(lower)) return { type: 'btn', value: 'confirm_order' };
  if (['add more', 'more items', 'المزيد', 'مزيد'].includes(lower)) return { type: 'btn', value: 'add_more' };
  if (['checkout', 'place order', 'إتمام الطلب', 'الدفع'].includes(lower)) return { type: 'btn', value: 'checkout' };
  if (['cancel', 'إلغاء'].includes(lower)) return { type: 'btn', value: 'cancel_order' };

  return null;
}

export async function getCatalogCategories(businessId: string): Promise<string[]> {
  const items = await prisma.catalogItem.findMany({
    where: { businessId, isAvailable: true },
    select: { category: true },
    orderBy: { sortOrder: 'asc' },
  });
  const cats = new Set<string>();
  for (const item of items) {
    cats.add(item.category?.trim() || 'Menu');
  }
  return [...cats];
}

export async function getAllCatalogItems(businessId: string) {
  return prisma.catalogItem.findMany({
    where: { businessId, isAvailable: true },
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    take: 200,
  });
}

export async function getItemsByCategory(businessId: string, categorySlug: string) {
  const all = await getAllCatalogItems(businessId);
  return all.filter((item) => slugifyCategory(item.category?.trim() || 'Menu') === categorySlug);
}

export function buildCategoryListSections(categories: string[], page = 0): WhapiListSection[] {
  const start = page * LIST_PAGE_SIZE;
  const slice = categories.slice(start, start + LIST_PAGE_SIZE);
  const rows = slice.map((cat) => ({
    id: PAYLOAD.category(slugifyCategory(cat)),
    title: cat.slice(0, 24),
    description: 'View items',
  }));
  if (categories.length > start + LIST_PAGE_SIZE) {
    rows.push({
      id: PAYLOAD.moreCategories(page + 1),
      title: 'More categories...',
      description: 'Next page',
    });
  }
  return [{ title: page > 0 ? `Categories ${page + 1}` : 'Categories', rows }];
}

export function formatItemPrice(item: { price: number; discountPrice?: number | null }): string {
  if (item.discountPrice != null && item.discountPrice < item.price) {
    return `${item.discountPrice} SAR (was ${item.price})`;
  }
  return `${item.price} SAR`;
}

export function buildCategoryMenuText(
  categoryName: string,
  items: Array<{ nameAr: string; nameEn: string; price: number; discountPrice?: number | null }>,
  lang: DetectedLanguage,
  startIndex: number
): string {
  const lines = items.map((item, i) => {
    const idx = startIndex + i;
    const name =
      lang === 'en' && item.nameEn?.trim()
        ? item.nameEn
        : lang === 'ar'
          ? item.nameAr
          : `${item.nameAr}${item.nameEn ? ` / ${item.nameEn}` : ''}`;
    return `${idx + 1}. ${name} — ${formatItemPrice(item)}`;
  });
  return `📂 ${categoryName}\n\n${lines.join('\n')}\n\nReply with item number or tap from list.`;
}

export function buildItemListSections(
  items: Array<{ id: string; nameAr: string; nameEn: string; price: number; discountPrice?: number | null }>,
  lang: DetectedLanguage,
  page = 0,
  categorySlug?: string
): WhapiListSection[] {
  const start = page * LIST_PAGE_SIZE;
  const slice = items.slice(start, start + LIST_PAGE_SIZE);
  const rows = slice.map((item) => {
    const title =
      lang === 'en' && item.nameEn?.trim() ? item.nameEn.slice(0, 24) : item.nameAr.slice(0, 24);
    return {
      id: PAYLOAD.item(item.id),
      title,
      description: formatItemPrice(item).slice(0, 72),
    };
  });
  if (items.length > start + LIST_PAGE_SIZE && categorySlug) {
    rows.push({
      id: PAYLOAD.moreItems(categorySlug, page + 1),
      title: 'More items...',
      description: 'Next page',
    });
  }
  return [{ title: page > 0 ? `Items ${page + 1}` : 'Items', rows }];
}

export async function findItemByGlobalIndex(businessId: string, index: number) {
  const items = await getAllCatalogItems(businessId);
  return items[index - 1] ?? null;
}

export function formatMenuLineFromItem(
  item: { nameAr: string; nameEn: string; price: number; discountPrice?: number | null },
  index: number,
  lang: DetectedLanguage
): string {
  return formatMenuLine(item, index, lang);
}
