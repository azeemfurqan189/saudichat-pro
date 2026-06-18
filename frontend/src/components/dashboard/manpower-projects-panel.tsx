"use client";

import { ALL_OIL_GAS_CATEGORIES, categoryColor } from "@/lib/manpower-categories";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FolderKanban, MapPin, Users, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { ManpowerStatCard, ManpowerGlassCard } from "./manpower-shell";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-500/10 text-green-600",
  DRAFT: "bg-muted text-muted-foreground",
  ON_HOLD: "bg-amber-500/10 text-amber-600",
  COMPLETED: "bg-blue-500/10 text-blue-600",
};

export function ManpowerProjectsPanel({
  businessId,
  isAr,
  compact = false,
}: {
  businessId: string;
  isAr: boolean;
  compact?: boolean;
}) {
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["manpower-projects", businessId],
    queryFn: async () => (await api.getManpowerProjects(businessId)).data ?? [],
  });

  const { data: analytics } = useQuery({
    queryKey: ["manpower-analytics", businessId],
    queryFn: async () => (await api.getManpowerAnalytics(businessId)).data,
  });

  const activeProjects = projects.filter((p) => p.status === "ACTIVE").length;
  const totalWorkersOnProjects = projects.reduce((s, p) => s + (p.stats?.activeWorkers ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ManpowerStatCard label={isAr ? "إجمالي المشاريع" : "Total Projects"} value={projects.length} accent="from-slate-500/15 to-gray-500/5" />
        <ManpowerStatCard label={isAr ? "مشاريع نشطة" : "Active Projects"} value={activeProjects} accent="from-emerald-500/15 to-green-500/5" />
        <ManpowerStatCard label={isAr ? "عمال على المواقع" : "Workers On Sites"} value={totalWorkersOnProjects} accent="from-blue-500/15 to-indigo-500/5" />
        <ManpowerStatCard label={isAr ? "ساعات معلقة" : "Pending Hours"} value={`${analytics?.pendingHours ?? 0}h`} accent="from-amber-500/15 to-orange-500/5" />
      </div>

      {(analytics?.workersByCategory?.length ?? 0) > 0 && (
        <ManpowerGlassCard
          title={isAr ? "التصنيفات على الموقع" : "Trades on Site"}
          icon={Users}
          action={
            <span className="text-[10px] text-muted-foreground">
              {ALL_OIL_GAS_CATEGORIES.length}+ {isAr ? "متاح" : "available"}
            </span>
          }
        >
          <div className="flex flex-wrap gap-2">
            {analytics?.workersByCategory?.map((item) => (
              <Link
                key={item.category}
                href={`/dashboard/${businessId}/workers`}
                className={cn("text-xs px-3 py-1.5 rounded-full font-medium hover:opacity-90 transition-opacity", categoryColor(item.category))}
              >
                {item.category} <strong className="ms-1">{item.count}</strong>
              </Link>
            ))}
          </div>
        </ManpowerGlassCard>
      )}

      <ManpowerGlassCard
        title={isAr ? "المشاريع الجارية" : "Live Projects"}
        icon={FolderKanban}
        action={
          <Link href={`/dashboard/${businessId}/projects`} className="text-xs text-primary hover:underline flex items-center gap-1">
            {isAr ? "كل المشاريع" : "All projects"}
            <ArrowRight className="w-3 h-3" />
          </Link>
        }
      >
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{isAr ? "جاري التحميل..." : "Loading..."}</p>
          ) : projects.length === 0 ? (
            <div className="text-center py-6 space-y-2">
              <p className="text-sm text-muted-foreground">
                {isAr ? "لا توجد مشاريع بعد" : "No projects yet"}
              </p>
              <Button size="sm" asChild>
                <Link href={`/dashboard/${businessId}/projects`}>
                  {isAr ? "إنشاء مشروع" : "Create Project"}
                </Link>
              </Button>
            </div>
          ) : (
            projects.slice(0, compact ? 3 : 6).map((project) => (
              <Link
                key={project.id}
                href={`/dashboard/${businessId}/projects/${project.id}`}
                className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium truncate">{project.name}</p>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full", STATUS_COLORS[project.status])}>
                      {project.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {project.clientCompany?.name}
                    {(project.siteName || project.city) && (
                      <>
                        {" · "}
                        <MapPin className="w-3 h-3 inline" /> {[project.siteName, project.city].filter(Boolean).join(", ")}
                      </>
                    )}
                  </p>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground shrink-0">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {project.stats?.activeWorkers ?? 0}/{project.headcount ?? "—"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {project.stats?.totalHours ?? 0}h
                  </span>
                  {project.startDate && !compact && (
                    <span>{formatDate(project.startDate)}</span>
                  )}
                </div>
              </Link>
            ))
          )}
      </ManpowerGlassCard>
    </div>
  );
}
