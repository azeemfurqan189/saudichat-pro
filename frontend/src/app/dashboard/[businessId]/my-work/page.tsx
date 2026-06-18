"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckSquare, LogIn, LogOut, MapPin, FolderKanban, Activity } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import {
  ManpowerHeroHeader,
  ManpowerPageShell,
  ManpowerStatCard,
} from "@/components/dashboard/manpower-shell";
import { ManpowerTeamPulse } from "@/components/dashboard/manpower-team-pulse";

export default function MyWorkPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();

  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.getMe()).data,
  });
  const role = meData?.businesses?.find((b) => b.id === businessId)?.memberRole;
  const isLeader = role === "OWNER" || role === "MANAGER";

  const { data, isLoading } = useQuery({
    queryKey: ["my-work", businessId],
    queryFn: async () => (await api.getMyWork(businessId)).data,
    enabled: !isLeader,
  });

  const checkInMutation = useMutation({
    mutationFn: () => api.checkIn(businessId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-work", businessId] });
      toast.success(isAr ? "تم تسجيل الحضور" : "Checked in");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const checkOutMutation = useMutation({
    mutationFn: () => api.checkOut(businessId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-work", businessId] });
      toast.success(isAr ? "تم تسجيل الانصراف" : "Checked out");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const checkedIn = !!data?.attendance?.checkInAt && !data?.attendance?.checkOutAt;

  if (isLeader) {
    return (
      <ManpowerPageShell>
        <ManpowerHeroHeader
          locale={locale}
          icon={Activity}
          title={t(locale, "dashboard", "myWork")}
          subtitle={
            isAr
              ? "مالك/مشرف — شوف كل الفريق: حضور المكتب، العمال على المواقع، الورديات والمهام"
              : "Owner/Manager view — see entire team: office check-ins, site workers, shifts & tasks"
          }
        />
        <ManpowerTeamPulse businessId={businessId} isAr={isAr} />
      </ManpowerPageShell>
    );
  }

  return (
    <ManpowerPageShell>
      <ManpowerHeroHeader
        locale={locale}
        icon={Activity}
        title={isAr ? "عملي" : "My Work"}
        subtitle={isAr ? "مهامك ومحادثاتك وورديتك اليوم" : "Your tasks, chats, and shift today"}
        actions={
          !checkedIn ? (
            <Button onClick={() => checkInMutation.mutate()} loading={checkInMutation.isPending}>
              <LogIn className="w-4 h-4 me-2" />
              {isAr ? "تسجيل حضور" : "Check In"}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => checkOutMutation.mutate()} loading={checkOutMutation.isPending}>
              <LogOut className="w-4 h-4 me-2" />
              {isAr ? "تسجيل انصراف" : "Check Out"}
            </Button>
          )
        }
      />
      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : (
        <>
          {data?.project && (
            <Card className="rounded-[10px] border-[#E8E8E8] bg-white">
              <CardContent className="p-4 flex flex-wrap items-start gap-4">
                <div className="w-9 h-9 rounded-lg bg-[#1D9E75] flex items-center justify-center shrink-0">
                  <FolderKanban className="w-[18px] h-[18px] text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.06em] text-[#9a9a9a] font-medium">
                    {isAr ? "مشروعك الحالي" : "Your current project"}
                  </p>
                  <p className="font-semibold text-[15px] text-[#1a1a1a]">{data.project.name}</p>
                  {data.project.clientName && (
                    <p className="text-[13px] text-[#5c5c5c]">{data.project.clientName}</p>
                  )}
                  {(data.siteLocation || data.project.siteName) && (
                    <p className="text-[13px] flex items-center gap-1 mt-2 text-[#5c5c5c]">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      {data.siteLocation || data.project.siteName}
                    </p>
                  )}
                </div>
                {data.project.id && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/${businessId}/projects/${data.project.id}`}>
                      {isAr ? "تفاصيل" : "Details"}
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid md:grid-cols-3 gap-4">
            <ManpowerStatCard label={isAr ? "ورديات" : "Shifts"} value={data?.shifts?.length ?? 0} />
            <ManpowerStatCard label={t(locale, "dashboard", "tasks")} value={data?.tasks?.length ?? 0} />
            <ManpowerStatCard label={t(locale, "dashboard", "conversations")} value={data?.conversations?.length ?? 0} />
          </div>

          {data?.shifts && data.shifts.length > 0 && (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">{t(locale, "dashboard", "schedule")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.shifts.map((shift) => (
                  <div key={shift.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                    <span>{formatDate(shift.date)}</span>
                    <span className="font-medium">
                      {shift.startTime} – {shift.endTime}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{t(locale, "dashboard", "tasks")}</CardTitle>
              <Button variant="link" size="sm" asChild>
                <Link href={`/dashboard/${businessId}/tasks`}>{isAr ? "عرض الكل" : "View all"}</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {(data?.tasks ?? []).length === 0 ? (
                <p className="text-muted-foreground text-sm">{t(locale, "dashboard", "noData")}</p>
              ) : (
                data?.tasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                    <CheckSquare className={cn("w-4 h-4", task.status === "DONE" ? "text-green-500" : "text-muted-foreground")} />
                    <div className="flex-1">
                      <p className="font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{task.status}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </ManpowerPageShell>
  );
}
