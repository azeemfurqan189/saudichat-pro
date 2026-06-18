"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  AlertTriangle,
  Package,
  Clock,
  Wrench,
  Loader2,
  RefreshCw,
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";
import { ManpowerHeroHeader, ManpowerPageShell, ManpowerStatCard } from "@/components/dashboard/manpower-shell";
import { CmmsDemoBanner } from "@/components/dashboard/cmms-demo-banner";

const CAPABILITIES = [
  { id: "failure", icon: AlertTriangle, en: "Failure Prediction", ar: "توقع الأعطال", tab: "failure" as const },
  { id: "spare", icon: Package, en: "Spare Demand Forecast", ar: "توقع قطع الغيار", tab: "spare" as const },
  { id: "downtime", icon: Clock, en: "Downtime Prediction", ar: "توقع التوقف", tab: "downtime" as const },
  { id: "optimize", icon: Wrench, en: "Maintenance Optimization", ar: "تحسين الصيانة", tab: "optimize" as const },
];

function riskColor(risk: string) {
  if (risk === "CRITICAL") return "bg-red-500/10 text-red-700 border-red-200";
  if (risk === "HIGH") return "bg-orange-500/10 text-orange-700 border-orange-200";
  if (risk === "MEDIUM") return "bg-amber-500/10 text-amber-700 border-amber-200";
  return "bg-green-500/10 text-green-700 border-green-200";
}

export default function AiEnginePage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();
  const [tab, setTab] = useState<(typeof CAPABILITIES)[number]["tab"]>("failure");

  const { data: ai, isLoading } = useQuery({
    queryKey: ["cmms-ai-engine", businessId],
    queryFn: async () => (await api.getCmmsAiEngine(businessId)).data,
  });

  const runMut = useMutation({
    mutationFn: () => api.runCmmsAiEngine(businessId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cmms-ai-engine", businessId] });
      toast.success(isAr ? "تم تحليل AI" : "AI analysis complete");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const seedMut = useMutation({
    mutationFn: () => api.seedCmmsAiEngine(businessId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cmms-ai-engine", businessId] });
      qc.invalidateQueries({ queryKey: ["cmms-dashboard", businessId] });
      toast.success(isAr ? "تم تحميل بيانات CMMS للتحليل" : "CMMS data loaded for AI analysis");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const autoWoMut = useMutation({
    mutationFn: () => api.postAutoWoFromPredictions(businessId, "HIGH"),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["work-orders", businessId] });
      toast.success(isAr ? `تم إنشاء ${res.data?.count ?? 0} أمر عمل` : `Created ${res.data?.count ?? 0} work order(s) from predictions`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const fmt = (n: number) => formatCurrency(n, isAr ? "ar-SA" : "en-SA");
  const hasData = (ai?.summary.assetsAnalyzed ?? 0) > 0;

  const TrendIcon =
    ai?.downtimePrediction.trend === "INCREASING"
      ? TrendingUp
      : ai?.downtimePrediction.trend === "DECREASING"
        ? TrendingDown
        : Minus;

  return (
    <ManpowerPageShell>
      <ManpowerHeroHeader
        icon={Sparkles}
        title={t(locale, "dashboard", "cmmsAiEngine")}
        subtitle={
          isAr
            ? "توقع الأعطال · قطع الغيار · التوقف · تحسين الصيانة"
            : "Failure prediction · Spare forecast · Downtime · Maintenance optimization"
        }
      />

      <CmmsDemoBanner businessId={businessId} isAr={isAr} hasData={hasData} />

      <div className="flex flex-wrap gap-2 justify-between items-center">
        <div className="flex items-center gap-2 text-xs text-[#5c5c5c]">
          <Brain className="w-4 h-4 text-[#1D9E75]" />
          {ai?.generatedAt && (
            <span>
              {isAr ? "آخر تحليل:" : "Last run:"}{" "}
              {new Date(ai.generatedAt).toLocaleString(isAr ? "ar-SA" : "en-SA")}
              · {ai.summary.confidencePct}% {isAr ? "ثقة" : "confidence"}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {!hasData && (
            <Button size="sm" variant="outline" onClick={() => seedMut.mutate()} disabled={seedMut.isPending}>
              {seedMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : isAr ? "Demo CMMS" : "Load CMMS demo"}
            </Button>
          )}
          <Button size="sm" onClick={() => runMut.mutate()} disabled={runMut.isPending || !hasData}>
            {runMut.isPending ? <Loader2 className="w-4 h-4 animate-spin me-1" /> : <RefreshCw className="w-4 h-4 me-1" />}
            {isAr ? "تشغيل AI" : "Run AI Analysis"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <ManpowerStatCard label={isAr ? "أصول محللة" : "Assets analyzed"} value={isLoading ? "—" : ai?.summary.assetsAnalyzed ?? 0} />
        <ManpowerStatCard
          label={isAr ? "خطر عالي" : "High risk"}
          value={isLoading ? "—" : ai?.summary.highRiskAssets ?? 0}
          accent={(ai?.summary.highRiskAssets ?? 0) > 0 ? "border-red-200 bg-red-50/50" : undefined}
        />
        <ManpowerStatCard label={isAr ? "قطع للطلب" : "Parts to order"} value={isLoading ? "—" : ai?.summary.partsToReorder ?? 0} />
        <ManpowerStatCard label={isAr ? "توقف متوقع" : "Predicted downtime"} value={isLoading ? "—" : `${ai?.summary.predictedDowntimeHours ?? 0}h`} />
        <ManpowerStatCard label={isAr ? "توصيات" : "Optimizations"} value={isLoading ? "—" : ai?.summary.optimizationActions ?? 0} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {CAPABILITIES.map((cap) => {
          const Icon = cap.icon;
          const active = tab === cap.tab;
          return (
            <button
              key={cap.id}
              type="button"
              onClick={() => setTab(cap.tab)}
              className={cn(
                "rounded-[10px] border p-3 text-left transition",
                active ? "border-[#1D9E75] bg-[#EAF3DE]/60" : "border-[#E8E8E8] bg-white hover:border-[#1D9E75]/40"
              )}
            >
              <Icon className={cn("w-4 h-4 mb-1", active ? "text-[#1D9E75]" : "text-muted-foreground")} />
              <p className="text-xs font-semibold">{isAr ? cap.ar : cap.en}</p>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-12">{isAr ? "جاري التحميل..." : "Loading..."}</p>
      ) : !hasData ? (
        <p className="text-center text-muted-foreground py-12">{isAr ? "حمّل Demo CMMS ثم شغّل AI" : "Load CMMS demo then run AI analysis"}</p>
      ) : (
        <>
          {tab === "failure" && (
            <div className="rounded-[10px] border border-[#E8E8E8] bg-white divide-y">
              <div className="p-3 bg-[#FAFAF8] text-xs font-semibold flex justify-between items-center">
                <span>{isAr ? "توقع الأعطال — أعلى المخاطر" : "Failure Prediction — top risks"}</span>
                <Button size="sm" variant="outline" disabled={autoWoMut.isPending} onClick={() => autoWoMut.mutate()}>
                  {autoWoMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : isAr ? "Auto WO" : "Auto-generate WO"}
                </Button>
              </div>
              {(ai?.failurePrediction.items.length ?? 0) === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">{isAr ? "لا مخاطر مرتفعة" : "No elevated risks"}</p>
              ) : (
                ai?.failurePrediction.items.map((item) => (
                  <div key={item.assetId} className="p-4 flex flex-wrap justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{item.assetName}</span>
                        {item.assetTag && <span className="font-mono text-[10px] text-muted-foreground">{item.assetTag}</span>}
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", riskColor(item.risk))}>
                          {item.risk} · {item.failureProbability}%
                        </span>
                      </div>
                      {item.location && <p className="text-[10px] text-muted-foreground mt-0.5">{item.location}</p>}
                      <p className="text-xs text-[#5c5c5c] mt-1">{item.recommendation}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.factors.slice(0, 3).map((f) => (
                          <span key={f} className="text-[9px] px-1.5 py-0.5 rounded bg-muted">{f}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <p className="font-bold text-lg">{item.score}</p>
                      <p className="text-muted-foreground">{isAr ? `خلال ${item.predictedWindowDays} يوم` : `within ${item.predictedWindowDays}d`}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "spare" && (
            <div className="rounded-[10px] border border-[#E8E8E8] bg-white divide-y">
              <div className="p-3 bg-[#FAFAF8] text-xs font-semibold flex justify-between">
                <span>{isAr ? "توقع الطلب — 30 يوم" : "Spare Demand Forecast — 30 days"}</span>
                <span>{fmt(ai?.spareDemandForecast.totalReorderValue ?? 0)}</span>
              </div>
              {ai?.spareDemandForecast.items.map((item) => (
                <div key={item.sparePartId} className="p-4 flex flex-wrap justify-between gap-2">
                  <div>
                    <span className="font-mono text-[10px] text-muted-foreground">{item.sku}</span>
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {isAr ? "مخزون:" : "Stock:"} {item.stockQty} · {isAr ? "استخدام/شهر:" : "Use/mo:"} {item.monthlyUsage}
                    </p>
                  </div>
                  <div className="text-right text-xs space-y-1">
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", riskColor(item.urgency))}>{item.urgency}</span>
                    <p>{isAr ? "طلب:" : "Order:"} <strong>{item.suggestedOrderQty}</strong></p>
                    <p className="text-muted-foreground">{fmt(item.estimatedCost)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "downtime" && (
            <div className="space-y-3">
              <div className="rounded-[10px] border border-[#E8E8E8] bg-white p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase text-[#9a9a9a]">{isAr ? "14 يوم القادمة" : "Next 14 days"}</p>
                  <p className="text-3xl font-bold">{ai?.downtimePrediction.predictedHours ?? 0}h</p>
                  <p className="text-xs text-muted-foreground">{ai?.downtimePrediction.predictedDays ?? 0} {isAr ? "أيام إنتاج" : "production days"}</p>
                </div>
                <div className={cn("flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-full",
                  ai?.downtimePrediction.trend === "INCREASING" ? "bg-red-50 text-red-700" :
                  ai?.downtimePrediction.trend === "DECREASING" ? "bg-green-50 text-green-700" : "bg-muted"
                )}>
                  <TrendIcon className="w-4 h-4" />
                  {ai?.downtimePrediction.trend}
                </div>
              </div>
              <div className="rounded-[10px] border border-[#E8E8E8] bg-white divide-y">
                {ai?.downtimePrediction.items.map((item, i) => (
                  <div key={i} className="p-3 flex justify-between gap-2 text-sm">
                    <div>
                      <p className="font-medium">{item.assetName}</p>
                      <p className="text-[10px] text-muted-foreground">{item.location ?? "—"} · {item.drivers.join(" · ")}</p>
                    </div>
                    <span className="font-bold">{item.predictedHours}h</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "optimize" && (
            <div className="rounded-[10px] border border-[#E8E8E8] bg-white divide-y">
              <div className="p-3 bg-[#FAFAF8] text-xs font-semibold">
                {isAr ? "تحسين الصيانة — توصيات AI" : "Maintenance Optimization — AI recommendations"}
              </div>
              {(ai?.maintenanceOptimization.recommendations.length ?? 0) === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">{isAr ? "لا توصيات حالياً" : "No recommendations"}</p>
              ) : (
                ai?.maintenanceOptimization.recommendations.map((rec, i) => (
                  <div key={i} className="p-4">
                    <div className="flex items-start gap-2">
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0", riskColor(rec.priority))}>
                        {rec.priority}
                      </span>
                      <div>
                        <p className="font-semibold text-sm">{rec.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{rec.detail}</p>
                        {rec.savingsEstimate && (
                          <p className="text-[10px] text-[#1D9E75] mt-1">{rec.savingsEstimate}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </ManpowerPageShell>
  );
}
