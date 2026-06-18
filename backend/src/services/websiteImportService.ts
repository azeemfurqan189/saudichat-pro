import dns from 'dns/promises';
import net from 'net';
import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import type { AnyNode } from 'domhandler';
import prisma from '../utils/prisma';
import { Prisma } from '@prisma/client';
import { createChatCompletion, isAiConfigured } from '../ai/provider';
import { ensureDefaultCatalog } from './catalogService';
import { invalidateAllBotCaches } from '../cache/answerCache';

const FETCH_TIMEOUT_MS = 20000;
const MAX_HTML_BYTES = 2 * 1024 * 1024;
const MAX_PAGES = 12;
const MAX_ITEMS = 500;

const MENU_PATH_HINTS = [
  '/menu',
  '/our-menu',
  '/food-menu',
  '/food',
  '/order',
  '/order-online',
  '/products',
  '/shop',
  '/catalog',
  '/catalogue',
  '/items',
  '/dishes',
];

const MENU_LINK_KEYWORDS = [
  'menu',
  'food',
  'order',
  'product',
  'shop',
  'catalog',
  'dishes',
  'قائمة',
  'طعام',
  'منيو',
  'منتج',
];

export interface WebsitePreviewItem {
  nameEn: string;
  nameAr?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  price: number;
  discountPrice?: number;
  category?: string;
  image?: string;
}

export interface WebsitePreviewResult {
  url: string;
  pagesScanned?: number;
  businessInfo?: {
    name?: string;
    address?: string;
    hours?: string;
    about?: string;
  };
  categories: string[];
  items: WebsitePreviewItem[];
  source: 'cheerio' | 'ai' | 'mixed';
}

export interface WebsiteImportOptions {
  applyProfile?: boolean;
  applyCatalog?: boolean;
  items?: WebsitePreviewItem[];
}

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    if (parts[0] === 10) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 0) return true;
  }
  if (ip === '::1' || ip.startsWith('fe80:') || ip.startsWith('fc') || ip.startsWith('fd')) return true;
  return false;
}

export async function assertSafeUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new Error('Invalid URL');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http/https URLs are allowed');
  }
  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new Error('Localhost URLs are not allowed');
  }
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error('Private IP addresses are not allowed');
    return parsed;
  }
  const addresses = await dns.lookup(host, { all: true });
  for (const addr of addresses) {
    if (isPrivateIp(addr.address)) {
      throw new Error('URL resolves to a private network address');
    }
  }
  return parsed;
}

function resolveImageUrl(base: URL, src: string | undefined): string | undefined {
  if (!src?.trim()) return undefined;
  const raw = src.trim().replace(/&amp;/g, '&');
  if (raw.startsWith('data:') || raw.startsWith('blob:')) return undefined;

  try {
    let abs = new URL(raw, base).href;
    if (abs.startsWith('http://')) abs = `https://${abs.slice(7)}`;
    if (!abs.startsWith('https://')) return undefined;

    const lower = abs.toLowerCase();
    if (lower.includes('1x1') || lower.includes('pixel') || lower.includes('spacer.gif')) return undefined;
    if (lower.endsWith('.svg') && (lower.includes('icon') || lower.includes('logo') || lower.includes('sprite'))) {
      return undefined;
    }
    return abs;
  } catch {
    return undefined;
  }
}

function parseSrcset(srcset: string, base: URL): string | undefined {
  const parts = srcset.split(',').map((s) => s.trim()).filter(Boolean);
  let bestUrl: string | undefined;
  let bestScore = -1;

  for (const part of parts) {
    const tokens = part.split(/\s+/);
    const url = tokens[0];
    const descriptor = tokens[1] || '';
    let score = 0;
    if (descriptor.endsWith('w')) score = parseInt(descriptor, 10) || 0;
    else if (descriptor.endsWith('x')) score = (parseFloat(descriptor) || 1) * 1000;
    else score = 500;

    if (score >= bestScore) {
      bestScore = score;
      bestUrl = url;
    }
  }

  return resolveImageUrl(base, bestUrl || parts[0]?.split(/\s+/)[0]);
}

function parseJsonLdImage(image: unknown, pageUrl: URL): string | undefined {
  if (!image) return undefined;
  if (typeof image === 'string') return resolveImageUrl(pageUrl, image);
  if (Array.isArray(image)) {
    for (const entry of image) {
      const u = parseJsonLdImage(entry, pageUrl);
      if (u) return u;
    }
    return undefined;
  }
  if (typeof image === 'object') {
    const obj = image as Record<string, unknown>;
    if (obj.url) return resolveImageUrl(pageUrl, String(obj.url));
    if (obj.contentUrl) return resolveImageUrl(pageUrl, String(obj.contentUrl));
  }
  return undefined;
}

function extractImageFromElement($: CheerioAPI, el: AnyNode, pageUrl: URL): string | undefined {
  const $el = $(el);
  const candidates: (string | undefined)[] = [];

  $el.find('img, [role="img"]').each((_, imgEl) => {
    const $img = $(imgEl);
    if ($img.is('img')) {
      candidates.push(
        $img.attr('src'),
        $img.attr('data-src'),
        $img.attr('data-lazy-src'),
        $img.attr('data-original'),
        $img.attr('data-lazy'),
        $img.attr('data-url'),
        $img.attr('data-image')
      );
      const srcset = $img.attr('srcset') || $img.attr('data-srcset');
      if (srcset) candidates.push(parseSrcset(srcset, pageUrl));
    }
    const bg = $img.attr('style');
    if (bg) {
      const m = bg.match(/url\(['"]?([^'")]+)['"]?\)/i);
      if (m) candidates.push(m[1]);
    }
  });

  $el.find('picture source').each((_, source) => {
    const srcset = $(source).attr('srcset');
    if (srcset) candidates.push(parseSrcset(srcset, pageUrl));
  });

  const style = $el.attr('style') || $el.find('[style*="background"]').first().attr('style');
  if (style) {
    const m = style.match(/url\(['"]?([^'")]+)['"]?\)/i);
    if (m) candidates.push(m[1]);
  }

  // Image in parent card wrapper
  const parentImg = $el.parent().closest('[class*="item"],[class*="card"],[class*="product"]').find('img').first();
  if (parentImg.length) {
    candidates.push(parentImg.attr('src'), parentImg.attr('data-src'));
    const ps = parentImg.attr('srcset');
    if (ps) candidates.push(parseSrcset(ps, pageUrl));
  }

  for (const c of candidates) {
    const resolved = resolveImageUrl(pageUrl, c);
    if (resolved) return resolved;
  }
  return undefined;
}

function mergeItemPreferRich(a: WebsitePreviewItem, b: WebsitePreviewItem): WebsitePreviewItem {
  return {
    nameEn: a.nameEn || b.nameEn,
    nameAr: a.nameAr || b.nameAr,
    descriptionEn: b.descriptionEn || a.descriptionEn,
    descriptionAr: b.descriptionAr || a.descriptionAr,
    price: b.price || a.price,
    discountPrice: b.discountPrice ?? a.discountPrice,
    category: b.category || a.category,
    image: a.image || b.image,
  };
}

function parsePrice(text: string): number | null {
  const cleaned = text.replace(/,/g, ' ').replace(/\u00a0/g, ' ');
  const patterns = [
    /(\d+(?:\.\d{1,2})?)\s*(?:sar|sr|s\.r|riyal|ر\.?\s*س|ريال)/i,
    /(?:sar|sr|s\.r|riyal|ر\.?\s*س|ريال)\s*(\d+(?:\.\d{1,2})?)/i,
    /(?:price|سعر)[:\s]*(\d+(?:\.\d{1,2})?)/i,
    /\b(\d{1,4}(?:\.\d{1,2})?)\s*(?:\/|per)?\s*(?:pc|piece|item)?\b/i,
  ];
  for (const re of patterns) {
    const match = cleaned.match(re);
    if (match) {
      const n = parseFloat(match[1]);
      if (Number.isFinite(n) && n > 0 && n < 50000) return n;
    }
  }
  return null;
}

function stripPrices(text: string): string {
  return text
    .replace(/\d+(?:\.\d{1,2})?\s*(?:sar|sr|s\.r|riyal|ر\.?\s*س|ريال)/gi, '')
    .replace(/(?:sar|sr|s\.r|riyal|ر\.?\s*س|ريال)\s*\d+(?:\.\d{1,2})?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractPricesFromBlock($: CheerioAPI, el: AnyNode): { price: number; discountPrice?: number } | null {
  const $el = $(el);
  const strike = $el.find('del, s, strike, [class*="old-price"], [class*="was-price"]').first().text();
  const sale = $el.find('[class*="sale"], [class*="new-price"], [class*="offer-price"], .price').last().text();
  const fullText = $el.text().replace(/\s+/g, ' ').trim();

  const salePrice = parsePrice(sale) ?? parsePrice(fullText);
  if (!salePrice) return null;

  const oldPrice = parsePrice(strike);
  if (oldPrice && oldPrice > salePrice) {
    return { price: oldPrice, discountPrice: salePrice };
  }
  return { price: salePrice };
}

function pushItem(
  items: WebsitePreviewItem[],
  categories: Set<string>,
  item: WebsitePreviewItem
): void {
  if (!item.nameEn || item.nameEn.length < 2 || !item.price) return;
  categories.add(item.category || 'Menu');
  items.push(item);
}

function extractJsonLd(html: string, pageUrl: URL): WebsitePreviewItem[] {
  const items: WebsitePreviewItem[] = [];
  const scripts = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];

  for (const block of scripts) {
    const jsonText = block.replace(/<\/?script[^>]*>/gi, '').trim();
    try {
      const data = JSON.parse(jsonText) as unknown;
      collectJsonLdItems(data, pageUrl, items);
    } catch {
      // skip invalid JSON-LD
    }
  }
  return items;
}

function collectJsonLdItems(node: unknown, pageUrl: URL, out: WebsitePreviewItem[], category = 'Menu'): void {
  if (!node) return;
  if (Array.isArray(node)) {
    node.forEach((n) => collectJsonLdItems(n, pageUrl, out, category));
    return;
  }
  if (typeof node !== 'object') return;

  const obj = node as Record<string, unknown>;
  const type = String(obj['@type'] || '').toLowerCase();

  if (type.includes('menu') && Array.isArray(obj.hasMenuSection)) {
    for (const section of obj.hasMenuSection as unknown[]) {
      if (typeof section !== 'object' || !section) continue;
      const sec = section as Record<string, unknown>;
      const secName = String(sec.name || 'Menu');
      if (Array.isArray(sec.hasMenuItem)) {
        for (const mi of sec.hasMenuItem as unknown[]) {
          collectJsonLdItems(mi, pageUrl, out, secName);
        }
      }
    }
  }

  if (type.includes('menuitem') || type.includes('product') || type.includes('offer')) {
    const name = String(obj.name || obj.menuItemName || '').trim();
    let price = 0;
    let discountPrice: number | undefined;

    const offers = obj.offers;
    if (offers && typeof offers === 'object') {
      const offer = Array.isArray(offers) ? offers[0] : offers;
      if (offer && typeof offer === 'object') {
        const o = offer as Record<string, unknown>;
        price = Number(o.price || o.lowPrice || 0);
      }
    }
    if (!price && obj.price) price = Number(obj.price);

    if (name && price > 0) {
      out.push({
        nameEn: name.slice(0, 120),
        nameAr: name.slice(0, 120),
        descriptionEn: obj.description ? String(obj.description).slice(0, 500) : undefined,
        price,
        discountPrice,
        category,
        image: parseJsonLdImage(obj.image, pageUrl),
      });
    }
  }

  for (const val of Object.values(obj)) {
    if (val && typeof val === 'object') collectJsonLdItems(val, pageUrl, out, category);
  }
}

function extractWithCheerio(html: string, pageUrl: URL): WebsitePreviewResult {
  const $ = cheerio.load(html);
  const items: WebsitePreviewItem[] = [];
  const categories = new Set<string>();
  let currentCategory = 'Menu';

  // JSON-LD first
  for (const ld of extractJsonLd(html, pageUrl)) {
    pushItem(items, categories, ld);
  }

  $('h1, h2, h3, h4, [class*="category"], [class*="section-title"]').each((_, el) => {
    const heading = $(el).text().replace(/\s+/g, ' ').trim();
    if (heading.length >= 2 && heading.length <= 80 && !parsePrice(heading)) {
      currentCategory = heading;
      categories.add(currentCategory);
    }
  });

  const itemSelectors = [
    'li',
    'article',
    '[class*="menu-item"]',
    '[class*="menu_item"]',
    '[class*="product"]',
    '[class*="dish"]',
    '[class*="food-item"]',
    '[class*="card"]',
    '[data-product]',
    '[itemtype*="Product"]',
  ].join(', ');

  $(itemSelectors).each((_, el) => {
    const $el = $(el);
    const prices = extractPricesFromBlock($, el);
    if (!prices) return;

    const nameEl = $el.find('h1,h2,h3,h4,h5,h6,[class*="title"],[class*="name"]').first();
    let name = nameEl.text().replace(/\s+/g, ' ').trim();
    if (!name || name.length < 2) {
      name = stripPrices($el.clone().find('del,s,strike,.price,[class*="price"]').remove().end().text());
    }
    name = stripPrices(name);
    if (name.length < 2 || name.length > 120) return;

    const cat =
      $el.closest('[data-category]').attr('data-category') ||
      $el.attr('data-category') ||
      currentCategory;

    const desc = $el.find('p,[class*="desc"]').first().text().replace(/\s+/g, ' ').trim();
    const img = extractImageFromElement($, el, pageUrl);

    pushItem(items, categories, {
      nameEn: name.slice(0, 120),
      nameAr: name.slice(0, 120),
      descriptionEn: desc && desc !== name ? desc.slice(0, 500) : undefined,
      price: prices.price,
      discountPrice: prices.discountPrice,
      category: cat,
      image: img,
    });
  });

  // Heading siblings pattern
  $('h2, h3, h4').each((_, heading) => {
    const cat = $(heading).text().replace(/\s+/g, ' ').trim();
    if (cat.length < 2 || parsePrice(cat)) return;
    categories.add(cat);
    $(heading)
      .nextUntil('h1,h2,h3,h4')
      .find('li, p, div')
      .each((__, node) => {
        const text = $(node).text().replace(/\s+/g, ' ').trim();
        const price = parsePrice(text);
        if (!price || text.length > 200) return;
        const name = stripPrices(text);
        if (name.length < 2) return;
        const img = extractImageFromElement($, node, pageUrl);
        pushItem(items, categories, {
          nameEn: name.slice(0, 120),
          nameAr: name.slice(0, 120),
          price,
          category: cat,
          image: img,
        });
      });
  });

  const about = $('meta[name="description"]').attr('content')?.trim();
  const title = $('title').text().trim();

  return {
    url: pageUrl.href,
    businessInfo: { name: title || undefined, about: about || undefined },
    categories: Array.from(categories),
    items: dedupeItems(items),
    source: 'cheerio',
  };
}

function dedupeItems(items: WebsitePreviewItem[]): WebsitePreviewItem[] {
  const byKey = new Map<string, WebsitePreviewItem>();
  for (const item of items) {
    const key = `${(item.category || '').toLowerCase()}:${item.nameEn.toLowerCase().trim()}`;
    const existing = byKey.get(key);
    if (!existing) byKey.set(key, item);
    else byKey.set(key, mergeItemPreferRich(existing, item));
  }
  return Array.from(byKey.values()).slice(0, MAX_ITEMS);
}

function mergeResults(parts: WebsitePreviewResult[]): WebsitePreviewResult {
  const allItems: WebsitePreviewItem[] = [];
  const categories = new Set<string>();
  let businessInfo: WebsitePreviewResult['businessInfo'];
  let source: WebsitePreviewResult['source'] = 'cheerio';
  const sources = new Set<string>();

  for (const p of parts) {
    allItems.push(...p.items);
    p.categories.forEach((c) => categories.add(c));
    if (p.businessInfo && !businessInfo) businessInfo = p.businessInfo;
    sources.add(p.source);
  }

  if (sources.has('ai') && sources.has('cheerio')) source = 'mixed';
  else if (sources.has('ai')) source = 'ai';

  return {
    url: parts[0]?.url || '',
    pagesScanned: parts.length,
    businessInfo,
    categories: Array.from(categories),
    items: dedupeItems(allItems),
    source,
  };
}

function discoverMenuUrls(html: string, baseUrl: URL): URL[] {
  const $ = cheerio.load(html);
  const urls = new Set<string>();

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    const label = `${$(el).text()} ${$(el).attr('title') || ''} ${href}`.toLowerCase();
    const isMenuLink = MENU_LINK_KEYWORDS.some((k) => label.includes(k));
    if (!isMenuLink) return;
    try {
      const u = new URL(href, baseUrl);
      if (u.hostname !== baseUrl.hostname) return;
      urls.add(u.href.split('#')[0]);
    } catch {
      // skip
    }
  });

  return Array.from(urls).slice(0, MAX_PAGES).map((h) => new URL(h));
}

async function extractWithAi(
  htmlChunks: string[],
  pageUrl: URL,
  businessId: string
): Promise<WebsitePreviewResult | null> {
  const combined = htmlChunks
    .map((h) => cheerio.load(h)('body').text().replace(/\s+/g, ' ').trim())
    .join('\n\n')
    .slice(0, 28000);
  if (combined.length < 80) return null;

  function extractImageUrlsFromHtml(chunks: string[]): string[] {
    const urls = new Set<string>();
    for (const html of chunks) {
      const $ = cheerio.load(html);
      $('img').each((_, el) => {
        const u = extractImageFromElement($, el, pageUrl);
        if (u) urls.add(u);
      });
    }
    return Array.from(urls);
  }

  const prompt = `Extract ALL menu items and categories from this business website text. Include every dish/product with price in SAR.
Return ONLY valid JSON (no markdown):
{"businessInfo":{"name":"","address":"","hours":"","about":""},"categories":["Category1"],"items":[{"nameEn":"","nameAr":"","descriptionEn":"","price":0,"discountPrice":null,"category":"","image":""}]}
Rules: price = original; discountPrice = sale price if discounted; category must match categories array; include Arabic names if visible.
For "image": use the full https:// image URL for each product if mentioned in IMAGE_URLS or visible in text. Leave empty only if no image found.
URL: ${pageUrl.href}
IMAGE_URLS:
${extractImageUrlsFromHtml(htmlChunks).slice(0, 80).join('\n')}
TEXT:
${combined}`;

  const result = await createChatCompletion({
    businessId,
    messages: [
      { role: 'system', content: 'You extract complete restaurant/shop menus as JSON. Include ALL items you find.' },
      { role: 'user', content: prompt },
    ],
    maxTokens: 8000,
  });
  if (!result?.content) return null;

  const jsonMatch = result.content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      businessInfo?: WebsitePreviewResult['businessInfo'];
      categories?: string[];
      items?: WebsitePreviewItem[];
    };
    const items = (parsed.items || [])
      .filter((i) => i.nameEn && Number(i.price) > 0)
      .map((i) => ({
        nameEn: String(i.nameEn).slice(0, 120),
        nameAr: i.nameAr ? String(i.nameAr).slice(0, 120) : String(i.nameEn).slice(0, 120),
        descriptionEn: i.descriptionEn ? String(i.descriptionEn).slice(0, 500) : undefined,
        descriptionAr: i.descriptionAr ? String(i.descriptionAr).slice(0, 500) : undefined,
        price: Number(i.price),
        discountPrice: i.discountPrice != null && Number(i.discountPrice) > 0 ? Number(i.discountPrice) : undefined,
        category: i.category ? String(i.category) : 'Menu',
        image: i.image?.startsWith('https://') ? i.image : undefined,
      }));

    const categories = parsed.categories?.length
      ? parsed.categories.map(String)
      : Array.from(new Set(items.map((i) => i.category || 'Menu')));

    return {
      url: pageUrl.href,
      businessInfo: parsed.businessInfo,
      categories,
      items: dedupeItems(items),
      source: 'ai',
    };
  } catch {
    return null;
  }
}

async function fetchPageHtml(url: URL): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url.href, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SaudiChatBot/1.0; +https://saudichat.pro)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en,ar',
      },
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`Failed to fetch ${url.pathname} (${res.status})`);
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_HTML_BYTES) {
      throw new Error('Page too large to import');
    }
    return new TextDecoder('utf-8', { fatal: false }).decode(buf);
  } finally {
    clearTimeout(timer);
  }
}

async function collectPageUrls(baseUrl: URL): Promise<URL[]> {
  const seen = new Set<string>();
  const queue: URL[] = [baseUrl];

  for (const path of MENU_PATH_HINTS) {
    try {
      const u = new URL(path, baseUrl);
      if (u.hostname === baseUrl.hostname) queue.push(u);
    } catch {
      // skip
    }
  }

  try {
    const homeHtml = await fetchPageHtml(baseUrl);
    for (const u of discoverMenuUrls(homeHtml, baseUrl)) {
      queue.push(u);
    }
  } catch {
    // homepage optional for discovery
  }

  const unique: URL[] = [];
  for (const u of queue) {
    const key = u.href.split('#')[0];
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(new URL(key));
    if (unique.length >= MAX_PAGES) break;
  }
  return unique;
}

export async function previewWebsiteImport(
  businessId: string,
  rawUrl: string
): Promise<WebsitePreviewResult> {
  const baseUrl = await assertSafeUrl(rawUrl);
  const pageUrls = await collectPageUrls(baseUrl);
  const pageResults: WebsitePreviewResult[] = [];
  const htmlForAi: string[] = [];

  for (const pageUrl of pageUrls) {
    try {
      const html = await fetchPageHtml(pageUrl);
      htmlForAi.push(html);
      const cheerioResult = extractWithCheerio(html, pageUrl);
      if (cheerioResult.items.length > 0) {
        pageResults.push(cheerioResult);
      }
    } catch (err) {
      console.warn(`[website-import] skip ${pageUrl.href}:`, err instanceof Error ? err.message : err);
    }
  }

  let merged = pageResults.length > 0 ? mergeResults(pageResults) : null;

  // Always try AI when configured — fills gaps from JS-heavy sites
  if (isAiConfigured() && htmlForAi.length > 0) {
    const aiResult = await extractWithAi(htmlForAi, baseUrl, businessId);
    if (aiResult?.items.length) {
      merged = mergeResults([...(merged ? [merged] : []), aiResult]);
    }
  }

  if (!merged || merged.items.length === 0) {
    throw new Error('Could not extract menu from website. Try a direct menu page URL or add items manually in Catalog.');
  }

  return {
    ...merged,
    url: baseUrl.href,
    pagesScanned: pageUrls.length,
  };
}

function getWebsiteSettings(settings: Record<string, unknown>) {
  return {
    websiteUrl: String(settings.websiteUrl || ''),
    websiteImportEnabled: settings.websiteImportEnabled === true,
    websiteLastSyncAt: settings.websiteLastSyncAt ? String(settings.websiteLastSyncAt) : undefined,
    websiteSyncIntervalHours: Number(settings.websiteSyncIntervalHours) || 24,
  };
}

export async function applyWebsiteImport(
  businessId: string,
  rawUrl: string,
  options: WebsiteImportOptions
): Promise<{ itemsCreated: number; itemsUpdated: number; profileUpdated: boolean; categories: number; totalItems: number }> {
  // Always full site scan on import — never use stale preview subset unless explicitly passed for manual edit
  const preview =
    options.items && options.items.length > 0 && options.applyCatalog === false
      ? { url: rawUrl, categories: [], items: options.items, source: 'cheerio' as const }
      : await previewWebsiteImport(businessId, rawUrl);

  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) throw new Error('Business not found');

  const settings = (business.settings as Record<string, unknown>) || {};
  let itemsCreated = 0;
  let itemsUpdated = 0;
  let profileUpdated = false;

  if (options.applyProfile !== false && preview.businessInfo) {
    const profilePatch: Record<string, unknown> = { ...settings };
    if (preview.businessInfo.about) profilePatch.about = preview.businessInfo.about;
    if (preview.businessInfo.address) profilePatch.address = preview.businessInfo.address;
    if (preview.businessInfo.hours) profilePatch.workingHours = preview.businessInfo.hours;
    await prisma.business.update({
      where: { id: businessId },
      data: { settings: profilePatch as Prisma.InputJsonValue },
    });
    profileUpdated = true;
  }

  const categories = new Set(preview.items.map((i) => i.category || 'Menu'));

  if (options.applyCatalog !== false && preview.items.length > 0) {
    const catalogId = await ensureDefaultCatalog(businessId);
    const existing = await prisma.catalogItem.findMany({
      where: { businessId },
      select: { id: true, nameEn: true, image: true },
    });
    const byName = new Map(existing.map((e) => [e.nameEn.toLowerCase().trim(), e]));

    for (let i = 0; i < preview.items.length; i++) {
      const item = preview.items[i];
      const key = item.nameEn.toLowerCase().trim();
      const existingRecord = byName.get(key);
      const existingId = existingRecord?.id;
      const imageUrl = item.image || existingRecord?.image || undefined;
      const data = {
        nameEn: item.nameEn,
        nameAr: item.nameAr || item.nameEn,
        descriptionEn: item.descriptionEn,
        descriptionAr: item.descriptionAr,
        price: item.price,
        discountPrice: item.discountPrice,
        category: item.category || 'Menu',
        image: imageUrl,
        sortOrder: i,
        isAvailable: true,
      };

      if (existingId) {
        await prisma.catalogItem.update({ where: { id: existingId }, data });
        itemsUpdated++;
      } else {
        await prisma.catalogItem.create({
          data: { businessId, catalogId, ...data },
        });
        itemsCreated++;
      }
    }
  }

  const prev = (business.settings as Record<string, unknown>) || {};
  await prisma.business.update({
    where: { id: businessId },
    data: {
      settings: {
        ...prev,
        websiteUrl: rawUrl,
        websiteImportEnabled: true,
        websiteLastSyncAt: new Date().toISOString(),
        websiteSyncIntervalHours: Number(prev.websiteSyncIntervalHours) || 24,
      } as Prisma.InputJsonValue,
    },
  });

  await invalidateAllBotCaches(businessId);
  void import('./menuPdfService').then(({ generateMenuPdf }) =>
    generateMenuPdf(businessId).catch((err) =>
      console.warn('[website-import] menu PDF regen failed:', err instanceof Error ? err.message : err)
    )
  );
  return {
    itemsCreated,
    itemsUpdated,
    profileUpdated,
    categories: categories.size,
    totalItems: preview.items.length,
  };
}

export async function syncWebsiteForBusiness(
  businessId: string
): Promise<{ itemsCreated: number; itemsUpdated: number; categories: number; totalItems: number } | null> {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) return null;
  const settings = (business.settings as Record<string, unknown>) || {};
  const { websiteUrl, websiteImportEnabled } = getWebsiteSettings(settings);
  if (!websiteImportEnabled || !websiteUrl) return null;

  const result = await applyWebsiteImport(businessId, websiteUrl, {
    applyProfile: true,
    applyCatalog: true,
  });
  return {
    itemsCreated: result.itemsCreated,
    itemsUpdated: result.itemsUpdated,
    categories: result.categories,
    totalItems: result.totalItems,
  };
}

export async function runDueWebsiteSyncs(): Promise<number> {
  const businesses = await prisma.business.findMany({
    where: { isActive: true },
    select: { id: true, settings: true },
  });

  let synced = 0;
  const now = Date.now();

  for (const b of businesses) {
    const settings = (b.settings as Record<string, unknown>) || {};
    const { websiteUrl, websiteImportEnabled, websiteLastSyncAt, websiteSyncIntervalHours } =
      getWebsiteSettings(settings);
    if (!websiteImportEnabled || !websiteUrl) continue;

    const intervalMs = websiteSyncIntervalHours * 60 * 60 * 1000;
    const last = websiteLastSyncAt ? Date.parse(websiteLastSyncAt) : 0;
    if (last && now - last < intervalMs) continue;

    try {
      await syncWebsiteForBusiness(b.id);
      synced++;
      console.log(`[website-sync] synced business ${b.id}`);
    } catch (err) {
      console.warn(`[website-sync] failed for ${b.id}:`, err instanceof Error ? err.message : err);
    }
  }

  return synced;
}
