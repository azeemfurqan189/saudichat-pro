import { NavKey, MemberRole } from "@/lib/industry-config";

export type SidebarNavItem = {
  key: NavKey;
  href: string;
  indent?: boolean;
  hideIcon?: boolean;
  badgeKey?: "timesheets" | "workRequests" | "calibrations";
};

export type SidebarSection = {
  id: string;
  labelEn: string;
  labelAr: string;
  items: SidebarNavItem[];
};

/** Professional ERP-style sidebar — grouped by business function */
export const MANPOWER_SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    id: "command",
    labelEn: "Command",
    labelAr: "القيادة",
    items: [
      { key: "overview", href: "" },
      { key: "commandCenter", href: "/command-center" },
      { key: "manpowerLive", href: "/manpower-live", indent: true, hideIcon: true },
      { key: "myWork", href: "/my-work", indent: true, hideIcon: true },
    ],
  },
  {
    id: "manpower",
    labelEn: "Manpower",
    labelAr: "العمال",
    items: [
      { key: "clients", href: "/clients" },
      { key: "projects", href: "/projects" },
      { key: "workers", href: "/workers" },
      { key: "placements", href: "/placements" },
      { key: "timesheets", href: "/timesheets", badgeKey: "timesheets" },
      { key: "attendance", href: "/attendance" },
      { key: "hrIntegration", href: "/hr" },
      { key: "subcontractors", href: "/subcontractors" },
      { key: "projectAccess", href: "/project-access" },
      { key: "manpowerPolicy", href: "/manpower-policy" },
    ],
  },
  {
    id: "planning",
    labelEn: "Planning & Controls",
    labelAr: "التخطيط والرقابة",
    items: [
      { key: "planningHub", href: "/planning-hub" },
      { key: "projectPlanning", href: "/planning" },
      { key: "planningSimulation", href: "/planning/simulation" },
      { key: "planningRisk", href: "/planning/risks" },
    ],
  },
  {
    id: "cmms",
    labelEn: "Maintenance (CMMS)",
    labelAr: "الصيانة CMMS",
    items: [
      { key: "cmmsHub", href: "/cmms" },
      { key: "assets", href: "/assets" },
      { key: "equipment", href: "/equipment" },
      { key: "locations", href: "/locations" },
      { key: "workRequests", href: "/work-requests", badgeKey: "workRequests" },
      { key: "workOrders", href: "/work-orders" },
      { key: "workPlanner", href: "/planner" },
      { key: "preventiveMaintenance", href: "/maintenance" },
      { key: "assetReliability", href: "/reliability" },
      { key: "iotMonitoring", href: "/iot-monitoring" },
      { key: "calibration", href: "/calibration", badgeKey: "calibrations" },
      { key: "spares", href: "/spares" },
      { key: "procurement", href: "/procurement" },
      { key: "cmmsFinance", href: "/finance" },
      { key: "cmmsAiEngine", href: "/ai-engine" },
      { key: "notificationCenter", href: "/notifications" },
      { key: "cmmsSecurity", href: "/security" },
    ],
  },
];

export const MANPOWER_SIDEBAR_FOOTER: SidebarNavItem[] = [
  { key: "help", href: "/help" },
  { key: "settings", href: "/settings" },
  { key: "billing", href: "/billing" },
];

export function filterManpowerSidebar(
  role: MemberRole,
  visibleKeys: NavKey[]
): { sections: SidebarSection[]; footer: SidebarNavItem[] } {
  const allow = new Set(visibleKeys);
  const sections = MANPOWER_SIDEBAR_SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((i) => allow.has(i.key)),
  })).filter((s) => s.items.length > 0);

  const footer = MANPOWER_SIDEBAR_FOOTER.filter((i) => allow.has(i.key));
  return { sections, footer };
}
