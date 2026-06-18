"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  RotateCw,
  Plus,
  Play,
  ClipboardList,
  Droplets,
  Wrench,
  AlertTriangle,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api, MaintenancePlanRow } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { ManpowerHeroHeader, ManpowerPageShell, ManpowerStatCard } from "@/components/dashboard/manpower-shell";
import { CmmsDemoBanner } from "@/components/dashboard/cmms-demo-banner";
import { ReminderNotificationPanel } from "@/components/dashboard/reminder-notification-panel";
import { reminderItemKey } from "@/lib/reminder-notify-types";

const PM_TYPES = [
  { value: "INSPECTION", en: "Inspection", ar: "فحص", icon: ClipboardList, color: "bg-blue-50 text-blue-700" },
  { value: "LUBRICATION", en: "Lubrication", ar: "تزييت", icon: Droplets, color: "bg-emerald-50 text-emerald-700" },
  { value: "OVERHAUL", en: "Overhaul", ar: "صيانة شاملة", icon: Wrench, color: "bg-amber-50 text-amber-700" },
];

const PRESETS = [
  { value: "MONTHLY", en: "Every Month", ar: "كل شهر", days: 30 },
  { value: "QUARTERLY", en: "Every 3 Months", ar: "كل 3 أشهر", days: 90 },
  { value: "SEMI_ANNUAL", en: "Every 6 Months", ar: "كل 6 أشهر", days: 182 },
  { value: "ANNUAL", en: "Every Year", ar: "كل سنة", days: 365 },
  { value: "HOURS_2000", en: "Every 2000 Hours", ar: "كل 2000 ساعة", hours: 2000 },
  { value: "TEMP_80C", en: "When temp > 80°C", ar: "عند تجاوز 80°م", condition: true },
  { value: "VIBRATION_HIGH", en: "Vibration > 7.5", ar: "اهتزاز > 7.5", condition: true },
];

function pmTypeMeta(type?: string) {
  return PM_TYPES.find((p) => p.value === type) ?? PM_TYPES[0];
}

function presetLabel(preset: string | null | undefined, isAr: boolean) {
  const p = PRESETS.find((x) => x.value === preset);
  if (p) return isAr ? p.ar : p.en;
  return preset ?? "—";
}

function intervalLabel(plan: MaintenancePlanRow, isAr: boolean) {
  if (plan.preset) return presetLabel(plan.preset, isAr);
  if (plan.triggerType === "CONDITION") {
    return isAr ? "حسب الشرط (حرارة/اهتزاز)" : "Condition-based (temp/vibration)";
  }
  if (plan.triggerType === "METER" && plan.intervalHours) {
    return isAr ? `كل ${plan.intervalHours} ساعة` : `Every ${plan.intervalHours} hours`;
  }
  if (plan.intervalDays) {
    return isAr ? `كل ${plan.intervalDays} يوم` : `Every ${plan.intervalDays} days`;
  }
  return "—";
}

export default function MaintenancePage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [pmType, setPmType] = useState("INSPECTION");
  const [preset, setPreset] = useState("MONTHLY");
  const [description, setDescription] = useState("");

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["maintenance-plans", businessId],
    queryFn: async () => (await api.getMaintenancePlans(businessId)).data ?? [],
  });

  const { data: history = [] } = useQuery({
    queryKey: ["pm-history", businessId],
    queryFn: async () => (await api.getPmHistory(businessId)).data ?? [],
  });

  const stats = useMemo(() => {
    const now = new Date();
    const due = plans.filter((p) => p.isActive !== false && p.nextDueAt && new Date(p.nextDueAt) <= now).length;
    const byType = PM_TYPES.map((t) => ({
      ...t,
      count: plans.filter((p) => p.pmType === t.value).length,
    }));
    return { total: plans.length, due, active: plans.filter((p) => p.isActive !== false).length, byType };
  }, [plans]);

  const createMut = useMutation({
    mutationFn: () =>
      api.createMaintenancePlan(businessId, {
        name,
        pmType,
        preset,
        description: description || undefined,
      }),
    onSuccess: () => {
      setName("");
      setDescription("");
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ["maintenance-plans", businessId] });
      toast.success(isAr ? "تمت إضافة خطة PM" : "PM plan added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const runMut = useMutation({
    mutationFn: () => api.runDuePm(businessId),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["maintenance-plans", businessId] });
      qc.invalidateQueries({ queryKey: ["pm-history", businessId] });
      qc.invalidateQueries({ queryKey: ["work-orders", businessId] });
      const n = res.data?.generated ?? 0;
      const items = res.data?.items ?? [];
      if (n === 0) {
        toast.info(isAr ? "لا خطط PM مستحقة الآن" : "No PM plans due right now");
      } else {
        toast.success(
          isAr
            ? `تم إنشاء ${n} أمر عمل: ${items.map((i) => i.workOrder).join(", ")}`
            : `Created ${n} work orders: ${items.map((i) => i.workOrder).join(", ")}`
        );
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deactivateMut = useMutation({
    mutationFn: (planId: string) => api.deleteMaintenancePlan(businessId, planId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maintenance-plans", businessId] });
      toast.success(isAr ? "تم إيقاف الخطة" : "Plan deactivated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <ManpowerPageShell>
      <ManpowerHeroHeader
        icon={RotateCw}
        title={t(locale, "dashboard", "preventiveMaintenance")}
        subtitle={
          isAr
            ? "جدول زمني — النظام ينشئ أوامر الفحص/التزييت/الإ overhaul تلقائياً"
            : "Time & meter schedules — system auto-creates Inspection / Lubrication / Overhaul work orders"
        }
      />
      <CmmsDemoBanner businessId={businessId} isAr={isAr} hasData={plans.length > 0} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ManpowerStatCard label={isAr ? "خطط PM" : "PM plans"} value={isLoading ? "—" : stats.total} />
        <ManpowerStatCard
          label={isAr ? "مستحق الآن" : "Due now"}
          value={isLoading ? "—" : stats.due}
          accent={stats.due > 0 ? "border-amber-200 bg-amber-50/50" : undefined}
        />
        <ManpowerStatCard label={isAr ? "سجل التنفيذ" : "History records"} value={history.length} />
        <ManpowerStatCard label={isAr ? "نشطة" : "Active"} value={isLoading ? "—" : stats.active} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => runMut.mutate()} disabled={runMut.isPending}>
          <Play className="w-3.5 h-3.5 me-1" />
          {isAr ? "تشغيل PM المستحق → أوامر عمل" : "Run due PM → create work orders"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
          <Plus className="w-3.5 h-3.5 me-1" />
          {isAr ? "خطة جديدة" : "New plan"}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-[10px] border border-[#E8E8E8] bg-white p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <label className="text-[10px] font-semibold uppercase text-[#9a9a9a]">{isAr ? "اسم الخطة" : "Plan name"} *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 mt-1" placeholder={isAr ? "فحص شهري" : "Monthly inspection"} />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase text-[#9a9a9a]">{isAr ? "نوع PM" : "PM type"}</label>
            <select value={pmType} onChange={(e) => setPmType(e.target.value)} className="h-9 w-full rounded-md border px-2 text-sm bg-background mt-1">
              {PM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{isAr ? t.ar : t.en}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase text-[#9a9a9a]">{isAr ? "الجدول" : "Schedule"}</label>
            <select value={preset} onChange={(e) => setPreset(e.target.value)} className="h-9 w-full rounded-md border px-2 text-sm bg-background mt-1">
              {PRESETS.map((p) => (
                <option key={p.value} value={p.value}>{isAr ? p.ar : p.en}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-4 flex gap-2">
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={isAr ? "وصف (اختياري)" : "Description (optional)"} className="h-9 flex-1" />
            <Button size="sm" disabled={!name.trim() || createMut.isPending} onClick={() => createMut.mutate()}>
              {isAr ? "حفظ" : "Save"}
            </Button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-[10px] border border-[#E8E8E8] bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E8E8E8] bg-[#FAFAF8]">
            <p className="text-[13px] font-medium">{isAr ? "خطط PM (pm_plans)" : "PM plans (pm_plans)"}</p>
          </div>
          <div className="divide-y max-h-[420px] overflow-y-auto">
            {isLoading ? (
              <p className="p-6 text-center text-muted-foreground text-sm">{isAr ? "جاري التحميل..." : "Loading..."}</p>
            ) : plans.length === 0 ? (
              <p className="p-6 text-center text-muted-foreground text-sm">{isAr ? "لا خطط — حمّل CMMS demo" : "No plans — load CMMS demo"}</p>
            ) : (
              plans.map((p) => {
                const meta = pmTypeMeta(p.pmType);
                const Icon = meta.icon;
                const overdue = p.nextDueAt && new Date(p.nextDueAt) <= new Date();
                return (
                  <div key={p.id} className="p-4 space-y-2 text-sm">
                    <div className="flex flex-wrap justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={cn("inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full", meta.color)}>
                          <Icon className="w-3 h-3" />
                          {isAr ? meta.ar : meta.en}
                        </span>
                        {overdue && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3" />
                            {isAr ? "مستحق" : "Due"}
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-[#1a1a1a]">{p.name}</p>
                      <p className="text-[11px] text-[#888] mt-0.5">
                        {intervalLabel(p, isAr)} · {p.equipment?.assetTag ?? p.equipment?.name ?? p.functionalLocation?.code ?? "—"}
                      </p>
                      {p.schedules?.[0] && (
                        <p className="text-[10px] text-[#aaa] mt-0.5">
                          {isAr ? "pm_schedules:" : "pm_schedules:"} {p.schedules[0].status}
                          {p.schedules[0].dueAt && ` · ${formatDate(p.schedules[0].dueAt, locale)}`}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-xs shrink-0">
                      <p className={overdue ? "text-amber-600 font-medium" : "text-muted-foreground"}>
                        {isAr ? "الاستحقاق" : "Due"}: {p.nextDueAt ? formatDate(p.nextDueAt, locale) : "—"}
                      </p>
                      {p.isActive !== false && (
                        <button
                          type="button"
                          className="text-[10px] text-red-600 mt-1 hover:underline"
                          onClick={() => deactivateMut.mutate(p.id)}
                        >
                          {isAr ? "إيقاف" : "Deactivate"}
                        </button>
                      )}
                    </div>
                    </div>
                    <ReminderNotificationPanel
                      businessId={businessId}
                      itemKey={reminderItemKey("pm", p.id)}
                      isAr={isAr}
                      compact
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-[10px] border border-[#E8E8E8] bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E8E8E8] bg-[#FAFAF8] flex items-center gap-2">
            <History className="w-4 h-4 text-[#888]" />
            <p className="text-[13px] font-medium">{isAr ? "سجل PM (pm_history)" : "PM history (pm_history)"}</p>
          </div>
          <div className="divide-y max-h-[420px] overflow-y-auto">
            {history.length === 0 ? (
              <p className="p-6 text-center text-muted-foreground text-sm">
                {isAr ? "اضغط «تشغيل PM المستحق» لإنشاء أوامر عمل" : "Click «Run due PM» to generate work orders"}
              </p>
            ) : (
              history.map((h) => {
                const meta = pmTypeMeta(h.pmType);
                return (
                  <div key={h.id} className="p-4 text-sm">
                    <div className="flex justify-between gap-2">
                      <div>
                        <p className="font-medium text-[#1a1a1a]">{h.title}</p>
                        <p className="text-[11px] text-[#888] mt-0.5">
                          {h.workOrderNumber ?? "—"} · {isAr ? meta.ar : meta.en}
                        </p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 h-fit">{h.status}</span>
                    </div>
                    <p className="text-[10px] text-[#aaa] mt-1">
                      {formatDate(h.generatedAt, locale)}
                      {h.plan?.name && ` · ${h.plan.name}`}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="rounded-[10px] border border-dashed border-[#E8E8E8] bg-[#FAFAF8]/50 p-4">
        <p className="text-[11px] font-semibold uppercase text-[#9a9a9a] mb-2">{isAr ? "أنواع أوامر العمل التلقائية" : "Auto-generated work order types"}</p>
        <div className="grid sm:grid-cols-3 gap-2 text-[12px]">
          {PM_TYPES.map((t) => (
            <div key={t.value} className="flex items-center gap-2 px-3 py-2 rounded-md bg-white border border-[#E8E8E8]">
              <t.icon className="w-4 h-4 text-[#888]" />
              <span>{isAr ? `${t.ar} Work Order` : `${t.en} Work Order`}</span>
            </div>
          ))}
        </div>
      </div>
    </ManpowerPageShell>
  );
}
