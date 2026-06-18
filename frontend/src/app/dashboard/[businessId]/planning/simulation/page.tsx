"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Play, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";
import { ManpowerHeroHeader, ManpowerPageShell, ManpowerStatCard } from "@/components/dashboard/manpower-shell";

export default function PlanningSimulationPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";

  const [projectId, setProjectId] = useState("");
  const [workersRemoved, setWorkersRemoved] = useState("5");
  const [materialDays, setMaterialDays] = useState("7");
  const [craneDays, setCraneDays] = useState("3");
  const [tradeRole, setTradeRole] = useState("WELDER");

  const { data: projects = [] } = useQuery({
    queryKey: ["planning-projects", businessId],
    queryFn: async () => (await api.getPlanningProjects(businessId)).data ?? [],
  });

  const activeProjectId = projectId || projects[0]?.id || "";

  const batchMut = useMutation({
    mutationFn: () => api.runPlanningBatchSimulation(businessId, activeProjectId, 100),
    onSuccess: () => toast.success(isAr ? "تم تشغيل 100 سيناريو" : "100 scenarios computed"),
    onError: (e: Error) => toast.error(e.message),
  });

  const customMut = useMutation({
    mutationFn: () =>
      api.runPlanningScenario(businessId, activeProjectId, {
        workerShortage: { workersRemoved: parseInt(workersRemoved, 10) || 5, tradeRole },
        materialDelayDays: parseFloat(materialDays) || 7,
        equipmentDelayDays: parseFloat(craneDays) || 3,
        equipmentTag: "CRANE",
        label: `Combined: −${workersRemoved} ${tradeRole}, mat +${materialDays}d, crane +${craneDays}d`,
      }),
    onSuccess: (res) => {
      toast.success(
        isAr
          ? `تأخير ${res.data?.projectSlipDays ?? 0} ي · +${formatCurrency(res.data?.costIncreaseSar ?? 0, "en-SA")}`
          : `Slip ${res.data?.projectSlipDays ?? 0}d · +${formatCurrency(res.data?.costIncreaseSar ?? 0, "en-SA")}`
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: batch, isLoading: batchLoading } = useQuery({
    queryKey: ["planning-batch", businessId, activeProjectId],
    queryFn: async () => (await api.runPlanningBatchSimulation(businessId, activeProjectId, 100)).data,
    enabled: !!activeProjectId && batchMut.isSuccess,
  });

  const fmt = (n: number) => formatCurrency(n, isAr ? "ar-SA" : "en-SA");

  return (
    <ManpowerPageShell>
      <ManpowerHeroHeader
        icon={Play}
        title={t(locale, "dashboard", "planningSimulation")}
        subtitle={isAr ? "What-If — workers · material · crane · combined" : "What-if — workers · material · crane · combined"}
      />

      <div className="flex flex-wrap gap-2 items-center">
        <select
          className="rounded-lg border px-3 py-2 text-sm min-w-[200px]"
          value={activeProjectId}
          onChange={(e) => setProjectId(e.target.value)}
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <Button size="sm" disabled={!activeProjectId || batchMut.isPending} onClick={() => batchMut.mutate()}>
          {batchMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 me-1" />}
          {isAr ? "100 سيناريو" : "Run 100 scenarios"}
        </Button>
      </div>

      {!activeProjectId ? (
        <p className="text-center text-muted-foreground py-12">{isAr ? "حمّل Demo من Planning Hub" : "Load demo from Planning Hub"}</p>
      ) : (
        <>
          {batch && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <ManpowerStatCard label={isAr ? "السيناريوهات" : "Scenarios"} value={batch.scenarioCount} />
              <ManpowerStatCard
                label={isAr ? "أسوأ تأخير" : "Worst slip"}
                value={`${batch.worstCase?.projectSlipDays ?? 0}d`}
                accent="border-red-200 bg-red-50/40"
              />
              <ManpowerStatCard
                label={isAr ? "أسوأ تكلفة" : "Worst cost"}
                value={fmt(batch.worstCase?.costIncreaseSar ?? 0)}
                accent="border-amber-200 bg-amber-50/40"
              />
              <ManpowerStatCard label={isAr ? "موصى به" : "Recommended slip"} value={`${batch.recommended?.projectSlipDays ?? 0}d`} />
            </div>
          )}

          <div className="rounded-[10px] border bg-white p-4 space-y-3">
            <p className="text-sm font-semibold">{isAr ? "سيناريو مدمج (Combined)" : "Combined multi-factor scenario"}</p>
            <div className="grid sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] uppercase text-muted-foreground">{isAr ? "عمال أقل" : "Workers removed"}</label>
                <Input value={workersRemoved} onChange={(e) => setWorkersRemoved(e.target.value)} type="number" className="h-8 mt-1" />
              </div>
              <div>
                <label className="text-[10px] uppercase text-muted-foreground">{isAr ? "تأخير مواد (يوم)" : "Material delay (days)"}</label>
                <Input value={materialDays} onChange={(e) => setMaterialDays(e.target.value)} type="number" className="h-8 mt-1" />
              </div>
              <div>
                <label className="text-[10px] uppercase text-muted-foreground">{isAr ? "Crane delay" : "Crane delay (days)"}</label>
                <Input value={craneDays} onChange={(e) => setCraneDays(e.target.value)} type="number" className="h-8 mt-1" />
              </div>
            </div>
            <select className="rounded border px-2 py-1.5 text-sm w-full sm:w-auto" value={tradeRole} onChange={(e) => setTradeRole(e.target.value)}>
              {["WELDER", "MECHANIC", "ELECTRICIAN", "GENERAL"].map((tr) => (
                <option key={tr} value={tr}>{tr}</option>
              ))}
            </select>
            <Button size="sm" disabled={customMut.isPending} onClick={() => customMut.mutate()}>
              {isAr ? "تشغيل Combined" : "Run combined scenario"}
            </Button>
          </div>

          {batchLoading && <p className="text-sm text-muted-foreground">{t(locale, "dashboard", "loading")}</p>}

          {batch && batch.scenarios.length > 0 && (
            <div className="rounded-[10px] border bg-white overflow-hidden">
              <div className="px-4 py-2 bg-[#FAFAF8] border-b text-xs font-semibold grid grid-cols-12 gap-2">
                <span className="col-span-1">#</span>
                <span className="col-span-5">{isAr ? "السيناريو" : "Scenario"}</span>
                <span className="col-span-2">{isAr ? "تأخير" : "Slip"}</span>
                <span className="col-span-2">{isAr ? "تكلفة +" : "Cost +"}</span>
                <span className="col-span-2">Critical</span>
              </div>
              {batch.scenarios.slice(0, 25).map((s) => (
                <div key={s.id} className="grid grid-cols-12 gap-2 px-4 py-2 border-b text-sm items-center">
                  <span className="col-span-1 text-xs text-muted-foreground">{s.rank}</span>
                  <span className="col-span-5 truncate">{s.label}</span>
                  <span className={cn("col-span-2 tabular-nums", s.projectSlipDays >= 5 && "text-red-600 font-semibold")}>
                    +{s.projectSlipDays}d
                  </span>
                  <span className="col-span-2 tabular-nums text-xs">{fmt(s.costIncreaseSar)}</span>
                  <span className="col-span-2 text-xs">{s.criticalPathCount}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </ManpowerPageShell>
  );
}
