"use client";

import Link from "next/link";
import { useMemo, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, BarChart3, Download, CheckCheck, XCircle, Settings, LayoutDashboard, Upload, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api, type Timesheet } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { ManpowerHeroHeader, ManpowerPageShell, ManpowerStatCard } from "@/components/dashboard/manpower-shell";

const TS_STATUS: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-600",
  PENDING_ADMIN: "bg-orange-500/10 text-orange-600",
  PENDING_PAYROLL: "bg-purple-500/10 text-purple-600",
  APPROVED: "bg-green-500/10 text-green-600",
  REJECTED: "bg-red-500/10 text-red-600",
  BILLED: "bg-blue-500/10 text-blue-600",
};

const PENDING_STATUSES = ["PENDING", "PENDING_ADMIN", "PENDING_PAYROLL"];

function statusLabel(status: string, isAr: boolean) {
  const map: Record<string, { en: string; ar: string }> = {
    PENDING: { en: "Site Manager", ar: "مشرف الموقع" },
    PENDING_ADMIN: { en: "Admin Review", ar: "مراجعة الإدارة" },
    PENDING_PAYROLL: { en: "Payroll", ar: "الرواتب" },
    APPROVED: { en: "Approved", ar: "معتمد" },
    REJECTED: { en: "Rejected", ar: "مرفوض" },
    BILLED: { en: "Billed", ar: "مفوتر" },
  };
  const l = map[status] || { en: status, ar: status };
  return isAr ? l.ar : l.en;
}

export default function TimesheetsPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();
  const [view, setView] = useState<"all" | "pending">("pending");
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rejectId, setRejectId] = useState<string | "bulk" | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [form, setForm] = useState({
    projectId: "",
    placementId: "",
    workerProfileId: "",
    clientCompanyId: "",
    workDate: new Date().toISOString().slice(0, 10),
    regularHours: "8",
    overtimeHours: "0",
    notes: "",
  });
  const [exportMonth, setExportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: timesheets = [], isLoading } = useQuery({
    queryKey: ["manpower-timesheets", businessId],
    queryFn: async () => (await api.getManpowerTimesheets(businessId)).data ?? [],
    refetchInterval: 30000,
  });

  const { data: pendingQueue = [] } = useQuery({
    queryKey: ["manpower-pending-timesheets", businessId],
    queryFn: async () => (await api.getPendingTimesheets(businessId)).data ?? [],
    refetchInterval: 15000,
  });

  const { data: placements = [] } = useQuery({
    queryKey: ["manpower-placements", businessId],
    queryFn: async () => (await api.getManpowerPlacements(businessId)).data ?? [],
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["manpower-projects", businessId],
    queryFn: async () => (await api.getManpowerProjects(businessId)).data ?? [],
  });

  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.getMe()).data,
  });
  const memberRole = meData?.businesses?.find((b) => b.id === businessId)?.memberRole;
  const isOwner = memberRole === "OWNER";
  const canApprove = memberRole === "OWNER" || memberRole === "MANAGER";
  const isEntryOnly = memberRole === "OFFICE_STAFF" || memberRole === "FIELD_WORKER";

  const list = view === "pending" ? pendingQueue : timesheets;

  const createMutation = useMutation({
    mutationFn: () =>
      api.createManpowerTimesheet(businessId, {
        projectId: form.projectId || undefined,
        placementId: form.placementId || undefined,
        workerProfileId: form.workerProfileId,
        clientCompanyId: form.clientCompanyId || undefined,
        workDate: form.workDate,
        regularHours: Number(form.regularHours) || 0,
        overtimeHours: Number(form.overtimeHours) || 0,
        notes: form.notes || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manpower-timesheets", businessId] });
      qc.invalidateQueries({ queryKey: ["manpower-pending-timesheets", businessId] });
      toast.success(isAr ? "تم الإرسال للاعتماد" : "Submitted for approval");
      setShowForm(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const actionMutation = useMutation({
    mutationFn: (args: { id: string; action: "approve" | "reject" | "bill"; rejectReason?: string }) =>
      api.timesheetAction(businessId, args.id, { action: args.action, rejectReason: args.rejectReason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manpower-timesheets", businessId] });
      qc.invalidateQueries({ queryKey: ["manpower-pending-timesheets", businessId] });
      toast.success(isAr ? "تم التحديث" : "Updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const bulkMutation = useMutation({
    mutationFn: (args: { action: "approve" | "reject"; rejectReason?: string }) =>
      api.bulkTimesheetAction(businessId, {
        action: args.action,
        ids: Array.from(selected),
        rejectReason: args.rejectReason,
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["manpower-timesheets", businessId] });
      qc.invalidateQueries({ queryKey: ["manpower-pending-timesheets", businessId] });
      setSelected(new Set());
      toast.success(isAr ? `تم ${res.data?.approved ?? 0} اعتماد` : `${res.data?.approved ?? 0} approved`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const pendingHours = useMemo(
    () => timesheets.filter((ts) => PENDING_STATUSES.includes(ts.status || "")).reduce((s, ts) => s + ts.hoursWorked, 0),
    [timesheets]
  );

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllPending = () => {
    setSelected(new Set(pendingQueue.map((t) => t.id)));
  };

  const submitReject = () => {
    if (!rejectReason.trim()) {
      toast.error(isAr ? "سبب الرفض مطلوب" : "Reject reason required");
      return;
    }
    if (rejectId === "bulk") {
      bulkMutation.mutate({ action: "reject", rejectReason: rejectReason.trim() });
    } else if (rejectId) {
      actionMutation.mutate({ id: rejectId, action: "reject", rejectReason: rejectReason.trim() });
    }
    setRejectId(null);
    setRejectReason("");
  };

  const renderRow = (ts: Timesheet) => {
    const isPending = PENDING_STATUSES.includes(ts.status || "");
    return (
      <Card key={ts.id} className={cn(selected.has(ts.id) && "ring-2 ring-primary/40")}>
        <CardContent className="p-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            {view === "pending" && canApprove && (
              <input
                type="checkbox"
                className="mt-1"
                checked={selected.has(ts.id)}
                onChange={() => toggleSelect(ts.id)}
              />
            )}
            <div>
              <p className="font-medium text-sm">{formatDate(ts.workDate || ts.date || "")}</p>
              <p className="text-xs text-muted-foreground">
                {ts.workerProfile?.name}
                {ts.project?.name && ` · ${ts.project.name}`}
              </p>
              {ts.rejectReason && (
                <p className="text-[10px] text-red-500 mt-0.5">{isAr ? "سبب:" : "Reason:"} {ts.rejectReason}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-sm font-bold">{ts.hoursWorked}h</p>
            {(ts.overtimeHours ?? 0) > 0 && (
              <span className="text-[10px] text-orange-600">OT {ts.overtimeHours}h</span>
            )}
            <span className={cn("text-[10px] px-2 py-0.5 rounded-full", TS_STATUS[ts.status || "PENDING"])}>
              {statusLabel(ts.status || "PENDING", isAr)}
            </span>
            {canApprove && isPending && (
              <>
                <Button size="sm" className="h-7 text-[10px]" onClick={() => actionMutation.mutate({ id: ts.id, action: "approve" })}>
                  {isAr ? "اعتماد" : "Approve"}
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-[10px] text-red-600" onClick={() => setRejectId(ts.id)}>
                  {isAr ? "رفض" : "Reject"}
                </Button>
              </>
            )}
            {canApprove && ts.status === "APPROVED" && (
              <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => actionMutation.mutate({ id: ts.id, action: "bill" })}>
                {isAr ? "فوترة" : "Bill"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <ManpowerPageShell>
      <ManpowerHeroHeader
        title={t(locale, "dashboard", "timesheets")}
        subtitle={isAr ? "Office → Site Manager → Admin → Payroll" : "Office → Site Manager → Admin → Payroll"}
        icon={BarChart3}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/${businessId}/manpower-live`}>
                <LayoutDashboard className="w-3.5 h-3.5 me-1" />
                {isAr ? "لوحة مباشرة" : "Live Dashboard"}
              </Link>
            </Button>
            {isOwner && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/${businessId}/manpower-policy`}>
                  <Settings className="w-3.5 h-3.5 me-1" />
                  {isAr ? "السياسات" : "Policies"}
                </Link>
              </Button>
            )}
            {!isEntryOnly && (
              <Button size="sm" onClick={() => setShowForm(!showForm)}>
                <Plus className="w-3.5 h-3.5 me-1" />
                {isAr ? "سجل جديد" : "New Entry"}
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ManpowerStatCard label={isAr ? "بانتظار الاعتماد" : "Pending queue"} value={pendingQueue.length} />
        <ManpowerStatCard label={isAr ? "ساعات معلقة" : "Pending hours"} value={`${pendingHours}h`} />
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Button size="sm" variant={view === "pending" ? "default" : "outline"} onClick={() => setView("pending")}>
          {isAr ? "قائمة الانتظار" : "Pending Queue"} ({pendingQueue.length})
        </Button>
        <Button size="sm" variant={view === "all" ? "default" : "outline"} onClick={() => setView("all")}>
          {isAr ? "الكل" : "All Entries"}
        </Button>
        {view === "pending" && canApprove && pendingQueue.length > 0 && (
          <>
            <Button size="sm" variant="outline" onClick={selectAllPending}>{isAr ? "تحديد الكل" : "Select all"}</Button>
            <Button size="sm" onClick={() => bulkMutation.mutate({ action: "approve" })} disabled={selected.size === 0} loading={bulkMutation.isPending}>
              <CheckCheck className="w-3.5 h-3.5 me-1" />
              {isAr ? "اعتماد المحدد" : "Approve selected"} ({selected.size})
            </Button>
            <Button size="sm" variant="outline" className="text-red-600" onClick={() => setRejectId("bulk")} disabled={selected.size === 0}>
              <XCircle className="w-3.5 h-3.5 me-1" />
              {isAr ? "رفض" : "Reject"}
            </Button>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input type="month" className="w-40 h-8 text-xs" value={exportMonth} onChange={(e) => setExportMonth(e.target.value)} />
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={async () => {
          setExporting(true);
          try {
            await api.downloadManpowerTimesheetExport(businessId, { month: exportMonth, period: "monthly" });
            toast.success(isAr ? "تم التحميل" : "Downloaded");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed");
          } finally {
            setExporting(false);
          }
        }} loading={exporting}>
          <Download className="w-3.5 h-3.5 me-1" />
          Excel
        </Button>
        {canApprove && (
          <>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={async () => {
              try {
                await api.downloadTimesheetImportTemplate(businessId);
                toast.success(isAr ? "تم تحميل القالب" : "Template downloaded");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed");
              }
            }}>
              <FileSpreadsheet className="w-3.5 h-3.5 me-1" />
              {isAr ? "قالب استيراد" : "Import Template"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setImporting(true);
                try {
                  const res = await api.uploadTimesheetImport(businessId, file);
                  toast.success(
                    isAr
                      ? `تم استيراد ${res.data?.imported} — تخطي ${res.data?.skipped}`
                      : `Imported ${res.data?.imported}, skipped ${res.data?.skipped}`
                  );
                  qc.invalidateQueries({ queryKey: ["manpower-timesheets", businessId] });
                  qc.invalidateQueries({ queryKey: ["manpower-pending-timesheets", businessId] });
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Import failed");
                } finally {
                  setImporting(false);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }
              }}
            />
            <Button variant="outline" size="sm" className="h-8 text-xs" loading={importing} onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-3.5 h-3.5 me-1" />
              {isAr ? "رفع Excel" : "Bulk Upload"}
            </Button>
          </>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">{isAr ? "تسجيل ساعات" : "Log Hours"}</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-3">
            <select className="rounded-lg border px-3 py-2 text-sm" value={form.projectId} onChange={(e) => {
              const p = projects.find((x) => x.id === e.target.value);
              setForm({ ...form, projectId: e.target.value, clientCompanyId: p?.clientCompanyId || "", placementId: "", workerProfileId: "" });
            }}>
              <option value="">{isAr ? "المشروع" : "Project"}</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select className="rounded-lg border px-3 py-2 text-sm" value={form.placementId} onChange={(e) => {
              const p = placements.find((x) => x.id === e.target.value);
              setForm({ ...form, placementId: e.target.value, workerProfileId: p?.workerProfileId || "", clientCompanyId: p?.clientCompanyId || form.clientCompanyId, regularHours: String(p?.workerProfile?.defaultHours ?? 8) });
            }}>
              <option value="">{isAr ? "العامل" : "Worker"}</option>
              {(form.projectId ? placements.filter((p) => p.projectId === form.projectId) : placements).map((p) => (
                <option key={p.id} value={p.id}>{p.workerProfile?.name}</option>
              ))}
            </select>
            <Input type="date" value={form.workDate} onChange={(e) => setForm({ ...form, workDate: e.target.value })} />
            <Input type="number" placeholder="Regular h" value={form.regularHours} onChange={(e) => setForm({ ...form, regularHours: e.target.value })} />
            <Input type="number" placeholder="OT h" value={form.overtimeHours} onChange={(e) => setForm({ ...form, overtimeHours: e.target.value })} />
            <Input placeholder={isAr ? "ملاحظات" : "Notes"} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <div className="sm:col-span-2 flex gap-2">
              <Button size="sm" onClick={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!form.placementId && !form.workerProfileId}>
                {isAr ? "إرسال للاعتماد" : "Submit for approval"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>{t(locale, "dashboard", "cancel")}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {rejectId && (
        <Card className="border-red-500/30">
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-medium">{isAr ? "سبب الرفض" : "Reject reason"} *</p>
            <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder={isAr ? "اكتب السبب..." : "Enter reason..."} />
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={submitReject}>{isAr ? "تأكيد الرفض" : "Confirm reject"}</Button>
              <Button size="sm" variant="outline" onClick={() => { setRejectId(null); setRejectReason(""); }}>{t(locale, "dashboard", "cancel")}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : list.length === 0 ? (
        <Card className="p-8 text-center">
          <BarChart3 className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">{t(locale, "dashboard", "noData")}</p>
        </Card>
      ) : (
        <div className="space-y-2">{list.map(renderRow)}</div>
      )}
    </ManpowerPageShell>
  );
}
