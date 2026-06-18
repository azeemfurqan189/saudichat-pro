"use client";

import { useMemo, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GitBranch, Loader2, Play, Target, AlertTriangle, Sparkles } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api, ScheduleActivityRow } from "@/lib/api";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { ManpowerHeroHeader, ManpowerPageShell, ManpowerStatCard } from "@/components/dashboard/manpower-shell";

const DEP_TYPES = ["FS", "SS", "FF", "SF"] as const;

export default function PlanningPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();

  const [projectId, setProjectId] = useState<string>("");
  const [selectedAct, setSelectedAct] = useState<ScheduleActivityRow | null>(null);
  const [predId, setPredId] = useState("");
  const [depType, setDepType] = useState<(typeof DEP_TYPES)[number]>("FS");
  const [simDays, setSimDays] = useState("3");
  const [tab, setTab] = useState<"schedule" | "setup" | "evm" | "changes" | "ai" | "resources">("schedule");
  const [newProgName, setNewProgName] = useState("");
  const [newProjName, setNewProjName] = useState("");
  const [newWbsCode, setNewWbsCode] = useState("");
  const [newWbsName, setNewWbsName] = useState("");
  const [newActName, setNewActName] = useState("");
  const [newActCode, setNewActCode] = useState("");
  const [newActDur, setNewActDur] = useState("1");
  const [progressPct, setProgressPct] = useState("");
  const [shiftHours, setShiftHours] = useState("8");
  const [penaltyDay, setPenaltyDay] = useState("15000");
  const [importCsv, setImportCsv] = useState("");
  const [voTitle, setVoTitle] = useState("");
  const [voScope, setVoScope] = useState("");
  const [voCost, setVoCost] = useState("");
  const [voDays, setVoDays] = useState("");
  const [linkedAgencyId, setLinkedAgencyId] = useState("");
  const dragRef = useRef<{ actId: string; mode: "move" | "resize"; startX: number; origDur: number; origStart: number } | null>(null);

  const { data: projects = [] } = useQuery({
    queryKey: ["planning-projects", businessId],
    queryFn: async () => (await api.getPlanningProjects(businessId)).data ?? [],
  });

  const activeProjectId = projectId || projects[0]?.id || "";

  const { data: project, isLoading } = useQuery({
    queryKey: ["planning-project", businessId, activeProjectId],
    queryFn: async () => (await api.getPlanningProject(businessId, activeProjectId)).data,
    enabled: !!activeProjectId,
  });

  const { data: aiInsights } = useQuery({
    queryKey: ["planning-ai", businessId, activeProjectId],
    queryFn: async () => (await api.getPlanningAiInsights(businessId, activeProjectId)).data,
    enabled: !!activeProjectId && tab === "ai",
  });

  const { data: leveling } = useQuery({
    queryKey: ["planning-leveling", businessId, activeProjectId],
    queryFn: async () => (await api.getPlanningLeveling(businessId, activeProjectId)).data,
    enabled: !!activeProjectId && tab === "resources",
  });

  const { data: sCurve } = useQuery({
    queryKey: ["planning-s-curve", businessId, activeProjectId],
    queryFn: async () => (await api.getPlanningSCurve(businessId, activeProjectId)).data,
    enabled: !!activeProjectId && tab === "evm",
  });

  const { data: resourceForecast } = useQuery({
    queryKey: ["planning-forecast", businessId, activeProjectId],
    queryFn: async () => (await api.getPlanningResourceForecast(businessId, activeProjectId)).data,
    enabled: !!activeProjectId && tab === "resources",
  });

  const { data: changeOrders = [], refetch: refetchVo } = useQuery({
    queryKey: ["planning-vo", businessId, activeProjectId],
    queryFn: async () => (await api.getPlanningChangeOrders(businessId, activeProjectId)).data ?? [],
    enabled: !!activeProjectId && tab === "changes",
  });

  const { data: agencyProjects = [] } = useQuery({
    queryKey: ["manpower-projects", businessId],
    queryFn: async () => (await api.getManpowerProjects(businessId)).data ?? [],
    enabled: tab === "setup" || tab === "evm",
  });

  const evm = project?.evm;
  const evmIntegration = project?.evmIntegration;

  const seedMut = useMutation({
    mutationFn: () => api.seedPlanningDemo(businessId),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["planning-projects", businessId] });
      if (res.data?.projectId) setProjectId(res.data.projectId);
      toast.success(isAr ? "تم تحميل خطة Demo" : "Planning demo loaded");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const depMut = useMutation({
    mutationFn: () => {
      if (!selectedAct || !predId) throw new Error("Select predecessor and activity");
      return api.createPlanningDependency(businessId, activeProjectId, {
        predecessorId: predId,
        successorId: selectedAct.id,
        type: depType,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planning-project", businessId, activeProjectId] });
      setPredId("");
      toast.success(isAr ? "تمت إضافة التبعية" : "Dependency added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const baselineMut = useMutation({
    mutationFn: () => api.createPlanningBaseline(businessId, activeProjectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planning-project", businessId, activeProjectId] });
      toast.success(isAr ? "تم حفظ Baseline" : "Baseline saved");
    },
  });

  const ganttRange = useMemo(() => {
    if (!project?.activities.length) return { start: Date.now(), span: 1 };
    const starts = project.activities.map((a) => new Date(a.plannedStart ?? Date.now()).getTime());
    const ends = project.activities.map((a) => new Date(a.plannedFinish ?? Date.now()).getTime());
    const min = Math.min(...starts);
    const max = Math.max(...ends);
    return { start: min, span: Math.max(1, max - min) };
  }, [project?.activities]);

  const fmt = (n: number) => formatCurrency(n, isAr ? "ar-SA" : "en-SA");

  const simMut = useMutation({
    mutationFn: () => {
      if (!selectedAct) throw new Error("Select activity");
      return api.simulatePlanningDelay(businessId, activeProjectId, {
        activityId: selectedAct.id,
        extraDays: parseFloat(simDays) || 3,
      });
    },
    onSuccess: (res) => {
      toast.success(
        isAr
          ? `تأخير: ${res.data?.projectSlipDays ?? 0}d · +${fmt(res.data?.costIncreaseSar ?? 0)}`
          : `Slip: ${res.data?.projectSlipDays ?? 0}d · +${fmt(res.data?.costIncreaseSar ?? 0)}`
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patchActMut = useMutation({
    mutationFn: (data: Partial<ScheduleActivityRow>) => {
      if (!selectedAct) throw new Error("Select activity");
      return api.patchPlanningActivity(businessId, selectedAct.id, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planning-project", businessId, activeProjectId] });
      toast.success(isAr ? "تم التحديث — EVM (SPI/CPI) recalculated" : "Updated — EVM (SPI/CPI) recalculated");
    },
  });

  const invalidateProject = () => qc.invalidateQueries({ queryKey: ["planning-project", businessId, activeProjectId] });

  const onGanttPointerUp = useCallback(async () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d || !project?.plannedStart) return;
    if (d.mode === "resize") {
      const newDur = Math.max(0.5, d.origDur + (d.origDur * 0.1));
      await api.patchPlanningActivity(businessId, d.actId, { durationDays: Math.round(newDur * 10) / 10 });
    } else {
      const shiftDays = Math.max(0, d.origStart + 1);
      await api.shiftPlanningActivity(businessId, d.actId, shiftDays);
    }
    invalidateProject();
  }, [businessId, project?.plannedStart, qc, activeProjectId]);

  const startDrag = (e: React.PointerEvent, act: ScheduleActivityRow, mode: "move" | "resize") => {
    e.stopPropagation();
    e.preventDefault();
    const startDays = act.plannedStart
      ? (new Date(act.plannedStart).getTime() - ganttRange.start) / 86400000
      : 0;
    dragRef.current = { actId: act.id, mode, startX: e.clientX, origDur: act.durationDays, origStart: startDays };
    window.addEventListener("pointerup", onGanttPointerUp, { once: true });
  };

  const releaseMut = useMutation({
    mutationFn: (activityId: string) => api.releasePlanningActivity(businessId, activityId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planning-project", businessId, activeProjectId] });
      qc.invalidateQueries({ queryKey: ["work-orders", businessId] });
      toast.success(isAr ? "تم إنشاء أمر العمل" : "Work order created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const syncEvmMut = useMutation({
    mutationFn: () => api.syncPlanningEvm(businessId, activeProjectId),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["planning-project", businessId, activeProjectId] });
      qc.invalidateQueries({ queryKey: ["planning-s-curve", businessId, activeProjectId] });
      toast.success(
        isAr
          ? `تم المزامنة — ${res.data?.activitiesUpdated ?? 0} نشاط`
          : `Synced — ${res.data?.activitiesUpdated ?? 0} activities updated`
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <ManpowerPageShell>
      <ManpowerHeroHeader
        icon={GitBranch}
        title={t(locale, "dashboard", "projectPlanning")}
        subtitle={
          isAr
            ? "WBS · شبكة الأنشطة · Critical Path · Baseline · محاكاة التأخير"
            : "WBS · activity network · critical path · baseline · delay simulation"
        }
      />

      <div className="flex flex-wrap gap-2 justify-between items-center">
        <select
          className="rounded-lg border border-[#E8E8E8] px-3 py-2 text-sm min-w-[200px]"
          value={activeProjectId}
          onChange={(e) => setProjectId(e.target.value)}
        >
          {projects.length === 0 && <option value="">{isAr ? "لا مشاريع" : "No projects"}</option>}
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} {p.code ? `(${p.code})` : ""}
            </option>
          ))}
        </select>
        {project?.agencyProject && (
          <span className="text-[11px] px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
            {isAr ? "مرتبط:" : "Linked:"} {project.agencyProject.name}
          </span>
        )}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => seedMut.mutate()} disabled={seedMut.isPending}>
            {seedMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : isAr ? "Demo" : "Demo"}
          </Button>
          {activeProjectId && (
            <>
              <Button size="sm" variant="outline" onClick={() => baselineMut.mutate()} disabled={baselineMut.isPending}>
                <Target className="w-4 h-4 me-1" />
                {isAr ? "Baseline" : "Set baseline"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => api.recalculatePlanning(businessId, activeProjectId).then(() => qc.invalidateQueries({ queryKey: ["planning-project", businessId, activeProjectId] }))}
              >
                {isAr ? "إعادة CPM" : "Recalculate CPM"}
              </Button>
            </>
          )}
        </div>
      </div>

      {!activeProjectId ? (
        <p className="text-center text-muted-foreground py-12">
          {isAr ? "حمّل Demo لبدء التخطيط" : "Load demo to start planning"}
        </p>
      ) : isLoading ? (
        <p className="text-center text-muted-foreground py-12">{t(locale, "dashboard", "loading")}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <ManpowerStatCard label={isAr ? "الأنشطة" : "Activities"} value={project?.activities.length ?? 0} />
            <ManpowerStatCard
              label={isAr ? "Critical Path" : "Critical path"}
              value={project?.activities.filter((a) => a.isCritical).length ?? 0}
              accent="border-red-200 bg-red-50/40"
            />
            <ManpowerStatCard
              label="SPI (BCWP/BCWS)"
              value={evm?.spi?.toFixed(2) ?? "—"}
              accent={evm && evm.spi < 1 ? "border-red-200 bg-red-50/40" : undefined}
            />
            <ManpowerStatCard
              label="CPI (BCWP/ACWP)"
              value={evm?.cpi?.toFixed(2) ?? "—"}
              accent={evm && evm.cpi < 1 ? "border-amber-200 bg-amber-50/40" : undefined}
            />
            <ManpowerStatCard
              label={isAr ? "انتهاء مخطط" : "Planned finish"}
              value={project?.plannedFinish ? formatDate(project.plannedFinish, locale) : "—"}
            />
          </div>

          <div className="flex gap-1 border-b border-[#E8E8E8]">
            {(["schedule", "setup", "evm", "changes", "ai", "resources"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={cn(
                  "px-4 py-2 text-sm border-b-2 -mb-px",
                  tab === k ? "border-[#1D9E75] font-medium" : "border-transparent text-muted-foreground"
                )}
              >
                {k === "schedule"
                  ? isAr ? "الجدول" : "Schedule"
                  : k === "setup"
                    ? isAr ? "إنشاء" : "Create"
                    : k === "evm"
                      ? "EVM"
                      : k === "changes"
                        ? isAr ? "V.O / تغيير" : "V.O / Changes"
                        : k === "ai"
                          ? "AI"
                          : isAr ? "الموارد" : "Resources"}
              </button>
            ))}
          </div>

          {tab === "setup" && (
            <div className="rounded-[10px] border bg-white p-4 space-y-4 text-sm">
              <p className="font-semibold">{isAr ? "ربط مشروع العمال" : "Link manpower project"}</p>
              <p className="text-xs text-muted-foreground">
                {isAr
                  ? "اربط مشروع Manpower لسحب Timesheet → EVM progress و CMMS Finance → ACWP"
                  : "Link agency project to pull Timesheet hours → EVM progress & CMMS Finance → ACWP"}
              </p>
              <div className="flex gap-2 flex-wrap">
                <select
                  className="rounded border px-2 py-2 text-sm flex-1 min-w-[200px]"
                  value={linkedAgencyId || project?.agencyProject?.id || ""}
                  onChange={(e) => setLinkedAgencyId(e.target.value)}
                >
                  <option value="">{isAr ? "— لا ربط —" : "— No link —"}</option>
                  {agencyProjects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!activeProjectId}
                  onClick={async () => {
                    await api.patchPlanningProject(businessId, activeProjectId, {
                      agencyProjectId: linkedAgencyId || null,
                    });
                    invalidateProject();
                    qc.invalidateQueries({ queryKey: ["planning-projects", businessId] });
                    toast.success(isAr ? "تم الربط" : "Project linked");
                  }}
                >
                  {isAr ? "حفظ الربط" : "Save link"}
                </Button>
              </div>
              <p className="font-semibold pt-2">{isAr ? "برنامج / مشروع / WBS / نشاط" : "Program / project / WBS / activity"}</p>
              <div className="grid sm:grid-cols-2 gap-2">
                <Input placeholder={isAr ? "اسم البرنامج" : "Program name"} value={newProgName} onChange={(e) => setNewProgName(e.target.value)} />
                <Button size="sm" variant="outline" onClick={async () => {
                  await api.createPlanningProgram(businessId, { name: newProgName });
                  setNewProgName("");
                  qc.invalidateQueries({ queryKey: ["planning-projects", businessId] });
                  toast.success(isAr ? "تم" : "Created");
                }}>{isAr ? "برنامج +" : "+ Program"}</Button>
                <Input placeholder={isAr ? "اسم المشروع" : "Project name"} value={newProjName} onChange={(e) => setNewProjName(e.target.value)} />
                <Button size="sm" variant="outline" onClick={async () => {
                  const r = await api.createPlanningProject(businessId, { name: newProjName });
                  if (r.data?.id) setProjectId(r.data.id);
                  setNewProjName("");
                  qc.invalidateQueries({ queryKey: ["planning-projects", businessId] });
                  toast.success(isAr ? "تم" : "Created");
                }}>{isAr ? "مشروع +" : "+ Project"}</Button>
                <Input placeholder="WBS code" value={newWbsCode} onChange={(e) => setNewWbsCode(e.target.value)} />
                <Input placeholder="WBS name" value={newWbsName} onChange={(e) => setNewWbsName(e.target.value)} />
                <Button size="sm" className="sm:col-span-2" variant="outline" disabled={!activeProjectId} onClick={async () => {
                  await api.createPlanningWbs(businessId, activeProjectId, { code: newWbsCode, name: newWbsName || newWbsCode });
                  setNewWbsCode(""); setNewWbsName("");
                  invalidateProject();
                }}>+ WBS</Button>
                <Input placeholder={isAr ? "كود النشاط" : "Activity code"} value={newActCode} onChange={(e) => setNewActCode(e.target.value)} />
                <Input placeholder={isAr ? "اسم النشاط" : "Activity name"} value={newActName} onChange={(e) => setNewActName(e.target.value)} />
                <Input type="number" placeholder="Duration days" value={newActDur} onChange={(e) => setNewActDur(e.target.value)} />
                <Button size="sm" variant="outline" disabled={!activeProjectId} onClick={async () => {
                  await api.createPlanningActivity(businessId, activeProjectId, { code: newActCode, name: newActName, durationDays: parseFloat(newActDur) || 1 });
                  setNewActCode(""); setNewActName("");
                  invalidateProject();
                }}>+ Activity</Button>
              </div>
              <p className="font-semibold pt-2">{isAr ? "التقويم / Calendar (Sun–Thu)" : "Calendar (Sun–Thu Saudi)"}</p>
              <div className="grid sm:grid-cols-3 gap-2">
                <Input type="number" placeholder="Shift hours" value={shiftHours} onChange={(e) => setShiftHours(e.target.value)} />
                <Input type="number" placeholder="Penalty SAR/day" value={penaltyDay} onChange={(e) => setPenaltyDay(e.target.value)} />
                <Button size="sm" variant="outline" disabled={!activeProjectId} onClick={async () => {
                  await api.patchPlanningProject(businessId, activeProjectId, {
                    shiftHours: parseFloat(shiftHours) || 8,
                    penaltyPerDay: parseFloat(penaltyDay) || 15000,
                    calendarConfig: { workingDays: [0, 1, 2, 3, 4], hoursPerDay: parseFloat(shiftHours) || 8 },
                  });
                  invalidateProject();
                  toast.success(isAr ? "تم حفظ التقويم" : "Calendar saved");
                }}>{isAr ? "حفظ" : "Save calendar"}</Button>
              </div>
              <p className="font-semibold">{isAr ? "استيراد CSV / XER-lite" : "Import CSV / XER-lite"}</p>
              <p className="text-xs text-muted-foreground">code,name,duration,wbs,predecessor,type,labor,material,equipmentTag</p>
              <textarea className="w-full min-h-[80px] rounded border p-2 text-xs font-mono" value={importCsv} onChange={(e) => setImportCsv(e.target.value)} />
              <Button size="sm" disabled={!activeProjectId || !importCsv.trim()} onClick={async () => {
                await api.importPlanningCsv(businessId, activeProjectId, importCsv, "csv");
                setImportCsv("");
                invalidateProject();
                toast.success(isAr ? "تم الاستيراد" : "Imported");
              }}>{isAr ? "استيراد" : "Import"}</Button>
            </div>
          )}

          {tab === "evm" && evm && (
            <div className="rounded-[10px] border bg-white p-4 space-y-4">
              <p className="text-sm font-semibold">{isAr ? "Earned Value Management" : "Earned Value Management (EVM)"}</p>
              <p className="text-xs text-muted-foreground">
                {isAr ? "BCWP = كم كام كام مكتمل · BCWS = كم كان المفروض · ACWP = كم خرج فعلياً" : "BCWP = value of work done · BCWS = planned value · ACWP = actual cost spent"}
              </p>

              {evmIntegration && (
                <div className="rounded-lg border border-[#E8E8E8] bg-[#FAFAF8] p-3 space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-sm">{isAr ? "تكامل EVM" : "EVM integration"}</p>
                    <div className="flex gap-2">
                      <span className={cn("px-2 py-0.5 rounded", evmIntegration.progressSource === "MANUAL" ? "bg-gray-100" : "bg-emerald-100 text-emerald-700")}>
                        {isAr ? "تقدم:" : "Progress:"} {evmIntegration.progressSource}
                      </span>
                      <span className={cn("px-2 py-0.5 rounded", evmIntegration.costSource === "ESTIMATED" ? "bg-gray-100" : "bg-blue-100 text-blue-700")}>
                        {isAr ? "تكلفة:" : "Cost:"} {evmIntegration.costSource}
                      </span>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    <p>{isAr ? "ساعات Timesheet:" : "Timesheet hrs:"} <strong>{evmIntegration.timesheetHoursApproved}</strong></p>
                    <p>{isAr ? "تكلفة عمال:" : "Labor cost:"} <strong>{fmt(evmIntegration.timesheetLaborCostSar)}</strong></p>
                    <p>{isAr ? "CMMS فعلي:" : "CMMS actual:"} <strong>{fmt(evmIntegration.cmmsFinanceActualSar)}</strong></p>
                    <p>{isAr ? "CMMS ميزانية:" : "CMMS budget:"} <strong>{fmt(evmIntegration.cmmsFinanceBudgetSar)}</strong></p>
                  </div>
                  {evmIntegration.linkedAgencyProjectName && (
                    <p className="text-muted-foreground">
                      {isAr ? "مشروع:" : "Agency project:"} {evmIntegration.linkedAgencyProjectName}
                    </p>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!evmIntegration.linkedAgencyProjectId || syncEvmMut.isPending}
                    onClick={() => syncEvmMut.mutate()}
                  >
                    {isAr ? "مزامنة Timesheet → % إنجاز" : "Sync timesheet → progress %"}
                  </Button>
                  {evmIntegration.activityProgress.some((a) => a.hoursUsed > 0) && (
                    <div className="mt-2 border-t pt-2 space-y-1 max-h-32 overflow-y-auto">
                      {evmIntegration.activityProgress.filter((a) => a.hoursUsed > 0 || a.integratedPct !== a.manualPct).slice(0, 8).map((a) => (
                        <div key={a.activityId} className="flex justify-between gap-2">
                          <span className="truncate">{a.name}</span>
                          <span className="shrink-0 tabular-nums">{a.manualPct}% → {a.integratedPct}% ({a.hoursUsed}h)</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: "BAC", sub: isAr ? "الميزانية الكلية" : "Budget at Completion", val: fmt(evm.bac) },
                  { label: "BCWS (PV)", sub: isAr ? "قيمة مخططة" : "Planned Value", val: fmt(evm.bcws) },
                  { label: "BCWP (EV)", sub: isAr ? "قيمة مكتسبة" : "Earned Value", val: fmt(evm.bcwp) },
                  { label: "ACWP (AC)", sub: isAr ? "تكلفة فعلية" : "Actual Cost", val: fmt(evm.acwp) },
                ].map((row) => (
                  <div key={row.label} className="rounded-lg border p-3">
                    <p className="text-[10px] uppercase text-muted-foreground">{row.label}</p>
                    <p className="text-lg font-semibold tabular-nums">{row.val}</p>
                    <p className="text-[10px] text-muted-foreground">{row.sub}</p>
                  </div>
                ))}
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className={cn("rounded-lg border p-3", evm.spi < 1 && "border-red-200 bg-red-50/30")}>
                  <p className="text-[10px] uppercase">SPI = BCWP / BCWS</p>
                  <p className="text-2xl font-bold tabular-nums">{evm.spi.toFixed(3)}</p>
                  <p className="text-xs">{evm.spi >= 1 ? (isAr ? "✓ في الموعد" : "✓ On schedule") : (isAr ? "⚠ متأخر" : "⚠ Behind schedule")}</p>
                </div>
                <div className={cn("rounded-lg border p-3", evm.cpi < 1 && "border-amber-200 bg-amber-50/30")}>
                  <p className="text-[10px] uppercase">CPI = BCWP / ACWP</p>
                  <p className="text-2xl font-bold tabular-nums">{evm.cpi.toFixed(3)}</p>
                  <p className="text-xs">{evm.cpi >= 1 ? (isAr ? "✓ تحت الميزانية" : "✓ Under budget") : (isAr ? "⚠ تجاوز تكلفة" : "⚠ Over budget")}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-[10px] uppercase">SV (Schedule Var.)</p>
                  <p className={cn("text-xl font-semibold tabular-nums", evm.sv < 0 && "text-red-600")}>{fmt(evm.sv)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-[10px] uppercase">CV (Cost Var.)</p>
                  <p className={cn("text-xl font-semibold tabular-nums", evm.cv < 0 && "text-amber-600")}>{fmt(evm.cv)}</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-3 text-sm">
                <p><span className="text-muted-foreground">EAC:</span> <strong>{fmt(evm.eac)}</strong></p>
                <p><span className="text-muted-foreground">VAC:</span> <strong>{fmt(evm.vac)}</strong></p>
                <p><span className="text-muted-foreground">% Complete:</span> <strong>{evm.percentComplete}%</strong></p>
              </div>
              {sCurve && (
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{isAr ? "S-Curve — تقدم vs تكلفة" : "S-Curve — Progress vs Cost"}</p>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded font-medium",
                      sCurve.currentZone === "GREEN" ? "bg-green-100 text-green-700" : sCurve.currentZone === "YELLOW" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                    )}>
                      {sCurve.currentZone} ZONE
                    </span>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sCurve.points}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v) => fmt(Number(v ?? 0))} />
                        <Legend />
                        <Line type="monotone" dataKey="plannedValue" name="BCWS (PV)" stroke="#8884d8" dot={false} />
                        <Line type="monotone" dataKey="earnedValue" name="BCWP (EV)" stroke="#1D9E75" dot={false} />
                        <Line type="monotone" dataKey="actualCost" name="ACWP (AC)" stroke="#f59e0b" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground">
                {evmIntegration?.linkedAgencyProjectId
                  ? isAr
                    ? "EVM يدمج Timesheet + CMMS Finance تلقائياً عند الربط"
                    : "EVM auto-integrates timesheets + CMMS finance when agency project is linked"
                  : isAr
                    ? "اربط مشروع Manpower في Create tab — أو حدّث Progress % يدوياً"
                    : "Link manpower project in Create tab — or update Progress % manually"}
              </p>
            </div>
          )}

          {tab === "changes" && (
            <div className="space-y-4">
              <div className="rounded-[10px] border bg-white p-4 space-y-3">
                <p className="text-sm font-semibold">{isAr ? "Variation Order (V.O) — طلب تغيير" : "Variation Order (V.O) — scope change request"}</p>
                <Input placeholder={isAr ? "عنوان التغيير" : "Change title"} value={voTitle} onChange={(e) => setVoTitle(e.target.value)} />
                <textarea className="w-full min-h-[60px] rounded border p-2 text-sm" placeholder={isAr ? "وصف نطاق التغيير" : "Scope change description"} value={voScope} onChange={(e) => setVoScope(e.target.value)} />
                <div className="grid sm:grid-cols-2 gap-2">
                  <Input type="number" placeholder={isAr ? "تأثير تكلفة SAR" : "Cost impact SAR"} value={voCost} onChange={(e) => setVoCost(e.target.value)} />
                  <Input type="number" placeholder={isAr ? "تأثير جدول (أيام)" : "Schedule impact (days)"} value={voDays} onChange={(e) => setVoDays(e.target.value)} />
                </div>
                <Button size="sm" disabled={!voTitle.trim()} onClick={async () => {
                  await api.createPlanningChangeOrder(businessId, activeProjectId, {
                    title: voTitle,
                    scopeChange: voScope,
                    costImpactSar: parseFloat(voCost) || 0,
                    scheduleImpactDays: parseFloat(voDays) || 0,
                  });
                  setVoTitle(""); setVoScope(""); setVoCost(""); setVoDays("");
                  refetchVo();
                  toast.success(isAr ? "V.O مسودة" : "V.O drafted");
                }}>{isAr ? "إنشاء V.O" : "Create V.O"}</Button>
              </div>
              <div className="rounded-[10px] border bg-white overflow-hidden">
                <div className="px-4 py-2 bg-[#FAFAF8] border-b text-xs font-semibold grid grid-cols-12 gap-2">
                  <span className="col-span-2">V.O</span>
                  <span className="col-span-4">{isAr ? "العنوان" : "Title"}</span>
                  <span className="col-span-2">{isAr ? "تكلفة" : "Cost"}</span>
                  <span className="col-span-2">{isAr ? "جدول" : "Days"}</span>
                  <span className="col-span-2">{isAr ? "إجراء" : "Action"}</span>
                </div>
                {changeOrders.map((vo) => (
                  <div key={vo.id} className="grid grid-cols-12 gap-2 px-4 py-2 border-b text-sm items-center">
                    <span className="col-span-2 font-mono text-xs">{vo.number}</span>
                    <span className="col-span-4 truncate">{vo.title}</span>
                    <span className="col-span-2 text-xs tabular-nums">{fmt(vo.costImpactSar)}</span>
                    <span className="col-span-2 text-xs">+{vo.scheduleImpactDays}d</span>
                    <span className="col-span-2 flex flex-wrap gap-1">
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded", vo.status === "APPROVED" ? "bg-green-100 text-green-700" : vo.status === "REJECTED" ? "bg-red-100" : vo.status === "PENDING" ? "bg-amber-100" : "bg-gray-100")}>{vo.status}</span>
                      {vo.status === "DRAFT" && (
                        <button type="button" className="text-[10px] text-[#1D9E75] underline" onClick={async () => { await api.patchPlanningChangeOrder(businessId, vo.id, "submit"); refetchVo(); }}>{isAr ? "إرسال" : "Submit"}</button>
                      )}
                      {vo.status === "PENDING" && (
                        <>
                          <button type="button" className="text-[10px] text-green-600 underline" onClick={async () => { await api.patchPlanningChangeOrder(businessId, vo.id, "approve"); refetchVo(); invalidateProject(); toast.success(isAr ? "تمت الموافقة + baseline" : "Approved + baseline updated"); }}>{isAr ? "موافقة" : "Approve"}</button>
                          <button type="button" className="text-[10px] text-red-600 underline" onClick={async () => { await api.patchPlanningChangeOrder(businessId, vo.id, "reject", "Client declined"); refetchVo(); }}>{isAr ? "رفض" : "Reject"}</button>
                        </>
                      )}
                    </span>
                  </div>
                ))}
                {!changeOrders.length && <p className="text-sm text-center text-muted-foreground py-8">{isAr ? "لا توجد V.O" : "No variation orders yet"}</p>}
              </div>
              {changeOrders.some((v) => v.changeLog?.length) && (
                <div className="rounded-[10px] border bg-white p-4 text-xs space-y-1">
                  <p className="font-semibold mb-2">{isAr ? "سجل التغييرات (Change Log)" : "Change Log"}</p>
                  {changeOrders.flatMap((v) => (v.changeLog ?? []).map((e, i) => (
                    <p key={`${v.id}-${i}`}><span className="font-mono text-muted-foreground">{v.number}</span> · {e.action} — {e.note}</p>
                  )))}
                </div>
              )}
            </div>
          )}

          {tab === "schedule" && (
            <div className="grid lg:grid-cols-[220px_1fr_300px] gap-4">
              <div className="rounded-[10px] border border-[#E8E8E8] bg-white p-3 space-y-2">
                <p className="text-xs font-semibold uppercase text-[#9a9a9a]">WBS</p>
                {(project?.wbsNodes ?? []).map((w) => (
                  <div key={w.id} className="text-sm py-1 border-b border-[#f0f0f0]">
                    <span className="font-mono text-[10px] text-[#888]">{w.code}</span>
                    <p className="font-medium">{w.name}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="rounded-[10px] border border-[#E8E8E8] bg-white overflow-hidden">
                  <div className="px-4 py-2 bg-[#FAFAF8] border-b text-xs font-semibold grid grid-cols-12 gap-2">
                    <span className="col-span-1">#</span>
                    <span className="col-span-4">{isAr ? "النشاط" : "Activity"}</span>
                    <span className="col-span-1">{isAr ? "مدة" : "Dur"}</span>
                    <span className="col-span-1">Float</span>
                    <span className="col-span-5">Gantt</span>
                  </div>
                  {(project?.activities ?? []).map((act) => {
                    const start = new Date(act.plannedStart ?? Date.now()).getTime();
                    const end = new Date(act.plannedFinish ?? Date.now()).getTime();
                    const left = ((start - ganttRange.start) / ganttRange.span) * 100;
                    const width = Math.max(2, ((end - start) / ganttRange.span) * 100);
                    const active = selectedAct?.id === act.id;
                    return (
                      <button
                        key={act.id}
                        type="button"
                        onClick={() => setSelectedAct(act)}
                        className={cn(
                          "w-full grid grid-cols-12 gap-2 px-4 py-2.5 border-b text-left text-sm items-center hover:bg-[#FAFAF8]",
                          act.isCritical && "bg-red-50/30",
                          active && "bg-[#F5EDE4]"
                        )}
                      >
                        <span className="col-span-1 font-mono text-[10px]">{act.code ?? "—"}</span>
                        <span className="col-span-4 font-medium truncate">
                          {act.isCritical && <span className="text-red-600 me-1">●</span>}
                          {act.name}
                        </span>
                        <span className="col-span-1 tabular-nums">{act.durationDays}d</span>
                        <span className={cn("col-span-1 tabular-nums text-xs", (act.totalFloat ?? 0) <= 0 ? "text-red-600 font-semibold" : "")}>
                          {act.totalFloat ?? 0}
                        </span>
                        <div className="col-span-5 h-4 bg-[#f5f5f5] rounded relative overflow-hidden">
                          <div
                            role="presentation"
                            className={cn("absolute top-0 h-full rounded cursor-grab", act.isCritical ? "bg-red-500" : "bg-[#1D9E75]")}
                            style={{ left: `${left}%`, width: `${width}%` }}
                            onPointerDown={(e) => startDrag(e, act, "move")}
                          />
                          <div
                            role="presentation"
                            className="absolute top-0 h-full w-1.5 right-0 cursor-ew-resize bg-black/20 rounded-r"
                            style={{ left: `calc(${left}% + ${width}% - 6px)` }}
                            onPointerDown={(e) => startDrag(e, act, "resize")}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {(project?.baselineVariance?.length ?? 0) > 0 && (
                  <div className="rounded-[10px] border border-amber-200 bg-amber-50/40 p-3 text-xs space-y-1">
                    <p className="font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {isAr ? "Baseline vs Actual" : "Baseline variance"}
                    </p>
                    {project!.baselineVariance!.slice(0, 5).map((v) => (
                      <p key={v.activityId}>
                        {v.name}: {v.scheduleVarianceDays > 0 ? "+" : ""}
                        {v.scheduleVarianceDays}d · {fmt(v.costVariance)} SAR
                      </p>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="rounded-[10px] border border-[#E8E8E8] bg-white p-4 space-y-3">
                  <p className="text-sm font-semibold">{selectedAct ? selectedAct.name : isAr ? "اختر نشاطاً" : "Select activity"}</p>
                  {selectedAct && (
                    <>
                      <p className="text-[11px] text-[#888]">
                        {selectedAct.percentComplete}% · {selectedAct.status}
                        {selectedAct.workOrder && ` · WO ${selectedAct.workOrder.number}`}
                      </p>
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <label className="text-[10px] uppercase text-[#9a9a9a]">% {isAr ? "إنجاز" : "Progress"}</label>
                          <Input type="number" min="0" max="100" value={progressPct || selectedAct.percentComplete} onChange={(e) => setProgressPct(e.target.value)} className="h-8 mt-1" />
                        </div>
                        <Button size="sm" variant="outline" onClick={() => patchActMut.mutate({ percentComplete: parseFloat(progressPct) || selectedAct.percentComplete })}>
                          {isAr ? "حفظ" : "Save"}
                        </Button>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase text-[#9a9a9a]">{isAr ? "سابق (Predecessor)" : "Predecessor"}</label>
                        <select
                          className="w-full mt-1 rounded border px-2 py-1.5 text-sm"
                          value={predId}
                          onChange={(e) => setPredId(e.target.value)}
                        >
                          <option value="">—</option>
                          {project?.activities.filter((a) => a.id !== selectedAct.id).map((a) => (
                            <option key={a.id} value={a.id}>{a.code} {a.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-1">
                        {DEP_TYPES.map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setDepType(d)}
                            className={cn("flex-1 py-1 text-[10px] rounded border", depType === d ? "bg-[#F5EDE4] font-medium" : "")}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                      <Button size="sm" className="w-full" disabled={!predId || depMut.isPending} onClick={() => depMut.mutate()}>
                        {isAr ? "إضافة تبعية" : "Add dependency"}
                      </Button>
                      <div className="flex gap-2">
                        <Input type="number" min="1" value={simDays} onChange={(e) => setSimDays(e.target.value)} className="h-8" />
                        <Button size="sm" variant="outline" disabled={simMut.isPending} onClick={() => simMut.mutate()}>
                          <Play className="w-3.5 h-3.5 me-1" />
                          {isAr ? "محاكاة" : "Simulate"}
                        </Button>
                      </div>
                      {!selectedAct.workOrder && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          disabled={releaseMut.isPending}
                          onClick={() => releaseMut.mutate(selectedAct.id)}
                        >
                          {isAr ? "إصدار → Work Order" : "Release → Work Order"}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === "ai" && aiInsights && (
            <div className="rounded-[10px] border border-[#E8E8E8] bg-white p-4 space-y-4">
              <p className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                {isAr ? "تنبؤ التأخير والتكلفة" : "Delay & cost prediction"}
              </p>
              <p className="text-sm">
                {isAr ? "غرامة متوقعة:" : "Est. penalty:"}{" "}
                <strong>{fmt(aiInsights.costImpact.estimatedPenaltySar)}</strong>
              </p>
              <ul className="text-xs space-y-2">
                {aiInsights.delayPredictions.slice(0, 6).map((d) => (
                  <li key={d.activityId} className="flex justify-between gap-2 border-b pb-2">
                    <span>{d.name}</span>
                    <span className={cn("shrink-0", d.riskScore >= 80 ? "text-red-600" : "text-amber-600")}>
                      {d.riskScore}% · {d.prediction}
                    </span>
                  </li>
                ))}
              </ul>
              {aiInsights.recommendations.map((r, i) => (
                <p key={i} className="text-xs text-[#5c5c5c] bg-[#FAFAF8] p-2 rounded">• {r}</p>
              ))}
            </div>
          )}

          {tab === "resources" && leveling && (
            <div className="space-y-4">
              <div className="rounded-[10px] border border-[#E8E8E8] bg-white p-4 space-y-3">
                <p className="text-sm font-semibold">{isAr ? "تسوية الموارد" : "Resource leveling"}</p>
                <p className="text-xs text-[#888]">
                  {isAr ? "الطاقة:" : "Capacity:"} {leveling.headcount} · {isAr ? "الموجود:" : "Pool:"} {leveling.placementPoolSize}
                </p>
                {leveling.overloads.length === 0 ? (
                  <p className="text-sm text-[#1D9E75]">{isAr ? "لا اختناق" : "No overload detected"}</p>
                ) : (
                  leveling.overloads.map((o, i) => (
                    <div key={i} className="text-xs p-2 rounded bg-amber-50 border border-amber-200">
                      {o.date} · {o.trade}: {o.required}/{o.available} — {o.suggestion}
                    </div>
                  ))
                )}
              </div>
              {resourceForecast && resourceForecast.byTrade.length > 0 && (
                <div className="rounded-[10px] border bg-white p-4 space-y-3">
                  <p className="text-sm font-semibold">{isAr ? "توقعات الموارد — 3 أشهر" : "Resource histogram — 3-month forecast"}</p>
                  {resourceForecast.totalAlerts > 0 && (
                    <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded">
                      ⚠ {resourceForecast.totalAlerts} {isAr ? "تنبيه نقص عمالة" : "staffing gap alerts"}
                    </p>
                  )}
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={resourceForecast.byTrade[0]?.weeklyLoad ?? []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="weekStart" tick={{ fontSize: 9 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="required" name={isAr ? "مطلوب" : "Required"} fill="#1D9E75" />
                        <Bar dataKey="available" name={isAr ? "متوفر" : "Available"} fill="#94a3b8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {resourceForecast.byTrade.map((t) => (
                      <div key={t.trade} className="text-xs border rounded p-2">
                        <p className="font-semibold">{t.trade}</p>
                        <p className="text-muted-foreground">{isAr ? "ذروة:" : "Peak:"} {t.peakRequired} ({t.peakWeek})</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </ManpowerPageShell>
  );
}
