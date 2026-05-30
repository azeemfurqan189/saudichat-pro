"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ShoppingBag,
  Calendar,
  Package,
  Users,
  Megaphone,
  MessageSquare,
  UserCog,
  BarChart3,
  Settings,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MessageCircle,
  LogOut,
  X,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { cn, getInitials } from "@/lib/utils";
import { Business, User } from "@/lib/api";

interface SidebarProps {
  businessId: string;
  businesses: Business[];
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const navItems = [
  { key: "overview", href: "", icon: LayoutDashboard },
  { key: "orders", href: "/orders", icon: ShoppingBag },
  { key: "appointments", href: "/appointments", icon: Calendar },
  { key: "catalog", href: "/catalog", icon: Package },
  { key: "customers", href: "/customers", icon: Users },
  { key: "marketing", href: "/marketing", icon: Megaphone },
  { key: "conversations", href: "/conversations", icon: MessageSquare },
  { key: "staff", href: "/staff", icon: UserCog },
  { key: "analytics", href: "/analytics", icon: BarChart3 },
  { key: "settings", href: "/settings", icon: Settings },
  { key: "billing", href: "/billing", icon: CreditCard },
] as const;

export function Sidebar({
  businessId,
  businesses,
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
    <div className="flex h-full flex-col">
      {/* Logo & collapse toggle */}
      <div className={cn("flex items-center gap-3 p-4 border-b border-border/50", collapsed && "justify-center")}>
        <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shrink-0">
          <MessageCircle className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate">SaudiChat Pro</p>
            <p className="text-xs text-muted-foreground truncate">
              {locale === "ar" && currentBusiness?.nameAr ? currentBusiness.nameAr : currentBusiness?.name}
            </p>
          </div>
        )}
        {onMobileClose && (
          <button onClick={onMobileClose} className="lg:hidden p-1 rounded-lg hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Business switcher */}
      {businesses.length > 1 && !collapsed && (
        <div className="p-3 border-b border-border/50">
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
              <p className="text-xs text-muted-foreground capitalize">{currentBusiness?.type?.toLowerCase()}</p>
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

      {/* User profile */}
      <div className={cn("p-3 border-t border-border/50", collapsed && "flex justify-center")}>
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
          "hidden lg:flex flex-col h-screen sticky top-0 glass border-e border-border/50 transition-all duration-300 z-30",
          collapsed ? "w-[72px]" : "w-64"
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
              className="fixed inset-y-0 start-0 w-64 glass z-50 lg:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
