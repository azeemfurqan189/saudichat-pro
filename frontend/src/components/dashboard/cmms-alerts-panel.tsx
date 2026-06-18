"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Bell } from "lucide-react";
import { api, type CmmsAlertItem } from "@/lib/api";
import { cn } from "@/lib/utils";

const SEV_STYLE: Record<string, string> = {
  CRITICAL: "border-red-300 bg-red-50 text-red-800",
  HIGH: "border-amber-300 bg-amber-50 text-amber-900",
  MEDIUM: "border-blue-200 bg-blue-50 text-blue-800",
};

export function CmmsAlertsPanel({ isAr, compact }: { isAr: boolean; compact?: boolean }) {
  const { businessId } = useParams() as { businessId: string };

  const { data: alerts, isLoading } = useQuery({
    queryKey: ["cmms-alerts", businessId],
    queryFn: async () => (await api.getCmmsAlerts(businessId)).data,
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="rounded-[10px] border border-[#E8E8E8] bg-white p-4 text-sm text-muted-foreground">
        {isAr ? "جاري تحميل التنبيهات..." : "Loading alerts..."}
      </div>
    );
  }

  const s = alerts?.summary;
  const items = alerts?.items ?? [];

  if (compact && items.length === 0) return null;

  return (
    <div className="rounded-[10px] border border-[#E8E8E8] bg-white overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-[#E8E8E8] bg-[#FAFAF8]">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-600" />
          <p className="text-sm font-semibold">{isAr ? "تنبيهات CMMS" : "CMMS Alerts"}</p>
        </div>
        {s && (
          <div className="flex flex-wrap gap-2 text-[10px]">
            {s.inspectionOverdue > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                {s.inspectionOverdue} {isAr ? "فحص متأخر" : "inspection"}
              </span>
            )}
            {s.pmDue > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                {s.pmDue} PM
              </span>
            )}
            {s.warrantyExpiring > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-800">
                {s.warrantyExpiring} {isAr ? "ضمان" : "warranty"}
              </span>
            )}
            {s.lowStock > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                {s.lowStock} {isAr ? "مخزون" : "stock"}
              </span>
            )}
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">
          {isAr ? "لا تنبيهات حالياً — كل شيء تحت السيطرة ✓" : "No alerts — all clear ✓"}
        </p>
      ) : (
        <div className={cn("divide-y divide-[#E8E8E8]", compact ? "max-h-64 overflow-y-auto" : "")}>
          {items.slice(0, compact ? 8 : 20).map((item: CmmsAlertItem) => (
            <Link
              key={item.id}
              href={`/dashboard/${businessId}${item.href}`}
              className="flex items-start gap-2 px-4 py-2.5 hover:bg-[#FAFAF8] transition-colors"
            >
              <AlertTriangle
                className={cn(
                  "w-4 h-4 shrink-0 mt-0.5",
                  item.severity === "CRITICAL" ? "text-red-500" : item.severity === "HIGH" ? "text-amber-500" : "text-blue-500"
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium leading-snug">{item.title}</p>
                {item.detail && <p className="text-[10px] text-muted-foreground mt-0.5">{item.detail}</p>}
              </div>
              <span className={cn("text-[9px] px-1.5 py-0.5 rounded border shrink-0", SEV_STYLE[item.severity])}>
                {item.severity}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
