"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Radio } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { ManpowerHeroHeader, ManpowerPageShell, ManpowerStatCard } from "@/components/dashboard/manpower-shell";
import { CmmsDemoBanner } from "@/components/dashboard/cmms-demo-banner";

export default function IotMonitoringPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();

  const [equipmentId, setEquipmentId] = useState("");
  const [readingType, setReadingType] = useState("HOURS");
  const [value, setValue] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["iot-monitoring", businessId],
    queryFn: async () => (await api.getIotMonitoring(businessId)).data,
  });

  const { data: assets = [] } = useQuery({
    queryKey: ["cmms-assets-list", businessId],
    queryFn: async () => (await api.getCmmsAssets(businessId)).data ?? [],
  });

  const ingestMut = useMutation({
    mutationFn: () =>
      api.postIotIngest(businessId, [
        { equipmentId, readingType, value: parseFloat(value), source: "MANUAL" },
      ]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["iot-monitoring", businessId] });
      setValue("");
      toast.success(isAr ? "تم تسجيل القراءة" : "Reading recorded");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const hasData = (data?.totalReadings ?? 0) > 0 || (data?.assets?.length ?? 0) > 0;

  return (
    <ManpowerPageShell>
      <ManpowerHeroHeader
        icon={Radio}
        title={t(locale, "dashboard", "iotMonitoring")}
        subtitle={
          isAr
            ? "قراءات العدادات والحساسات — PM تلقائي عند تجاوز العتبة"
            : "Meter & sensor readings — auto PM when thresholds exceeded"
        }
      />
      <CmmsDemoBanner businessId={businessId} isAr={isAr} hasData={hasData} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ManpowerStatCard label={isAr ? "القراءات" : "Readings"} value={isLoading ? "—" : data?.totalReadings ?? 0} />
        <ManpowerStatCard
          label={isAr ? "تنبيهات" : "Anomalies"}
          value={isLoading ? "—" : data?.anomalyCount ?? 0}
          accent={(data?.anomalyCount ?? 0) > 0 ? "border-red-200 bg-red-50/40" : undefined}
        />
        <ManpowerStatCard label={isAr ? "أصول مراقبة" : "Monitored assets"} value={isLoading ? "—" : data?.assets?.length ?? 0} />
        <ManpowerStatCard
          label={isAr ? "حالة PM" : "Condition PM"}
          value={isLoading ? "—" : data?.anomalies?.length ? "TRIGGERED" : "OK"}
          accent={data?.anomalies?.length ? "border-amber-200 bg-amber-50/40" : undefined}
        />
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        <div className="rounded-[10px] border bg-white overflow-hidden">
          <div className="px-4 py-2 bg-[#FAFAF8] border-b text-xs font-semibold flex items-center gap-2">
            {isAr ? "تنبيهات الحالة" : "Condition alerts"}
            {(data?.anomalyCount ?? 0) > 0 && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
          </div>
          {isLoading ? (
            <p className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></p>
          ) : !data?.anomalies?.length ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              {isAr ? "لا تنبيهات — سجّل قراءات أو فعّل Condition PM" : "No alerts — record readings or enable Condition PM plans"}
            </p>
          ) : (
            data.anomalies.map((a, i) => (
              <div key={i} className="px-4 py-3 border-b text-sm flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{a.assetName}</p>
                  <p className="text-[11px] text-muted-foreground">{a.planName}</p>
                  <p className="text-[11px] font-mono mt-0.5">
                    {a.readingType} = {a.value} (threshold {a.threshold})
                  </p>
                </div>
                <span className={cn("text-[10px] px-2 py-0.5 rounded font-medium", a.severity === "HIGH" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700")}>
                  {a.severity}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="rounded-[10px] border bg-white p-4 space-y-3 h-fit">
          <p className="text-sm font-semibold">{isAr ? "تسجيل قراءة" : "Record reading"}</p>
          <select className="w-full rounded border px-2 py-2 text-sm" value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)}>
            <option value="">{isAr ? "اختر أصل" : "Select asset"}</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>{a.assetTag || a.name} — {a.name}</option>
            ))}
          </select>
          <select className="w-full rounded border px-2 py-2 text-sm" value={readingType} onChange={(e) => setReadingType(e.target.value)}>
            <option value="HOURS">{isAr ? "ساعات التشغيل" : "Running hours"}</option>
            <option value="TEMPERATURE">{isAr ? "درجة الحرارة °C" : "Temperature °C"}</option>
            <option value="VIBRATION">{isAr ? "اهتزاز mm/s" : "Vibration mm/s"}</option>
          </select>
          <Input type="number" step="0.1" value={value} onChange={(e) => setValue(e.target.value)} placeholder={isAr ? "القيمة" : "Value"} />
          <Button
            size="sm"
            className="w-full"
            disabled={!equipmentId || !value || ingestMut.isPending}
            onClick={() => ingestMut.mutate()}
          >
            {isAr ? "حفظ" : "Save reading"}
          </Button>
        </div>
      </div>

      <div className="rounded-[10px] border bg-white overflow-hidden">
        <div className="px-4 py-2 bg-[#FAFAF8] border-b text-xs font-semibold grid grid-cols-12 gap-2">
          <span className="col-span-3">{isAr ? "الأصل" : "Asset"}</span>
          <span className="col-span-2">{isAr ? "ساعات" : "Hours"}</span>
          <span className="col-span-2">{isAr ? "حرارة" : "Temp"}</span>
          <span className="col-span-2">{isAr ? "اهتزاز" : "Vibration"}</span>
          <span className="col-span-3">{isAr ? "آخر قراءة" : "Last reading"}</span>
        </div>
        {isLoading ? (
          <p className="p-6 text-center text-sm text-muted-foreground">{isAr ? "جاري التحميل..." : "Loading..."}</p>
        ) : !data?.assets?.length ? (
          <p className="p-6 text-center text-sm text-muted-foreground">{isAr ? "لا بيانات حساسات بعد" : "No sensor data yet"}</p>
        ) : (
          data.assets.map((a) => (
            <div key={a.id} className={cn("grid grid-cols-12 gap-2 px-4 py-3 border-b text-sm items-center", a.hasAnomaly && "bg-red-50/30")}>
              <div className="col-span-3">
                <p className="font-medium truncate">{a.name}</p>
                {a.assetTag && <p className="text-[10px] font-mono text-muted-foreground">{a.assetTag}</p>}
              </div>
              <span className="col-span-2 tabular-nums">{a.lastHoursReading ?? a.runningHours ?? "—"}</span>
              <span className="col-span-2 tabular-nums">{a.lastTemp ?? "—"}</span>
              <span className="col-span-2 tabular-nums">{a.lastVibration ?? "—"}</span>
              <span className="col-span-3 text-[11px] text-muted-foreground">
                {a.lastReadingAt ? formatDate(a.lastReadingAt, locale) : "—"}
              </span>
            </div>
          ))
        )}
      </div>

      {!!data?.recentReadings?.length && (
        <details className="rounded-[10px] border bg-white p-3">
          <summary className="text-sm font-semibold cursor-pointer">
            {isAr ? "آخر القراءات" : "Recent readings"} ({data.recentReadings.length})
          </summary>
          <div className="mt-2 space-y-1">
            {data.recentReadings.slice(0, 20).map((r) => (
              <div key={r.id} className="text-xs p-2 rounded bg-muted/30 flex justify-between gap-2">
                <span>{r.equipment?.name ?? r.equipmentId} — {r.readingType} = {r.value}</span>
                <span className="text-muted-foreground">{formatDate(r.recordedAt, locale)}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </ManpowerPageShell>
  );
}
