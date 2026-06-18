"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Users, Clock, AlertTriangle, MapPin, LayoutDashboard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useApp } from "@/lib/context";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ManpowerHeroHeader, ManpowerPageShell, ManpowerStatCard } from "@/components/dashboard/manpower-shell";

export default function ManpowerLivePage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";

  const { data: dash, isLoading } = useQuery({
    queryKey: ["manpower-live", businessId],
    queryFn: async () => (await api.getManpowerLiveDashboard(businessId)).data,
    refetchInterval: 20000,
  });

  return (
    <ManpowerPageShell>
      <ManpowerHeroHeader
        title={isAr ? "لوحة العمال المباشرة" : "Live Manpower Dashboard"}
        subtitle={isAr ? "تحديث تلقائي كل 20 ثانية" : "Auto-refreshes every 20s"}
        icon={LayoutDashboard}
      />

      {isLoading || !dash ? (
        <TableSkeleton rows={4} />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <ManpowerStatCard label={isAr ? "مشرف الموقع" : "Site Mgr"} value={dash.realtime.pendingSiteManager} valueClassName="text-amber-600" />
            <ManpowerStatCard label={isAr ? "إدارة/رواتب" : "Admin/Payroll"} value={dash.realtime.pendingAdminPayroll} valueClassName="text-orange-600" />
            <ManpowerStatCard label={isAr ? "إدخالات اليوم" : "Entries today"} value={dash.realtime.entriesToday} />
            <ManpowerStatCard label={isAr ? "حاضر" : "Present"} value={dash.realtime.presentToday} valueClassName="text-green-600" />
            <ManpowerStatCard label={isAr ? "غائب" : "Absent"} value={dash.realtime.absentToday} valueClassName="text-red-500" />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><MapPin className="w-4 h-4" />{isAr ? "حضور المواقع اليوم" : "Site Attendance Live"}</CardTitle></CardHeader>
              <CardContent className="space-y-2 pb-4">
                {dash.siteAttendanceLive.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{isAr ? "لا بيانات حضور اليوم" : "No attendance today"}</p>
                ) : dash.siteAttendanceLive.map((s) => (
                  <div key={s.projectId} className="flex justify-between text-xs border-b border-border/50 pb-1">
                    <span>{s.projectName}</span>
                    <span><span className="text-green-600">{s.present}✓</span> · <span className="text-red-500">{s.absent}✗</span></span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" />{isAr ? "خطر الإرهاق (OT)" : "Fatigue Risk (OT)"}</CardTitle></CardHeader>
              <CardContent className="space-y-1 pb-4">
                {dash.fatigueRisk.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{isAr ? "لا مخاطر حالياً" : "No risk flagged"}</p>
                ) : dash.fatigueRisk.slice(0, 8).map((w) => (
                  <div key={w.workerProfileId} className="flex justify-between text-xs">
                    <span>{w.workerName}</span>
                    <span className={cn(w.riskLevel === "HIGH" ? "text-red-500" : "text-amber-600")}>{w.weeklyOvertimeHours}h OT</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><Clock className="w-4 h-4" />{isAr ? "توازن الوقت الإضافي" : "Overtime Equalization"}</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4 pb-4 text-xs">
              <div>
                <p className="font-medium mb-1 text-green-600">{isAr ? "أقل OT (يحتاج ساعات)" : "Under-allocated"}</p>
                {dash.overtimeBalance.underAllocated.map((w, i) => (
                  <p key={i}>{w.name} — {w.weeklyOvertimeHours}h</p>
                ))}
              </div>
              <div>
                <p className="font-medium mb-1 text-red-500">{isAr ? "أكثر OT" : "Over-allocated"}</p>
                {dash.overtimeBalance.overAllocated.map((w, i) => (
                  <p key={i}>{w.name} — {w.weeklyOvertimeHours}h</p>
                ))}
              </div>
              <p className="md:col-span-2 text-muted-foreground">
                {isAr ? "متوسط OT أسبوعي:" : "Avg weekly OT:"} {dash.overtimeBalance.averageWeeklyOt}h · {isAr ? "OT الشهر:" : "Month OT:"} {dash.totalOvertimeHoursMonth}h
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4" />{isAr ? "اتجاه الساعات (الشهر)" : "Hours Trend (Month)"}</CardTitle></CardHeader>
            <CardContent className="pb-4">
              <div className="flex gap-1 items-end h-24 overflow-x-auto">
                {dash.laborCostTrend.slice(-14).map((d, i) => (
                  <div key={i} className="flex flex-col items-center min-w-[28px]">
                    <div className="w-5 bg-primary/70 rounded-t" style={{ height: `${Math.min(80, (d.totalHours || 0) * 4)}px` }} title={`${d.totalHours}h`} />
                    <span className="text-[8px] text-muted-foreground mt-1">{new Date(d.date).getDate()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </ManpowerPageShell>
  );
}
