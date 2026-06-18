const PARENT_LABELS: Record<string, { en: string; ar: string }> = {
  projects: { en: "Projects", ar: "المشاريع" },
  clients: { en: "Clients", ar: "العملاء" },
  workers: { en: "Workers", ar: "العمال" },
  equipment: { en: "Equipment", ar: "المعدات" },
  settings: { en: "Settings", ar: "الإعدادات" },
  catalog: { en: "Catalog", ar: "القائمة" },
  orders: { en: "Orders", ar: "الطلبات" },
  conversations: { en: "Conversations", ar: "المحادثات" },
};

export type DashboardBackTarget = {
  href: string;
  labelEn: string;
  labelAr: string;
};

/** Resolves where the dashboard header back button should navigate. */
export function getDashboardBackTarget(pathname: string, businessId: string): DashboardBackTarget | null {
  const base = `/dashboard/${businessId}`;
  if (pathname === base) return null;

  const rest = pathname.startsWith(base) ? pathname.slice(base.length) : "";
  const segments = rest.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  if (segments.length >= 2) {
    const parentKey = segments[segments.length - 2];
    const parent = PARENT_LABELS[parentKey];
    return {
      href: `${base}/${segments.slice(0, -1).join("/")}`,
      labelEn: parent ? `Back to ${parent.en}` : "Back",
      labelAr: parent ? `رجوع إلى ${parent.ar}` : "رجوع",
    };
  }

  return {
    href: base,
    labelEn: "Back to Dashboard",
    labelAr: "العودة للوحة التحكم",
  };
}
