"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Bell, Menu, LogOut, User, Settings, ArrowLeft } from "lucide-react";
import { getDashboardBackTarget } from "@/lib/dashboard-nav";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api, User as ApiUser } from "@/lib/api";
import { cn, formatDate, getInitials } from "@/lib/utils";

interface DashboardHeaderProps {
  businessId: string;
  businessName?: string;
  onMenuClick?: () => void;
  light?: boolean;
}

export function DashboardHeader({ businessId, businessName, onMenuClick, light }: DashboardHeaderProps) {
  const { locale } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const backTarget = useMemo(() => getDashboardBackTarget(pathname, businessId), [pathname, businessId]);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const user: ApiUser | null =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("user") || "null")
      : null;

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", businessId],
    queryFn: async () => {
      const res = await api.getNotifications(businessId);
      return res.data ?? [];
    },
    refetchInterval: 30000,
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markReadMutation = useMutation({
    mutationFn: (notificationId: string) => api.markNotificationRead(businessId, notificationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", businessId] }),
  });

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-20 px-4 py-3 border-b",
        light
          ? "bg-[#FAFAF8] border-[#E8E8E8]"
          : "glass border-border/50"
      )}
    >
      <div className="flex items-center gap-4">
        {onMenuClick && (
          <Button variant="ghost" size="icon" onClick={onMenuClick} className="lg:hidden">
            <Menu className="w-5 h-5" />
          </Button>
        )}

        {backTarget && (
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "shrink-0 gap-1.5 h-9 px-2.5",
              light ? "text-[#5c5c5c] hover:text-[#1a1a1a] hover:bg-[#EFEFEF]" : ""
            )}
            asChild
          >
            <Link href={backTarget.href} title={locale === "ar" ? backTarget.labelAr : backTarget.labelEn}>
              <ArrowLeft className="w-4 h-4 rtl-flip" />
              <span className="hidden sm:inline text-[13px] font-medium max-w-[140px] truncate">
                {locale === "ar" ? backTarget.labelAr : backTarget.labelEn}
              </span>
            </Link>
          </Button>
        )}

        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t(locale, "dashboard", "search")}
              className={cn(
                "w-full h-10 ps-10 pe-4 rounded-xl border text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                light
                  ? "border-[#E8E8E8] bg-white text-[#1a1a1a] placeholder:text-[#9a9a9a]"
                  : "border-border bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm text-sm"
              )}
            />
          </div>
        </div>

        {businessName && (
          <p className="hidden md:block text-[13px] font-medium text-[#5c5c5c] truncate max-w-[200px]">
            {businessName}
          </p>
        )}

        <div className="flex items-center gap-1 ms-auto">
          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setNotifOpen(!notifOpen);
                setProfileOpen(false);
              }}
              className="relative"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -end-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>

            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="absolute end-0 top-full mt-2 w-80 glass-card !p-0 !scale-100 shadow-xl z-50 max-h-96 overflow-hidden"
                >
                  <div className="p-4 border-b border-border/50">
                    <h3 className="font-semibold">{t(locale, "dashboard", "notifications")}</h3>
                  </div>
                  <div className="overflow-y-auto max-h-72">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground text-center">
                        {t(locale, "dashboard", "noData")}
                      </p>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <button
                          key={n.id}
                          onClick={() => !n.isRead && markReadMutation.mutate(n.id)}
                          className={cn(
                            "w-full text-start p-4 border-b border-border/30 hover:bg-muted/50 transition-colors",
                            !n.isRead && "bg-primary/5"
                          )}
                        >
                          <p className="text-sm font-medium">{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(n.createdAt, locale)}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <ThemeToggle />
          <LanguageToggle />

          {/* Profile dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => {
                setProfileOpen(!profileOpen);
                setNotifOpen(false);
              }}
              className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-bold ms-1 hover:ring-2 hover:ring-primary/30 transition-all"
            >
              {user?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                getInitials(user?.name || "U")
              )}
            </button>

            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="absolute end-0 top-full mt-2 w-56 glass-card !p-2 !scale-100 shadow-xl z-50"
                >
                  <div className="px-3 py-2 border-b border-border/50 mb-1">
                    <p className="font-medium text-sm">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => router.push(`/dashboard/${businessId}/settings`)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    {t(locale, "dashboard", "settings")}
                  </button>
                  <button
                    onClick={() => router.push(`/dashboard/${businessId}/settings`)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
                  >
                    <User className="w-4 h-4" />
                    {locale === "ar" ? "الملف الشخصي" : "Profile"}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    {locale === "ar" ? "تسجيل الخروج" : "Logout"}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
