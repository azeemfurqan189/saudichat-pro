import crypto from 'crypto';
import { tenantKey, redisGet, redisSet, redisIncr, redisDelPattern } from '../utils/redis';
import { buildMenuSummary } from '../services/catalogService';
import { DetectedLanguage } from '../ai/language/detector';

const ANSWER_CACHE_TTL = 300; // 5 min — avoid stale replies after catalog/settings change

async function getBotDataVersion(businessId: string): Promise<string> {
  const key = tenantKey(businessId, 'cache', 'dataVersion');
  const v = await redisGet(key);
  return v || '0';
}

/** Call when catalog, profile, or business info changes */
export async function invalidateAllBotCaches(businessId: string): Promise<void> {
  invalidateCatalogCache(businessId);
  await redisIncr(tenantKey(businessId, 'cache', 'dataVersion'));
  await redisDelPattern(businessId, 'cache:faq:*');
  await redisDelPattern(businessId, 'cache:embed:*');
  await redisSet(tenantKey(businessId, 'cache', 'greeting'), '', 1);
}

const GREETING_CACHE_TTL = 86400;
const EMBED_CACHE_TTL = 21600;

export async function getCachedGreeting(businessId: string): Promise<string | null> {
  const key = tenantKey(businessId, 'cache', 'greeting');
  return redisGet(key);
}

export async function setCachedGreeting(businessId: string, greeting: string): Promise<void> {
  const key = tenantKey(businessId, 'cache', 'greeting');
  await redisSet(key, greeting, GREETING_CACHE_TTL);
}

export async function getCachedEmbed(businessId: string, query: string): Promise<string[] | null> {
  const version = await getBotDataVersion(businessId);
  const hash = crypto
    .createHash('sha256')
    .update(`${version}:${query.toLowerCase().trim()}`)
    .digest('hex')
    .slice(0, 16);
  const key = tenantKey(businessId, 'cache', 'embed', hash);
  const raw = await redisGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return null;
  }
}

export async function setCachedEmbed(
  businessId: string,
  query: string,
  results: string[],
  ttlSeconds = EMBED_CACHE_TTL
): Promise<void> {
  const version = await getBotDataVersion(businessId);
  const hash = crypto
    .createHash('sha256')
    .update(`${version}:${query.toLowerCase().trim()}`)
    .digest('hex')
    .slice(0, 16);
  const key = tenantKey(businessId, 'cache', 'embed', hash);
  await redisSet(key, JSON.stringify(results), ttlSeconds);
}

export async function getCachedAnswer(businessId: string, query: string): Promise<string | null> {
  const version = await getBotDataVersion(businessId);
  const hash = crypto
    .createHash('sha256')
    .update(`${version}:${query.toLowerCase().trim()}`)
    .digest('hex')
    .slice(0, 16);
  const key = tenantKey(businessId, 'cache', 'faq', hash);
  return redisGet(key);
}

export async function setCachedAnswer(
  businessId: string,
  query: string,
  answer: string,
  ttlSeconds = ANSWER_CACHE_TTL
): Promise<void> {
  const version = await getBotDataVersion(businessId);
  const hash = crypto
    .createHash('sha256')
    .update(`${version}:${query.toLowerCase().trim()}`)
    .digest('hex')
    .slice(0, 16);
  const key = tenantKey(businessId, 'cache', 'faq', hash);
  await redisSet(key, answer, ttlSeconds);
}

export async function getCatalogSummary(
  businessId: string,
  lang: DetectedLanguage = 'mixed'
): Promise<string | null> {
  const key = tenantKey(businessId, 'cache', 'catalog', 'summary', lang);
  const cached = await redisGet(key);
  if (cached) return cached || null;

  const summary = await buildMenuSummary(businessId, lang);
  if (!summary) return null;

  await redisSet(key, summary, 300);
  return summary;
}

export async function getCatalogSummaryLegacy(businessId: string): Promise<string | null> {
  return getCatalogSummary(businessId, 'mixed');
}

export function invalidateCatalogCache(businessId: string): void {
  for (const lang of ['en', 'ar', 'ur', 'mixed']) {
    void redisSet(tenantKey(businessId, 'cache', 'catalog', 'summary', lang), '', 1);
  }
  void redisSet(tenantKey(businessId, 'cache', 'catalog', 'summary'), '', 1);
}
