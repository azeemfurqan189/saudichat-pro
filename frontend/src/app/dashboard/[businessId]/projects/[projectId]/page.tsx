"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  MapPin,
  Users,
  BarChart3,
  UserCog,
  Phone,
  Mail,
  Plus,
  Download,
  Search,
  Check,
  X,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api, type TimesheetStatus, type Placement, type WorkerAttendanceStatus } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { CategoryPicker, ProjectCategoryNav } from "@/components/dashboard/category-picker";
import { categoryColor } from "@/lib/manpower-categories";
import { hasProjectPermission } from "@/lib/project-permissions";
import { ProjectWorkerMenu, MonthlyTimesheetPanel } from "@/components/dashboard/project-worker-menu";
import { ManpowerHeroHeader, ManpowerPageShell } from "@/components/dashboard/manpower-shell";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-500/10 text-green-600",
  DRAFT: "bg-muted text-muted-foreground",
  ON_HOLD: "bg-amber-500/10 text-amber-600",
  COMPLETED: "bg-blue-500/10 text-blue-600",
};

const TS_STATUS: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-600",
  PENDING_ADMIN: "bg-orange-500/10 text-orange-600",
  PENDING_PAYROLL: "bg-purple-500/10 text-purple-600",
  APPROVED: "bg-green-500/10 text-green-600",
  REJECTED: "bg-red-500/10 text-red-600",
  BILLED: "bg-blue-500/10 text-blue-600",
};

type Tab = "overview" | "workers" | "timesheets";

export default function ProjectDetailPage() {
  const { businessId, projectId } = useParams() as { businessId: string; projectId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");
  const [showAddWorker, setShowAddWorker] = useState(false);
  const [workerForm, setWorkerForm] = useState({
    name: "",
    phone: "",
    iqamaNumber: "",
    password: "",
    category: "",
    defaultHours: "8",
    hourlyRate: "",
    nationality: "",
  });
  const [timesheetWorkerId, setTimesheetWorkerId] = useState<string | null>(null);
  const [timesheetPlacementId, setTimesheetPlacementId] = useState<string | undefined>();
  const [sheetMode, setSheetMode] = useState<"daily" | "monthly" | null>(null);
  const [tsForm, setTsForm] = useState({
    workDate: new Date().toISOString().slice(0, 10),
    regularHours: "8",
    overtimeHours: "0",
    notes: "",
  });
  const [exportMonth, setExportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [exporting, setExporting] = useState(false);
  const [downloadingWorkerId, setDownloadingWorkerId] = useState<string | null>(null);
  const [projectCategoryFilter, setProjectCategoryFilter] = useState<string | null>(null);
  const [workerSearch, setWorkerSearch] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [savingAttendanceId, setSavingAttendanceId] = useState<string | null>(null);

  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.getMe()).data,
  });
  const memberRole = meData?.businesses?.find((b) => b.id === businessId)?.memberRole;
  const isOwner = memberRole === "OWNER";

  const { data: project, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["manpower-project", businessId, projectId],
    queryFn: async () => (await api.getManpowerProject(businessId, projectId)).data,
  });

  const projectPerms = project?.myPermissions;
  const canPerm = (key: string) => isOwner || hasProjectPermission(projectPerms, key);

  const { data: attendanceRows = [] } = useQuery({
    queryKey: ["project-attendance", businessId, projectId, attendanceDate],
    queryFn: async () => (await api.getProjectWorkerAttendance(businessId, projectId, attendanceDate)).data ?? [],
    enabled: tab === "workers" && !!projectId,
  });

  const attendanceMap = useMemo(() => {
    const map = new Map<string, WorkerAttendanceStatus>();
    for (const row of attendanceRows) {
      map.set(row.workerProfileId, row.status);
    }
    return map;
  }, [attendanceRows]);

  const monthFilteredTimesheets = useMemo(() => {
    return (project?.timesheets ?? []).filter((ts) => {
      const d = (ts.workDate || ts.date || "").slice(0, 7);
      return d === exportMonth;
    });
  }, [project?.timesheets, exportMonth]);

  const workersInMonth = useMemo(() => {
    const map = new Map<string, { id: string; name: string; entryCount: number; totalHours: number }>();
    for (const ts of monthFilteredTimesheets) {
      const id = ts.workerProfileId || ts.workerProfile?.id;
      if (!id) continue;
      const name = ts.workerProfile?.name || (isAr ? "عامل" : "Worker");
      const prev = map.get(id) || { id, name, entryCount: 0, totalHours: 0 };
      prev.entryCount += 1;
      prev.totalHours += Number(ts.hoursWorked) || 0;
      map.set(id, prev);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [monthFilteredTimesheets, isAr]);

  const attendanceMutation = useMutation({
    mutationFn: ({ workerProfileId, status }: { workerProfileId: string; status: WorkerAttendanceStatus }) =>
      api.setProjectWorkerAttendance(businessId, projectId, {
        workerProfileId,
        workDate: attendanceDate,
        status,
      }),
    onMutate: ({ workerProfileId }) => setSavingAttendanceId(workerProfileId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-attendance", businessId, projectId, attendanceDate] });
    },
    onError: (err: Error) => toast.error(err.message),
    onSettled: () => setSavingAttendanceId(null),
  });

  const syncSchemaMutation = useMutation({
    mutationFn: () => api.syncManpowerSchema(businessId),
    onSuccess: () => {
      refetch();
      toast.success(isAr ? "تم تحديث قاعدة البيانات" : "Database updated — retrying...");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const approveMutation = useMutation({
    mutationFn: (args: { id: string; status: TimesheetStatus }) =>
      api.updateManpowerTimesheetStatus(businessId, args.id, args.status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manpower-project", businessId, projectId] });
      toast.success(isAr ? "تم تحديث السجل" : "Timesheet updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const { data: categoryData } = useQuery({
    queryKey: ["worker-categories", businessId],
    queryFn: async () => (await api.getWorkerCategories(businessId)).data,
  });
  const customCategories = categoryData?.custom ?? [];

  const addWorkerMutation = useMutation({
    mutationFn: () =>
      api.addProjectWorker(businessId, projectId, {
        name: workerForm.name,
        phone: workerForm.phone || undefined,
        iqamaNumber: workerForm.iqamaNumber || undefined,
        password: workerForm.password || undefined,
        category: workerForm.category || undefined,
        defaultHours: Number(workerForm.defaultHours) || 8,
        hourlyRate: workerForm.hourlyRate ? Number(workerForm.hourlyRate) : undefined,
        nationality: workerForm.nationality || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manpower-project", businessId, projectId] });
      qc.invalidateQueries({ queryKey: ["manpower-workers", businessId] });
      qc.invalidateQueries({ queryKey: ["worker-categories", businessId] });
      qc.invalidateQueries({ queryKey: ["manpower-analytics", businessId] });
      toast.success(isAr ? "تمت إضافة العامل للمشروع" : "Worker added to project");
      setWorkerForm({ name: "", phone: "", iqamaNumber: "", password: "", category: "", defaultHours: "8", hourlyRate: "", nationality: "" });
      setShowAddWorker(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const timesheetMutation = useMutation({
    mutationFn: (args: { workerProfileId: string; placementId?: string; regularHours: number; overtimeHours: number }) =>
      api.createManpowerTimesheet(businessId, {
        workerProfileId: args.workerProfileId,
        projectId,
        placementId: args.placementId,
        workDate: tsForm.workDate,
        regularHours: args.regularHours,
        overtimeHours: args.overtimeHours,
        notes: tsForm.notes || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manpower-project", businessId, projectId] });
      qc.invalidateQueries({ queryKey: ["manpower-timesheets", businessId] });
      toast.success(isAr ? "تم تسجيل الساعات" : "Timesheet saved");
      setTimesheetWorkerId(null);
      setTimesheetPlacementId(undefined);
      setSheetMode(null);
      setTsForm({ workDate: new Date().toISOString().slice(0, 10), regularHours: "8", overtimeHours: "0", notes: "" });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openTimesheetForWorker = (workerId: string, defaultHours?: number, placementId?: string, mode: "daily" | "monthly" = "daily") => {
    setTimesheetWorkerId(workerId);
    setTimesheetPlacementId(placementId);
    setSheetMode(mode);
    if (mode === "daily") {
      setTsForm({
        workDate: new Date().toISOString().slice(0, 10),
        regularHours: String(defaultHours ?? 8),
        overtimeHours: "0",
        notes: "",
      });
    }
  };

  const allProjectPlacements = useMemo(() => {
    const list = project?.placements ?? [];
    return [...list].sort((a, b) => {
      if (a.status === "ACTIVE" && b.status !== "ACTIVE") return -1;
      if (b.status === "ACTIVE" && a.status !== "ACTIVE") return 1;
      return (a.workerProfile?.name || "").localeCompare(b.workerProfile?.name || "");
    });
  }, [project?.placements]);

  const projectCategories = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of allProjectPlacements) {
      const cat = p.workerProfile?.category?.trim() || (isAr ? "عام / Labour" : "General / Labour");
      map.set(cat, (map.get(cat) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }, [allProjectPlacements, isAr]);

  const filteredPlacements = useMemo(() => {
    let list = allProjectPlacements;
    if (projectCategoryFilter) {
      list = list.filter((p) => {
        const cat = p.workerProfile?.category?.trim() || (isAr ? "عام / Labour" : "General / Labour");
        return cat === projectCategoryFilter;
      });
    }
    const q = workerSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) => {
      const w = p.workerProfile;
      const cat = w?.category?.trim() || (isAr ? "عام / Labour" : "General / Labour");
      return (
        w?.name?.toLowerCase().includes(q) ||
        w?.iqamaNumber?.toLowerCase().includes(q) ||
        w?.phone?.toLowerCase().includes(q) ||
        cat.toLowerCase().includes(q)
      );
    });
  }, [allProjectPlacements, projectCategoryFilter, workerSearch, isAr]);

  const attendanceSummary = useMemo(() => {
    let present = 0;
    let absent = 0;
    for (const p of filteredPlacements) {
      const st = attendanceMap.get(p.workerProfileId);
      if (st === "PRESENT") present += 1;
      else if (st === "ABSENT") absent += 1;
    }
    return { present, absent, unmarked: filteredPlacements.length - present - absent };
  }, [filteredPlacements, attendanceMap]);

  const groupedPlacements = useMemo(() => {
    const groups = new Map<string, Placement[]>();
    for (const p of filteredPlacements) {
      const cat = p.workerProfile?.category?.trim() || (isAr ? "عام / Labour" : "General / Labour");
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(p);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredPlacements, isAr]);

  const todayLabel = useMemo(() => {
    return new Date(tsForm.workDate).toLocaleDateString(isAr ? "ar-SA" : "en-GB", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [tsForm.workDate, isAr]);

  const renderTimesheetForm = (workerName: string) => (
    <div className="p-4 rounded-xl border-2 border-primary/30 bg-primary/5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-primary font-semibold">
            {isAr ? "سجل اليوم" : "Daily Timesheet"}
          </p>
          <p className="font-semibold text-lg">{workerName}</p>
        </div>
        <div className="text-end">
          <p className="text-xs text-muted-foreground">{isAr ? "تاريخ العمل" : "Work date"}</p>
          <p className="font-medium text-sm">{todayLabel}</p>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            {isAr ? "اختر التاريخ" : "Select date"}
          </label>
          <Input type="date" value={tsForm.workDate} onChange={(e) => setTsForm({ ...tsForm, workDate: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            {isAr ? "ساعات أساسية" : "Regular hours"}
          </label>
          <div className="flex gap-1 flex-wrap">
            {["8", "10", "12"].map((h) => (
              <Button key={h} type="button" size="sm" variant={tsForm.regularHours === h ? "default" : "outline"} onClick={() => setTsForm({ ...tsForm, regularHours: h })}>
                {h}h
              </Button>
            ))}
            <Input type="number" className="w-16 h-8" value={tsForm.regularHours} onChange={(e) => setTsForm({ ...tsForm, regularHours: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            {isAr ? "وقت إضافي" : "Overtime"}
          </label>
          <Input type="number" value={tsForm.overtimeHours} onChange={(e) => setTsForm({ ...tsForm, overtimeHours: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            {isAr ? "ملاحظات" : "Notes"}
          </label>
          <Input placeholder="..." value={tsForm.notes} onChange={(e) => setTsForm({ ...tsForm, notes: e.target.value })} />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-primary/20">
        <p className="text-sm font-bold">
          {isAr ? "إجمالي اليوم:" : "Day total:"}{" "}
          <span className="text-primary">{(Number(tsForm.regularHours) || 0) + (Number(tsForm.overtimeHours) || 0)}h</span>
        </p>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              if (!timesheetWorkerId) return;
              timesheetMutation.mutate({
                workerProfileId: timesheetWorkerId,
                placementId: timesheetPlacementId ?? project?.placements?.find((p) => p.workerProfileId === timesheetWorkerId)?.id,
                regularHours: Number(tsForm.regularHours) || 0,
                overtimeHours: Number(tsForm.overtimeHours) || 0,
              });
            }}
            loading={timesheetMutation.isPending}
          >
            {isAr ? "حفظ سجل اليوم" : "Save today's entry"}
          </Button>
          <Button variant="outline" onClick={() => { setTimesheetWorkerId(null); setTimesheetPlacementId(undefined); }}>
            {t(locale, "dashboard", "cancel")}
          </Button>
        </div>
      </div>
    </div>
  );

  const renderWorkerRow = (p: Placement) => {
    const isExpanded = timesheetWorkerId === p.workerProfileId;
    const attendanceStatus = attendanceMap.get(p.workerProfileId);
    const savingAtt = savingAttendanceId === p.workerProfileId;
    const monthlyEntries = (project?.timesheets ?? []).filter((ts) => {
      if (ts.workerProfileId !== p.workerProfileId && ts.workerProfile?.id !== p.workerProfileId) return false;
      const d = (ts.workDate || ts.date || "").slice(0, 7);
      return d === exportMonth;
    });

    return (
      <div key={p.id} className="space-y-1.5">
        <div className={cn(
          "flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg border transition-colors text-xs",
          isExpanded ? "border-primary/40 bg-primary/5" : "border-border/50 bg-muted/20"
        )}>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-[11px] font-bold text-primary">
              {p.workerProfile?.name?.charAt(0) || "?"}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-medium text-sm leading-tight">{p.workerProfile?.name}</p>
                {p.workerProfile?.category && (
                  <span className={cn("text-[9px] px-1.5 py-0 rounded-full font-medium", categoryColor(p.workerProfile.category))}>
                    {p.workerProfile.category}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                {p.workerProfile?.iqamaNumber && `${isAr ? "إقامة" : "Iqama"}: ${p.workerProfile.iqamaNumber}`}
                {p.workerProfile?.iqamaNumber && p.workerProfile?.phone && " · "}
                {p.workerProfile?.phone}
                {(p.workerProfile?.iqamaNumber || p.workerProfile?.phone) && " · "}
                {p.workerProfile?.defaultHours ?? 8}h
                {p.workerProfile?.hourlyRate != null && (
                  <> · {p.workerProfile.hourlyRate} {isAr ? "ر.س/س" : "SAR/hr"}</>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <div className="flex items-center gap-0.5 rounded-md border border-border/60 p-0.5 bg-background/80">
              <span className="text-[9px] text-muted-foreground px-1 hidden sm:inline">{isAr ? "حضور" : "Attend"}</span>
              {canPerm("workers.attendance") && (
                <>
              <button
                type="button"
                title={isAr ? "حاضر" : "Present"}
                disabled={savingAtt}
                onClick={() => attendanceMutation.mutate({ workerProfileId: p.workerProfileId, status: "PRESENT" })}
                className={cn(
                  "w-6 h-6 rounded flex items-center justify-center transition-colors",
                  attendanceStatus === "PRESENT"
                    ? "bg-green-500 text-white shadow-sm"
                    : "text-muted-foreground hover:bg-green-500/10 hover:text-green-600"
                )}
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                type="button"
                title={isAr ? "غائب" : "Absent"}
                disabled={savingAtt}
                onClick={() => attendanceMutation.mutate({ workerProfileId: p.workerProfileId, status: "ABSENT" })}
                className={cn(
                  "w-6 h-6 rounded flex items-center justify-center transition-colors",
                  attendanceStatus === "ABSENT"
                    ? "bg-red-500 text-white shadow-sm"
                    : "text-muted-foreground hover:bg-red-500/10 hover:text-red-600"
                )}
              >
                <X className="w-3 h-3" />
              </button>
                </>
              )}
            </div>
            <ProjectWorkerMenu
              isAr={isAr}
              canTimesheet={canPerm("workers.timesheet")}
              canExport={canPerm("workers.export")}
              onDailySheet={() => {
                if (isExpanded && sheetMode === "daily") {
                  setTimesheetWorkerId(null);
                  setSheetMode(null);
                } else {
                  openTimesheetForWorker(p.workerProfileId, p.workerProfile?.defaultHours, p.id, "daily");
                }
              }}
              onMonthlySheet={() => {
                if (isExpanded && sheetMode === "monthly") {
                  setTimesheetWorkerId(null);
                  setSheetMode(null);
                } else {
                  openTimesheetForWorker(p.workerProfileId, p.workerProfile?.defaultHours, p.id, "monthly");
                }
              }}
              onDownload={() => downloadWorkerExcel(p.workerProfileId, p.workerProfile?.name || "worker")}
            />
          </div>
        </div>
        {isExpanded && sheetMode === "daily" && p.workerProfile?.name && renderTimesheetForm(p.workerProfile.name)}
        {isExpanded && sheetMode === "monthly" && p.workerProfile?.name && (
          <MonthlyTimesheetPanel
            workerName={p.workerProfile.name}
            month={exportMonth}
            entries={monthlyEntries}
            isAr={isAr}
            onClose={() => {
              setTimesheetWorkerId(null);
              setSheetMode(null);
            }}
          />
        )}
      </div>
    );
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await api.downloadManpowerTimesheetExport(businessId, {
        month: exportMonth,
        period: "monthly",
        projectId,
      });
      toast.success(isAr ? "تم التحميل" : "Excel downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const downloadWorkerExcel = async (workerId: string, workerName: string) => {
    setDownloadingWorkerId(workerId);
    try {
      await api.downloadManpowerTimesheetExport(businessId, {
        month: exportMonth,
        period: "monthly",
        projectId,
        workerProfileId: workerId,
        workerName,
      });
      toast.success(isAr ? "تم تحميل Excel" : "Worker Excel downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setDownloadingWorkerId(null);
    }
  };

  if (isLoading) return <TableSkeleton rows={8} />;
  if (isError) {
    const msg = (error as Error).message || "";
    const needsSchema = /sync-schema|Database tables|DIRECT_URL|503/i.test(msg);
    return (
      <Card className="p-8 text-center space-y-4">
        <p className="text-destructive text-sm">{msg}</p>
        {needsSchema && (
          <Button
            variant="outline"
            onClick={() => syncSchemaMutation.mutate()}
            loading={syncSchemaMutation.isPending}
          >
            {isAr ? "إصلاح قاعدة البيانات" : "Fix Database Tables"}
          </Button>
        )}
        <Button variant="link" asChild>
          <Link href={`/dashboard/${businessId}/projects`}>{isAr ? "رجوع" : "Back"}</Link>
        </Button>
      </Card>
    );
  }
  if (!project) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">{isAr ? "المشروع غير موجود" : "Project not found"}</p>
        <Button variant="link" asChild className="mt-2">
          <Link href={`/dashboard/${businessId}/projects`}>{isAr ? "رجوع" : "Back"}</Link>
        </Button>
      </Card>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    ...(canPerm("project.view") ? [{ id: "overview" as Tab, label: isAr ? "نظرة عامة" : "Overview" }] : []),
    ...(canPerm("workers.view") ? [{ id: "workers" as Tab, label: isAr ? "العمال" : "Workers" }] : []),
    ...(canPerm("timesheets.view") ? [{ id: "timesheets" as Tab, label: isAr ? "الساعات" : "Timesheets" }] : []),
  ];

  return (
    <ManpowerPageShell>
      <ManpowerHeroHeader
        title={project.name}
        subtitle={project.clientCompany?.name}
        icon={Building2}
        titleExtra={
          <span className={cn("text-xs px-2 py-1 rounded-full font-medium", STATUS_COLORS[project.status])}>
            {project.status}
          </span>
        }
        actions={
          isOwner ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/${businessId}/project-access`}>
                <Shield className="w-4 h-4 me-2" />
                {isAr ? "صلاحيات" : "Access"}
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="flex gap-2 border-b border-border pb-2">
        {tabs.map((item) => (
          <Button
            key={item.id}
            variant={tab === item.id ? "default" : "ghost"}
            size="sm"
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {project.projectStats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{project.projectStats.activeWorkers}</p>
              <p className="text-xs text-muted-foreground">{isAr ? "عمال نشطون" : "Active Workers"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{project.projectStats.assignedWorkers}</p>
              <p className="text-xs text-muted-foreground">{isAr ? "إجمالي المعينين" : "Total Assigned"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">
                {project.projectStats.headcountRequired ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">{isAr ? "المطلوب" : "Required"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{project.projectStats.totalHours}h</p>
              <p className="text-xs text-muted-foreground">{isAr ? "إجمالي الساعات" : "Total Hours"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{project.projectStats.pendingHours}h</p>
              <p className="text-xs text-muted-foreground">{isAr ? "ساعات معلقة" : "Pending Hours"}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {(project.manager?.user || project.clientCompany) && (
        <div className="grid md:grid-cols-2 gap-4">
          {project.manager?.user && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <UserCog className="w-4 h-4" />
                  {isAr ? "مدير المشروع" : "Project Manager"}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p className="font-medium">{project.manager.user.name}</p>
                {project.manager.user.phone && (
                  <p className="flex items-center gap-1 text-muted-foreground">
                    <Phone className="w-3.5 h-3.5" /> {project.manager.user.phone}
                  </p>
                )}
                {project.manager.user.email && (
                  <p className="flex items-center gap-1 text-muted-foreground">
                    <Mail className="w-3.5 h-3.5" /> {project.manager.user.email}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
          {project.clientCompany && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  {isAr ? "العميل" : "Client Company"}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p className="font-medium">{project.clientCompany.name}</p>
                {project.clientCompany.contactName && (
                  <p className="text-muted-foreground">{project.clientCompany.contactName}</p>
                )}
                {project.clientCompany.phone && (
                  <p className="flex items-center gap-1 text-muted-foreground">
                    <Phone className="w-3.5 h-3.5" /> {project.clientCompany.phone}
                  </p>
                )}
                {project.clientCompany.address && (
                  <p className="text-muted-foreground">{project.clientCompany.address}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {tab === "overview" && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {isAr ? "موقع المشروع" : "Site Location"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {project.siteName && <p><span className="text-muted-foreground">{isAr ? "الموقع:" : "Site:"}</span> {project.siteName}</p>}
              {project.siteAddress && <p>{project.siteAddress}</p>}
              {project.city && <p>{project.city}</p>}
              {!project.siteName && !project.siteAddress && !project.city && (
                <p className="text-muted-foreground">{t(locale, "dashboard", "noData")}</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{isAr ? "تفاصيل العقد" : "Contract Details"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {project.contractRef && <p><span className="text-muted-foreground">{isAr ? "المرجع:" : "Ref:"}</span> {project.contractRef}</p>}
              {project.industryTag && <p><span className="text-muted-foreground">{isAr ? "القطاع:" : "Sector:"}</span> {project.industryTag}</p>}
              {project.startDate && <p><span className="text-muted-foreground">{isAr ? "البداية:" : "Start:"}</span> {formatDate(project.startDate)}</p>}
              {project.endDate && <p><span className="text-muted-foreground">{isAr ? "النهاية:" : "End:"}</span> {formatDate(project.endDate)}</p>}
              {project.headcount != null && <p><span className="text-muted-foreground">{isAr ? "المطلوب:" : "Required:"}</span> {project.headcount} {isAr ? "عامل" : "workers"}</p>}
              {project.notes && <p className="text-muted-foreground">{project.notes}</p>}
            </CardContent>
          </Card>
          {project.hoursSummary && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  {isAr ? "ملخص الساعات" : "Hours Summary"}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><p className="text-2xl font-bold">{project.hoursSummary.total}h</p><p className="text-xs text-muted-foreground">{isAr ? "الإجمالي" : "Total"}</p></div>
                <div><p className="text-2xl font-bold">{project.hoursSummary.pending}h</p><p className="text-xs text-muted-foreground">{isAr ? "معلق" : "Pending"}</p></div>
                <div><p className="text-2xl font-bold">{project.hoursSummary.approved}h</p><p className="text-xs text-muted-foreground">{isAr ? "معتمد" : "Approved"}</p></div>
                <div><p className="text-2xl font-bold">{project.hoursSummary.billed}h</p><p className="text-xs text-muted-foreground">{isAr ? "مفوتر" : "Billed"}</p></div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {tab === "workers" && (
        <div className="space-y-0">
          <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/60 pb-2 space-y-2">
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <div className="relative flex-1 min-w-[180px] max-w-md">
                <Search className="absolute start-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  className="h-8 ps-8 text-xs"
                  placeholder={isAr ? "بحث بالاسم، إقامة، تصنيف..." : "Search name, iqama, trade..."}
                  value={workerSearch}
                  onChange={(e) => setWorkerSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  type="date"
                  className="h-8 w-[130px] text-xs"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                />
                <Input
                  type="month"
                  className="h-8 w-[130px] text-xs"
                  value={exportMonth}
                  onChange={(e) => setExportMonth(e.target.value)}
                  title={isAr ? "شهر التصدير/السجل" : "Export / sheet month"}
                />
                <span className="text-[10px] text-muted-foreground whitespace-nowrap hidden sm:inline">
                  <span className="text-green-600 font-medium">{attendanceSummary.present}✓</span>
                  {" · "}
                  <span className="text-red-500 font-medium">{attendanceSummary.absent}✗</span>
                </span>
              </div>
              {workerSearch && (
                <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => setWorkerSearch("")}>
                  <X className="w-3 h-3 me-1" />
                  {isAr ? "مسح" : "Clear"}
                </Button>
              )}
            </div>

            <ProjectCategoryNav
              categories={projectCategories}
              totalWorkers={allProjectPlacements.length}
              selected={projectCategoryFilter}
              onSelect={setProjectCategoryFilter}
              isAr={isAr}
            />
          </div>

          <Card className="overflow-visible border-t-0 rounded-t-none mt-0 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between py-2 px-4">
              <div>
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  {isAr ? "قائمة العمال" : "Worker List"}
                </CardTitle>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {filteredPlacements.length}/{allProjectPlacements.length} {isAr ? "معروض" : "shown"}
                  {projectCategoryFilter ? ` · ${projectCategoryFilter}` : ""}
                  {workerSearch ? ` · "${workerSearch}"` : ""}
                </p>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowAddWorker(!showAddWorker)} disabled={!canPerm("workers.add")}>
                <Plus className="w-3 h-3 me-1" />
                {isAr ? "إضافة" : "Add"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 pb-4 px-3 sm:px-4">
              {showAddWorker && (
                <div className="grid sm:grid-cols-2 gap-3 p-4 rounded-xl border border-primary/20 bg-muted/30 relative z-0">
                  <Input placeholder={isAr ? "الاسم *" : "Name *"} value={workerForm.name} onChange={(e) => setWorkerForm({ ...workerForm, name: e.target.value })} />
                  <Input placeholder={isAr ? "الجوال" : "Contact"} value={workerForm.phone} onChange={(e) => setWorkerForm({ ...workerForm, phone: e.target.value })} />
                  <Input placeholder={isAr ? "رقم الإقامة" : "Iqama"} value={workerForm.iqamaNumber} onChange={(e) => setWorkerForm({ ...workerForm, iqamaNumber: e.target.value })} />
                  <Input
                    type="number"
                    min={1}
                    step={0.5}
                    placeholder={isAr ? "الأجر/ساعة (ر.س)" : "Pay per hour (SAR)"}
                    value={workerForm.hourlyRate}
                    onChange={(e) => setWorkerForm({ ...workerForm, hourlyRate: e.target.value })}
                  />
                  <Input type="password" placeholder={isAr ? "كلمة المرور" : "Password"} value={workerForm.password} onChange={(e) => setWorkerForm({ ...workerForm, password: e.target.value })} />
                  <div className="sm:col-span-2 space-y-2">
                    <label className="text-xs font-medium text-muted-foreground block">{isAr ? "التصنيف" : "Trade category"}</label>
                    {projectCategories.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {projectCategories.map(({ category }) => (
                          <button
                            key={category}
                            type="button"
                            onClick={() => setWorkerForm({ ...workerForm, category })}
                            className={cn(
                              "text-xs px-2 py-1 rounded-full border",
                              workerForm.category === category ? "bg-primary text-primary-foreground border-primary" : categoryColor(category)
                            )}
                          >
                            {category}
                          </button>
                        ))}
                      </div>
                    )}
                    <CategoryPicker
                      compact
                      value={workerForm.category}
                      onChange={(c) => setWorkerForm({ ...workerForm, category: c })}
                      customCategories={customCategories}
                      isAr={isAr}
                    />
                  </div>
                  <div className="flex gap-2 items-center sm:col-span-2">
                    <span className="text-xs text-muted-foreground">{isAr ? "دوام:" : "Duty:"}</span>
                    {["8", "10", "12"].map((h) => (
                      <Button key={h} type="button" size="sm" variant={workerForm.defaultHours === h ? "default" : "outline"} onClick={() => setWorkerForm({ ...workerForm, defaultHours: h })}>
                        {h}h
                      </Button>
                    ))}
                  </div>
                  <div className="flex gap-2 sm:col-span-2">
                    <Button onClick={() => workerForm.name && addWorkerMutation.mutate()} loading={addWorkerMutation.isPending} disabled={!workerForm.name}>
                      {isAr ? "حفظ وإضافة" : "Save & Assign"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddWorker(false)}>{t(locale, "dashboard", "cancel")}</Button>
                  </div>
                </div>
              )}

              {allProjectPlacements.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm border border-dashed rounded-xl">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  {t(locale, "dashboard", "noData")}
                </div>
              ) : filteredPlacements.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">{isAr ? "لا نتائج — جرّب بحثاً أو تصنيفاً آخر" : "No results — try another search or trade"}</p>
              ) : projectCategoryFilter || workerSearch ? (
                <div className="space-y-1.5">{filteredPlacements.map(renderWorkerRow)}</div>
              ) : (
                <div className="space-y-4">
                  {groupedPlacements.map(([category, items]) => (
                    <div key={category}>
                      <div className="flex items-center gap-1.5 mb-1.5 sticky top-[7.5rem] z-20 bg-background/90 py-1">
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold", categoryColor(category))}>{category}</span>
                        <span className="text-[10px] text-muted-foreground">{items.length} {isAr ? "عامل" : "workers"}</span>
                      </div>
                      <div className="space-y-1.5">{items.map(renderWorkerRow)}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "timesheets" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">{isAr ? "سجلات الساعات" : "Timesheet Entries"}</CardTitle>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {isAr
                    ? "حمّل Excel لجميع العمال أو لكل عامل على حدة"
                    : "Download Excel for all workers or each worker separately"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input type="month" className="w-40" value={exportMonth} onChange={(e) => setExportMonth(e.target.value)} />
                {canPerm("workers.export") && (
                  <Button variant="default" size="sm" onClick={handleExport} loading={exporting}>
                    <Download className="w-4 h-4 me-1" />
                    {isAr ? "تحميل الكل" : "Download all workers"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {canPerm("workers.export") && workersInMonth.length > 0 && (
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
                  <p className="text-xs font-semibold">
                    {isAr ? "تحميل حسب العامل" : "Download by worker"} ({workersInMonth.length})
                  </p>
                  <div className="flex flex-col gap-2">
                    {workersInMonth.map((w) => (
                      <div
                        key={w.id}
                        className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-background border border-border/40"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{w.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {w.entryCount} {isAr ? "سجل" : "entries"} · {w.totalHours}h {isAr ? "إجمالي" : "total"}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs shrink-0"
                          loading={downloadingWorkerId === w.id}
                          onClick={() => downloadWorkerExcel(w.id, w.name)}
                        >
                          <Download className="w-3.5 h-3.5 me-1" />
                          {isAr ? "تحميل Excel" : "Download sheet"}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {monthFilteredTimesheets.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-6">
                  {isAr ? "لا سجلات لهذا الشهر" : "No entries for this month"}
                </p>
              ) : (
                monthFilteredTimesheets.map((ts) => {
                  const workerId = ts.workerProfileId || ts.workerProfile?.id;
                  const workerName = ts.workerProfile?.name || (isAr ? "عامل" : "Worker");
                  return (
                    <div key={ts.id} className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-muted/50">
                      <div>
                        <p className="font-medium">{workerName}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(ts.workDate || ts.date || "", isAr ? "ar-SA" : "en-SA")}</p>
                        {(ts.regularHours != null || ts.overtimeHours != null) && (
                          <p className="text-xs text-muted-foreground">
                            {isAr ? "أساسي" : "Regular"}: {ts.regularHours ?? ts.hoursWorked}h
                            {(ts.overtimeHours ?? 0) > 0 && ` · ${isAr ? "إضافي" : "OT"}: ${ts.overtimeHours}h`}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold">{ts.hoursWorked}h</span>
                        <span className={cn("text-xs px-2 py-1 rounded-full", TS_STATUS[ts.status || "PENDING"])}>
                          {ts.status || "PENDING"}
                        </span>
                        {canPerm("workers.export") && workerId && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            loading={downloadingWorkerId === workerId}
                            onClick={() => downloadWorkerExcel(workerId, workerName)}
                          >
                            <Download className="w-3.5 h-3.5 me-1" />
                            {isAr ? "Excel" : "Sheet"}
                          </Button>
                        )}
                        {ts.status === "PENDING" && memberRole !== "OFFICE_STAFF" && (
                          <Button size="sm" variant="outline" onClick={() => approveMutation.mutate({ id: ts.id, status: "APPROVED" })}>
                            {isAr ? "اعتماد" : "Approve"}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </ManpowerPageShell>
  );
}
