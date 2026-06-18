"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AuthGuard } from "@/components/dashboard/auth-guard";
import { Sidebar } from "@/components/shared/sidebar";
import { DashboardHeader } from "@/components/shared/dashboard-header";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { useBusinessSocket } from "@/hooks/use-business-socket";
import { getDefaultDashboardPath, MemberRole } from "@/lib/industry-config";
import { useIsManpowerTheme } from "@/hooks/use-is-manpower-theme";
import { cn } from "@/lib/utils";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const businessId = params.businessId as string;
  const { locale } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: meData, isLoading: meLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await api.getMe();
      return res.data;
    },
  });

  const { data: business, isLoading: businessLoading } = useQuery({
    queryKey: ["business", businessId],
    queryFn: async () => {
      const res = await api.getBusiness(businessId);
      return res.data;
    },
    enabled: !!businessId,
  });

  const businesses = meData?.businesses ?? (business ? [business] : []);
  const currentBusiness = businesses.find((b) => b.id === businessId) ?? business;
  const memberRole = (currentBusiness?.memberRole as MemberRole) || "OWNER";
  const businessName =
    locale === "ar" && business?.nameAr ? business.nameAr : business?.name;
  const resolvedBusinessType = business?.type ?? currentBusiness?.type;
  const isManpower = useIsManpowerTheme(businessId, resolvedBusinessType);

  useBusinessSocket(businessId);

  useEffect(() => {
    if (!businessId || !memberRole) return;
    const overviewPath = `/dashboard/${businessId}`;
    if (
      (memberRole === "OFFICE_STAFF" || memberRole === "FIELD_WORKER") &&
      pathname === overviewPath
    ) {
      router.replace(getDefaultDashboardPath(memberRole, businessId));
    }
  }, [businessId, memberRole, pathname, router]);

  const loading = meLoading || businessLoading;

  return (
    <AuthGuard>
      <div className={cn("flex min-h-screen", isManpower && "manpower-theme")} suppressHydrationWarning>
        <Sidebar
          businessId={businessId}
          businesses={businesses}
          businessType={resolvedBusinessType}
          memberRole={memberRole}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader
            businessId={businessId}
            businessName={businessName}
            onMenuClick={() => setMobileOpen(true)}
            light={isManpower}
          />

          <main className={cn("flex-1 p-4 md:p-6 overflow-auto", isManpower && "bg-[#FAFAF8]")}>
            {loading ? (
              <div className="space-y-6">
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 rounded-2xl" />
                  ))}
                </div>
                <Skeleton className="h-64 rounded-2xl" />
              </div>
            ) : !business ? (
              <div className="glass-card text-center py-16">
                <p className="text-muted-foreground">{t(locale, "dashboard", "error")}</p>
              </div>
            ) : (
              children
            )}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
