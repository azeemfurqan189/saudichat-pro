"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { t, Locale } from "@/lib/i18n";
import { NAV_ICONS, NavKey } from "@/lib/industry-config";
import {
  filterManpowerSidebar,
  SidebarNavItem,
  SidebarSection,
} from "@/lib/manpower-sidebar-nav";
import { api } from "@/lib/api";

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-[#E24B4A] text-white text-[10px] font-semibold flex items-center justify-center tabular-nums">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function SidebarLink({
  item,
  basePath,
  locale,
  collapsed,
  active,
  badge,
  onNavigate,
}: {
  item: SidebarNavItem;
  basePath: string;
  locale: Locale;
  collapsed?: boolean;
  active: boolean;
  badge?: number;
  onNavigate?: () => void;
}) {
  const Icon: LucideIcon | undefined = item.hideIcon ? undefined : NAV_ICONS[item.key];
  const href = `${basePath}${item.href}`;

  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={collapsed ? t(locale, "dashboard", item.key) : undefined}
      className={cn(
        "flex items-center gap-2.5 py-2 text-[13px] font-normal transition-colors rounded-lg",
        item.indent ? "pl-9 pr-3" : "px-3",
        active
          ? "bg-[#F3EDE4] text-[#1a1a1a]"
          : "text-[#5c5c5c] hover:bg-[#EFEFEF] hover:text-[#1a1a1a]",
        collapsed && "justify-center px-2"
      )}
    >
      {Icon && !collapsed && <Icon className="w-[15px] h-[15px] shrink-0 stroke-[1.75]" />}
      {Icon && collapsed && <Icon className="w-[18px] h-[18px] shrink-0 stroke-[1.75]" />}
      {!collapsed && (
        <>
          <span className="truncate flex-1">{t(locale, "dashboard", item.key)}</span>
          {badge !== undefined && <NavBadge count={badge} />}
        </>
      )}
    </Link>
  );
}

export function ManpowerSidebarNav({
  businessId,
  locale,
  visibleKeys,
  role,
  collapsed,
  onNavigate,
}: {
  businessId: string;
  locale: Locale;
  visibleKeys: NavKey[];
  role: import("@/lib/industry-config").MemberRole;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const basePath = `/dashboard/${businessId}`;
  const { sections, footer } = filterManpowerSidebar(role, visibleKeys);

  const { data: pendingTs = [] } = useQuery({
    queryKey: ["sidebar-pending-ts", businessId],
    queryFn: async () => (await api.getPendingTimesheets(businessId)).data ?? [],
    enabled: visibleKeys.includes("timesheets"),
    staleTime: 60_000,
  });

  const { data: workRequests = [] } = useQuery({
    queryKey: ["sidebar-wr", businessId],
    queryFn: async () => (await api.getWorkRequests(businessId, "SUBMITTED")).data ?? [],
    enabled: visibleKeys.includes("workRequests"),
    staleTime: 60_000,
  });

  const { data: calibrations } = useQuery({
    queryKey: ["sidebar-calibrations", businessId],
    queryFn: async () => (await api.getCalibrations(businessId)).data,
    enabled: visibleKeys.includes("calibration"),
    staleTime: 120_000,
  });

  const badges: Partial<Record<"timesheets" | "workRequests" | "calibrations", number>> = {
    timesheets: pendingTs.length,
    workRequests: workRequests.length,
    calibrations: calibrations?.dueCount ?? 0,
  };

  const isActive = (href: string) => {
    const full = `${basePath}${href}`;
    if (href === "") return pathname === basePath;
    return pathname.startsWith(full);
  };

  const renderSection = (section: SidebarSection) => (
    <div key={section.id} className="mb-4">
      {!collapsed && (
        <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9a9a9a]">
          {locale === "ar" ? section.labelAr : section.labelEn}
        </p>
      )}
      <div className="space-y-0.5">
        {section.items.map((item) => (
          <SidebarLink
            key={item.key}
            item={item}
            basePath={basePath}
            locale={locale}
            collapsed={collapsed}
            active={isActive(item.href)}
            badge={item.badgeKey ? badges[item.badgeKey] : undefined}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );

  return (
    <nav className="flex-1 overflow-y-auto px-2 py-3">
      {sections.map(renderSection)}
      {footer.length > 0 && (
        <div className="pt-3 mt-1 border-t border-[#E8E8E8] space-y-0.5">
          {footer.map((item) => (
            <SidebarLink
              key={item.key}
              item={item}
              basePath={basePath}
              locale={locale}
              collapsed={collapsed}
              active={isActive(item.href)}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </nav>
  );
}
