"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  Clock,
  FolderKanban,
  Mail,
  MapPin,
  Phone,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useApp } from "@/lib/context";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  ManpowerHeroHeader,
  ManpowerPageShell,
  ManpowerStatCard,
} from "@/components/dashboard/manpower-shell";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-[#EAF3DE] text-[#27500A]",
  DRAFT: "bg-[#EFEFEF] text-[#5c5c5c]",
  ON_HOLD: "bg-amber-50 text-amber-700",
  COMPLETED: "bg-blue-50 text-blue-700",
};

export default function ClientDashboardPage() {
  const { businessId, clientId } = useParams() as { businessId: string; clientId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";

  const { data: client, isLoading, isError } = useQuery({
    queryKey: ["manpower-client", businessId, clientId],
    queryFn: async () => (await api.getManpowerClient(businessId, clientId)).data,
  });

  const summary = client?.summary;
  const projects = client?.projects ?? [];

  if (isError) {
    return (
      <ManpowerPageShell>
        <div className="rounded-[10px] border border-[#E8E8E8] bg-white p-10 text-center">
          <p className="text-sm text-[#5c5c5c]">{isAr ? "العميل غير موجود" : "Client not found"}</p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href={`/dashboard/${businessId}/clients`}>
              <ArrowLeft className="w-4 h-4 me-1" />
              {isAr ? "رجوع" : "Back"}
            </Link>
          </Button>
        </div>
      </ManpowerPageShell>
    );
  }

  return (
    <ManpowerPageShell>
      <div className="flex items-center gap-2 mb-1">
        <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-[#5c5c5c]">
          <Link href={`/dashboard/${businessId}/clients`}>
            <ArrowLeft className="w-4 h-4 me-1" />
            {isAr ? "العملاء" : "Clients"}
          </Link>
        </Button>
      </div>

      <ManpowerHeroHeader
        icon={Building2}
        title={client?.name ?? (isLoading ? "…" : "—")}
        subtitle={
          isAr
            ? "لوحة العميل — مشاريع، عمال، وساعات العمل"
            : "Client dashboard — projects, workers & billable hours"
        }
        actions={
          client?.phone ? (
            <Button asChild variant="outline" size="sm">
              <a href={`tel:${client.phone}`}>
                <Phone className="w-3.5 h-3.5 me-1" />
                {isAr ? "اتصال" : "Call"}
              </a>
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : (
        <>
          {(client?.contactName || client?.email || client?.address) && (
            <div className="rounded-[10px] border border-[#E8E8E8] bg-white p-4 grid sm:grid-cols-3 gap-3 text-sm">
              {client.contactName && (
                <div>
                  <p className="text-[10px] uppercase text-[#9a9a9a] mb-0.5">{isAr ? "جهة الاتصال" : "Contact"}</p>
                  <p className="font-medium text-[#1a1a1a]">{client.contactName}</p>
                </div>
              )}
              {client.phone && (
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 text-[#9a9a9a] mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase text-[#9a9a9a] mb-0.5">{isAr ? "الجوال" : "Phone"}</p>
                    <p>{client.phone}</p>
                  </div>
                </div>
              )}
              {client.email && (
                <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 text-[#9a9a9a] mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase text-[#9a9a9a] mb-0.5">Email</p>
                    <p className="truncate">{client.email}</p>
                  </div>
                </div>
              )}
              {client.address && (
                <div className="sm:col-span-3 flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#9a9a9a] mt-0.5 shrink-0" />
                  <p className="text-[#5c5c5c]">{client.address}</p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <ManpowerStatCard label={isAr ? "المشاريع" : "Projects"} value={summary?.totalProjects ?? 0} />
            <ManpowerStatCard label={isAr ? "نشطة" : "Active"} value={summary?.activeProjects ?? 0} accent="border-[#1D9E75]/30 bg-[#EAF3DE]/30" />
            <ManpowerStatCard label={isAr ? "عمال على الموقع" : "Workers on site"} value={summary?.totalWorkers ?? 0} />
            <ManpowerStatCard label={isAr ? "ساعات معتمدة" : "Total hours"} value={Math.round(summary?.totalHours ?? 0)} sub={summary?.pendingTimesheets ? `${summary.pendingTimesheets} ${isAr ? "معلقة" : "pending TS"}` : undefined} />
          </div>

          <div className="rounded-[10px] border border-[#E8E8E8] bg-white overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8E8E8] bg-[#FAFAF8]">
              <p className="text-[13px] font-medium text-[#1a1a1a]">
                {isAr ? "مشاريع هذا العميل" : "Projects for this client"}
              </p>
              <span className="text-[11px] text-[#9a9a9a]">{projects.length} {isAr ? "مشروع" : "total"}</span>
            </div>

            {projects.length === 0 ? (
              <div className="p-10 text-center">
                <FolderKanban className="w-10 h-10 mx-auto text-[#9a9a9a] mb-2" />
                <p className="text-sm text-[#5c5c5c] mb-3">
                  {isAr ? "لا مشاريع مرتبطة بهذا العميل" : "No projects linked to this client yet"}
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/dashboard/${businessId}/projects`}>
                    {isAr ? "إنشاء مشروع" : "Create project"}
                  </Link>
                </Button>
              </div>
            ) : (
              projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/dashboard/${businessId}/projects/${project.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 border-b border-[#E8E8E8] last:border-0 hover:bg-[#FAFAF8] transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      {project.code && (
                        <span className="font-mono text-[10px] text-[#9a9a9a]">{project.code}</span>
                      )}
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", STATUS_COLORS[project.status] ?? STATUS_COLORS.DRAFT)}>
                        {project.status}
                      </span>
                    </div>
                    <p className="font-medium text-[#1a1a1a] group-hover:text-[#1D9E75]">{project.name}</p>
                    {(project.siteName || project.city) && (
                      <p className="text-[11px] text-[#9a9a9a] flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {[project.siteName, project.city].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[#5c5c5c] shrink-0">
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {project.stats?.activeWorkers ?? 0}
                      {project.headcount != null && ` / ${project.headcount}`}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {Math.round(project.stats?.totalHours ?? 0)}h
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#9a9a9a] group-hover:text-[#1D9E75]" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </>
      )}
    </ManpowerPageShell>
  );
}
