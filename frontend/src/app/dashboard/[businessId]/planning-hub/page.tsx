"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GitBranch, Database } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api } from "@/lib/api";
import { ManpowerHeroHeader, ManpowerPageShell, ManpowerStatCard } from "@/components/dashboard/manpower-shell";
import { formatDate } from "@/lib/utils";

export default function PlanningHubPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();

  const { data: dash, isLoading } = useQuery({
    queryKey: ["planning-dashboard", businessId],
    queryFn: async () => (await api.getPlanningDashboard(businessId)).data,
  });

  const seedMut = useMutation({
    mutationFn: () => api.seedPlanningDemo(businessId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planning-dashboard", businessId] });
      qc.invalidateQueries({ queryKey: ["planning-projects", businessId] });
      toast.success(isAr ? "تم تحميل Demo التخطيط" : "Planning demo loaded");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const links = [
    { href: "/planning", key: "projectPlanning" as const, desc: isAr ? "WBS · Gantt · CPM · Baseline" : "WBS · Gantt · CPM · baseline" },
    { href: "/planning/simulation", key: "planningSimulation" as const, desc: isAr ? "Workers · Material · Crane · 100 scenarios" : "Workers · material · crane · batch scenarios" },
    { href: "/planning/risks", key: "planningRisk" as const, desc: isAr ? "Delay · Cost · Resource risk + SAR" : "Delay · cost · resource risk + SAR impact" },
    { href: "/planner", key: "workPlanner" as const, desc: isAr ? "7-day WO board (execution)" : "7-day work order board (execution)" },
  ];

  return (
    <ManpowerPageShell>
      <ManpowerHeroHeader
        icon={GitBranch}
        title={t(locale, "dashboard", "planningHub")}
        subtitle={
          isAr
            ? "المخطط يقرر — CMMS ينفّذ — Manpower يزوّد"
            : "Planning decides — CMMS executes — Manpower supplies"
        }
        actions={
          <Button variant="outline" size="sm" onClick={() => seedMut.mutate()} disabled={seedMut.isPending}>
            <Database className="w-4 h-4 mr-1" />
            {isAr ? "Demo تخطيط" : "Load planning demo"}
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ManpowerStatCard label={isAr ? "البرامج" : "Programs"} value={isLoading ? "—" : dash?.programCount ?? 0} />
        <ManpowerStatCard label={isAr ? "المشاريع" : "Projects"} value={dash?.projectCount ?? "—"} />
        <ManpowerStatCard
          label={isAr ? "Schedule Compliance" : "Schedule compliance"}
          value={dash ? `${dash.scheduleCompliancePct}%` : "—"}
          accent="from-green-500/10 to-transparent"
        />
        <ManpowerStatCard
          label={isAr ? "Critical path" : "Critical path"}
          value={dash?.criticalPathActivities ?? "—"}
          accent="from-red-500/10 to-transparent"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {links.map((l) => (
          <Link
            key={l.href}
            href={`/dashboard/${businessId}${l.href}`}
            className="rounded-[10px] border border-[#E8E8E8] bg-white p-4 hover:border-[#1D9E75]/40 transition-colors"
          >
            <p className="font-semibold text-sm">{t(locale, "dashboard", l.key)}</p>
            <p className="text-xs text-muted-foreground mt-1">{l.desc}</p>
          </Link>
        ))}
      </div>

      <div className="rounded-[10px] border border-[#E8E8E8] bg-white p-4">
        <p className="text-sm font-semibold mb-3">{isAr ? "مشاريع التخطيط" : "Schedule projects"}</p>
        <div className="space-y-2">
          {(dash?.recentProjects ?? []).map((p) => (
            <Link
              key={p.id}
              href={`/dashboard/${businessId}/planning`}
              className="flex flex-wrap justify-between gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-[#FAFAF8]"
            >
              <span className="font-medium">{p.name} {p.code ? `(${p.code})` : ""}</span>
              <span className="text-xs text-muted-foreground">
                {p.activityCount} {isAr ? "نشاط" : "activities"}
                {p.plannedFinish ? ` · ${formatDate(p.plannedFinish, locale)}` : ""}
              </span>
            </Link>
          ))}
          {!dash?.recentProjects?.length && (
            <p className="text-sm text-center text-muted-foreground py-6">
              {isAr ? "حمّل Demo للبدء" : "Load demo to start"}
            </p>
          )}
        </div>
      </div>
    </ManpowerPageShell>
  );
}
