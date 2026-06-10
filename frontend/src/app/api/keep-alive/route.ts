import { NextResponse } from "next/server";

const RAILWAY_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, "") ||
  "https://saudichat-pro-production.up.railway.app";

/** Vercel cron pings Railway /health every 10 min to reduce cold starts */
export async function GET() {
  try {
    const res = await fetch(`${RAILWAY_BASE}/health`, { cache: "no-store" });
    return NextResponse.json({ ok: res.ok, status: res.status });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "ping failed" },
      { status: 500 }
    );
  }
}
