"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Settings } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/context";
import { api, type ManpowerPolicy } from "@/lib/api";
import { ManpowerHeroHeader, ManpowerPageShell } from "@/components/dashboard/manpower-shell";

export default function ManpowerPolicyPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();
  const [form, setForm] = useState<ManpowerPolicy | null>(null);

  const { data: policy, isLoading } = useQuery({
    queryKey: ["manpower-policy", businessId],
    queryFn: async () => (await api.getManpowerPolicy(businessId)).data,
  });

  useEffect(() => {
    if (policy && !form) setForm(policy);
  }, [policy, form]);

  const saveMutation = useMutation({
    mutationFn: () => api.updateManpowerPolicy(businessId, form || {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manpower-policy", businessId] });
      toast.success(isAr ? "تم حفظ السياسات" : "Policies saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading || !form) {
    return <div className="p-6 text-sm text-muted-foreground">{isAr ? "جاري التحميل..." : "Loading..."}</div>;
  }

  const set = (patch: Partial<ManpowerPolicy>) => setForm({ ...form, ...patch });

  return (
    <ManpowerPageShell>
      <ManpowerHeroHeader
        title={isAr ? "سياسات Manpower" : "Manpower Policies"}
        subtitle={isAr ? "OT، الورديات، الاعتماد" : "OT rules, shifts, approval levels"}
        icon={Settings}
        actions={
          <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
            <Save className="w-4 h-4 me-2" />
            {isAr ? "حفظ" : "Save"}
          </Button>
        }
      />

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-sm">{isAr ? "وقت إضافي OT" : "Overtime Rules"}</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3 pb-4">
          <div>
            <label className="text-[10px] text-muted-foreground">{isAr ? "ساعات أساسية/يوم" : "Regular hours/day"}</label>
            <Input type="number" className="h-8 text-xs mt-1" value={form.regularHoursPerDay} onChange={(e) => set({ regularHoursPerDay: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">{isAr ? "مضاعف OT" : "OT multiplier"}</label>
            <Input type="number" step="0.1" className="h-8 text-xs mt-1" value={form.overtimeMultiplier} onChange={(e) => set({ overtimeMultiplier: Number(e.target.value) })} />
          </div>
          <label className="sm:col-span-2 flex items-center gap-2 text-xs">
            <input type="checkbox" checked={form.autoCalculateOvertime} onChange={(e) => set({ autoCalculateOvertime: e.target.checked })} />
            {isAr ? "حساب OT تلقائياً" : "Auto-calculate OT after daily threshold"}
          </label>
          <label className="sm:col-span-2 flex items-center gap-2 text-xs">
            <input type="checkbox" checked={form.equalizeOvertime} onChange={(e) => set({ equalizeOvertime: e.target.checked })} />
            {isAr ? "توازن OT بين العمال" : "Equalize overtime across workers"}
          </label>
          <div>
            <label className="text-[10px] text-muted-foreground">{isAr ? "حد الإرهاق/أسبوع" : "Fatigue threshold/week"}</label>
            <Input type="number" className="h-8 text-xs mt-1" value={form.fatigueOtThresholdWeekly} onChange={(e) => set({ fatigueOtThresholdWeekly: Number(e.target.value) })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-sm">{isAr ? "مسار الاعتماد" : "Approval Workflow"}</CardTitle></CardHeader>
        <CardContent className="space-y-2 pb-4">
          {(["SITE_MANAGER", "ADMIN", "PAYROLL"] as const).map((level) => (
            <label key={level} className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={form.approvalLevels.includes(level)}
                onChange={(e) => {
                  const levels = e.target.checked
                    ? [...form.approvalLevels, level]
                    : form.approvalLevels.filter((l) => l !== level);
                  set({ approvalLevels: levels });
                }}
              />
              {level === "SITE_MANAGER" ? (isAr ? "مشرف الموقع" : "Site Manager") : level === "ADMIN" ? (isAr ? "الإدارة" : "Admin") : (isAr ? "الرواتب" : "Payroll")}
            </label>
          ))}
          <div>
            <label className="text-[10px] text-muted-foreground">{isAr ? "تذكير SMS/email بعد (ساعات)" : "Reminder after (hours)"}</label>
            <Input type="number" className="h-8 text-xs mt-1 w-32" value={form.autoReminderHours} onChange={(e) => set({ autoReminderHours: Number(e.target.value) })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-sm">{isAr ? "أوقات الوردية" : "Shift Timings"}</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 pb-4">
          <Input type="time" className="h-8 text-xs" value={form.shiftStart} onChange={(e) => set({ shiftStart: e.target.value })} />
          <Input type="time" className="h-8 text-xs" value={form.shiftEnd} onChange={(e) => set({ shiftEnd: e.target.value })} />
        </CardContent>
      </Card>
    </ManpowerPageShell>
  );
}
