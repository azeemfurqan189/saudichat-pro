"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  LogOut,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { cn, getInitials } from "@/lib/utils";
import { Business, User } from "@/lib/api";
import {
  getNavItemsForRole,
  NAV_ICONS,
  getIndustryLabel,
  normalizeBusinessType,
  NavKey,
  MemberRole,
} from "@/lib/industry-config";
import { useIsManpowerTheme } from "@/hooks/use-is-manpower-theme";
import { ManpowerSidebarNav } from "@/components/shared/manpower-sidebar";

interface SidebarProps {
  businessId: string;
  businesses: Business[];
  businessType?: string;
  memberRole?: MemberRole;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const ALL_NAV_ITEMS = [
  { key: "overview" as NavKey, href: "", icon: NAV_ICONS.overview },
  { key: "aiBot" as NavKey, href: "/ai", icon: NAV_ICONS.aiBot },
  { key: "orders" as NavKey, href: "/orders", icon: NAV_ICONS.orders },
  { key: "appointments" as NavKey, href: "/appointments", icon: NAV_ICONS.appointments },
  { key: "catalog" as NavKey, href: "/catalog", icon: NAV_ICONS.catalog },
  { key: "customers" as NavKey, href: "/customers", icon: NAV_ICONS.customers },
  { key: "pipeline" as NavKey, href: "/pipeline", icon: NAV_ICONS.pipeline },
  { key: "tasks" as NavKey, href: "/tasks", icon: NAV_ICONS.tasks },
  { key: "workflows" as NavKey, href: "/workflows", icon: NAV_ICONS.workflows },
  { key: "inventory" as NavKey, href: "/inventory", icon: NAV_ICONS.inventory },
  { key: "leads" as NavKey, href: "/leads", icon: NAV_ICONS.leads },
  { key: "inbox" as NavKey, href: "/inbox", icon: NAV_ICONS.inbox },
  { key: "reviews" as NavKey, href: "/reviews", icon: NAV_ICONS.reviews },
  { key: "advisor" as NavKey, href: "/advisor", icon: NAV_ICONS.advisor },
  { key: "deliveries" as NavKey, href: "/deliveries", icon: NAV_ICONS.deliveries },
  { key: "suppliers" as NavKey, href: "/suppliers", icon: NAV_ICONS.suppliers },
  { key: "developers" as NavKey, href: "/developers", icon: NAV_ICONS.developers },
  { key: "properties" as NavKey, href: "/properties", icon: NAV_ICONS.properties },
  { key: "hotel" as NavKey, href: "/hotel", icon: NAV_ICONS.hotel },
  { key: "logistics" as NavKey, href: "/logistics", icon: NAV_ICONS.logistics },
  { key: "courses" as NavKey, href: "/courses", icon: NAV_ICONS.courses },
  { key: "workshop" as NavKey, href: "/workshop", icon: NAV_ICONS.workshop },
  { key: "marketing" as NavKey, href: "/marketing", icon: NAV_ICONS.marketing },
  { key: "conversations" as NavKey, href: "/conversations", icon: NAV_ICONS.conversations },
  { key: "staff" as NavKey, href: "/staff", icon: NAV_ICONS.staff },
  { key: "workforce" as NavKey, href: "/workforce", icon: NAV_ICONS.workforce },
  { key: "schedule" as NavKey, href: "/schedule", icon: NAV_ICONS.schedule },
  { key: "attendance" as NavKey, href: "/attendance", icon: NAV_ICONS.attendance },
  { key: "hrIntegration" as NavKey, href: "/hr", icon: NAV_ICONS.hrIntegration },
  { key: "myWork" as NavKey, href: "/my-work", icon: NAV_ICONS.myWork },
  { key: "clients" as NavKey, href: "/clients", icon: NAV_ICONS.clients },
  { key: "projects" as NavKey, href: "/projects", icon: NAV_ICONS.projects },
  { key: "workers" as NavKey, href: "/workers", icon: NAV_ICONS.workers },
  { key: "placements" as NavKey, href: "/placements", icon: NAV_ICONS.placements },
  { key: "timesheets" as NavKey, href: "/timesheets", icon: NAV_ICONS.timesheets },
  { key: "equipment" as NavKey, href: "/equipment", icon: NAV_ICONS.equipment },
  { key: "cmmsHub" as NavKey, href: "/cmms", icon: NAV_ICONS.cmmsHub },
  { key: "locations" as NavKey, href: "/locations", icon: NAV_ICONS.locations },
  { key: "workRequests" as NavKey, href: "/work-requests", icon: NAV_ICONS.workRequests },
  { key: "workOrders" as NavKey, href: "/work-orders", icon: NAV_ICONS.workOrders },
  { key: "projectPlanning" as NavKey, href: "/planning", icon: NAV_ICONS.projectPlanning },
  { key: "workPlanner" as NavKey, href: "/planner", icon: NAV_ICONS.workPlanner },
  { key: "preventiveMaintenance" as NavKey, href: "/maintenance", icon: NAV_ICONS.preventiveMaintenance },
  { key: "spares" as NavKey, href: "/spares", icon: NAV_ICONS.spares },
  { key: "procurement" as NavKey, href: "/procurement", icon: NAV_ICONS.procurement },
  { key: "cmmsFinance" as NavKey, href: "/finance", icon: NAV_ICONS.cmmsFinance },
  { key: "cmmsAiEngine" as NavKey, href: "/ai-engine", icon: NAV_ICONS.cmmsAiEngine },
  { key: "notificationCenter" as NavKey, href: "/notifications", icon: NAV_ICONS.notificationCenter },
  { key: "cmmsSecurity" as NavKey, href: "/security", icon: NAV_ICONS.cmmsSecurity },
  { key: "projectAccess" as NavKey, href: "/project-access", icon: NAV_ICONS.projectAccess },
  { key: "commandCenter" as NavKey, href: "/command-center", icon: NAV_ICONS.commandCenter },
  { key: "manpowerLive" as NavKey, href: "/manpower-live", icon: NAV_ICONS.manpowerLive },
  { key: "manpowerPolicy" as NavKey, href: "/manpower-policy", icon: NAV_ICONS.manpowerPolicy },
  { key: "analytics" as NavKey, href: "/analytics", icon: NAV_ICONS.analytics },
  { key: "help" as NavKey, href: "/help", icon: NAV_ICONS.help },
  { key: "settings" as NavKey, href: "/settings", icon: NAV_ICONS.settings },
  { key: "billing" as NavKey, href: "/billing", icon: NAV_ICONS.billing },
];

export function Sidebar({
  businessId,
  businesses,
  businessType,
  memberRole = "OWNER",
  collapsed = false,
  onCollapsedChange,
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const { locale, dir } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const currentBusiness = businesses.find((b) => b.id === businessId) ?? businesses[0];
  const type = normalizeBusinessType(businessType ?? currentBusiness?.type);
  const role = (currentBusiness?.memberRole as MemberRole) || memberRole;
  const isManpower = useIsManpowerTheme(businessId, businessType ?? currentBusiness?.type);
  const visibleNavKeys = getNavItemsForRole(role, type);
  const navItems = ALL_NAV_ITEMS.filter((item) => visibleNavKeys.includes(item.key));
  const user: User | null =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("user") || "null")
      : null;

  const basePath = `/dashboard/${businessId}`;

  const isActive = (href: string) => {
    const full = `${basePath}${href}`;
    if (href === "") return pathname === basePath;
    return pathname.startsWith(full);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#FAFAF8]">
      {/* Logo */}
      <div className={cn("flex items-center gap-2.5 px-4 py-4", collapsed && "justify-center px-2")}>
        <div className="w-8 h-8 rounded-lg bg-[#1D9E75] flex items-center justify-center shrink-0">
          <MessageCircle className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[13px] text-[#1a1a1a] truncate">SaudiChat Pro</p>
            <p className="text-[11px] text-[#9a9a9a] truncate">
              {locale === "ar" && currentBusiness?.nameAr ? currentBusiness.nameAr : currentBusiness?.name}
            </p>
          </div>
        )}
        {onMobileClose && (
          <button onClick={onMobileClose} className="lg:hidden p-1 rounded-lg hover:bg-[#EFEFEF]">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Business switcher */}
      {businesses.length > 1 && !collapsed && (
        <div className="px-3 pb-2">
          <button
            onClick={() => setSwitcherOpen(!switcherOpen)}
            className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-muted/80 transition-colors text-start"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              {currentBusiness?.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentBusiness.logo} alt="" className="w-full h-full rounded-lg object-cover" />
              ) : (
                <span className="text-xs font-bold text-primary">
                  {getInitials(currentBusiness?.name || "B")}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{currentBusiness?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{getIndustryLabel(type, locale === "ar" ? "ar" : "en")}</p>
            </div>
            <ChevronDown className={cn("w-4 h-4 transition-transform", switcherOpen && "rotate-180")} />
          </button>
          <AnimatePresence>
            {switcherOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-1 space-y-0.5">
                  {businesses
                    .filter((b) => b.id !== businessId)
                    .map((b) => (
                      <Link
                        key={b.id}
                        href={`/dashboard/${b.id}`}
                        onClick={onMobileClose}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/80 text-sm transition-colors"
                      >
                        <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {getInitials(b.name)}
                        </div>
                        <span className="truncate">{locale === "ar" && b.nameAr ? b.nameAr : b.name}</span>
                      </Link>
                    ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Navigation */}
      {isManpower ? (
        <ManpowerSidebarNav
          businessId={businessId}
          locale={locale}
          visibleKeys={visibleNavKeys}
          role={role}
          collapsed={collapsed}
          onNavigate={onMobileClose}
        />
      ) : (
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {navItems.map(({ key, href, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={key}
                href={`${basePath}${href}`}
                onClick={onMobileClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-gradient-primary text-white shadow-glow-green"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  collapsed && "justify-center px-2"
                )}
                title={collapsed ? t(locale, "dashboard", key) : undefined}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span>{t(locale, "dashboard", key)}</span>}
              </Link>
            );
          })}
        </nav>
      )}

      {/* User profile */}
      <div className={cn("p-3 border-t border-[#E8E8E8]", collapsed && "flex justify-center")}>
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                getInitials(user?.name || "U")
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name || "User"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.phone}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-red-500 transition-colors"
              title={locale === "ar" ? "تسجيل الخروج" : "Logout"}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-red-500 transition-colors"
            title={locale === "ar" ? "تسجيل الخروج" : "Logout"}
          >
            <LogOut className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col h-screen sticky top-0 border-e border-[#E8E8E8] transition-all duration-300 z-30 bg-[#FAFAF8]",
          collapsed ? "w-[72px]" : "w-[220px]"
        )}
      >
        {sidebarContent}
        {onCollapsedChange && (
          <button
            onClick={() => onCollapsedChange(!collapsed)}
            className="absolute -end-3 top-20 w-6 h-6 rounded-full bg-card border border-border shadow-md flex items-center justify-center hover:bg-muted transition-colors z-40"
          >
            {dir === "rtl" ? (
              collapsed ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
            ) : collapsed ? (
              <ChevronRight className="w-3 h-3" />
            ) : (
              <ChevronLeft className="w-3 h-3" />
            )}
          </button>
        )}
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: dir === "rtl" ? 280 : -280 }}
              animate={{ x: 0 }}
              exit={{ x: dir === "rtl" ? 280 : -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 start-0 w-[220px] bg-[#FAFAF8] border-e border-[#E8E8E8] z-50 lg:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
