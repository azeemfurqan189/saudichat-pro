"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, FolderKanban, MapPin, Building2, Users, Clock, UserCog, Database, Shield, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api, type ProjectStatus } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { ManpowerDemoBanner } from "@/components/dashboard/manpower-demo-banner";
import { ManpowerHeroHeader, ManpowerPageShell } from "@/components/dashboard/manpower-shell";

const INDUSTRY_TAGS = [
  { value: "OIL_GAS", en: "Oil & Gas", ar: "نفط وغاز" },
  { value: "CONSTRUCTION", en: "Construction", ar: "إنشاءات" },
  { value: "FACILITY", en: "Facility Management", ar: "إدارة مرافق" },
  { value: "OTHER", en: "Other", ar: "أخرى" },
];

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-500/10 text-green-600",
  DRAFT: "bg-muted text-muted-foreground",
  ON_HOLD: "bg-amber-500/10 text-amber-600",
  COMPLETED: "bg-blue-500/10 text-blue-600",
};

const emptyForm = {
  name: "",
  clientCompanyId: "",
  managerMemberId: "",
  siteName: "",
  siteAddress: "",
  city: "",
  industryTag: "OIL_GAS",
  contractRef: "",
  startDate: "",
  endDate: "",
  headcount: "",
  status: "ACTIVE" as ProjectStatus,
  notes: "",
};

export default function ProjectsPage() {
  const { businessId } = useParams() as { businessId: string };
  const router = useRouter();
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [quickClientName, setQuickClientName] = useState("");
  const [form, setForm] = useState(emptyForm);

  const { data: projects = [], isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["manpower-projects", businessId],
    queryFn: async () => (await api.getManpowerProjects(businessId)).data ?? [],
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: clients = [], refetch: refetchClients } = useQuery({
    queryKey: ["manpower-clients", businessId],
    queryFn: async () => (await api.getManpowerClients(businessId)).data ?? [],
  });

  const { data: members = [] } = useQuery({
    queryKey: ["workforce-members", businessId],
    queryFn: async () => (await api.getWorkforceMembers(businessId)).data ?? [],
  });

  const managers = members.filter((m) => m.role === "OWNER" || m.role === "MANAGER");

  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.getMe()).data,
  });
  const isOwner = meData?.businesses?.find((b) => b.id === businessId)?.memberRole === "OWNER";

  const quickClientMutation = useMutation({
    mutationFn: () => api.createManpowerClient(businessId, { name: quickClientName }),
    onSuccess: async (res) => {
      await refetchClients();
      if (res.data?.id) {
        setForm((f) => ({ ...f, clientCompanyId: res.data!.id }));
      }
      setQuickClientName("");
      toast.success(isAr ? "تمت إضافة العميل" : "Client added");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const demoMutation = useMutation({
    mutationFn: () => api.loadManpowerDemo(businessId, projects.length >= 5),
    onSuccess: async (res) => {
      await qc.refetchQueries({ queryKey: ["manpower-projects", businessId] });
      qc.invalidateQueries({ queryKey: ["manpower-clients", businessId] });
      qc.invalidateQueries({ queryKey: ["manpower-workers", businessId] });
      qc.invalidateQueries({ queryKey: ["manpower-analytics", businessId] });
      toast.success(res.data?.message || (isAr ? "تم تحميل البيانات" : "Demo loaded"));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const syncSchemaMutation = useMutation({
    mutationFn: () => api.syncManpowerSchema(businessId),
    onSuccess: async (res) => {
      await qc.refetchQueries({ queryKey: ["manpower-projects", businessId] });
      toast.success(res.message || res.data?.message || (isAr ? "تم تحديث قاعدة البيانات" : "Database updated"));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await api.createManpowerProject(businessId, {
        name: form.name.trim(),
        clientCompanyId: form.clientCompanyId,
        managerMemberId: form.managerMemberId || undefined,
        siteName: form.siteName.trim() || undefined,
        siteAddress: form.siteAddress.trim() || undefined,
        city: form.city.trim() || undefined,
        industryTag: form.industryTag || undefined,
        contractRef: form.contractRef.trim() || undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        headcount: form.headcount ? Number(form.headcount) : undefined,
        status: form.status,
        notes: form.notes.trim() || undefined,
      });
      return res.data;
    },
    onSuccess: async (project) => {
      await qc.refetchQueries({ queryKey: ["manpower-projects", businessId] });
      toast.success(isAr ? "تم حفظ المشروع" : "Project saved");
      setForm(emptyForm);
      setShowForm(false);
      if (project?.id) {
        router.push(`/dashboard/${businessId}/projects/${project.id}`);
      }
    },
    onError: (err: Error) => {
      const msg = err.message.toLowerCase();
      if (
        msg.includes("database") ||
        msg.includes("schema") ||
        msg.includes("updating") ||
        msg.includes("internal server")
      ) {
        toast.error(
          isAr
            ? 'قاعدة البيانات تحتاج تحديث — اضغط "إصلاح قاعدة البيانات" ثم حاول مرة أخرى'
            : 'Database needs update — click "Fix Database Tables" then try again',
          { duration: 8000 }
        );
      } else {
        toast.error(err.message);
      }
    },
  });

  return (
    <ManpowerPageShell>
      <ManpowerHeroHeader
        title={t(locale, "dashboard", "projects")}
        subtitle={
          isAr
            ? "كل مشروع — العميل، الموقع، العمال، الساعات"
            : "Each project — client, site, workers, and hours in one place"
        }
        icon={FolderKanban}
        actions={
          <div className="flex flex-wrap gap-2">
            {isOwner && (
              <Button variant="outline" asChild>
                <Link href={`/dashboard/${businessId}/project-access`}>
                  <Shield className="w-4 h-4 me-2" />
                  {isAr ? "صلاحيات المشرف" : "Manager Access"}
                </Link>
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => refetch()}
              loading={isFetching && !isLoading}
              disabled={isLoading}
            >
              <RefreshCw className="w-4 h-4 me-2" />
              {isAr ? "تحديث" : "Refresh"}
            </Button>
            <Button variant="outline" onClick={() => demoMutation.mutate()} loading={demoMutation.isPending}>
              <Database className="w-4 h-4 me-2" />
              {isAr ? "تحميل 5 مشاريع تجريبية" : "Load 5 Demo Projects"}
            </Button>
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="w-4 h-4 me-2" />
              {isAr ? "مشروع جديد" : "New Project"}
            </Button>
          </div>
        }
      />

      <ManpowerDemoBanner businessId={businessId} isAr={isAr} projectCount={projects.length} />

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 text-sm space-y-3">
            <p className="text-destructive">{(error as Error).message}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()} loading={isFetching}>
                <RefreshCw className="w-3.5 h-3.5 me-1.5" />
                {isAr ? "إعادة المحاولة" : "Retry"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => syncSchemaMutation.mutate()}
                loading={syncSchemaMutation.isPending}
              >
                {isAr ? "إصلاح قاعدة البيانات" : "Fix Database Tables"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{isAr ? "إنشاء مشروع" : "Create Project"}</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            {createMutation.isError && (
              <div className="sm:col-span-2 p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-sm space-y-2">
                <p className="text-destructive">{(createMutation.error as Error).message}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => syncSchemaMutation.mutate()}
                  loading={syncSchemaMutation.isPending}
                >
                  {isAr ? "إصلاح قاعدة البيانات" : "Fix Database Tables"}
                </Button>
              </div>
            )}
            {clients.length === 0 && (
              <div className="sm:col-span-2 p-3 rounded-lg bg-amber-500/10 text-sm space-y-2">
                <p>{isAr ? "أضف عميلاً أولاً (مثال: SABIC، Aramco)" : "Add a client first (e.g. SABIC, Aramco)"}</p>
                <div className="flex gap-2">
                  <Input
                    placeholder={isAr ? "اسم الشركة" : "Company name"}
                    value={quickClientName}
                    onChange={(e) => setQuickClientName(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    onClick={() => quickClientName.trim() && quickClientMutation.mutate()}
                    loading={quickClientMutation.isPending}
                  >
                    {isAr ? "إضافة" : "Add"}
                  </Button>
                </div>
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground">{isAr ? "اسم المشروع" : "Project name"} *</label>
              <Input
                className="mt-1"
                placeholder={isAr ? "مثال: صيانة مصفاة الجبيل" : "e.g. Jubail Refinery Maintenance"}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{isAr ? "العميل" : "Client"} *</label>
              <select
                className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={form.clientCompanyId}
                onChange={(e) => setForm({ ...form, clientCompanyId: e.target.value })}
              >
                <option value="">{isAr ? "اختر العميل..." : "Select client..."}</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{isAr ? "مدير المشروع" : "Project manager"}</label>
              <select
                className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={form.managerMemberId}
                onChange={(e) => setForm({ ...form, managerMemberId: e.target.value })}
              >
                <option value="">{isAr ? "اختر المشرف..." : "Select manager..."}</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.user?.name || m.role} ({m.role})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{isAr ? "نوع الصناعة" : "Industry"}</label>
              <select
                className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={form.industryTag}
                onChange={(e) => setForm({ ...form, industryTag: e.target.value })}
              >
                {INDUSTRY_TAGS.map((tag) => (
                  <option key={tag.value} value={tag.value}>{isAr ? tag.ar : tag.en}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{isAr ? "اسم الموقع" : "Site name"}</label>
              <Input value={form.siteName} onChange={(e) => setForm({ ...form, siteName: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{isAr ? "المدينة" : "City"}</label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground">{isAr ? "عنوان الموقع" : "Site address"}</label>
              <Input value={form.siteAddress} onChange={(e) => setForm({ ...form, siteAddress: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{isAr ? "رقم العقد" : "Contract ref"}</label>
              <Input value={form.contractRef} onChange={(e) => setForm({ ...form, contractRef: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{isAr ? "عدد العمال المطلوب" : "Headcount needed"}</label>
              <Input type="number" min={1} value={form.headcount} onChange={(e) => setForm({ ...form, headcount: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{isAr ? "تاريخ البداية" : "Start date"}</label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{isAr ? "تاريخ النهاية" : "End date"}</label>
              <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Input placeholder={isAr ? "ملاحظات" : "Notes"} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button
                onClick={() => form.name.trim() && form.clientCompanyId && createMutation.mutate()}
                loading={createMutation.isPending}
                disabled={!form.name.trim() || !form.clientCompanyId}
              >
                {isAr ? "حفظ المشروع" : "Save Project"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>{t(locale, "dashboard", "cancel")}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <h2 className="text-lg font-semibold">{isAr ? "كل المشاريع" : "All Projects"}</h2>

      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : projects.length === 0 ? (
        <Card className="p-8 text-center">
          <FolderKanban className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">{t(locale, "dashboard", "noData")}</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {projects.map((project) => (
            <Link key={project.id} href={`/dashboard/${businessId}/projects/${project.id}`}>
              <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{project.name}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Building2 className="w-3.5 h-3.5" />
                        {project.clientCompany?.name}
                      </p>
                      {project.manager?.user?.name && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <UserCog className="w-3.5 h-3.5" />
                          {project.manager.user.name}
                        </p>
                      )}
                    </div>
                    <span className={cn("text-xs px-2 py-1 rounded-full font-medium", STATUS_COLORS[project.status] || STATUS_COLORS.DRAFT)}>
                      {project.status}
                    </span>
                  </div>
                  {(project.siteName || project.city) && (
                    <p className="text-sm flex items-center gap-1 text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      {[project.siteName, project.city].filter(Boolean).join(", ")}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {project.stats?.activeWorkers ?? 0}/{project.headcount ?? "—"} {isAr ? "عامل" : "workers"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {project.stats?.totalHours ?? 0}h
                    </span>
                    {project.startDate && <span>{formatDate(project.startDate)}</span>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </ManpowerPageShell>
  );
}
