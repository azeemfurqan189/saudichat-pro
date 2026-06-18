"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  GitBranch,
  MoreVertical,
  Download,
  Pencil,
  Trash2,
  UserX,
  ChevronDown,
  MapPin,
  Building2,
  FolderKanban,
  Phone,
  Calendar,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api, type AgencyProject, type Placement } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import {
  ManpowerHeroHeader,
  ManpowerPageShell,
  ManpowerStatCard,
} from "@/components/dashboard/manpower-shell";
import { ManpowerDemoBanner } from "@/components/dashboard/manpower-demo-banner";

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-[#EAF3DE] text-[#27500A]",
  ENDED: "bg-[#EFEFEF] text-[#5c5c5c]",
  ON_HOLD: "bg-amber-50 text-amber-700",
};

const emptyForm = {
  workerProfileId: "",
  projectId: "",
  clientCompanyId: "",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
  siteName: "",
  notes: "",
};

function downloadCsv(placements: Placement[], filename: string) {
  const headers = ["Worker", "Client", "Project", "Site", "Start", "End", "Status", "Notes"];
  const rows = placements.map((p) => [
    p.workerProfile?.name ?? "",
    p.clientCompany?.name ?? "",
    p.project?.name ?? "",
    p.siteName ?? "",
    p.startDate ? p.startDate.slice(0, 10) : "",
    p.endDate ? p.endDate.slice(0, 10) : "",
    p.status ?? "",
    p.notes ?? "",
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function PlacementMenu({
  placement,
  isAr,
  onEdit,
  onEnd,
  onRemove,
  onDownload,
  onToggleDetail,
}: {
  placement: Placement;
  isAr: boolean;
  onEdit: () => void;
  onEnd: () => void;
  onRemove: () => void;
  onDownload: () => void;
  onToggleDetail: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const items = [
    { label: isAr ? "التفاصيل" : "View details", icon: ChevronDown, action: () => { onToggleDetail(); setOpen(false); } },
    { label: isAr ? "تعديل" : "Edit", icon: Pencil, action: () => { onEdit(); setOpen(false); } },
    { label: isAr ? "تحميل" : "Download", icon: Download, action: () => { onDownload(); setOpen(false); } },
    ...(placement.status === "ACTIVE"
      ? [{ label: isAr ? "إنهاء التعيين" : "End assignment", icon: UserX, action: () => { onEnd(); setOpen(false); } }]
      : []),
    { label: isAr ? "حذف" : "Remove", icon: Trash2, action: () => { onRemove(); setOpen(false); }, danger: true },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[#EFEFEF] text-[#5c5c5c]"
        aria-label="Options"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute end-0 top-full mt-1 z-30 min-w-[160px] rounded-lg border border-[#E8E8E8] bg-white shadow-lg py-1">
          {items.map(({ label, icon: Icon, action, danger }) => (
            <button
              key={label}
              type="button"
              onClick={(e) => { e.stopPropagation(); action(); }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-[12px] text-start hover:bg-[#FAFAF8]",
                danger ? "text-red-600" : "text-[#1a1a1a]"
              )}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PlacementsPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: placements = [], isLoading } = useQuery({
    queryKey: ["manpower-placements", businessId],
    queryFn: async () => (await api.getManpowerPlacements(businessId)).data ?? [],
  });

  const { data: workers = [] } = useQuery({
    queryKey: ["manpower-workers", businessId],
    queryFn: async () => (await api.getManpowerWorkers(businessId)).data ?? [],
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["manpower-clients", businessId],
    queryFn: async () => (await api.getManpowerClients(businessId)).data ?? [],
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["manpower-projects", businessId],
    queryFn: async () => (await api.getManpowerProjects(businessId)).data ?? [],
  });

  const activeCount = placements.filter((p) => p.status === "ACTIVE").length;
  const endedCount = placements.filter((p) => p.status === "ENDED").length;

  const filteredPlacements = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return placements;
    return placements.filter((p) => {
      const w = p.workerProfile;
      return (
        w?.name?.toLowerCase().includes(q) ||
        w?.iqamaNumber?.toLowerCase().includes(q) ||
        w?.phone?.includes(q) ||
        w?.category?.toLowerCase().includes(q) ||
        p.clientCompany?.name?.toLowerCase().includes(q) ||
        p.project?.name?.toLowerCase().includes(q) ||
        p.siteName?.toLowerCase().includes(q)
      );
    });
  }, [placements, search]);

  const selectProject = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    setForm({
      ...form,
      projectId,
      clientCompanyId: project?.clientCompanyId || "",
      siteName: project?.siteName || form.siteName,
    });
  };

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["manpower-placements", businessId] });
    qc.invalidateQueries({ queryKey: ["manpower-projects", businessId] });
  };

  const createMutation = useMutation({
    mutationFn: () =>
      api.createManpowerPlacement(businessId, {
        workerProfileId: form.workerProfileId,
        projectId: form.projectId || undefined,
        clientCompanyId: form.clientCompanyId,
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        siteName: form.siteName || undefined,
        notes: form.notes || undefined,
      }),
    onSuccess: () => {
      invalidate();
      toast.success(isAr ? "تم التعيين" : "Placement created");
      setShowForm(false);
      setForm(emptyForm);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      api.updateManpowerPlacement(businessId, editId!, {
        workerProfileId: form.workerProfileId,
        projectId: form.projectId || undefined,
        clientCompanyId: form.clientCompanyId,
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        siteName: form.siteName || undefined,
        notes: form.notes || undefined,
      }),
    onSuccess: () => {
      invalidate();
      toast.success(isAr ? "تم التحديث" : "Placement updated");
      setEditId(null);
      setForm(emptyForm);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const endMutation = useMutation({
    mutationFn: (id: string) =>
      api.updateManpowerPlacement(businessId, id, {
        status: "ENDED",
        endDate: new Date().toISOString().slice(0, 10),
      }),
    onSuccess: () => {
      invalidate();
      toast.success(isAr ? "تم إنهاء التعيين" : "Placement ended");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteManpowerPlacement(businessId, id),
    onSuccess: () => {
      invalidate();
      toast.success(isAr ? "تم الحذف" : "Placement removed");
      setExpandedId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const startEdit = (p: Placement) => {
    setEditId(p.id);
    setShowForm(false);
    setForm({
      workerProfileId: p.workerProfileId,
      projectId: p.projectId ?? "",
      clientCompanyId: p.clientCompanyId,
      startDate: p.startDate?.slice(0, 10) ?? "",
      endDate: p.endDate?.slice(0, 10) ?? "",
      siteName: p.siteName ?? "",
      notes: p.notes ?? "",
    });
  };

  const canSubmit = form.workerProfileId && (form.projectId || form.clientCompanyId);
  const isEditing = !!editId;

  const renderForm = (onSave: () => void, onCancel: () => void, saving: boolean) => (
    <div className="rounded-[10px] border border-[#E8E8E8] bg-white p-4 space-y-3">
      <p className="text-[13px] font-medium">
        {isEditing ? (isAr ? "تعديل التعيين" : "Edit placement") : isAr ? "تعيين عامل جديد" : "New placement"}
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] uppercase text-[#9a9a9a]">{isAr ? "العامل" : "Worker"}</label>
          <select
            className="w-full mt-1 rounded-lg border border-[#E8E8E8] bg-white px-3 py-2 text-sm"
            value={form.workerProfileId}
            onChange={(e) => setForm({ ...form, workerProfileId: e.target.value })}
          >
            <option value="">{isAr ? "اختر..." : "Select..."}</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase text-[#9a9a9a]">{isAr ? "المشروع" : "Project"}</label>
          <select
            className="w-full mt-1 rounded-lg border border-[#E8E8E8] bg-white px-3 py-2 text-sm"
            value={form.projectId}
            onChange={(e) => selectProject(e.target.value)}
          >
            <option value="">{isAr ? "اختر مشروع..." : "Select project..."}</option>
            {projects.map((p: AgencyProject) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase text-[#9a9a9a]">{isAr ? "العميل" : "Client"}</label>
          <select
            className="w-full mt-1 rounded-lg border border-[#E8E8E8] bg-white px-3 py-2 text-sm disabled:opacity-60"
            value={form.clientCompanyId}
            disabled={!!form.projectId}
            onChange={(e) => setForm({ ...form, clientCompanyId: e.target.value })}
          >
            <option value="">{isAr ? "اختر..." : "Select..."}</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase text-[#9a9a9a]">{isAr ? "تاريخ البداية" : "Start"}</label>
          <Input type="date" className="h-9 mt-1" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
        </div>
        <div>
          <label className="text-[10px] uppercase text-[#9a9a9a]">{isAr ? "تاريخ النهاية" : "End (optional)"}</label>
          <Input type="date" className="h-9 mt-1" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
        </div>
        <div>
          <label className="text-[10px] uppercase text-[#9a9a9a]">{isAr ? "الموقع" : "Site"}</label>
          <Input className="h-9 mt-1" value={form.siteName} onChange={(e) => setForm({ ...form, siteName: e.target.value })} />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="text-[10px] uppercase text-[#9a9a9a]">{isAr ? "ملاحظات" : "Notes"}</label>
          <Input className="h-9 mt-1" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={onSave} disabled={!canSubmit || saving}>
          {t(locale, "dashboard", "save")}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          {t(locale, "dashboard", "cancel")}
        </Button>
      </div>
    </div>
  );

  return (
    <ManpowerPageShell>
      <ManpowerHeroHeader
        icon={GitBranch}
        title={t(locale, "dashboard", "placements")}
        subtitle={isAr ? "تعيين العمال على مشروع أو موقع عميل" : "Assign workers to a project or client site"}
        actions={
          <div className="flex flex-wrap gap-2">
            {placements.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => downloadCsv(placements, `placements-${businessId}.csv`)}
              >
                <Download className="w-4 h-4 me-1" />
                {isAr ? "تحميل الكل" : "Download all"}
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => {
                setShowForm(!showForm);
                setEditId(null);
                setForm(emptyForm);
              }}
            >
              <Plus className="w-4 h-4 me-1" />
              {isAr ? "تعيين جديد" : "New Placement"}
            </Button>
          </div>
        }
      />

      <ManpowerDemoBanner businessId={businessId} isAr={isAr} projectCount={projects.length} autoLoad={placements.length === 0 && projects.length === 0} />

      <div className="grid grid-cols-3 gap-3">
        <ManpowerStatCard label={isAr ? "إجمالي" : "Total"} value={placements.length} />
        <ManpowerStatCard label={isAr ? "نشط" : "Active"} value={activeCount} accent="border-[#1D9E75]/30 bg-[#EAF3DE]/30" />
        <ManpowerStatCard label={isAr ? "منتهي" : "Ended"} value={endedCount} />
      </div>

      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9a9a9a]" />
        <input
          type="search"
          className="w-full h-10 ps-10 pe-10 rounded-[10px] border border-[#E8E8E8] bg-white text-sm"
          placeholder={isAr ? "بحث: اسم، إقامة، جوال، تصنيف، عميل..." : "Search name, iqama, phone, category, client..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute end-3 top-1/2 -translate-y-1/2 text-[#9a9a9a] hover:text-[#1a1a1a]"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {search && (
        <p className="text-[11px] text-[#5c5c5c]">
          {filteredPlacements.length}/{placements.length} {isAr ? "نتيجة" : "results"}
        </p>
      )}

      {showForm && !isEditing &&
        renderForm(
          () => canSubmit && createMutation.mutate(),
          () => { setShowForm(false); setForm(emptyForm); },
          createMutation.isPending
        )}

      {isEditing &&
        renderForm(
          () => canSubmit && updateMutation.mutate(),
          () => { setEditId(null); setForm(emptyForm); },
          updateMutation.isPending
        )}

      <div className="rounded-[10px] border border-[#E8E8E8] bg-white overflow-hidden">
        <div className="hidden md:grid md:grid-cols-[1.4fr_1.2fr_1fr_90px_72px_36px] gap-2 px-4 py-2 border-b border-[#E8E8E8] bg-[#FAFAF8] text-[10px] font-semibold uppercase tracking-wide text-[#9a9a9a]">
          <span>{isAr ? "العامل" : "Worker"}</span>
          <span>{isAr ? "العميل / المشروع" : "Client / Project"}</span>
          <span>{isAr ? "الموقع" : "Site"}</span>
          <span>{isAr ? "البداية" : "Start"}</span>
          <span>{isAr ? "الحالة" : "Status"}</span>
          <span />
        </div>

        {isLoading ? (
          <div className="p-4"><TableSkeleton rows={5} /></div>
        ) : filteredPlacements.length === 0 ? (
          <div className="p-10 text-center">
            <GitBranch className="w-10 h-10 mx-auto text-[#9a9a9a] mb-2" />
            <p className="text-sm text-[#5c5c5c]">
              {search ? (isAr ? "لا نتائج للبحث" : "No search results") : t(locale, "dashboard", "noData")}
            </p>
          </div>
        ) : (
          filteredPlacements.map((p) => {
            const expanded = expandedId === p.id;
            const workerInitial = p.workerProfile?.name?.charAt(0)?.toUpperCase() ?? "?";

            return (
              <div key={p.id} className="border-b border-[#E8E8E8] last:border-0">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedId(expanded ? null : p.id)}
                  onKeyDown={(e) => e.key === "Enter" && setExpandedId(expanded ? null : p.id)}
                  className={cn(
                    "grid grid-cols-[1fr_auto] md:grid-cols-[1.4fr_1.2fr_1fr_90px_72px_36px] gap-2 px-3 md:px-4 py-2.5 items-center cursor-pointer hover:bg-[#FAFAF8] transition-colors",
                    expanded && "bg-[#FAFAF8]/80"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#EAF3DE] text-[#27500A] text-xs font-semibold flex items-center justify-center shrink-0">
                      {workerInitial}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-[#1a1a1a] truncate">{p.workerProfile?.name ?? "—"}</p>
                      <p className="text-[10px] text-[#9a9a9a] truncate md:hidden">{p.clientCompany?.name}</p>
                    </div>
                  </div>

                  <div className="hidden md:block min-w-0">
                    <p className="text-[12px] text-[#1a1a1a] truncate">{p.clientCompany?.name ?? "—"}</p>
                    {p.project && (
                      <Link
                        href={`/dashboard/${businessId}/projects/${p.project.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] text-[#1D9E75] hover:underline truncate block"
                      >
                        {p.project.name}
                      </Link>
                    )}
                  </div>

                  <p className="hidden md:block text-[11px] text-[#5c5c5c] truncate">{p.siteName ?? p.project?.siteName ?? "—"}</p>
                  <p className="hidden md:block text-[11px] tabular-nums text-[#5c5c5c]">{formatDate(p.startDate, isAr ? "ar-SA" : "en-SA")}</p>

                  <span className={cn("hidden md:inline text-[10px] px-1.5 py-0.5 rounded font-medium w-fit", STATUS_STYLE[p.status ?? "ACTIVE"] ?? STATUS_STYLE.ACTIVE)}>
                    {p.status ?? "ACTIVE"}
                  </span>

                  <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <span className={cn("md:hidden text-[10px] px-1.5 py-0.5 rounded font-medium", STATUS_STYLE[p.status ?? "ACTIVE"] ?? STATUS_STYLE.ACTIVE)}>
                      {p.status ?? "ACTIVE"}
                    </span>
                    <PlacementMenu
                      placement={p}
                      isAr={isAr}
                      onEdit={() => startEdit(p)}
                      onEnd={() => endMutation.mutate(p.id)}
                      onRemove={() => {
                        if (confirm(isAr ? "حذف هذا التعيين؟" : "Remove this placement?")) {
                          deleteMutation.mutate(p.id);
                        }
                      }}
                      onDownload={() => downloadCsv([p], `placement-${p.workerProfile?.name ?? p.id}.csv`)}
                      onToggleDetail={() => setExpandedId(expanded ? null : p.id)}
                    />
                  </div>
                </div>

                {expanded && (
                  <div className="px-4 pb-3 pt-0 bg-[#FAFAF8]/60 border-t border-[#E8E8E8]/80">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 py-3 text-[12px]">
                      <div className="flex items-start gap-2">
                        <Building2 className="w-3.5 h-3.5 text-[#9a9a9a] mt-0.5" />
                        <div>
                          <p className="text-[10px] uppercase text-[#9a9a9a]">{isAr ? "العميل" : "Client"}</p>
                          <p className="font-medium">{p.clientCompany?.name ?? "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <FolderKanban className="w-3.5 h-3.5 text-[#9a9a9a] mt-0.5" />
                        <div>
                          <p className="text-[10px] uppercase text-[#9a9a9a]">{isAr ? "المشروع" : "Project"}</p>
                          {p.project ? (
                            <Link href={`/dashboard/${businessId}/projects/${p.project.id}`} className="font-medium text-[#1D9E75] hover:underline">
                              {p.project.name}
                            </Link>
                          ) : (
                            <p>—</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#9a9a9a] mt-0.5" />
                        <div>
                          <p className="text-[10px] uppercase text-[#9a9a9a]">{isAr ? "الموقع" : "Site"}</p>
                          <p>{p.siteName ?? p.project?.siteName ?? "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Calendar className="w-3.5 h-3.5 text-[#9a9a9a] mt-0.5" />
                        <div>
                          <p className="text-[10px] uppercase text-[#9a9a9a]">{isAr ? "الفترة" : "Period"}</p>
                          <p>
                            {formatDate(p.startDate, isAr ? "ar-SA" : "en-SA")}
                            {p.endDate ? ` → ${formatDate(p.endDate, isAr ? "ar-SA" : "en-SA")}` : ""}
                          </p>
                        </div>
                      </div>
                      {p.workerProfile?.phone && (
                        <div className="flex items-start gap-2">
                          <Phone className="w-3.5 h-3.5 text-[#9a9a9a] mt-0.5" />
                          <div>
                            <p className="text-[10px] uppercase text-[#9a9a9a]">{isAr ? "الجوال" : "Phone"}</p>
                            <p>{p.workerProfile.phone}</p>
                          </div>
                        </div>
                      )}
                      {p.notes && (
                        <div className="sm:col-span-2 lg:col-span-3">
                          <p className="text-[10px] uppercase text-[#9a9a9a] mb-0.5">{isAr ? "ملاحظات" : "Notes"}</p>
                          <p className="text-[#5c5c5c]">{p.notes}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-[#E8E8E8]">
                      <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => startEdit(p)}>
                        <Pencil className="w-3 h-3 me-1" />{isAr ? "تعديل" : "Edit"}
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => downloadCsv([p], `placement-${p.id}.csv`)}>
                        <Download className="w-3 h-3 me-1" />{isAr ? "تحميل" : "Download"}
                      </Button>
                      {p.status === "ACTIVE" && (
                        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => endMutation.mutate(p.id)}>
                          <UserX className="w-3 h-3 me-1" />{isAr ? "إنهاء" : "End"}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </ManpowerPageShell>
  );
}
