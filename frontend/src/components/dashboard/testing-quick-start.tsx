"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Database, Loader2, LogIn, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api, DemoSeedResult } from "@/lib/api";
import { ManpowerGlassCard } from "@/components/dashboard/manpower-shell";

const DEMO_LOGINS = [
  { role: "Manager", roleAr: "مشرف", phone: "+966552000001", password: "Welcome123!" },
  { role: "Office Staff", roleAr: "موظف مكتب", phone: "+966552000002", password: "Welcome123!" },
  { role: "Field Worker", roleAr: "عامل ميداني", phone: "+966552000003", password: "Welcome123!" },
];

const TEST_STEPS = [
  {
    en: "Load demo data (button below) — 5 projects, 8 workers, CMMS, equipment",
    ar: "حمّل بيانات التجربة — 5 مشاريع، 8 عمال، CMMS، معدات",
  },
  {
    en: "Login as Owner → check Command Center, Projects, Timesheets",
    ar: "سجّل دخول كمالك → Command Center، المشاريع، الساعات",
  },
  {
    en: "Logout → login as Demo Manager (+966552000001) — test limited access",
    ar: "سجّل خروج → ادخل كمشرف تجريبي — اختبر الصلاحيات",
  },
  {
    en: "Staff → Invite Member → copy WhatsApp link → open /join link",
    ar: "الفريق → دعوة عضو → انسخ رابط واتساب → افتح رابط /join",
  },
  {
    en: "Project Access → add phone → grant permissions → test manager view",
    ar: "صلاحيات المشرفين → أضف جوال → امنح صلاحيات → اختبر العرض",
  },
  {
    en: "CMMS → Work Orders, Planner, Equipment — drag-drop kanban",
    ar: "CMMS → أوامر العمل، المخطط، المعدات — سحب وإفلات",
  },
];

export function TestingQuickStart({ businessId, isAr }: { businessId: string; isAr: boolean }) {
  const qc = useQueryClient();

  const demoMutation = useMutation({
    mutationFn: () => api.loadManpowerDemo(businessId, true),
    onSuccess: (res) => {
      const keys = [
        ["manpower-projects", businessId],
        ["manpower-clients", businessId],
        ["manpower-workers", businessId],
        ["manpower-analytics", businessId],
        ["manpower-timesheets", businessId],
        ["command-center", businessId],
        ["workforce-members", businessId],
        ["location-tree", businessId],
        ["work-orders", businessId],
        ["equipment", businessId],
      ];
      keys.forEach((key) => qc.invalidateQueries({ queryKey: key }));
      toast.success(res.data?.message || (isAr ? "تم تحميل بيانات التجربة" : "Demo data loaded"));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const result = demoMutation.data?.data as DemoSeedResult | undefined;

  return (
    <ManpowerGlassCard
      title={isAr ? "بدء الاختبار — Demo Data" : "Testing Quick Start — Demo Data"}
      icon={Database}
    >
      <p className="text-xs text-muted-foreground mb-4">
        {isAr
          ? "زر واحد يحمّل كل البيانات: SABIC، Aramco، NEOM مشاريع + عمال + حضور + CMMS + 3 حسابات تجريبية للدخول"
          : "One button loads everything: SABIC, Aramco, NEOM projects + workers + attendance + CMMS + 3 test login accounts"}
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        <Button
          size="sm"
          onClick={() => demoMutation.mutate()}
          disabled={demoMutation.isPending}
        >
          {demoMutation.isPending ? (
            <Loader2 className="w-4 h-4 me-1 animate-spin" />
          ) : (
            <Database className="w-4 h-4 me-1" />
          )}
          {isAr ? "تحميل كل Demo Data" : "Load All Demo Data"}
        </Button>
        {demoMutation.isSuccess && (
          <Button size="sm" variant="outline" onClick={() => demoMutation.mutate()} disabled={demoMutation.isPending}>
            <RefreshCw className="w-4 h-4 me-1" />
            {isAr ? "إعادة التحميل" : "Reload"}
          </Button>
        )}
      </div>

      {demoMutation.isSuccess && result?.message && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3 mb-4 flex gap-2 text-xs">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
          <span>{result.message}</span>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold mb-2 flex items-center gap-1">
            <LogIn className="w-3.5 h-3.5" />
            {isAr ? "حسابات تجريبية (بعد Load Demo)" : "Demo login accounts (after Load Demo)"}
          </p>
          <div className="rounded-lg border overflow-hidden text-[11px]">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-start p-2 font-medium">{isAr ? "الدور" : "Role"}</th>
                  <th className="text-start p-2 font-medium">{isAr ? "الجوال" : "Phone"}</th>
                  <th className="text-start p-2 font-medium">{isAr ? "كلمة المرور" : "Password"}</th>
                </tr>
              </thead>
              <tbody>
                {DEMO_LOGINS.map((row) => (
                  <tr key={row.phone} className="border-t border-border/50">
                    <td className="p-2">{isAr ? row.roleAr : row.role}</td>
                    <td className="p-2 font-mono" dir="ltr">
                      {row.phone}
                    </td>
                    <td className="p-2">
                      <code className="bg-muted px-1 rounded">{row.password}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            {isAr ? "صفحة الدخول: /login — الجوال + كلمة المرور" : "Login page: /login — phone + password"}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold mb-2">{isAr ? "خطوات الاختبار (A→Z)" : "Testing checklist (A→Z)"}</p>
          <ol className="space-y-2">
            {TEST_STEPS.map((step, i) => (
              <li key={i} className="flex gap-2 text-[11px] text-muted-foreground">
                <span className="font-bold text-primary shrink-0">{i + 1}.</span>
                <span>{isAr ? step.ar : step.en}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </ManpowerGlassCard>
  );
}
