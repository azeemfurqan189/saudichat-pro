"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  Brain,
  Download,
  HardHat,
  MessageSquare,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api, type AttentionItem, type CompanyReminder } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ManpowerDemoBanner } from "@/components/dashboard/manpower-demo-banner";
import { ReminderNotificationPanel } from "@/components/dashboard/reminder-notification-panel";
import { reminderItemKey } from "@/lib/reminder-notify-types";
import {
  ManpowerHeroHeader,
  ManpowerPageShell,
  ManpowerStatCard,
} from "@/components/dashboard/manpower-shell";

const SEV: Record<string, string> = {
  CRITICAL: "bg-red-500/15 text-red-600 border-red-500/30",
  HIGH: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  MEDIUM: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  LOW: "bg-muted text-muted-foreground border-border",
};

function ItemRow({ item, businessId }: { item: AttentionItem; businessId: string }) {
  const inner = (
    <div className="flex items-start justify-between gap-2 py-2 border-b border-border/50 last:border-0">
      <div className="min-w-0">
        <p className="text-xs font-medium leading-snug">{item.title}</p>
        {item.detail && <p className="text-[10px] text-muted-foreground mt-0.5">{item.detail}</p>}
      </div>
      <span className={cn("text-[9px] px-1.5 py-0.5 rounded border shrink-0", SEV[item.severity])}>
        {item.severity}
      </span>
    </div>
  );
  if (item.href) {
    return (
      <Link href={`/dashboard/${businessId}${item.href}`} className="block hover:bg-muted/40 rounded px-1 -mx-1">
        {inner}
      </Link>
    );
  }
  return inner;
}

export default function CommandCenterPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [reminderForm, setReminderForm] = useState({ title: "", type: "subscription", dueDate: "" });

  const { data: briefing, isLoading } = useQuery({
    queryKey: ["command-center", businessId],
    queryFn: async () => (await api.getCommandCenter(businessId)).data,
    refetchInterval: 60000,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["manpower-projects", businessId],
    queryFn: async () => (await api.getManpowerProjects(businessId)).data ?? [],
  });

  const { data: reminders = [] } = useQuery({
    queryKey: ["company-reminders", businessId],
    queryFn: async () => (await api.getCompanyReminders(businessId)).data ?? [],
  });

  const askMutation = useMutation({
    mutationFn: (q: string) => api.askCompany(businessId, q),
    onSuccess: (res) => {
      setAnswer(res.data?.answer || "");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reminderMutation = useMutation({
    mutationFn: () =>
      api.saveCompanyReminder(businessId, {
        ...reminderForm,
        status: "OPEN",
        id: crypto.randomUUID(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-reminders", businessId] });
      qc.invalidateQueries({ queryKey: ["command-center", businessId] });
      setReminderForm({ title: "", type: "subscription", dueDate: "" });
      toast.success(isAr ? "تمت الإضافة" : "Reminder added");
    },
  });

  const riskColor = useMemo(() => {
    if (!briefing) return "text-muted-foreground";
    if (briefing.riskScore >= 70) return "text-red-500";
    if (briefing.riskScore >= 45) return "text-orange-500";
    if (briefing.riskScore >= 25) return "text-amber-500";
    return "text-green-600";
  }, [briefing]);

  return (
    <ManpowerPageShell>
      <ManpowerHeroHeader
        locale={locale}
        icon={Sparkles}
        title={t(locale, "dashboard", "commandCenter")}
        subtitle={
          isAr
            ? "AI Chief of Staff — مخاطر، إيجاز، وما يحتاج قرارك اليوم"
            : "AI Chief of Staff — risk score, briefing & what needs your decision today"
        }
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={async () => {
              try {
                await api.downloadManpowerCeoReport(businessId);
                toast.success(isAr ? "تم التحميل" : "PDF downloaded");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed");
              }
            }}>
              <Download className="w-3.5 h-3.5 me-1" />
              {isAr ? "تقرير CEO" : "CEO PDF"}
            </Button>
          </div>
        }
      />

      <ManpowerDemoBanner businessId={businessId} isAr={isAr} projectCount={projects.length} />

      {isLoading || !briefing ? (
        <TableSkeleton rows={6} />
      ) : (
        <>
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="md:col-span-1">
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  {isAr ? "مؤشر المخاطر" : "Hidden Risk Score"}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center pb-4">
                <p className={cn("text-4xl font-bold", riskColor)}>{briefing.riskScore}</p>
                <p className="text-xs text-muted-foreground mt-1">{briefing.riskLevel}</p>
                <div className="mt-3 space-y-1 text-left">
                  {briefing.riskFactors.map((f) => (
                    <div key={f.label} className="flex justify-between text-[10px]">
                      <span>{f.label}</span>
                      <span>{f.score}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  {isAr ? "إيجاز الصباح" : "Morning Briefing"}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <pre className="text-xs whitespace-pre-wrap font-sans text-muted-foreground leading-relaxed">
                  {briefing.morningBrief}
                </pre>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-4 gap-3">
            <ManpowerStatCard label={isAr ? "اعتماد مشرف" : "Site approvals"} value={briefing.summary.pendingTimesheets} valueClassName="text-amber-600" />
            <ManpowerStatCard label={isAr ? "إدارة/رواتب" : "Admin/Payroll"} value={briefing.summary.pendingAdmin} valueClassName="text-orange-600" />
            <ManpowerStatCard label={isAr ? "إقامة تنتهي" : "Iqama expiring"} value={briefing.summary.iqamaExpiringCount} valueClassName="text-red-500" />
            <ManpowerStatCard label={isAr ? "عمال متاحون" : "Workers available"} value={briefing.resourceVisibility.workers.available} />
          </div>

          {briefing.cmmsKpis && (
            <div className="grid md:grid-cols-5 gap-3">
              <ManpowerStatCard label={isAr ? "أوامر عمل مفتوحة" : "Open WOs"} value={briefing.cmmsKpis.openWorkOrders} accent="border-blue-200 bg-blue-50/30" />
              <ManpowerStatCard label={isAr ? "PM متأخر" : "PM overdue"} value={briefing.cmmsKpis.pmOverdue} accent={briefing.cmmsKpis.pmOverdue > 0 ? "border-amber-200 bg-amber-50/40" : undefined} />
              <ManpowerStatCard label={isAr ? "تنبيهات CMMS" : "CMMS alerts"} value={briefing.cmmsKpis.cmmsAlerts} />
              <ManpowerStatCard label={isAr ? "ميزانية صيانة" : "Maint. budget"} value={briefing.cmmsKpis.maintenanceBudget > 0 ? `${Math.round(briefing.cmmsKpis.maintenanceBudget / 1000)}k` : "—"} />
              <ManpowerStatCard label={isAr ? "إجازات معلقة" : "Leave pending"} value={briefing.summary.pendingLeave ?? 0} accent={(briefing.summary.pendingLeave ?? 0) > 0 ? "border-violet-200 bg-violet-50/40" : undefined} />
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-4 h-4" />
                  {isAr ? "يتطلب انتباهك" : "Requires Your Attention"} ({briefing.attentionItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4 max-h-72 overflow-y-auto">
                {briefing.attentionItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{isAr ? "لا عناصر حرجة" : "All clear for now"}</p>
                ) : (
                  briefing.attentionItems.map((item) => (
                    <ItemRow key={item.id} item={item} businessId={businessId} />
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {isAr ? "رؤية الموارد" : "Resource Visibility"}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4 text-xs space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="font-bold">{briefing.resourceVisibility.workers.total}</p>
                    <p className="text-muted-foreground">{isAr ? "إجمالي العمال" : "Total workers"}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="font-bold text-green-600">{briefing.resourceVisibility.workers.available}</p>
                    <p className="text-muted-foreground">{isAr ? "متاح" : "Available"}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="font-bold">{briefing.resourceVisibility.workers.assigned}</p>
                    <p className="text-muted-foreground">{isAr ? "معيّن" : "Assigned"}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="font-bold">{briefing.resourceVisibility.placementsActive}</p>
                    <p className="text-muted-foreground">{isAr ? "تعيينات نشطة" : "Active placements"}</p>
                  </div>
                </div>
                <p className="text-muted-foreground pt-1">
                  {isAr ? "مشاريع نشطة:" : "Active projects:"} {briefing.resourceVisibility.projects.active}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                {isAr ? "اسأل شركتك أي شيء" : "Ask Company Anything"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pb-4">
              <div className="flex gap-2">
                <Input
                  placeholder={isAr ? "مثال: كم عامل متاح؟ أي مشروع ينتهي قريباً؟" : "e.g. How many workers available? Any project ending soon?"}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && question.trim() && askMutation.mutate(question.trim())}
                />
                <Button
                  onClick={() => question.trim() && askMutation.mutate(question.trim())}
                  loading={askMutation.isPending}
                  disabled={!question.trim()}
                >
                  <MessageSquare className="w-4 h-4" />
                </Button>
              </div>
              {answer && (
                <div className="rounded-lg bg-muted/50 p-3 text-xs whitespace-pre-wrap">{answer}</div>
              )}
            </CardContent>
          </Card>

          {briefing.ignoredItems.length > 0 && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">{isAr ? "ما يتم تجاهله" : "What Is Being Ignored?"}</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                {briefing.ignoredItems.map((item) => (
                  <ItemRow key={item.id} item={item} businessId={businessId} />
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <HardHat className="w-4 h-4" />
                {isAr ? "تذكيرات (اشتراكات / معدات / صيانة)" : "Reminders (subscriptions / equipment / maintenance)"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pb-4">
              <div className="flex flex-wrap gap-2">
                <Input className="flex-1 min-w-[140px] h-8 text-xs" placeholder={isAr ? "العنوان" : "Title"} value={reminderForm.title} onChange={(e) => setReminderForm({ ...reminderForm, title: e.target.value })} />
                <Input type="date" className="w-36 h-8 text-xs" value={reminderForm.dueDate} onChange={(e) => setReminderForm({ ...reminderForm, dueDate: e.target.value })} />
                <Button size="sm" className="h-8" disabled={!reminderForm.title} onClick={() => reminderMutation.mutate()} loading={reminderMutation.isPending}>
                  {isAr ? "إضافة" : "Add"}
                </Button>
              </div>
              {(reminders as CompanyReminder[]).length === 0 ? (
                <p className="text-xs text-muted-foreground">{isAr ? "لا تذكيرات" : "No reminders yet"}</p>
              ) : (
                <div className="space-y-1">
                  {(reminders as CompanyReminder[]).map((r) => (
                    <div key={r.id} className="space-y-2 border-b border-border/40 py-2 last:border-0">
                      <div className="flex justify-between text-xs">
                        <span>{r.title} <span className="text-muted-foreground">({r.type})</span></span>
                        <span className="text-muted-foreground">{r.dueDate?.slice(0, 10)}</span>
                      </div>
                      <ReminderNotificationPanel
                        businessId={businessId}
                        itemKey={reminderItemKey("company-reminder", r.id)}
                        isAr={isAr}
                        compact
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </ManpowerPageShell>
  );
}
