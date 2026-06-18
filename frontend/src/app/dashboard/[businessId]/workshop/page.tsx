"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Wrench, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api, VehicleJob } from "@/lib/api";

const JOB_STATUSES = ["RECEIVED", "DIAGNOSING", "IN_REPAIR", "READY", "DELIVERED"];

export default function WorkshopPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();
  const [form, setForm] = useState({ vehiclePlate: "", vehicleMake: "", vehicleModel: "", issueDescription: "", laborCost: "", partsCost: "" });

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["vehicle-jobs", businessId],
    queryFn: async () => (await api.getVehicleJobs(businessId)).data ?? [],
  });
  const { data: stats } = useQuery({
    queryKey: ["industry-stats", businessId],
    queryFn: async () => (await api.getIndustryStats(businessId)).data,
  });

  const createJob = useMutation({
    mutationFn: (d: Partial<VehicleJob>) => api.createVehicleJob(businessId, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicle-jobs", businessId] });
      qc.invalidateQueries({ queryKey: ["industry-stats", businessId] });
      setForm({ vehiclePlate: "", vehicleMake: "", vehicleModel: "", issueDescription: "", laborCost: "", partsCost: "" });
      toast.success(isAr ? "تم" : "Job created");
    },
  });

  const updateJob = useMutation({
    mutationFn: ({ id, status, totalCost }: { id: string; status: string; totalCost?: number }) =>
      api.updateVehicleJob(businessId, id, { status, totalCost }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vehicle-jobs", businessId] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t(locale, "dashboard", "workshop")}</h1>
        {stats && (
          <div className="flex gap-3 text-sm">
            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30">{stats.openJobs ?? 0} {isAr ? "قيد العمل" : "In Progress"}</span>
            <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30">{stats.readyForPickup ?? 0} {isAr ? "جاهزة" : "Ready"}</span>
            <span className="px-3 py-1 rounded-full bg-muted">{(stats.totalRevenue ?? 0).toLocaleString()} SAR</span>
          </div>
        )}
      </div>

      <Card className="p-4 grid sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <Input placeholder={isAr ? "رقم اللوحة" : "Plate #"} value={form.vehiclePlate} onChange={(e) => setForm({ ...form, vehiclePlate: e.target.value })} dir="ltr" />
        <Input placeholder={isAr ? "الماركة" : "Make"} value={form.vehicleMake} onChange={(e) => setForm({ ...form, vehicleMake: e.target.value })} />
        <Input placeholder={isAr ? "الموديل" : "Model"} value={form.vehicleModel} onChange={(e) => setForm({ ...form, vehicleModel: e.target.value })} />
        <Input placeholder={isAr ? "المشكلة" : "Issue"} value={form.issueDescription} onChange={(e) => setForm({ ...form, issueDescription: e.target.value })} className="sm:col-span-2" />
        <Button
          onClick={() =>
            form.vehiclePlate &&
            form.issueDescription &&
            createJob.mutate({
              vehiclePlate: form.vehiclePlate,
              vehicleMake: form.vehicleMake,
              vehicleModel: form.vehicleModel,
              issueDescription: form.issueDescription,
              laborCost: form.laborCost ? Number(form.laborCost) : undefined,
              partsCost: form.partsCost ? Number(form.partsCost) : undefined,
              totalCost: (Number(form.laborCost) || 0) + (Number(form.partsCost) || 0) || undefined,
              status: "RECEIVED",
            })
          }
          loading={createJob.isPending}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </Card>

      {isLoading ? (
        <p>{t(locale, "dashboard", "loading")}</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {jobs.map((j) => (
            <Card key={j.id} className="p-4 flex justify-between gap-3">
              <div className="flex gap-3">
                <Wrench className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <p className="font-medium">{j.vehiclePlate} — {j.vehicleMake} {j.vehicleModel}</p>
                  <p className="text-xs text-muted-foreground">{j.issueDescription}</p>
                  {j.totalCost != null && <p className="text-xs font-medium mt-1">{j.totalCost} SAR</p>}
                </div>
              </div>
              <select
                className="text-xs border rounded-lg px-2 py-1"
                value={j.status}
                onChange={(e) => updateJob.mutate({ id: j.id, status: e.target.value })}
              >
                {JOB_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Card>
          ))}
        </div>
      )}
      {!isLoading && jobs.length === 0 && <p className="text-muted-foreground">{t(locale, "dashboard", "noData")}</p>}
    </div>
  );
}
