"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Activity, Loader2 } from "lucide-react";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ManpowerHeroHeader, ManpowerPageShell, ManpowerStatCard } from "@/components/dashboard/manpower-shell";
import { CmmsDemoBanner } from "@/components/dashboard/cmms-demo-banner";

export default function ReliabilityPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["cmms-mtbf-mttr", businessId],
    queryFn: async () => (await api.getCmmsMtbfMttr(businessId)).data ?? [],
  });

  const avgHealth = rows.length ? Math.round(rows.reduce((s, r) => s + r.healthScore, 0) / rows.length) : 0;
  const hasData = rows.length > 0;

  return (
    <ManpowerPageShell>
      <ManpowerHeroHeader
        icon={Activity}
        title={t(locale, "dashboard", "assetReliability")}
        subtitle={isAr ? "MTBF · MTTR · صحة الأصول" : "MTBF · MTTR · asset health scores from work order history"}
      />
      <CmmsDemoBanner businessId={businessId} isAr={isAr} hasData={hasData} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ManpowerStatCard label="MTBF/MTTR" value={isLoading ? "—" : `${rows.length} assets`} />
        <ManpowerStatCard label={isAr ? "متوسط الصحة" : "Avg health"} value={isLoading ? "—" : `${avgHealth}/100`} />
        <ManpowerStatCard
          label={isAr ? "ضعيف (<60)" : "At risk (<60)"}
          value={isLoading ? "—" : rows.filter((r) => r.healthScore < 60).length}
          accent={rows.some((r) => r.healthScore < 60) ? "border-red-200 bg-red-50/40" : undefined}
        />
        <ManpowerStatCard label={isAr ? "إجمالي الأعطال" : "Total failures"} value={isLoading ? "—" : rows.reduce((s, r) => s + r.failureCount, 0)} />
      </div>

      <div className="rounded-[10px] border bg-white overflow-hidden">
        <div className="px-4 py-2 bg-[#FAFAF8] border-b text-xs font-semibold grid grid-cols-12 gap-2">
          <span className="col-span-3">{isAr ? "الأصل" : "Asset"}</span>
          <span className="col-span-2">MTBF (h)</span>
          <span className="col-span-2">MTTR (h)</span>
          <span className="col-span-2">{isAr ? "أعطال" : "Failures"}</span>
          <span className="col-span-3">{isAr ? "الصحة" : "Health"}</span>
        </div>
        {isLoading ? (
          <p className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></p>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">{isAr ? "أكمل أوامر عمل تصحيحية لحساب MTBF/MTTR" : "Complete corrective work orders to calculate MTBF/MTTR"}</p>
        ) : (
          rows.map((r) => (
            <div key={r.equipmentId} className="grid grid-cols-12 gap-2 px-4 py-3 border-b text-sm items-center">
              <div className="col-span-3">
                <p className="font-medium truncate">{r.assetName}</p>
                {r.assetTag && <p className="text-[10px] font-mono text-muted-foreground">{r.assetTag}</p>}
              </div>
              <span className="col-span-2 tabular-nums">{r.mtbfHours ?? "—"}</span>
              <span className="col-span-2 tabular-nums">{r.mttrHours ?? (r.mttrMinutes != null ? (r.mttrMinutes / 60).toFixed(1) : "—")}</span>
              <span className="col-span-2 tabular-nums">{r.failureCount}</span>
              <div className="col-span-3">
                <div className="h-2 bg-muted rounded overflow-hidden">
                  <div
                    className={cn("h-full rounded", r.healthScore >= 70 ? "bg-[#1D9E75]" : r.healthScore >= 50 ? "bg-amber-500" : "bg-red-500")}
                    style={{ width: `${r.healthScore}%` }}
                  />
                </div>
                <p className="text-[10px] mt-0.5 tabular-nums">{r.healthScore}/100</p>
              </div>
            </div>
          ))
        )}
      </div>
    </ManpowerPageShell>
  );
}
