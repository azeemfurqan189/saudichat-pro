"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, UserCog, Calendar, CheckSquare, ArrowRight, FolderKanban, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api, BusinessMember } from "@/lib/api";
import { cn, getInitials } from "@/lib/utils";
import { getIndustryCategory, normalizeBusinessType } from "@/lib/industry-config";

const ROLE_LABELS: Record<string, { en: string; ar: string }> = {
  OWNER: { en: "Owner", ar: "مالك" },
  MANAGER: { en: "Manager", ar: "مشرف" },
  OFFICE_STAFF: { en: "Office Staff", ar: "موظف مكتب" },
  FIELD_WORKER: { en: "Field Worker", ar: "عامل ميداني" },
};

export default function WorkforcePage() {
  const { businessId } = useParams() as { businessId: string };
  const router = useRouter();
  const { locale } = useApp();
  const isAr = locale === "ar";

  const { data: business } = useQuery({
    queryKey: ["business", businessId],
    queryFn: async () => (await api.getBusiness(businessId)).data,
  });

  const isManpower =
    business?.type && getIndustryCategory(normalizeBusinessType(business.type)) === "manpower";

  useEffect(() => {
    if (isManpower) {
      router.replace(`/dashboard/${businessId}/command-center`);
    }
  }, [isManpower, businessId, router]);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["workforce-stats", businessId],
    queryFn: async () => (await api.getWorkforceStats(businessId)).data,
    enabled: !isManpower,
  });

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["workforce-members", businessId],
    queryFn: async () => (await api.getWorkforceMembers(businessId)).data ?? [],
    enabled: !isManpower,
  });

  const { data: agencyStats } = useQuery({
    queryKey: ["manpower-analytics", businessId],
    queryFn: async () => (await api.getManpowerAnalytics(businessId)).data,
    enabled: !isManpower,
  });

  if (isManpower) {
    return null;
  }

  const loading = statsLoading || membersLoading;

  const statCards = [
    { key: "totalMembers", label: isAr ? "إجمالي الفريق" : "Total Team", icon: Users, value: stats?.totalMembers ?? 0 },
    { key: "managers", label: isAr ? "المشرفون" : "Managers", icon: UserCog, value: stats?.managers ?? 0 },
    { key: "todayShifts", label: isAr ? "ورديات اليوم" : "Today's Shifts", icon: Calendar, value: stats?.todayShifts ?? 0 },
    { key: "openTasks", label: isAr ? "مهام مفتوحة" : "Open Tasks", icon: CheckSquare, value: stats?.openTasks ?? 0 },
  ];

  const grouped = members.reduce<Record<string, BusinessMember[]>>((acc, m) => {
    const key = m.role;
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t(locale, "dashboard", "workforce")}</h1>
          <p className="text-sm text-muted-foreground">
            {isAr ? "نافذة واحدة — الفريق كامل متصل" : "Single window — your whole team connected"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/${businessId}/projects`}>{t(locale, "dashboard", "projects")}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/dashboard/${businessId}/schedule`}>{t(locale, "dashboard", "schedule")}</Link>
          </Button>
          <Button asChild>
            <Link href={`/dashboard/${businessId}/staff`}>{t(locale, "dashboard", "staff")}</Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={4} />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map(({ key, label, icon: Icon, value }) => (
              <Card key={key}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {agencyStats && (
            <>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FolderKanban className="w-5 h-5" />
                {isAr ? "تحليلات الوكالة" : "Agency Analytics"}
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-2xl font-bold">{agencyStats.activeProjects}</p>
                    <p className="text-xs text-muted-foreground">{isAr ? "مشاريع نشطة" : "Active Projects"}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-2xl font-bold">{agencyStats.utilizationPercent}%</p>
                    <p className="text-xs text-muted-foreground">{isAr ? "استخدام العمال" : "Worker Utilization"}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-2xl font-bold">{agencyStats.pendingHours}h</p>
                    <p className="text-xs text-muted-foreground">{isAr ? "ساعات معلقة" : "Pending Hours"}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-2xl font-bold">{agencyStats.activePlacements}</p>
                    <p className="text-xs text-muted-foreground">{isAr ? "تعيينات نشطة" : "Active Placements"}</p>
                  </CardContent>
                </Card>
              </div>

              {(agencyStats.expiringIqamas?.length ?? 0) > 0 && (
                <Card className="border-amber-500/30">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2 text-amber-600">
                      <AlertTriangle className="w-4 h-4" />
                      {isAr ? "تنبيهات الإقامة (30 يوم)" : "Iqama Expiry Alerts (30 days)"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {agencyStats.expiringIqamas.map((w) => (
                      <div key={w.id} className="flex justify-between text-sm p-2 rounded-lg bg-muted/50">
                        <span>{w.name}</span>
                        <span className="text-muted-foreground">{w.iqamaExpiry?.slice(0, 10)}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {(["OWNER", "MANAGER", "OFFICE_STAFF", "FIELD_WORKER"] as const).map((role) => {
            const list = grouped[role] ?? [];
            if (list.length === 0) return null;
            return (
              <Card key={role}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {isAr ? ROLE_LABELS[role].ar : ROLE_LABELS[role].en} ({list.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {list.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
                    >
                      <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-bold">
                        {getInitials(member.user?.name || "?")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{member.user?.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {member.user?.phone}
                          {member.department ? ` · ${member.department}` : ""}
                        </p>
                      </div>
                      {member.manager?.user?.name && (
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {isAr ? "تحت" : "Reports to"}: {member.manager.user.name}
                        </span>
                      )}
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          member.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        )}
                      >
                        {member.isActive ? (isAr ? "نشط" : "Active") : isAr ? "معطل" : "Inactive"}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}

          {members.length === 0 && (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground mb-4">
                {isAr ? "لا يوجد أعضاء بعد — ادعُ فريقك" : "No team members yet — invite your team"}
              </p>
              <Button asChild>
                <Link href={`/dashboard/${businessId}/staff`}>
                  {isAr ? "دعوة موظف" : "Invite Staff"} <ArrowRight className="w-4 h-4 ms-2" />
                </Link>
              </Button>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
