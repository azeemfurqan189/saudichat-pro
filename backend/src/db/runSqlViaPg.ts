import fs from 'fs';
import path from 'path';

function needsSsl(connectionString: string): boolean {
  return (
    connectionString.includes('neon.tech') ||
    connectionString.includes('sslmode=require') ||
    connectionString.includes('supabase.co') ||
    connectionString.includes('railway.app')
  );
}

/** Run sync-schema.sql via native pg driver (works when prisma CLI fails on Railway). */
export async function runSqlViaPg(databaseUrl: string): Promise<boolean> {
  if (!databaseUrl) return false;

  const cwd = path.join(__dirname, '..', '..');
  const sqlFile = path.join(cwd, 'scripts', 'sync-schema.sql');
  if (!fs.existsSync(sqlFile)) {
    console.error('[db] sync-schema.sql not found at', sqlFile);
    return false;
  }

  try {
    const { Client } = await import('pg');
    const client = new Client({
      connectionString: databaseUrl,
      ssl: needsSsl(databaseUrl) ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: 30000,
    });
    await client.connect();
    const sql = fs.readFileSync(sqlFile, 'utf8');
    console.log('[db] Running sync-schema.sql via pg (direct connection)...');
    await client.query(sql);
    await client.end();
    console.log('[db] pg SQL sync OK');
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[db] pg SQL sync FAILED:', msg.slice(0, 500));
    return false;
  }
}
