"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Factory, Database } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api } from "@/lib/api";
import { getCmmsLevel } from "@/lib/cmms-config";
import { MemberRole } from "@/lib/industry-config";
import {
  ManpowerHeroHeader,
  ManpowerPageShell,
  ManpowerStatCard,
} from "@/components/dashboard/manpower-shell";
import { CmmsStructureBanner } from "@/components/dashboard/cmms-structure-banner";
import { CmmsAlertsPanel } from "@/components/dashboard/cmms-alerts-panel";
import { cn, formatCurrency } from "@/lib/utils";

export default function CmmsHubPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: async () => (await api.getMe()).data });
  const role = (me?.businesses?.find((b) => b.id === businessId)?.memberRole ?? "OWNER") as MemberRole;
  const level = getCmmsLevel(role);

  const { data: dash, isLoading } = useQuery({
    queryKey: ["cmms-dashboard", businessId],
    queryFn: async () => (await api.getCmmsDashboard(businessId)).data,
    enabled: level !== "SITE",
  });

  const seedMut = useMutation({
    mutationFn: () => api.seedCmmsDemo(businessId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cmms-dashboard", businessId] });
      toast.success(isAr ? "تم تحميل بيانات CMMS التجريبية" : "CMMS demo data loaded");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const s = dash?.summary;

  return (
    <ManpowerPageShell>
      <ManpowerHeroHeader
        icon={Factory}
        title={t(locale, "dashboard", "cmmsHub")}
        subtitle={
          isAr
            ? "المالك يرى الملخص — المكتب يقرر — الموقع ينفّذ"
            : "Owner sees summary — Office decides — Site executes"
        }
        actions={
          level !== "SITE" ? (
            <Button variant="outline" size="sm" onClick={() => seedMut.mutate()} disabled={seedMut.isPending}>
              <Database className="w-4 h-4 mr-1" />
              {isAr ? "تحميل CMMS تجريبي" : "Load CMMS demo"}
            </Button>
          ) : undefined
        }
      />
      <CmmsStructureBanner isAr={isAr} level={level} />

      {level !== "SITE" && <CmmsAlertsPanel isAr={isAr} />}

      {level !== "SITE" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            <ManpowerStatCard label={isAr ? "الأصول" : "Assets"} value={isLoading ? "—" : s?.assets ?? 0} accent="from-blue-500/10 to-transparent" />
            <ManpowerStatCard label={isAr ? "طلبات مفتوحة" : "Open requests"} value={s?.openWorkRequests ?? "—"} accent="from-amber-500/10 to-transparent" />
            <ManpowerStatCard label={isAr ? "أوامر عمل" : "Open WOs"} value={s?.openWorkOrders ?? "—"} accent="from-orange-500/10 to-transparent" />
            <ManpowerStatCard label={isAr ? "PM مستحق" : "PM due"} value={s?.pmDue ?? "—"} accent="from-violet-500/10 to-transparent" />
            <ManpowerStatCard
              label={isAr ? "تكلفة الصيانة" : "Maint. cost"}
              value={s ? formatCurrency(s.totalMaintenanceCost, isAr ? "ar-SA" : "en-SA") : "—"}
              sub={s ? `${s.totalDowntimeMinutes} min ${isAr ? "توقف" : "downtime"}` : undefined}
              accent="from-rose-500/10 to-transparent"
            />
          </div>

          <div className="rounded-[10px] border border-[#E8E8E8] bg-white p-4">
            <p className="text-sm font-semibold mb-3">{isAr ? "أحدث أوامر العمل" : "Recent work orders"}</p>
            <div className="space-y-2">
              {(dash?.recentWorkOrders ?? []).slice(0, 6).map((wo) => (
                <div key={wo.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                  <div>
                    <span className="font-mono text-xs text-muted-foreground mr-2">{wo.number}</span>
                    <span className="font-medium">{wo.title}</span>
                  </div>
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", wo.status === "COMPLETED" ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600")}>
                    {wo.status}
                  </span>
                </div>
              ))}
              {!dash?.recentWorkOrders?.length && (
                <p className="text-sm text-muted-foreground text-center py-6">{isAr ? "لا توجد أوامر — حمّل البيانات التجريبية" : "No work orders — load demo data"}</p>
              )}
            </div>
          </div>
        </>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { href: "/work-requests", key: "workRequests" as const, who: isAr ? "الموقع + المكتب" : "Site + Office" },
          { href: "/work-orders", key: "workOrders" as const, who: isAr ? "المكتب ينشئ — الموقع ينفّذ" : "Office creates — Site executes" },
          { href: "/locations", key: "locations" as const, who: isAr ? "المكتب يحدد الهيكل" : "Office defines structure" },
          { href: "/maintenance", key: "preventiveMaintenance" as const, who: isAr ? "المكتب يخطط — النظام يرسل" : "Office plans — system sends" },
          { href: "/spares", key: "spares" as const, who: isAr ? "المخزن + الموقع" : "Store + Site" },
          { href: "/procurement", key: "procurement" as const, who: isAr ? "المكتب فقط" : "Office only" },
          { href: "/finance", key: "cmmsFinance" as const, who: isAr ? "المالك + ERP" : "Owner + ERP" },
          { href: "/ai-engine", key: "cmmsAiEngine" as const, who: isAr ? "AI — توقع وتحسين" : "AI — predict & optimize" },
          { href: "/notifications", key: "notificationCenter" as const, who: isAr ? "Email · SMS · WhatsApp · Push" : "Email · SMS · WhatsApp · Push" },
          { href: "/security", key: "cmmsSecurity" as const, who: isAr ? "7 أدوار · 5 صلاحيات" : "7 roles · 5 permissions" },
        ].map(({ href, key, who }) => (
          <Link
            key={href}
            href={`/dashboard/${businessId}${href}`}
            className="rounded-[10px] border border-[#E8E8E8] bg-white p-4 hover:border-[#1D9E75]/40 transition"
          >
            <p className="font-semibold text-sm">{t(locale, "dashboard", key)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{who}</p>
          </Link>
        ))}
      </div>
    </ManpowerPageShell>
  );
}
