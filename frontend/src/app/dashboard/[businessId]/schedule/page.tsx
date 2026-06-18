"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api, BusinessMember } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function SchedulePage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    memberId: "",
    date: new Date().toISOString().slice(0, 10),
    startTime: "09:00",
    endTime: "17:00",
    notes: "",
  });

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ["shifts", businessId],
    queryFn: async () => (await api.getShifts(businessId)).data ?? [],
  });

  const { data: members = [] } = useQuery({
    queryKey: ["workforce-members", businessId],
    queryFn: async () => (await api.getWorkforceMembers(businessId)).data ?? [],
  });

  const createMutation = useMutation({
    mutationFn: () => api.createShift(businessId, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shifts", businessId] });
      toast.success(isAr ? "تمت إضافة الوردية" : "Shift created");
      setShowForm(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const staffMembers = members.filter((m: BusinessMember) => m.role !== "OWNER");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t(locale, "dashboard", "schedule")}</h1>
          <p className="text-sm text-muted-foreground">
            {isAr ? "جدول ورديات الفريق" : "Team shift schedule"}
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 me-2" />
          {isAr ? "وردية جديدة" : "New Shift"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{isAr ? "إضافة وردية" : "Add Shift"}</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">{isAr ? "الموظف" : "Member"}</label>
              <select
                className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={form.memberId}
                onChange={(e) => setForm({ ...form, memberId: e.target.value })}
              >
                <option value="">{isAr ? "اختر..." : "Select..."}</option>
                {staffMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.user?.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{isAr ? "التاريخ" : "Date"}</label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{isAr ? "البداية" : "Start"}</label>
              <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{isAr ? "النهاية" : "End"}</label>
              <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground">{isAr ? "ملاحظات" : "Notes"}</label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex items-end gap-2">
              <Button
                onClick={() => form.memberId && createMutation.mutate()}
                loading={createMutation.isPending}
                disabled={!form.memberId}
              >
                {t(locale, "dashboard", "save")}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                {t(locale, "dashboard", "cancel")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : shifts.length === 0 ? (
        <Card className="p-8 text-center">
          <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">{t(locale, "dashboard", "noData")}</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {shifts.map((shift) => (
            <Card key={shift.id}>
              <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{shift.member?.user?.name || shift.memberId}</p>
                  <p className="text-sm text-muted-foreground">{formatDate(shift.date)}</p>
                </div>
                <div className="text-sm font-medium">
                  {shift.startTime} – {shift.endTime}
                </div>
                {shift.notes && <p className="text-xs text-muted-foreground w-full">{shift.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
