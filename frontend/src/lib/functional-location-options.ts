import { FunctionalLocation } from "@/lib/api";

const OFFICE_TYPES = new Set(["HEAD_OFFICE", "WAREHOUSE"]);
const CLIENT_TYPES = new Set(["COMPANY"]);
const SITE_TYPES = new Set(["SITE", "PLANT", "SECTION", "AREA", "EQUIPMENT"]);

export type LocationOptionGroup = {
  id: "office" | "clients" | "projects" | "other";
  labelEn: string;
  labelAr: string;
  locations: FunctionalLocation[];
};

export function groupFunctionalLocations(locations: FunctionalLocation[]): LocationOptionGroup[] {
  const office: FunctionalLocation[] = [];
  const clients: FunctionalLocation[] = [];
  const projects: FunctionalLocation[] = [];
  const other: FunctionalLocation[] = [];

  for (const loc of locations) {
    if (OFFICE_TYPES.has(loc.type)) {
      office.push(loc);
    } else if (loc.projectId || (loc.project && loc.type === "SITE")) {
      projects.push(loc);
    } else if (CLIENT_TYPES.has(loc.type)) {
      clients.push(loc);
    } else if (SITE_TYPES.has(loc.type)) {
      other.push(loc);
    } else {
      other.push(loc);
    }
  }

  const sortByName = (a: FunctionalLocation, b: FunctionalLocation) =>
    a.name.localeCompare(b.name) || a.code.localeCompare(b.code);

  const groups: LocationOptionGroup[] = [];
  if (office.length) {
    groups.push({
      id: "office",
      labelEn: "Office & warehouse",
      labelAr: "المكتب والمستودع",
      locations: office.sort(sortByName),
    });
  }
  if (clients.length) {
    groups.push({
      id: "clients",
      labelEn: "Your clients",
      labelAr: "عملاؤك",
      locations: clients.sort(sortByName),
    });
  }
  if (projects.length) {
    groups.push({
      id: "projects",
      labelEn: "Client projects & sites",
      labelAr: "مشاريع ومواقع العملاء",
      locations: projects.sort(sortByName),
    });
  }
  if (other.length) {
    groups.push({
      id: "other",
      labelEn: "Other / CMMS demo areas",
      labelAr: "أخرى / مناطق CMMS",
      locations: other.sort(sortByName),
    });
  }
  return groups;
}

export function locationOptionLabel(loc: FunctionalLocation, isAr: boolean) {
  const clientName = loc.project?.clientCompany?.name;
  if (clientName && loc.project) {
    const site = loc.project.siteName || loc.project.name;
    return `${clientName} · ${site} (${loc.code})`;
  }
  if (loc.type === "HEAD_OFFICE") {
    return isAr ? `${loc.name} (مكتب)` : `${loc.name} (Office)`;
  }
  if (loc.type === "WAREHOUSE") {
    return isAr ? `${loc.name} (مستودع)` : `${loc.name} (Warehouse)`;
  }
  if (loc.type === "COMPANY") {
    return isAr ? `${loc.name} (عميل)` : `${loc.name} (Client)`;
  }
  return `${loc.code} — ${loc.name}`;
}

export function filterGroupsForColumn(
  groups: LocationOptionGroup[],
  boardColumn: string
): LocationOptionGroup[] {
  if (boardColumn === "STOCK" || boardColumn === "MAINTENANCE") {
    const filtered = groups.filter((g) => g.id === "office" || g.id === "clients");
    return filtered.length ? filtered : groups.filter((g) => g.id !== "projects");
  }
  return groups;
}

export const CUSTOM_LOCATION_VALUE = "__custom_new__";
