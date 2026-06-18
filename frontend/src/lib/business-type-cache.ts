import { getIndustryCategory, normalizeBusinessType } from "./industry-config";

const CACHE_PREFIX = "sc_business_type_";

/** Routes that only exist on manpower / CMMS accounts */
const MANPOWER_PATH_SEGMENTS = new Set([
  "command-center",
  "my-work",
  "clients",
  "projects",
  "workers",
  "placements",
  "timesheets",
  "manpower-live",
  "attendance",
  "hr",
  "project-access",
  "manpower-policy",
  "cmms",
  "equipment",
  "assets",
  "locations",
  "work-requests",
  "work-orders",
  "planner",
  "maintenance",
  "spares",
  "procurement",
  "finance",
  "ai-engine",
  "notifications",
  "security",
]);

export function getCachedBusinessType(businessId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(`${CACHE_PREFIX}${businessId}`);
  } catch {
    return null;
  }
}

export function setCachedBusinessType(businessId: string, type: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${CACHE_PREFIX}${businessId}`, type);
  } catch {
    /* ignore quota / private mode */
  }
}

export function isManpowerBusinessType(type?: string | null): boolean {
  if (!type) return false;
  return getIndustryCategory(normalizeBusinessType(type)) === "manpower";
}

export function isManpowerDashboardPath(pathname: string, businessId: string): boolean {
  const base = `/dashboard/${businessId}`;
  if (!pathname.startsWith(base)) return false;
  const rest = pathname.slice(base.length).replace(/^\//, "");
  if (!rest) return false;
  const segment = rest.split("/")[0];
  return MANPOWER_PATH_SEGMENTS.has(segment);
}

/** Instant theme hint — avoids default RESTAURANT flash while API loads */
export function resolveIsManpowerTheme(
  businessId: string,
  businessType?: string | null,
  pathname?: string | null
): boolean {
  if (businessType) return isManpowerBusinessType(businessType);
  const cached = getCachedBusinessType(businessId);
  if (cached) return isManpowerBusinessType(cached);
  if (pathname && isManpowerDashboardPath(pathname, businessId)) return true;
  return false;
}
