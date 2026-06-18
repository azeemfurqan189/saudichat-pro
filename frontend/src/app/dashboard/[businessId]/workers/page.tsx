"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, HardHat, Download, Search, Users, FileSpreadsheet, QrCode } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/skeleton";
import { CategoryFilterBar, CategoryPicker } from "@/components/dashboard/category-picker";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api, type WorkerProfile } from "@/lib/api";
import { ALL_OIL_GAS_CATEGORIES, categoryColor, mergeCategories } from "@/lib/manpower-categories";
import { cn } from "@/lib/utils";
import { ManpowerHeroHeader, ManpowerPageShell } from "@/components/dashboard/manpower-shell";

export default function WorkersPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [workerSearch, setWorkerSearch] = useState("");
  const [exportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [qrWorker, setQrWorker] = useState<{ name: string; qrImageUrl: string; checkInUrl: string } | null>(null);
  const [qrLoading, setQrLoading] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    nationality: "",
    iqamaNumber: "",
    iqamaExpiry: "",
    password: "",
    category: "",
    defaultHours: "8",
    hourlyRate: "",
    contractType: "",
  });

  const { data: workers = [], isLoading } = useQuery({
    queryKey: ["manpower-workers", businessId],
    queryFn: async () => (await api.getManpowerWorkers(businessId)).data ?? [],
  });

  const { data: categoryData } = useQuery({
    queryKey: ["worker-categories", businessId],
    queryFn: async () => (await api.getWorkerCategories(businessId)).data,
  });

  const allCategories = categoryData?.all ?? mergeCategories([]);
  const customCategories = categoryData?.custom ?? [];

  const filteredWorkers = useMemo(() => {
    return workers.filter((w) => {
      if (categoryFilter && w.category !== categoryFilter) return false;
      if (workerSearch.trim()) {
        const q = workerSearch.toLowerCase();
        return (
          w.name.toLowerCase().includes(q) ||
          w.category?.toLowerCase().includes(q) ||
          w.iqamaNumber?.toLowerCase().includes(q) ||
          w.phone?.includes(q)
        );
      }
      return true;
    });
  }, [workers, categoryFilter, workerSearch]);

  const createMutation = useMutation({
    mutationFn: () =>
      api.createManpowerWorker(businessId, {
        name: form.name,
        phone: form.phone || undefined,
        nationality: form.nationality || undefined,
        iqamaNumber: form.iqamaNumber || undefined,
        iqamaExpiry: form.iqamaExpiry || undefined,
        password: form.password || undefined,
        category: form.category || undefined,
        defaultHours: form.defaultHours ? Number(form.defaultHours) : 8,
        hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : undefined,
        contractType: form.contractType || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manpower-workers", businessId] });
      qc.invalidateQueries({ queryKey: ["worker-categories", businessId] });
      qc.invalidateQueries({ queryKey: ["manpower-analytics", businessId] });
      toast.success(isAr ? "تمت إضافة العامل" : "Worker added");
      setForm({
        name: "",
        phone: "",
        nationality: "",
        iqamaNumber: "",
        iqamaExpiry: "",
        password: "",
        category: "",
        defaultHours: "8",
        hourlyRate: "",
        contractType: "",
      });
      setShowForm(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const downloadWorkerExcel = async (worker: WorkerProfile) => {
    setDownloadingId(worker.id);
    try {
      await api.downloadManpowerTimesheetExport(businessId, {
        month: exportMonth,
        workerProfileId: worker.id,
        workerName: worker.name,
      });
      toast.success(isAr ? "تم تحميل Excel" : "Excel downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <ManpowerPageShell>
      <ManpowerHeroHeader
        title={t(locale, "dashboard", "workers")}
        subtitle={
          isAr
            ? `${ALL_OIL_GAS_CATEGORIES.length}+ تصنيف Oil & Gas — بحث، Excel لكل عامل`
            : `${ALL_OIL_GAS_CATEGORIES.length}+ oil & gas plant trades — search, per-worker Excel`
        }
        icon={HardHat}
        actions={
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 me-2" />
            {isAr ? "عامل جديد" : "New Worker"}
          </Button>
        }
      />

      <Card className="border-primary/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            {isAr ? "تصفية حسب التصنيف" : "Filter by Trade Category"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryFilterBar
            categories={allCategories}
            selected={categoryFilter}
            onSelect={setCategoryFilter}
            isAr={isAr}
          />
        </CardContent>
      </Card>

      {showForm && (
        <Card className="border-primary/20 shadow-md">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-base">{isAr ? "إضافة عامل جديد" : "Add New Worker"}</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4 pt-6">
            <Input placeholder={isAr ? "الاسم *" : "Full name *"} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder={isAr ? "رقم الجوال" : "Contact number"} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input placeholder={isAr ? "رقم الإقامة" : "Iqama number"} value={form.iqamaNumber} onChange={(e) => setForm({ ...form, iqamaNumber: e.target.value })} />
            <Input type="password" placeholder={isAr ? "كلمة المرور" : "Password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <Input placeholder={isAr ? "الجنسية" : "Nationality"} value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} />
            <Input type="date" value={form.iqamaExpiry} onChange={(e) => setForm({ ...form, iqamaExpiry: e.target.value })} />
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                {isAr ? "التصنيف / المهنة" : "Trade / Category"}
              </label>
              <CategoryPicker
                value={form.category}
                onChange={(c) => setForm({ ...form, category: c })}
                customCategories={customCategories}
                isAr={isAr}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{isAr ? "ساعات الدوام" : "Basic duty hours"}</label>
              <div className="flex gap-2 mt-1">
                {["8", "10", "12"].map((h) => (
                  <Button key={h} type="button" size="sm" variant={form.defaultHours === h ? "default" : "outline"} onClick={() => setForm({ ...form, defaultHours: h })}>
                    {h}h
                  </Button>
                ))}
              </div>
            </div>
            <Input type="number" placeholder={isAr ? "الأجر/ساعة" : "Hourly rate SAR"} value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} />
            <div className="flex gap-2 sm:col-span-2 pt-2">
              <Button onClick={() => form.name && createMutation.mutate()} loading={createMutation.isPending} disabled={!form.name}>
                {t(locale, "dashboard", "save")}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>{t(locale, "dashboard", "cancel")}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="ps-9"
            placeholder={isAr ? "بحث عامل..." : "Search worker..."}
            value={workerSearch}
            onChange={(e) => setWorkerSearch(e.target.value)}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {filteredWorkers.length} / {workers.length} {isAr ? "عامل" : "workers"}
        </p>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : filteredWorkers.length === 0 ? (
        <Card className="p-10 text-center border-dashed">
          <HardHat className="w-14 h-14 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">{t(locale, "dashboard", "noData")}</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredWorkers.map((worker) => (
            <Card key={worker.id} className="overflow-hidden hover:shadow-md transition-shadow border-border/80">
              <div className="h-1.5 bg-gradient-to-r from-primary/80 to-orange-500/60" />
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">{worker.name.charAt(0)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{worker.name}</p>
                      {worker.category && (
                        <span className={cn("inline-flex text-[10px] px-2 py-0.5 rounded-full font-medium mt-0.5", categoryColor(worker.category))}>
                          {worker.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  {worker.iqamaNumber && (
                    <p className="text-muted-foreground col-span-2">
                      <span className="font-medium text-foreground">{isAr ? "إقامة:" : "Iqama:"}</span> {worker.iqamaNumber}
                    </p>
                  )}
                  {worker.phone && <p>{worker.phone}</p>}
                  {worker.defaultHours != null && (
                    <p className="text-muted-foreground">{isAr ? "دوام:" : "Duty:"} {worker.defaultHours}h</p>
                  )}
                  {worker.hourlyRate != null && (
                    <p className="font-medium">{worker.hourlyRate} SAR/hr</p>
                  )}
                </div>
                <div className="flex gap-2 pt-1 border-t border-border/60">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs h-8"
                    onClick={() => downloadWorkerExcel(worker)}
                    loading={downloadingId === worker.id}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 me-1 text-green-600" />
                    {isAr ? "Excel" : "Excel Sheet"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2"
                    title={isAr ? "QR حضور" : "QR Attendance"}
                    loading={qrLoading === worker.id}
                    onClick={async () => {
                      setQrLoading(worker.id);
                      try {
                        const res = await api.getWorkerQrCode(businessId, worker.id);
                        if (res.data) {
                          setQrWorker({
                            name: worker.name,
                            qrImageUrl: res.data.qrImageUrl,
                            checkInUrl: res.data.checkInUrl,
                          });
                        }
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "QR failed");
                      } finally {
                        setQrLoading(null);
                      }
                    }}
                  >
                    <QrCode className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2"
                    title={isAr ? "تحميل" : "Download"}
                    onClick={() => downloadWorkerExcel(worker)}
                    loading={downloadingId === worker.id}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {qrWorker && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setQrWorker(null)}>
          <Card className="max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="py-3 text-center">
              <CardTitle className="text-sm">{qrWorker.name}</CardTitle>
              <p className="text-xs text-muted-foreground">{isAr ? "امسح للحضور" : "Scan to check in"}</p>
            </CardHeader>
            <CardContent className="text-center pb-6 space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrWorker.qrImageUrl} alt="QR" className="mx-auto w-48 h-48 rounded-lg border" />
              <p className="text-[10px] text-muted-foreground break-all">{qrWorker.checkInUrl}</p>
              <Button size="sm" variant="outline" onClick={() => {
                navigator.clipboard?.writeText(qrWorker.checkInUrl);
                toast.success(isAr ? "تم النسخ" : "Link copied");
              }}>
                {isAr ? "نسخ الرابط" : "Copy link"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </ManpowerPageShell>
  );
}
