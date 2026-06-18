"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LogIn, LogOut, Clock } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { ManpowerHeroHeader, ManpowerPageShell } from "@/components/dashboard/manpower-shell";

export default function AttendancePage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["attendance", businessId],
    queryFn: async () => (await api.getAttendance(businessId)).data ?? [],
  });

  const { data: myWork } = useQuery({
    queryKey: ["my-work", businessId],
    queryFn: async () => (await api.getMyWork(businessId)).data,
  });

  const checkInMutation = useMutation({
    mutationFn: () => api.checkIn(businessId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance", businessId] });
      qc.invalidateQueries({ queryKey: ["my-work", businessId] });
      toast.success(isAr ? "تم تسجيل الحضور" : "Checked in");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const checkOutMutation = useMutation({
    mutationFn: () => api.checkOut(businessId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance", businessId] });
      qc.invalidateQueries({ queryKey: ["my-work", businessId] });
      toast.success(isAr ? "تم تسجيل الانصراف" : "Checked out");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const checkedIn = !!myWork?.attendance?.checkInAt && !myWork?.attendance?.checkOutAt;

  return (
    <ManpowerPageShell>
      <ManpowerHeroHeader
        title={t(locale, "dashboard", "attendance")}
        subtitle={isAr ? "سجل الحضور والانصراف" : "Check-in and attendance records"}
        icon={Clock}
        actions={
          <div className="flex gap-2">
            {!checkedIn ? (
              <Button onClick={() => checkInMutation.mutate()} loading={checkInMutation.isPending}>
                <LogIn className="w-4 h-4 me-2" />
                {isAr ? "تسجيل حضور" : "Check In"}
              </Button>
            ) : (
              <Button variant="outline" onClick={() => checkOutMutation.mutate()} loading={checkOutMutation.isPending}>
                <LogOut className="w-4 h-4 me-2" />
                {isAr ? "تسجيل انصراف" : "Check Out"}
              </Button>
            )}
          </div>
        }
      />

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : records.length === 0 ? (
        <Card className="p-8 text-center">
          <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">{t(locale, "dashboard", "noData")}</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {records.map((record) => (
            <Card key={record.id}>
              <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{record.member?.user?.name || record.memberId}</p>
                  <p className="text-sm text-muted-foreground">{formatDate(record.date)}</p>
                </div>
                <div className="flex gap-4 text-sm">
                  <span>
                    {isAr ? "دخول" : "In"}:{" "}
                    {record.checkInAt
                      ? new Date(record.checkInAt).toLocaleTimeString(isAr ? "ar-SA" : "en-US", { hour: "2-digit", minute: "2-digit" })
                      : "—"}
                  </span>
                  <span>
                    {isAr ? "خروج" : "Out"}:{" "}
                    {record.checkOutAt
                      ? new Date(record.checkOutAt).toLocaleTimeString(isAr ? "ar-SA" : "en-US", { hour: "2-digit", minute: "2-digit" })
                      : "—"}
                  </span>
                </div>
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    record.status === "PRESENT" ? "bg-green-100 text-green-700" : "bg-muted"
                  )}
                >
                  {record.status}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </ManpowerPageShell>
  );
}
