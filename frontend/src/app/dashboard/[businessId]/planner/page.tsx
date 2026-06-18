"use client";

import { useMemo, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarRange, ChevronLeft, ChevronRight, GripVertical, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api, PlannerDayRow, PlannerJobRow } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ManpowerHeroHeader, ManpowerPageShell, ManpowerStatCard } from "@/components/dashboard/manpower-shell";
import { CmmsDemoBanner } from "@/components/dashboard/cmms-demo-banner";

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function maxJobs(days: PlannerDayRow[]): number {
  return Math.max(1, ...days.map((d) => d.jobCount));
}

export default function PlannerPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();

  const [weekStart, setWeekStart] = useState<string | undefined>(undefined);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dragJobId, setDragJobId] = useState<string | null>(null);
  const [dropHighlight, setDropHighlight] = useState<string | null>(null);

  const { data: workload, isLoading } = useQuery({
    queryKey: ["planner", businessId, weekStart],
    queryFn: async () => (await api.getPlannerWorkload(businessId, weekStart)).data,
  });

  const days = useMemo(() => workload?.days ?? [], [workload?.days]);
  const unscheduled = workload?.unscheduled ?? [];
  const peak = maxJobs(days);
  const hasData = (workload?.totals.scheduledThisWeek ?? 0) > 0;

  const selectedJobs = useMemo(() => {
    if (!selectedDay) return [];
    return days.find((d) => d.date === selectedDay)?.jobs ?? [];
  }, [days, selectedDay]);

  const scheduleMut = useMutation({
    mutationFn: ({ jobId, date }: { jobId: string; date: string }) =>
      api.scheduleWorkOrder(businessId, jobId, { date }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planner", businessId] });
      qc.invalidateQueries({ queryKey: ["work-orders", businessId] });
      toast.success(isAr ? "تمت الجدولة" : "Job scheduled");
      setDragJobId(null);
      setDropHighlight(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleDayDrop = useCallback(
    (date: string) => {
      if (!dragJobId) return;
      scheduleMut.mutate({ jobId: dragJobId, date });
    },
    [dragJobId, scheduleMut]
  );

  const seedMut = useMutation({
    mutationFn: () => api.seedPlannerDemo(businessId),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["planner", businessId] });
      qc.invalidateQueries({ queryKey: ["work-orders", businessId] });
      const msg = res.data?.skipped
        ? isAr
          ? "الجدول موجود مسبقاً"
          : "Planner already seeded this week"
        : isAr
          ? `تم إنشاء ${res.data?.created ?? 0} أعمال (10 + 15 + 8)`
          : `Created ${res.data?.created ?? 0} jobs (Mon 10 · Tue 15 · Wed 8)`;
      toast.success(msg);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <ManpowerPageShell>
      <ManpowerHeroHeader
        icon={CalendarRange}
        title={t(locale, "dashboard", "workPlanner")}
        subtitle={
          isAr
            ? "المخطط يوزّع أوامر العمل — الاثنين 10 · الثلاثاء 15 · الأربعاء 8"
            : "Planner manages workload — Mon 10 · Tue 15 · Wed 8 jobs"
        }
      />

      <CmmsDemoBanner businessId={businessId} isAr={isAr} hasData={hasData} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => setWeekStart(workload?.weekStart ? addDays(workload.weekStart, -7) : undefined)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs font-medium text-[#5c5c5c] min-w-[140px] text-center">
            {workload ? `${workload.weekStart} → ${workload.weekEnd}` : "—"}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => setWeekStart(workload?.weekStart ? addDays(workload.weekStart, 7) : undefined)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setWeekStart(undefined)}>
            {isAr ? "هذا الأسبوع" : "This week"}
          </Button>
        </div>
        <Button size="sm" variant="outline" onClick={() => seedMut.mutate()} disabled={seedMut.isPending}>
          {seedMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : isAr ? "Demo جدولة" : "Load demo schedule"}
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ManpowerStatCard
          label={isAr ? "مجدول هذا الأسبوع" : "Scheduled this week"}
          value={isLoading ? "—" : workload?.totals.scheduledThisWeek ?? 0}
        />
        <ManpowerStatCard
          label={isAr ? "غير مجدول" : "Unscheduled backlog"}
          value={isLoading ? "—" : workload?.totals.unscheduledBacklog ?? 0}
          accent={(workload?.totals.unscheduledBacklog ?? 0) > 0 ? "border-amber-200 bg-amber-50/50" : undefined}
        />
        <ManpowerStatCard
          label={isAr ? "أعلى يوم" : "Peak day"}
          value={
            isLoading
              ? "—"
              : workload?.totals.peakDay
                ? `${isAr ? workload.totals.peakDay.labelAr : workload.totals.peakDay.label} (${workload.totals.peakDay.jobCount})`
                : "—"
          }
        />
        <ManpowerStatCard label={isAr ? "أيام العمل" : "Work days"} value={isLoading ? "—" : days.filter((d) => d.jobCount > 0).length} />
      </div>

      <div className="rounded-[10px] border border-[#E8E8E8] bg-[#FAFAF8] p-3 text-[11px] text-center text-[#5c5c5c]">
        {isAr ? "🏢 المكتب — المخطط يوزّع الحمل على الفريق" : "🏢 Office — planner distributes jobs across the week"}
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-12 text-sm">{isAr ? "جاري التحميل..." : "Loading..."}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {days.map((day) => (
              <div
                key={day.date}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedDay(selectedDay === day.date ? null : day.date)}
                onKeyDown={(e) => e.key === "Enter" && setSelectedDay(selectedDay === day.date ? null : day.date)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDropHighlight(day.date);
                }}
                onDragLeave={() => setDropHighlight((d) => (d === day.date ? null : d))}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDayDrop(day.date);
                }}
                className={cn(
                  "rounded-[10px] border p-3 text-left transition-colors cursor-pointer",
                  selectedDay === day.date
                    ? "border-[#1D9E75] bg-[#EAF3DE]/60"
                    : dropHighlight === day.date
                      ? "border-[#1D9E75] bg-[#EAF3DE]/40 ring-2 ring-[#1D9E75]/30"
                      : "border-[#E8E8E8] bg-white hover:border-[#1D9E75]/40"
                )}
              >
                <p className="text-[10px] font-semibold uppercase text-[#9a9a9a]">
                  {isAr ? day.labelAr : day.label}
                </p>
                <p className="text-2xl font-bold text-[#1a1a1a] mt-1">{day.jobCount}</p>
                <p className="text-[10px] text-[#5c5c5c]">{isAr ? "أعمال" : "Jobs"}</p>
                <div className="mt-2 h-1.5 rounded-full bg-[#E8E8E8] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#1D9E75] transition-all"
                    style={{ width: `${Math.round((day.jobCount / peak) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {selectedDay && (
            <div className="rounded-[10px] border border-[#E8E8E8] bg-white divide-y">
              <div className="p-3 bg-[#FAFAF8] text-xs font-semibold">
                {isAr ? "أعمال" : "Jobs"} — {selectedJobs.length}
              </div>
              {selectedJobs.length === 0 ? (
                <p className="p-6 text-center text-muted-foreground text-sm">{isAr ? "لا أعمال" : "No jobs"}</p>
              ) : (
                selectedJobs.map((job) => <JobRow key={job.id} job={job} isAr={isAr} />)
              )}
            </div>
          )}

          {unscheduled.length > 0 && (
            <div className="rounded-[10px] border border-amber-200 bg-amber-50/30">
              <div className="p-3 border-b border-amber-200/60 text-xs font-semibold text-amber-900">
                {isAr ? "غير مجدول — اسحب إلى يوم" : "Unscheduled backlog — assign to a day"}
              </div>
              <div className="divide-y divide-amber-100">
                {unscheduled.slice(0, 12).map((job) => (
                  <div
                    key={job.id}
                    draggable
                    onDragStart={() => setDragJobId(job.id)}
                    onDragEnd={() => setDragJobId(null)}
                    className={cn(
                      "p-3 flex flex-wrap items-center justify-between gap-2 cursor-grab active:cursor-grabbing",
                      dragJobId === job.id && "opacity-50 bg-amber-100/50"
                    )}
                  >
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <GripVertical className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <JobRow job={job} isAr={isAr} compact />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {days.slice(0, 5).map((day) => (
                        <Button
                          key={day.date}
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] px-2"
                          disabled={scheduleMut.isPending}
                          onClick={() => scheduleMut.mutate({ jobId: job.id, date: day.date })}
                        >
                          {isAr ? day.labelAr.slice(0, 3) : day.label.slice(0, 3)}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </ManpowerPageShell>
  );
}

function JobRow({ job, compact }: { job: PlannerJobRow; isAr?: boolean; compact?: boolean }) {
  return (
    <div className={cn("flex flex-wrap justify-between gap-2", compact ? "" : "p-3")}>
      <div>
        <span className="font-mono text-[10px] text-muted-foreground">{job.number}</span>
        {!compact && <span className="text-[10px] ml-2 px-1.5 py-0.5 rounded bg-muted">{job.type}</span>}
        <p className={cn("font-semibold", compact ? "text-xs" : "text-sm")}>{job.title}</p>
        {job.functionalLocation && (
          <p className="text-[10px] text-muted-foreground">{job.functionalLocation.name}</p>
        )}
      </div>
      {!compact && (
        <span
          className={cn(
            "text-[10px] h-fit px-2 py-0.5 rounded-full font-medium",
            job.priority === "HIGH" ? "bg-red-500/10 text-red-600" : "bg-blue-500/10 text-blue-600"
          )}
        >
          {job.status}
        </span>
      )}
    </div>
  );
}
