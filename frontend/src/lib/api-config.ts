/** Production Railway API — used when Vercel env var is missing */
export const PRODUCTION_API_URL = "https://saudichat-pro-production.up.railway.app/api";

export function getApiUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  // Browser on Vercel / production
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host.endsWith(".vercel.app") || host.includes("saudichat")) {
      return PRODUCTION_API_URL;
    }
  }

  // Vercel build / SSR without env
  if (process.env.VERCEL === "1") {
    return PRODUCTION_API_URL;
  }

  return "http://localhost:4000/api";
}

export function getSocketBaseUrl(): string {
  return getApiUrl().replace(/\/api\/?$/, "");
}

/** Ping Railway to wake server before auth (cold start can take 30–60s) */
export async function warmupApi(maxWaitMs = 60000): Promise<boolean> {
  const base = getApiUrl().replace(/\/api\/?$/, "");
  const started = Date.now();
  let attempt = 0;

  while (Date.now() - started < maxWaitMs) {
    attempt += 1;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);
      const res = await fetch(`${base}/health`, { signal: controller.signal, cache: "no-store" });
      clearTimeout(timer);
      if (res.ok) return true;
    } catch {
      // server waking up — retry
    }
    await new Promise((r) => setTimeout(r, Math.min(3000 * attempt, 8000)));
  }
  return false;
}
