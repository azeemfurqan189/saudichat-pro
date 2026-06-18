import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { runSqlViaPg } from './runSqlViaPg';

const execAsync = promisify(exec);

/** Neon pooler URLs block DDL — use direct (non-pooler) connection for schema changes. */
export function resolveDirectDatabaseUrl(): string {
  const explicit = process.env.DIRECT_URL || process.env.DIRECT_DATABASE_URL;
  if (explicit?.trim()) return explicit.trim();

  let url = process.env.DATABASE_URL || '';
  // Neon: ep-xxx-pooler.region.neon.tech → ep-xxx.region.neon.tech
  url = url.replace(/-pooler\./g, '.').replace(/-pooler@/g, '@').replace(/-pooler\//g, '/');
  url = url.replace('.pooler.', '.');
  url = url.replace(/[?&]pgbouncer=true/g, '').replace(/&&/g, '&').replace(/\?&/g, '?');
  return url.replace(/[?&]$/, '');
}

function getBackendRoot(): string {
  const candidates = [
    path.join(__dirname, '..', '..'),
    path.join(__dirname, '..'),
    process.cwd(),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'prisma', 'schema.prisma'))) {
      return dir;
    }
  }
  return path.join(__dirname, '..', '..');
}

async function runPrismaDbPush(databaseUrl: string, label: string): Promise<boolean> {
  const cwd = getBackendRoot();
  try {
    console.log(`[db] prisma db push (${label})...`);
    await execAsync('npx prisma db push --skip-generate --accept-data-loss', {
      cwd,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      maxBuffer: 10 * 1024 * 1024,
    });
    console.log(`[db] prisma db push OK (${label})`);
    return true;
  } catch (error) {
    const out =
      error && typeof error === 'object' && 'stdout' in error
        ? String((error as { stdout?: Buffer }).stdout || '')
        : '';
    const errOut =
      error && typeof error === 'object' && 'stderr' in error
        ? String((error as { stderr?: Buffer }).stderr || '')
        : '';
    console.error(`[db] prisma db push FAILED (${label}):`, out || errOut || error);
    return false;
  }
}

async function runSqlFallback(databaseUrl: string): Promise<boolean> {
  const cwd = getBackendRoot();
  const sqlFile = path.join(cwd, 'scripts', 'sync-schema.sql');
  if (!fs.existsSync(sqlFile)) {
    console.error('[db] sync-schema.sql not found');
    return false;
  }
  try {
    console.log('[db] Running SQL fallback (sync-schema.sql)...');
    await execAsync(`npx prisma db execute --file scripts/sync-schema.sql --schema prisma/schema.prisma`, {
      cwd,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      maxBuffer: 10 * 1024 * 1024,
    });
    console.log('[db] SQL fallback complete');
    return true;
  } catch (error) {
    const errOut =
      error && typeof error === 'object' && 'stderr' in error
        ? String((error as { stderr?: Buffer }).stderr || '')
        : String(error);
    console.error('[db] SQL fallback FAILED:', errOut);
    return false;
  }
}

/**
 * Sync Prisma schema to production DB (sync).
 */
export function syncDatabaseSchema(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  void syncDatabaseSchemaAsync();
  return false;
}

let schemaSyncInProgress = false;

/**
 * Sync schema — pg direct SQL first, then prisma db push fallbacks.
 * In production, only runs when force=true (manual sync-schema API).
 */
export async function syncDatabaseSchemaAsync(options?: { force?: boolean }): Promise<boolean> {
  if (!process.env.DATABASE_URL) {
    console.warn('[db] DATABASE_URL not set — skipping schema sync');
    return false;
  }
  if (process.env.SKIP_DB_PUSH === 'true') {
    console.log('[db] SKIP_DB_PUSH=true — skipping schema sync');
    return false;
  }
  const force = options?.force === true;
  if (process.env.NODE_ENV === 'production' && !force) {
    console.log('[db] Auto schema sync skipped in production (use POST sync-schema or force=true)');
    return false;
  }
  if (schemaSyncInProgress) {
    console.log('[db] Schema sync already running — skip');
    return false;
  }
  schemaSyncInProgress = true;
  try {
  const pooled = process.env.DATABASE_URL;
  const direct = resolveDirectDatabaseUrl();
  const hasExplicitDirect = Boolean(process.env.DIRECT_URL || process.env.DIRECT_DATABASE_URL);

  console.log('[db] Schema sync — direct URL configured:', hasExplicitDirect, 'derived:', direct !== pooled);

  // 1) pg + full SQL on direct connection (best for Neon/Railway)
  if (await runSqlViaPg(direct)) {
    if (await isAgencyProjectFullyReady()) return true;
  }

  // 2) pg + critical-only SQL (smaller, fewer conflicts)
  const criticalFile = path.join(getBackendRoot(), 'scripts', 'critical-manpower.sql');
  if (fs.existsSync(criticalFile)) {
    try {
      const { Client } = await import('pg');
      const client = new Client({
        connectionString: direct,
        ssl: direct.includes('neon.tech') || direct.includes('sslmode=require')
          ? { rejectUnauthorized: false }
          : undefined,
      });
      await client.connect();
      await client.query(fs.readFileSync(criticalFile, 'utf8'));
      await client.end();
      console.log('[db] critical-manpower.sql OK');
      if (await isAgencyProjectFullyReady()) return true;
    } catch (err) {
      console.error('[db] critical-manpower.sql failed:', err instanceof Error ? err.message : err);
    }
  }

  // 3) prisma db push fallbacks
  if (await runPrismaDbPush(direct, 'direct')) return true;
  if (direct !== pooled && (await runPrismaDbPush(pooled, 'pooled'))) return true;
  if (await runSqlFallback(direct)) return true;

  console.error(
    '[db] All schema sync attempts failed. Set DIRECT_URL on Railway (Neon non-pooler URL) or run scripts/critical-manpower.sql in Neon SQL editor.'
  );
  return false;
  } finally {
    schemaSyncInProgress = false;
  }
}

export async function isBusinessMemberTableReady(): Promise<boolean> {
  try {
    const { default: prisma } = await import('../utils/prisma');
    await prisma.$queryRaw`SELECT 1 FROM "BusinessMember" LIMIT 1`;
    return true;
  } catch {
    return false;
  }
}

export async function isAgencyProjectTableReady(): Promise<boolean> {
  try {
    const { default: prisma } = await import('../utils/prisma');
    await prisma.$queryRaw`SELECT 1 FROM "AgencyProject" LIMIT 1`;
    return true;
  } catch {
    return false;
  }
}

export async function isAgencyProjectFullyReady(): Promise<boolean> {
  if (!(await isAgencyProjectTableReady())) return false;
  try {
    const { default: prisma } = await import('../utils/prisma');
    await prisma.$queryRaw`
      SELECT "industryTag", "headcount", "managerMemberId", "latitude", "longitude"
      FROM "AgencyProject" LIMIT 0
    `;
    return true;
  } catch {
    return false;
  }
}

/** Check only — never run heavy DDL here (prevents Railway OOM crash loops). */
export async function ensureAgencyProjectTable(): Promise<boolean> {
  return isAgencyProjectFullyReady();
}

export const SCHEMA_NOT_READY_MESSAGE =
  'Database tables need a one-time update. Option A: Railway → add DIRECT_URL (Neon direct URL, not pooler) → redeploy. Option B: Neon SQL Editor → run backend/scripts/critical-manpower.sql (quick) or sync-schema.sql (full) → refresh and try again.';
