"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Users, Calendar, CheckSquare, LogIn, HardHat } from "lucide-react";
import { api } from "@/lib/api";
import { ManpowerGlassCard, ManpowerStatCard } from "./manpower-shell";
import { cn } from "@/lib/utils";

export function ManpowerTeamPulse({ isAr, businessId }: { isAr: boolean; businessId: string }) {
  const { data: pulse, isLoading } = useQuery({
    queryKey: ["team-pulse", businessId],
    queryFn: async () => (await api.getTeamPulse(businessId)).data,
    refetchInterval: 30000,
  });

  if (isLoading || !pulse) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-muted/50" />
        ))}
      </div>
    );
  }

  const s = pulse.summary;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <ManpowerStatCard
          label={isAr ? "فريق المكتب" : "Office Team"}
          value={`${s.staffCheckedIn}/${s.staffTotal}`}
          sub={isAr ? "حاضر اليوم" : "checked in today"}
          accent="from-blue-500/15 to-indigo-500/5"
        />
        <ManpowerStatCard
          label={isAr ? "عمال المواقع" : "Site Workers"}
          value={`${s.workersPresent}✓ ${s.workersAbsent}✗`}
          sub={isAr ? "حضور اليوم" : "today attendance"}
          accent="from-emerald-500/15 to-green-500/5"
        />
        <ManpowerStatCard
          label={isAr ? "ورديات" : "Shifts"}
          value={s.todayShifts}
          sub={isAr ? "اليوم" : "scheduled today"}
          accent="from-violet-500/15 to-purple-500/5"
        />
        <ManpowerStatCard
          label={isAr ? "مهام" : "Tasks"}
          value={s.openTasks}
          sub={isAr ? "مفتوحة" : "open"}
          accent="from-amber-500/15 to-orange-500/5"
        />
        <ManpowerStatCard
          label={isAr ? "سجلات معلقة" : "Timesheets"}
          value={s.pendingTimesheets}
          sub={isAr ? "بانتظار الاعتماد" : "pending approval"}
          accent="from-rose-500/15 to-red-500/5"
        />
        <Link href={`/dashboard/${businessId}/timesheets`} className="block">
          <ManpowerStatCard
            label={isAr ? "إجراء" : "Action"}
            value="→"
            sub={isAr ? "راجع السجلات" : "Review queue"}
            accent="from-primary/20 to-teal-500/10"
          />
        </Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <ManpowerGlassCard
          title={isAr ? "فريق المكتب — من حاضر؟" : "Office Team — Who's In?"}
          icon={Users}
          action={
            <Link href={`/dashboard/${businessId}/attendance`} className="text-xs text-primary hover:underline">
              {isAr ? "الكل" : "View all"}
            </Link>
          }
        >
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {pulse.members.filter((m) => m.role !== "OWNER").map((m) => (
              <div key={m.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/30 last:border-0">
                <span className="font-medium">{m.name}</span>
                <span className="flex items-center gap-2">
                  <span className="text-muted-foreground">{m.role.replace("_", " ")}</span>
                  <span className={cn("w-2 h-2 rounded-full", m.checkedIn ? "bg-green-500" : "bg-muted-foreground/40")} />
                </span>
              </div>
            ))}
          </div>
        </ManpowerGlassCard>

        <ManpowerGlassCard
          title={isAr ? "مهام الفريق" : "Team Tasks"}
          icon={CheckSquare}
          action={
            <Link href={`/dashboard/${businessId}/tasks`} className="text-xs text-primary hover:underline">
              {isAr ? "الكل" : "View all"}
            </Link>
          }
        >
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {pulse.tasks.length === 0 ? (
              <p className="text-xs text-muted-foreground">{isAr ? "لا مهام" : "No open tasks"}</p>
            ) : (
              pulse.tasks.map((task) => (
                <div key={task.id} className="flex items-start justify-between gap-2 text-xs py-1.5 border-b border-border/30">
                  <span className="font-medium">{task.title}</span>
                  <span className={cn(
                    "shrink-0 px-1.5 py-0.5 rounded text-[9px]",
                    task.priority === "URGENT" || task.priority === "HIGH"
                      ? "bg-red-500/10 text-red-600"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {task.priority}
                  </span>
                </div>
              ))
            )}
          </div>
        </ManpowerGlassCard>

        <ManpowerGlassCard
          title={isAr ? "ورديات اليوم" : "Today's Shifts"}
          icon={Calendar}
          action={
            <Link href={`/dashboard/${businessId}/schedule`} className="text-xs text-primary hover:underline">
              {isAr ? "الجدول" : "Schedule"}
            </Link>
          }
        >
          {pulse.shifts.length === 0 ? (
            <p className="text-xs text-muted-foreground">{isAr ? "لا ورديات" : "No shifts today"}</p>
          ) : (
            pulse.shifts.map((shift) => (
              <div key={shift.id} className="flex justify-between text-xs py-1.5 border-b border-border/30">
                <span>{shift.memberName}</span>
                <span className="text-muted-foreground">{shift.startTime} – {shift.endTime}</span>
              </div>
            ))
          )}
        </ManpowerGlassCard>

        <ManpowerGlassCard title={isAr ? "حضور الموظفين" : "Staff Check-ins"} icon={LogIn}>
          {pulse.staffAttendance.length === 0 ? (
            <p className="text-xs text-muted-foreground">{isAr ? "لا تسجيلات" : "No check-ins yet"}</p>
          ) : (
            pulse.staffAttendance.slice(0, 8).map((a) => (
              <div key={a.id} className="flex justify-between text-xs py-1.5 border-b border-border/30">
                <span>{a.memberName}</span>
                <span className="text-muted-foreground">
                  {a.checkInAt ? new Date(a.checkInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                  {a.checkOutAt ? " ✓ out" : " · in"}
                </span>
              </div>
            ))
          )}
        </ManpowerGlassCard>
      </div>

      <ManpowerGlassCard title={isAr ? "حضور العمال على المواقع" : "Worker Site Roll-call"} icon={HardHat}>
        <div className="flex flex-wrap gap-4 text-sm">
          {pulse.siteAttendance.map((row) => (
            <span key={row.status}>
              <strong className={row.status === "PRESENT" ? "text-green-600" : "text-red-500"}>{row.count}</strong>{" "}
              {row.status === "PRESENT" ? (isAr ? "حاضر" : "Present") : (isAr ? "غائب" : "Absent")}
            </span>
          ))}
          <Link href={`/dashboard/${businessId}/projects`} className="text-primary text-xs ms-auto hover:underline">
            {isAr ? "إدارة المواقع ←" : "Manage sites →"}
          </Link>
        </div>
      </ManpowerGlassCard>
    </div>
  );
}
