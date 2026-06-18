"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Gauge, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { ManpowerHeroHeader, ManpowerPageShell, ManpowerStatCard } from "@/components/dashboard/manpower-shell";

export default function CalibrationPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [cert, setCert] = useState("");
  const [due, setDue] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["calibrations", businessId],
    queryFn: async () => (await api.getCalibrations(businessId)).data,
  });

  const createMut = useMutation({
    mutationFn: () => api.postCalibration(businessId, { instrumentName: name, certNumber: cert || undefined, nextDueAt: due || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calibrations", businessId] });
      setName(""); setCert(""); setDue(""); setShowForm(false);
      toast.success(isAr ? "تمت الإضافة" : "Calibration record added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const records = data?.records ?? [];

  return (
    <ManpowerPageShell>
      <ManpowerHeroHeader
        icon={Gauge}
        title={t(locale, "dashboard", "calibration")}
        subtitle={isAr ? "معايرة الأجهزة — تواريخ الاستحقاق والتذكير" : "Instrument calibration — due dates and compliance tracking"}
      />

      <div className="flex justify-between items-center">
        <div className="grid grid-cols-2 gap-3 flex-1 max-w-md">
          <ManpowerStatCard label={isAr ? "مسجّلة" : "Instruments"} value={isLoading ? "—" : records.length} />
          <ManpowerStatCard label={isAr ? "مستحقة" : "Due now"} value={isLoading ? "—" : data?.dueCount ?? 0} accent={(data?.dueCount ?? 0) > 0 ? "border-amber-200 bg-amber-50/40" : undefined} />
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 me-1" />{isAr ? "إضافة" : "Add"}</Button>
      </div>

      {showForm && (
        <div className="rounded-[10px] border bg-white p-4 grid sm:grid-cols-3 gap-2">
          <Input placeholder={isAr ? "اسم الجهاز" : "Instrument name"} value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder={isAr ? "رقم الشهادة" : "Cert number"} value={cert} onChange={(e) => setCert(e.target.value)} />
          <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          <Button className="sm:col-span-3" disabled={!name.trim() || createMut.isPending} onClick={() => createMut.mutate()}>
            {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : isAr ? "حفظ" : "Save"}
          </Button>
        </div>
      )}

      <div className="rounded-[10px] border bg-white divide-y">
        {isLoading ? (
          <p className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></p>
        ) : records.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">{isAr ? "لا سجلات معايرة" : "No calibration records yet"}</p>
        ) : (
          records.map((r) => {
            const overdue = r.nextDueAt && new Date(r.nextDueAt) <= new Date();
            return (
              <div key={r.id} className="p-4 flex flex-wrap justify-between gap-2 text-sm">
                <div>
                  <p className="font-semibold">{r.instrumentName}</p>
                  {r.equipment?.name && <p className="text-xs text-muted-foreground">{r.equipment.name}</p>}
                </div>
                <span className={cn("text-xs px-2 py-0.5 rounded h-fit", overdue ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700")}>
                  {r.nextDueAt ? formatDate(r.nextDueAt, locale) : r.status}
                </span>
              </div>
            );
          })
        )}
      </div>
    </ManpowerPageShell>
  );
}
