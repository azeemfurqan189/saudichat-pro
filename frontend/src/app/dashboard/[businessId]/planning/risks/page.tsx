"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";
import { ManpowerHeroHeader, ManpowerPageShell, ManpowerStatCard } from "@/components/dashboard/manpower-shell";

export default function PlanningRisksPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const [projectId, setProjectId] = useState("");

  const { data: projects = [] } = useQuery({
    queryKey: ["planning-projects", businessId],
    queryFn: async () => (await api.getPlanningProjects(businessId)).data ?? [],
  });

  const activeProjectId = projectId || projects[0]?.id || "";

  const { data: report, isLoading } = useQuery({
    queryKey: ["planning-risk", businessId, activeProjectId],
    queryFn: async () => (await api.getPlanningRiskReport(businessId, activeProjectId)).data,
    enabled: !!activeProjectId,
  });

  const fmt = (n: number) => formatCurrency(n, isAr ? "ar-SA" : "en-SA");

  return (
    <ManpowerPageShell>
      <ManpowerHeroHeader
        icon={AlertTriangle}
        title={t(locale, "dashboard", "planningRisk")}
        subtitle={isAr ? "Delay · Cost · Resource — SAR impact" : "Delay · cost · resource — SAR impact"}
      />

      <select
        className="rounded-lg border px-3 py-2 text-sm min-w-[200px]"
        value={activeProjectId}
        onChange={(e) => setProjectId(e.target.value)}
      >
        {projects.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      {!activeProjectId ? (
        <p className="text-center text-muted-foreground py-12">{isAr ? "حمّل Demo" : "Load demo first"}</p>
      ) : isLoading ? (
        <p className="text-center text-muted-foreground py-12">{t(locale, "dashboard", "loading")}</p>
      ) : report ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <ManpowerStatCard label="HIGH" value={report.summary.highRiskCount} accent="border-red-200 bg-red-50/40" />
            <ManpowerStatCard label="MEDIUM" value={report.summary.mediumRiskCount} accent="border-amber-200 bg-amber-50/40" />
            <ManpowerStatCard label={isAr ? "التعرض SAR" : "Exposure SAR"} value={fmt(report.summary.totalExposureSar)} />
            <ManpowerStatCard label={isAr ? "Compliance %" : "Compliance %"} value={`${report.summary.scheduleCompliancePct}%`} />
          </div>

          <div className="rounded-[10px] border bg-white p-4 space-y-2">
            <p className="text-sm font-semibold">{isAr ? "مخاطر الأنشطة" : "Activity risks"}</p>
            {report.activityRisks.map((r) => (
              <div key={r.activityId} className="flex flex-wrap justify-between gap-2 border-b pb-2 text-sm">
                <div>
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium me-2", r.riskLevel === "HIGH" ? "bg-red-100 text-red-700" : r.riskLevel === "MEDIUM" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700")}>
                    {r.riskLevel}
                  </span>
                  <span className="font-medium">{r.code} {r.name}</span>
                  {r.isCritical && <span className="text-red-600 ms-1">●</span>}
                </div>
                <span className="tabular-nums text-xs">
                  {r.delayProbability}% · {fmt(r.impactSar)}
                </span>
              </div>
            ))}
          </div>

          {report.summary.worstCaseSlipDays > 0 && (
            <div className="rounded-[10px] border border-amber-200 bg-amber-50/50 p-3 text-sm">
              {isAr ? "أسوأ سيناريو محاكاة:" : "Simulation worst-case:"}{" "}
              +{report.summary.worstCaseSlipDays}d · +{fmt(report.summary.worstCaseCostSar)}
            </div>
          )}

          {!!report.timesheetRisks?.length && (
            <div className="rounded-[10px] border bg-white p-4 space-y-2">
              <p className="text-sm font-semibold">{isAr ? "مخاطر Timesheet / EVM" : "Timesheet / EVM risks"}</p>
              {report.timesheetRisks.map((r, i) => (
                <div key={i} className={cn("text-xs p-2 rounded", r.severity === "HIGH" ? "bg-red-50 border border-red-200" : r.severity === "MEDIUM" ? "bg-amber-50 border border-amber-200" : "bg-muted/30")}>
                  <span className="font-medium">{r.type}</span> — {r.message}
                </div>
              ))}
            </div>
          )}

          {!!report.resourceRisks?.length && (
            <div className="rounded-[10px] border bg-white p-4 space-y-2">
              <p className="text-sm font-semibold">{isAr ? "مخاطر الموارد" : "Resource risks"}</p>
              {report.resourceRisks.map((r, i) => (
                <div key={i} className="flex justify-between gap-2 text-sm border-b pb-2">
                  <span>{r.date} · {r.trade}: -{r.shortage}</span>
                  <span className="tabular-nums text-xs">{fmt(r.impactSar)}</span>
                </div>
              ))}
            </div>
          )}

          {report.scenarioPreview && (
            <div className="rounded-[10px] border bg-white p-4 text-sm space-y-2">
              <p className="font-semibold">{isAr ? "معاينة المحاكاة" : "Simulation preview"} ({report.scenarioPreview.scenarioCount} scenarios)</p>
              {report.scenarioPreview.worstCase && (
                <p className="text-xs text-red-700">
                  {isAr ? "أسوأ:" : "Worst:"} +{report.scenarioPreview.worstCase.projectSlipDays}d · +{fmt(report.scenarioPreview.worstCase.costIncreaseSar)}
                </p>
              )}
              {report.scenarioPreview.recommended && (
                <p className="text-xs text-emerald-700">
                  {isAr ? "موصى:" : "Recommended:"} {report.scenarioPreview.recommended.label}
                </p>
              )}
            </div>
          )}
        </>
      ) : null}
    </ManpowerPageShell>
  );
}
