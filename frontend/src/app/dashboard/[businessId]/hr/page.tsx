"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UserCheck,
  Award,
  GraduationCap,
  Wrench,
  CalendarCheck,
  Link2,
  Loader2,
  Upload,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api, HrEmployeeRow } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { ManpowerHeroHeader, ManpowerPageShell, ManpowerStatCard } from "@/components/dashboard/manpower-shell";

const HR_SYSTEMS = [
  { value: "SAP_SUCCESSFACTORS", en: "SAP SuccessFactors", ar: "SAP SuccessFactors" },
  { value: "ORACLE_HCM", en: "Oracle HCM", ar: "Oracle HCM" },
  { value: "WORKDAY", en: "Workday", ar: "Workday" },
  { value: "BAMBOOHR", en: "BambooHR", ar: "BambooHR" },
];

const PILLARS = [
  { key: "skills", icon: Wrench, en: "Skills", ar: "المهارات", color: "text-blue-700 bg-blue-50" },
  { key: "certs", icon: Award, en: "Certifications", ar: "الشهادات", color: "text-violet-700 bg-violet-50" },
  { key: "training", icon: GraduationCap, en: "Training", ar: "التدريب", color: "text-emerald-700 bg-emerald-50" },
  { key: "attendance", icon: CalendarCheck, en: "Attendance", ar: "الحضور", color: "text-amber-700 bg-amber-50" },
] as const;

export default function HrIntegrationPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();
  const [showConnect, setShowConnect] = useState(false);
  const [selected, setSelected] = useState<HrEmployeeRow | null>(null);
  const [hrForm, setHrForm] = useState({ hrSystem: "SAP_SUCCESSFACTORS", hrEndpoint: "", companyCode: "", isConnected: false });
  const [leaveForm, setLeaveForm] = useState({ workerProfileId: "", leaveType: "ANNUAL", startDate: "", endDate: "", notes: "" });

  const { data: summary, isLoading } = useQuery({
    queryKey: ["hr-integration", businessId],
    queryFn: async () => (await api.getHrIntegrationSummary(businessId)).data,
  });

  const { data: config } = useQuery({
    queryKey: ["hr-integration-config", businessId],
    queryFn: async () => (await api.getHrIntegrationConfig(businessId)).data,
  });

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: async () => (await api.getMe()).data });
  const isOwner = me?.businesses?.find((b) => b.id === businessId)?.memberRole === "OWNER";

  const { data: hrAdvanced } = useQuery({
    queryKey: ["hr-advanced", businessId],
    queryFn: async () => (await api.getHrAdvanced(businessId)).data,
  });

  const hrAdvancedSeedMut = useMutation({
    mutationFn: () => api.seedHrAdvanced(businessId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-advanced", businessId] });
      qc.invalidateQueries({ queryKey: ["hr-integration", businessId] });
      toast.success(isAr ? "تم تحميل HR Advanced" : "HR Advanced demo loaded");
    },
  });

  const leaveMut = useMutation({
    mutationFn: () =>
      api.postLeaveRequest(businessId, {
        workerProfileId: leaveForm.workerProfileId,
        leaveType: leaveForm.leaveType,
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        notes: leaveForm.notes || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-advanced", businessId] });
      setLeaveForm({ workerProfileId: "", leaveType: "ANNUAL", startDate: "", endDate: "", notes: "" });
      toast.success(isAr ? "تم تقديم طلب الإجازة" : "Leave request submitted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approveLeaveMut = useMutation({
    mutationFn: (requestId: string) => api.approveLeaveRequest(businessId, requestId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-advanced", businessId] });
      toast.success(isAr ? "تمت الموافقة" : "Leave approved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const seedMut = useMutation({
    mutationFn: () => api.seedHrIntegrationDemo(businessId),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["hr-integration", businessId] });
      toast.success(
        res.data?.skipped
          ? isAr ? "البيانات موجودة" : "HR data already loaded"
          : isAr
            ? `تم: ${res.data?.workers} موظف · ${res.data?.certifications} شهادة · ${res.data?.training} تدريب`
            : `Loaded ${res.data?.workers} workers · ${res.data?.certifications} certs · ${res.data?.training} training`
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const configMut = useMutation({
    mutationFn: () =>
      api.updateHrIntegrationConfig(businessId, {
        hrSystem: hrForm.hrSystem,
        hrEndpoint: hrForm.hrEndpoint || null,
        companyCode: hrForm.companyCode || null,
        isConnected: hrForm.isConnected,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-integration", businessId] });
      qc.invalidateQueries({ queryKey: ["hr-integration-config", businessId] });
      toast.success(isAr ? "تم حفظ إعدادات HR" : "HR settings saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const syncMut = useMutation({
    mutationFn: () => api.syncHrIntegration(businessId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-integration", businessId] });
      toast.success(isAr ? "تمت المزامنة مع HR" : "Synced to HR system");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const hasData = (summary?.stats.workers ?? 0) > 0;

  return (
    <ManpowerPageShell>
      <ManpowerHeroHeader
        icon={UserCheck}
        title={t(locale, "dashboard", "hrIntegration")}
        subtitle={
          isAr
            ? "ربط HR — مهارات · شهادات · تدريب · حضور"
            : "HR connect — Skills · Certifications · Training · Attendance"
        }
      />

      <div className="flex flex-wrap gap-2 justify-end">
        {!hasData && (
          <Button size="sm" variant="outline" onClick={() => seedMut.mutate()} disabled={seedMut.isPending}>
            {seedMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : isAr ? "Demo HR" : "Load HR demo"}
          </Button>
        )}
        {isOwner && (
          <Button size="sm" variant="outline" onClick={() => setShowConnect(!showConnect)}>
            <Link2 className="w-4 h-4 me-1" />
            {isAr ? "ربط HR" : "HR Connect"}
          </Button>
        )}
        {isOwner && summary?.hr.isConnected && (
          <Button size="sm" onClick={() => syncMut.mutate()} disabled={syncMut.isPending}>
            {syncMut.isPending ? <Loader2 className="w-4 h-4 animate-spin me-1" /> : <Upload className="w-4 h-4 me-1" />}
            {isAr ? "مزامنة" : "Sync to HR"}
          </Button>
        )}
      </div>

      {showConnect && isOwner && (
        <div className="rounded-[10px] border border-[#E8E8E8] bg-white p-4 space-y-3">
          <p className="text-sm font-semibold">{isAr ? "إعدادات HR / ERP" : "HR System Integration"}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-semibold uppercase text-[#9a9a9a]">{isAr ? "النظام" : "System"}</label>
              <select
                className="w-full mt-1 rounded-lg border border-[#E8E8E8] px-3 py-2 text-sm"
                value={hrForm.hrSystem || config?.hrSystem || "SAP_SUCCESSFACTORS"}
                onChange={(e) => setHrForm({ ...hrForm, hrSystem: e.target.value })}
              >
                {HR_SYSTEMS.map((s) => (
                  <option key={s.value} value={s.value}>{isAr ? s.ar : s.en}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase text-[#9a9a9a]">API Endpoint</label>
              <Input
                value={hrForm.hrEndpoint || config?.hrEndpoint || ""}
                onChange={(e) => setHrForm({ ...hrForm, hrEndpoint: e.target.value })}
                placeholder="https://hr-api.company.com/v1"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase text-[#9a9a9a]">{isAr ? "Company Code" : "Company Code"}</label>
              <Input
                value={hrForm.companyCode || config?.companyCode || ""}
                onChange={(e) => setHrForm({ ...hrForm, companyCode: e.target.value })}
                placeholder="1000"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={hrForm.isConnected || config?.isConnected || false}
              onChange={(e) => setHrForm({ ...hrForm, isConnected: e.target.checked })}
              className="rounded accent-[#1D9E75]"
            />
            {isAr ? "متصل بنظام HR" : "Connected to HR system"}
          </label>
          <Button size="sm" onClick={() => configMut.mutate()} loading={configMut.isPending}>
            {t(locale, "dashboard", "save")}
          </Button>
        </div>
      )}

      {summary?.hr.isConnected && (
        <div className="rounded-[10px] border border-[#1D9E75]/30 bg-[#EAF3DE]/40 p-3 text-xs flex flex-wrap justify-between gap-2">
          <span>
            {HR_SYSTEMS.find((s) => s.value === summary.hr.system)?.[isAr ? "ar" : "en"] ?? summary.hr.system}
            {summary.hr.companyCode && ` · ${summary.hr.companyCode}`}
          </span>
          {summary.hr.lastSyncAt && (
            <span className="text-[#5c5c5c]">
              {isAr ? "آخر مزامنة:" : "Last sync:"}{" "}
              {new Date(summary.hr.lastSyncAt).toLocaleString(isAr ? "ar-SA" : "en-SA")}
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {PILLARS.map((p) => {
          const Icon = p.icon;
          const stat =
            p.key === "skills"
              ? summary?.stats.totalSkills
              : p.key === "certs"
                ? summary?.stats.certifications
                : p.key === "training"
                  ? summary?.stats.trainingCompleted
                  : summary?.stats.attendanceThisMonth;
          return (
            <div key={p.key} className={cn("rounded-[10px] border border-[#E8E8E8] p-3", p.color.split(" ")[1])}>
              <Icon className={cn("w-4 h-4 mb-1", p.color.split(" ")[0])} />
              <p className="text-[10px] font-semibold uppercase text-[#9a9a9a]">{isAr ? p.ar : p.en}</p>
              <p className="text-xl font-bold">{isLoading ? "—" : stat ?? 0}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ManpowerStatCard label={isAr ? "الموظفون" : "Employees"} value={isLoading ? "—" : summary?.stats.workers ?? 0} />
        <ManpowerStatCard
          label={isAr ? "شهادات تنتهي" : "Expiring certs"}
          value={isLoading ? "—" : summary?.stats.expiringCerts ?? 0}
          accent={(summary?.stats.expiringCerts ?? 0) > 0 ? "border-amber-200 bg-amber-50/50" : undefined}
        />
        <ManpowerStatCard label={isAr ? "تدريب مستحق" : "Training due"} value={isLoading ? "—" : summary?.stats.trainingDue ?? 0} />
        <ManpowerStatCard
          label={isAr ? "نسبة الحضور" : "Present rate"}
          value={isLoading ? "—" : `${summary?.stats.presentRate ?? 0}%`}
        />
      </div>

      {(summary?.stats.expiringCerts ?? 0) > 0 && (
        <div className="rounded-[10px] border border-amber-200 bg-amber-50/40 p-3 flex items-center gap-2 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {isAr
            ? `${summary?.stats.expiringCerts} شهادة تنتهي خلال 60 يوماً — راجع HR`
            : `${summary?.stats.expiringCerts} certification(s) expiring within 60 days`}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-3">
        <div className="lg:col-span-1 rounded-[10px] border border-[#E8E8E8] bg-white divide-y max-h-[480px] overflow-y-auto">
          <div className="p-3 bg-[#FAFAF8] text-xs font-semibold sticky top-0">
            {isAr ? "الموظفون" : "Employees"} ({summary?.employees.length ?? 0})
          </div>
          {isLoading ? (
            <p className="p-6 text-center text-muted-foreground text-sm">{isAr ? "جاري التحميل..." : "Loading..."}</p>
          ) : (summary?.employees.length ?? 0) === 0 ? (
            <p className="p-6 text-center text-muted-foreground text-sm">{isAr ? "لا موظفين — Demo HR" : "No employees — load HR demo"}</p>
          ) : (
            summary?.employees.map((emp) => (
              <button
                key={emp.id}
                type="button"
                onClick={() => setSelected(emp)}
                className={cn(
                  "w-full text-left p-3 hover:bg-[#FAFAF8] transition",
                  selected?.id === emp.id && "bg-[#EAF3DE]/50 border-s-2 border-[#1D9E75]"
                )}
              >
                <p className="font-medium text-sm">{emp.name}</p>
                <p className="text-[10px] text-muted-foreground">{emp.category ?? "—"}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {emp.skills.slice(0, 2).map((s) => (
                    <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">{s}</span>
                  ))}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="lg:col-span-2 rounded-[10px] border border-[#E8E8E8] bg-white">
          {!selected ? (
            <p className="p-12 text-center text-muted-foreground text-sm">
              {isAr ? "اختر موظفاً لعرض Skills · Certifications · Training · Attendance" : "Select an employee to view Skills · Certifications · Training · Attendance"}
            </p>
          ) : (
            <div className="divide-y">
              <div className="p-4">
                <p className="font-semibold">{selected.name}</p>
                <p className="text-xs text-muted-foreground">{selected.category} · {selected.status}</p>
              </div>

              <Section title={isAr ? "المهارات" : "Skills"} icon={Wrench}>
                {selected.skills.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{isAr ? "لا مهارات" : "No skills"}</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {selected.skills.map((s) => (
                      <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">{s}</span>
                    ))}
                  </div>
                )}
              </Section>

              <Section title={isAr ? "الشهادات" : "Certifications"} icon={Award}>
                {selected.certifications.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{isAr ? "لا شهادات" : "No certifications"}</p>
                ) : (
                  <div className="space-y-2">
                    {selected.certifications.map((c) => (
                      <div key={c.id} className="flex justify-between gap-2 text-xs">
                        <div>
                          <p className="font-medium">{c.name}</p>
                          <p className="text-muted-foreground">{c.issuer}{c.certNumber && ` · ${c.certNumber}`}</p>
                        </div>
                        <span className={cn(
                          "text-[10px] h-fit px-2 py-0.5 rounded-full font-medium",
                          c.status === "EXPIRED" ? "bg-red-50 text-red-700" :
                          c.status === "EXPIRING" ? "bg-amber-50 text-amber-700" :
                          "bg-green-50 text-green-700"
                        )}>
                          {c.expiresAt ? formatDate(c.expiresAt, locale) : c.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              <Section title={isAr ? "التدريب" : "Training"} icon={GraduationCap}>
                {selected.training.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{isAr ? "لا تدريب" : "No training"}</p>
                ) : (
                  <div className="space-y-2">
                    {selected.training.map((tr) => (
                      <div key={tr.id} className="flex justify-between gap-2 text-xs">
                        <div>
                          <p className="font-medium">{tr.title}</p>
                          <p className="text-muted-foreground">{tr.trainingType}{tr.hours ? ` · ${tr.hours}h` : ""}</p>
                        </div>
                        <span className={cn(
                          "text-[10px] h-fit px-2 py-0.5 rounded-full font-medium",
                          tr.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" : "bg-violet-50 text-violet-700"
                        )}>
                          {tr.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              <Section title={isAr ? "الحضور (هذا الشهر)" : "Attendance (this month)"} icon={CalendarCheck}>
                <div className="flex gap-4 text-sm">
                  <span className="text-emerald-700 font-semibold">{isAr ? "حاضر:" : "Present:"} {selected.attendance.present}</span>
                  <span className="text-red-600 font-semibold">{isAr ? "غائب:" : "Absent:"} {selected.attendance.absent}</span>
                </div>
              </Section>
            </div>
          )}
        </div>
      </div>

      {hrAdvanced && (
        <div className="rounded-[10px] border bg-white p-4 space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm font-semibold">{isAr ? "HR Advanced — إجازات · كفاءات · تعاقب" : "HR Advanced — Leave · Competency · Succession"}</p>
            <Button size="sm" variant="outline" onClick={() => hrAdvancedSeedMut.mutate()} disabled={hrAdvancedSeedMut.isPending}>
              {isAr ? "Demo" : "Load demo"}
            </Button>
          </div>
          {hrAdvanced.alerts.length > 0 && (
            <div className="space-y-1">
              {hrAdvanced.alerts.slice(0, 5).map((a, i) => (
                <p key={i} className="text-xs bg-amber-50 text-amber-800 px-2 py-1 rounded">{a.message}</p>
              ))}
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="space-y-3 border rounded-lg p-3">
              <p className="text-xs font-semibold">{isAr ? "رصيد الإجازات" : "Leave balances"}</p>
              {hrAdvanced.leave.balances?.length ? (
                <div className="max-h-40 overflow-y-auto space-y-1 text-xs">
                  {hrAdvanced.leave.balances.slice(0, 20).map((b, i) => (
                    <div key={i} className="flex justify-between gap-2 border-b pb-1">
                      <span className="font-mono text-[10px]">{b.leaveType}</span>
                      <span className="tabular-nums">{b.balanceDays - b.usedDays}d / {b.balanceDays}d</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{isAr ? "حمّل Demo" : "Load demo for balances"}</p>
              )}
              {hrAdvanced.leave.onLeaveToday?.length > 0 && (
                <p className="text-xs text-emerald-700">{isAr ? "في إجازة اليوم:" : "On leave today:"} {hrAdvanced.leave.onLeaveToday.map((r) => r.workerProfile.name).join(", ")}</p>
              )}
            </div>

            <div className="space-y-3 border rounded-lg p-3">
              <p className="text-xs font-semibold">{isAr ? "طلب إجازة جديد" : "New leave request"}</p>
              <select className="w-full rounded border px-2 py-1.5 text-xs" value={leaveForm.workerProfileId} onChange={(e) => setLeaveForm({ ...leaveForm, workerProfileId: e.target.value })}>
                <option value="">{isAr ? "اختر موظف" : "Select worker"}</option>
                {(summary?.employees ?? []).map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
              <select className="w-full rounded border px-2 py-1.5 text-xs" value={leaveForm.leaveType} onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}>
                <option value="ANNUAL">{isAr ? "سنوية" : "Annual"}</option>
                <option value="SICK">{isAr ? "مرضية" : "Sick"}</option>
                <option value="UNPAID">{isAr ? "بدون راتب" : "Unpaid"}</option>
              </select>
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" className="h-8 text-xs" value={leaveForm.startDate} onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })} />
                <Input type="date" className="h-8 text-xs" value={leaveForm.endDate} onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })} />
              </div>
              <Input className="h-8 text-xs" placeholder={isAr ? "ملاحظات" : "Notes"} value={leaveForm.notes} onChange={(e) => setLeaveForm({ ...leaveForm, notes: e.target.value })} />
              <Button size="sm" className="w-full h-8" disabled={!leaveForm.workerProfileId || !leaveForm.startDate || !leaveForm.endDate || leaveMut.isPending} onClick={() => leaveMut.mutate()}>
                {isAr ? "تقديم الطلب" : "Submit request"}
              </Button>
            </div>
          </div>

          {hrAdvanced.leave.pendingRequests?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold">{isAr ? "طلبات معلقة — موافقة" : "Pending approvals"}</p>
              {hrAdvanced.leave.pendingRequests.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-xs border rounded p-2">
                  <span>{r.workerProfile.name} · {r.leaveType} · {r.days}d ({formatDate(r.startDate, locale)} → {formatDate(r.endDate, locale)})</span>
                  <Button size="sm" variant="outline" className="h-7 text-[10px]" disabled={approveLeaveMut.isPending} onClick={() => approveLeaveMut.mutate(r.id)}>
                    {isAr ? "موافقة" : "Approve"}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {hrAdvanced.competencyMatrix.skills.length > 0 && (
            <div className="overflow-x-auto">
              <p className="text-xs font-semibold mb-2">{isAr ? "مصفوفة الكفاءات (Grade A/B/C)" : "Competency Matrix (Grade A/B/C)"}</p>
              <table className="w-full text-xs border">
                <thead><tr className="bg-muted"><th className="p-2 text-left">{isAr ? "العامل" : "Worker"}</th>{hrAdvanced.competencyMatrix.skills.map((s) => <th key={s} className="p-2">{s}</th>)}</tr></thead>
                <tbody>
                  {hrAdvanced.competencyMatrix.workers.map((w) => (
                    <tr key={w.id} className="border-t"><td className="p-2 font-medium">{w.name}</td>{hrAdvanced.competencyMatrix.skills.map((s) => <td key={s} className="p-2 text-center">{w.grades[s] ?? "—"}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {hrAdvanced.successions.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-2">{isAr ? "خطط التعاقب" : "Succession Plans"}</p>
              {(hrAdvanced.successions as Array<{ keyWorker: { name: string }; replacementWorker: { name: string }; role?: string }>).map((s, i) => (
                <p key={i} className="text-xs">{s.keyWorker.name} → {s.replacementWorker.name}{s.role ? ` (${s.role})` : ""}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </ManpowerPageShell>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="p-4">
      <p className="text-xs font-semibold flex items-center gap-1.5 mb-2">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        {title}
      </p>
      {children}
    </div>
  );
}
