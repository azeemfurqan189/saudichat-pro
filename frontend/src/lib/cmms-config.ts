import { MemberRole } from "@/lib/industry-config";
import { NavKey } from "@/lib/industry-config";

export type CmmsLevel = "OWNER" | "OFFICE" | "SITE";

export function getCmmsLevel(role: MemberRole): CmmsLevel {
  if (role === "OWNER") return "OWNER";
  if (role === "MANAGER" || role === "OFFICE_STAFF") return "OFFICE";
  return "SITE";
}

export const CMMS_FLOW = [
  { key: "asset", en: "Asset exists", ar: "الأصل مسجّل" },
  { key: "request", en: "Work Request", ar: "بلاغ / طلب" },
  { key: "approve", en: "Office approves", ar: "موافقة المكتب" },
  { key: "order", en: "Work Order", ar: "أمر عمل" },
  { key: "execute", en: "Site executes", ar: "تنفيذ الموقع" },
  { key: "inventory", en: "Inventory used", ar: "استهلاك مخزون" },
  { key: "report", en: "Owner report", ar: "تقرير للمالك" },
] as const;

export const CMMS_LAYERS = {
  OWNER: {
    en: "Owner — top view (cost, performance, downtime)",
    ar: "المالك — نظرة عليا (تكلفة، أداء، توقف)",
  },
  OFFICE: {
    en: "Office — control room (approvals, planning, procurement)",
    ar: "المكتب — غرفة التحكم (موافقات، تخطيط، مشتريات)",
  },
  SITE: {
    en: "Site — execution (technicians, repairs, daily ops)",
    ar: "الموقع — التنفيذ (فنيون، إصلاح، عمليات يومية)",
  },
} as const;

/** CMMS nav keys by access level */
export const CMMS_NAV_BY_LEVEL: Record<CmmsLevel, NavKey[]> = {
  OWNER: [
    "cmmsHub",
    "locations",
    "equipment",
    "workRequests",
    "workOrders",
    "workPlanner",
    "preventiveMaintenance",
    "assetReliability",
    "calibration",
    "spares",
    "procurement",
    "cmmsFinance",
    "cmmsAiEngine",
    "notificationCenter",
    "cmmsSecurity",
    "suppliers",
  ],
  OFFICE: [
    "cmmsHub",
    "locations",
    "equipment",
    "workRequests",
    "workOrders",
    "workPlanner",
    "preventiveMaintenance",
    "assetReliability",
    "calibration",
    "spares",
    "procurement",
    "cmmsFinance",
    "cmmsAiEngine",
    "notificationCenter",
    "cmmsSecurity",
    "suppliers",
  ],
  SITE: ["workRequests", "workOrders", "equipment"],
};

export function getCmmsNavForRole(role: MemberRole): NavKey[] {
  return CMMS_NAV_BY_LEVEL[getCmmsLevel(role)];
}
