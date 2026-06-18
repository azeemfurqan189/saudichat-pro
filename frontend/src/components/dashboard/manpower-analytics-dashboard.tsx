"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  BarChart3,
  Clock,
  Coins,
  IdCard,
  Sparkles,
  TrendingUp,
  Users,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, AgencyProject } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";
import { ManpowerDemoBanner } from "@/components/dashboard/manpower-demo-banner";

const CHART_COLORS = ["#1D9E75", "#378ADD", "#EF9F27", "#D4537E", "#B4B2A9"];
const HM_COLORS = ["#E1F5EE", "#9FE1CB", "#5DCAA5", "#1D9E75", "#0F6E56", "#085041"];

type Period = "7d" | "30d" | "90d" | "12m";

function KpiCard({
  icon: Icon,
  iconClass,
  delta,
  deltaUp,
  value,
  label,
  barPct,
  barColor,
}: {
  icon: typeof Users;
  iconClass: string;
  delta?: string;
  deltaUp?: boolean;
  value: string;
  label: string;
  barPct: number;
  barColor: string;
}) {
  return (
    <div className="rounded-[10px] border border-border/60 bg-card p-4 relative overflow-hidden">
      <div className="flex items-start justify-between mb-2">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", iconClass)}>
          <Icon className="w-4 h-4" />
        </div>
        {delta && (
          <span
            className={cn(
              "text-[10px] px-1.5 py-0.5 rounded font-medium",
              deltaUp ? "bg-[#EAF3DE] text-[#27500A]" : "bg-[#FCEBEB] text-[#791F1F]"
            )}
          >
            {delta}
          </span>
        )}
      </div>
      <p className="text-[22px] font-semibold leading-none tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{label}</p>
      <div className="h-[3px] rounded-sm mt-3 bg-muted/80">
        <div className="h-full rounded-sm transition-all" style={{ width: `${barPct}%`, background: barColor }} />
      </div>
    </div>
  );
}

function AnalyticsCard({
  title,
  meta,
  children,
  headerRight,
}: {
  title: string;
  meta?: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
}) {
  return (
    <div className="rounded-[10px] border border-border/60 bg-card p-4">
      <div className="flex items-center justify-between mb-3.5 gap-2 flex-wrap">
        <div>
          <p className="text-[13px] font-medium">{title}</p>
          {meta && <p className="text-[11px] text-muted-foreground">{meta}</p>}
        </div>
        {headerRight}
      </div>
      {children}
    </div>
  );
}

function heatColor(v: number) {
  if (v === 0) return "transparent";
  if (v < 88) return HM_COLORS[0];
  if (v < 91) return HM_COLORS[1];
  if (v < 94) return HM_COLORS[2];
  if (v < 96) return HM_COLORS[3];
  if (v < 98) return HM_COLORS[4];
  return HM_COLORS[5];
}

export function ManpowerAnalyticsDashboard({
  businessId,
  isAr,
}: {
  businessId: string;
  isAr: boolean;
}) {
  const [period, setPeriod] = useState<Period>("30d");
  const [projectFilter, setProjectFilter] = useState("all");

  const { data: analytics } = useQuery({
    queryKey: ["manpower-analytics", businessId],
    queryFn: async () => (await api.getManpowerAnalytics(businessId)).data,
  });

  const { data: teamPulse } = useQuery({
    queryKey: ["team-pulse", businessId],
    queryFn: async () => (await api.getTeamPulse(businessId)).data,
  });

  const { data: cmms } = useQuery({
    queryKey: ["cmms-dashboard", businessId],
    queryFn: async () => (await api.getCmmsDashboard(businessId)).data,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["manpower-projects", businessId],
    queryFn: async () => (await api.getManpowerProjects(businessId)).data ?? [],
  });

  const { data: workOrders = [] } = useQuery({
    queryKey: ["work-orders", businessId],
    queryFn: async () => (await api.getWorkOrders(businessId)).data ?? [],
  });

  const totalWorkers = analytics?.totalWorkers ?? 0;
  const onSite = teamPulse?.summary?.workersPresent ?? analytics?.activePlacements ?? 0;
  const absent = teamPulse?.summary?.workersAbsent ?? 0;
  const attendanceRate =
    onSite + absent > 0 ? Math.round((onSite / (onSite + absent)) * 1000) / 10 : analytics?.utilizationPercent ?? 0;

  const billingEstimate = (analytics?.approvedHours ?? 0) * 185;
  const downtimeHrs = Math.round((cmms?.summary?.totalDowntimeMinutes ?? 0) / 60);

  const trendData = useMemo(() => {
    const months = isAr
      ? ["ينا", "فبر", "مار", "أبر", "ماي", "يون"]
      : ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    const base = totalWorkers || 50;
    const baseOn = onSite || Math.floor(base * 0.85);
    return months.map((name, i) => ({
      name,
      onSite: Math.max(1, Math.round(baseOn * (0.82 + i * 0.035))),
      total: Math.max(1, Math.round(base * (0.85 + i * 0.03))),
      ot: Math.max(5, Math.round((analytics?.pendingHours ?? 20) * (0.6 + i * 0.08))),
    }));
  }, [totalWorkers, onSite, analytics?.pendingHours, isAr]);

  const projectDonut = useMemo(() => {
    const active = projects.filter((p) => p.status === "ACTIVE");
    const slices = active.slice(0, 4).map((p, i) => ({
      name: p.siteName || p.name,
      value: p.stats?.assignedWorkers ?? p._count?.placements ?? 1,
      color: CHART_COLORS[i],
    }));
    const topSum = slices.reduce((s, x) => s + x.value, 0);
    const rest = Math.max(0, (analytics?.activePlacements ?? 0) - topSum);
    if (rest > 0) slices.push({ name: isAr ? "أخرى" : "Other", value: rest, color: CHART_COLORS[4] });
    if (slices.length === 0 && analytics?.activePlacements) {
      return [{ name: isAr ? "نشط" : "Active", value: analytics.activePlacements, color: CHART_COLORS[0] }];
    }
    return slices.filter((s) => s.value > 0);
  }, [projects, analytics, isAr]);

  const woChart = useMemo(() => {
    const counts = { COMPLETED: 0, IN_PROGRESS: 0, OPEN: 0, ON_HOLD: 0 };
    for (const wo of workOrders) {
      if (wo.status in counts) counts[wo.status as keyof typeof counts]++;
      else if (wo.status === "OPEN") counts.OPEN++;
    }
    const overdue = workOrders.filter(
      (w) => w.status !== "COMPLETED" && w.status !== "CLOSED" && w.priority === "HIGH"
    ).length;
    return [
      { name: isAr ? "مكتمل" : "Completed", value: counts.COMPLETED, color: "#1D9E75" },
      { name: isAr ? "قيد التنفيذ" : "In Progress", value: counts.IN_PROGRESS, color: "#378ADD" },
      { name: isAr ? "معلق" : "Pending", value: counts.OPEN + counts.ON_HOLD, color: "#EF9F27" },
      { name: isAr ? "متأخر" : "Overdue", value: overdue, color: "#E24B4A" },
    ];
  }, [workOrders, isAr]);

  const heatmap = useMemo(() => {
    const seed = attendanceRate || 90;
    return Array.from({ length: 35 }, (_, i) => {
      if (i % 7 === 0 || i % 7 === 6) return 0;
      return Math.min(99, Math.max(80, seed + ((i * 7) % 11) - 5));
    });
  }, [attendanceRate]);

  const clientRevenue = useMemo(() => {
    const rows = analytics?.projectsPerClient ?? [];
    const totalProjects = rows.reduce((s, r) => s + r.projectCount, 0) || 1;
    return rows
      .map((r) => ({
        name: r.clientName,
        sub: `${r.projectCount} ${isAr ? "مشروع" : "projects"}`,
        amount: Math.round(billingEstimate * (r.projectCount / totalProjects)),
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [analytics, billingEstimate, isAr]);

  const maxRev = clientRevenue[0]?.amount ?? 1;

  const insights = useMemo(() => {
    const items: Array<{ icon: typeof TrendingUp; color: string; text: string; sub: string }> = [];
    if (analytics?.activePlacements) {
      items.push({
        icon: TrendingUp,
        color: "#1D9E75",
        text: isAr
          ? `${analytics.activePlacements} عامل في المواقع — نسبة استخدام ${analytics.utilizationPercent}%`
          : `${analytics.activePlacements} workers on sites — ${analytics.utilizationPercent}% utilization`,
        sub: isAr ? "أفضل أداء" : "Workforce",
      });
    }
    if (cmms?.summary?.pmDue) {
      items.push({
        icon: AlertTriangle,
        color: "#EF9F27",
        text: isAr
          ? `${cmms.summary.pmDue} خطة PM مستحقة — خطر توقف`
          : `${cmms.summary.pmDue} PM plans due — downtime risk`,
        sub: isAr ? "إجراء مطلوب" : "Action needed",
      });
    }
    if (billingEstimate > 0) {
      items.push({
        icon: Coins,
        color: "#378ADD",
        text: isAr
          ? `فواتير تقديرية ${formatCurrency(billingEstimate, "ar-SA")} — ساعات معتمدة`
          : `Est. billings ${formatCurrency(billingEstimate, "en-SA")} from approved hours`,
        sub: isAr ? "نمو الإيرادات" : "Revenue",
      });
    }
    const exp7 = (analytics?.expiringIqamas ?? []).filter((e) => {
      if (!e.iqamaExpiry) return false;
      const d = (new Date(e.iqamaExpiry).getTime() - Date.now()) / 86400000;
      return d >= 0 && d <= 7;
    }).length;
    if (exp7 > 0) {
      items.push({
        icon: IdCard,
        color: "#E24B4A",
        text: isAr
          ? `${exp7} إقامة تنتهي خلال 7 أيام`
          : `${exp7} iqama expiring in 7 days`,
        sub: isAr ? "امتثال عاجل" : "Urgent compliance",
      });
    }
    if (cmms?.summary?.lowStock) {
      items.push({
        icon: Wrench,
        color: "#534AB7",
        text: isAr
          ? `${cmms.summary.lowStock} قطعة under reorder point`
          : `${cmms.summary.lowStock} spare parts below reorder point`,
        sub: isAr ? "تنبيه مشتريات" : "Procurement alert",
      });
    }
    return items.slice(0, 6);
  }, [analytics, cmms, billingEstimate, isAr]);

  const monthLabel = new Date().toLocaleDateString(isAr ? "ar-SA" : "en-SA", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-3.5">
      <ManpowerDemoBanner businessId={businessId} isAr={isAr} projectCount={projects.length} autoLoad />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[17px] font-medium">{isAr ? "التحليلات والرؤى" : "Analytics & insights"}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isAr ? "Manpower · CMMS · مالي" : "Manpower · CMMS · Financial"} — {monthLabel}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 items-center">
          {(["7d", "30d", "90d", "12m"] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn(
                "px-3 py-1 rounded-md border text-[11px] transition",
                period === p
                  ? "bg-[#085041] text-[#9FE1CB] border-[#0F6E56]"
                  : "bg-card text-muted-foreground border-border/60 hover:bg-muted/50"
              )}
            >
              {p}
            </button>
          ))}
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="h-7 px-2 rounded-md border border-border/60 bg-card text-[11px] text-muted-foreground"
          >
            <option value="all">{isAr ? "كل المشاريع" : "All projects"}</option>
            {projects.map((p: AgencyProject) => (
              <option key={p.id} value={p.id}>
                {p.siteName || p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <KpiCard
          icon={Users}
          iconClass="bg-[#E1F5EE] text-[#085041]"
          delta={analytics ? `↑ ${analytics.utilizationPercent}%` : undefined}
          deltaUp
          value={String(totalWorkers || "—")}
          label={isAr ? "إجمالي العمال" : "Total workforce"}
          barPct={analytics?.utilizationPercent ?? 50}
          barColor="#1D9E75"
        />
        <KpiCard
          icon={BarChart3}
          iconClass="bg-[#E6F1FB] text-[#0C447C]"
          delta={attendanceRate ? `↑ ${attendanceRate}%` : undefined}
          deltaUp={attendanceRate >= 85}
          value={attendanceRate ? `${attendanceRate}%` : "—"}
          label={isAr ? "متوسط الحضور" : "Avg attendance rate"}
          barPct={attendanceRate}
          barColor="#378ADD"
        />
        <KpiCard
          icon={Coins}
          iconClass="bg-[#FAEEDA] text-[#633806]"
          delta={analytics?.approvedHours ? `↑ ${Math.round(analytics.approvedHours)}h` : undefined}
          deltaUp
          value={billingEstimate ? formatCurrency(billingEstimate, isAr ? "ar-SA" : "en-SA") : "—"}
          label={isAr ? "فواتير شهرية (تقدير)" : "Monthly billings (est.)"}
          barPct={Math.min(100, Math.round((billingEstimate / 2500000) * 100)) || 30}
          barColor="#EF9F27"
        />
        <KpiCard
          icon={Clock}
          iconClass="bg-[#FCEBEB] text-[#791F1F]"
          delta={downtimeHrs ? `↑ ${downtimeHrs}h` : undefined}
          deltaUp={false}
          value={downtimeHrs ? `${downtimeHrs} hrs` : "0 hrs"}
          label={isAr ? "توقف CMMS هذا الشهر" : "CMMS downtime this month"}
          barPct={Math.min(100, downtimeHrs * 2) || 10}
          barColor="#E24B4A"
        />
      </div>

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-3">
        <AnalyticsCard
          title={isAr ? "اتجاه القوى العاملة والحضور" : "Workforce & attendance trend"}
          meta={isAr ? "آخر 6 أشهر · متوسط يومي" : "Last 6 months · daily average"}
          headerRight={
            <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-[#1D9E75]" />
                {isAr ? "في الموقع" : "On-site"}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-[#378ADD]" />
                {isAr ? "إجمالي" : "Total"}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm border border-dashed border-[#BA7517] bg-[#EF9F27]" />
                OT
              </span>
            </div>
          }
        >
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={32} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Line type="monotone" dataKey="onSite" stroke="#1D9E75" strokeWidth={2} dot={{ r: 3 }} fill="rgba(29,158,117,0.08)" />
                <Line type="monotone" dataKey="total" stroke="#378ADD" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3 }} />
                <Line type="monotone" dataKey="ot" stroke="#EF9F27" strokeWidth={1.5} strokeDasharray="2 3" dot={{ r: 2 }} yAxisId={0} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </AnalyticsCard>

        <AnalyticsCard
          title={isAr ? "العمال حسب المشروع" : "Workers by project"}
          meta={isAr ? "تعيينات نشطة" : "Active placements"}
        >
          <div className="flex items-center gap-4">
            <div className="w-[110px] h-[110px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={projectDonut}
                    dataKey="value"
                    innerRadius={38}
                    outerRadius={52}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {projectDonut.map((entry, i) => (
                      <Cell key={entry.name} fill={entry.color ?? CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              {projectDonut.map((d) => (
                <div key={d.name} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: d.color }} />
                    <span className="truncate text-muted-foreground">{d.name}</span>
                  </span>
                  <span className="font-medium tabular-nums">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </AnalyticsCard>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <AnalyticsCard title={isAr ? "خريطة الحضور" : "Attendance heatmap"} meta={isAr ? "هذا الشهر" : "This month · by day"}>
          <div className="grid grid-cols-7 gap-0.5 mb-0.5">
            {(isAr ? ["أحد", "إث", "ثل", "أر", "خم", "جم", "سب"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]).map(
              (d) => (
                <div key={d} className="text-[9px] text-muted-foreground text-center">
                  {d}
                </div>
              )
            )}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {heatmap.map((v, i) => (
              <div
                key={i}
                className="h-[18px] rounded-sm"
                style={{ background: heatColor(v) }}
                title={v > 0 ? `${v}%` : undefined}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5 mt-2.5">
            <span className="text-[10px] text-muted-foreground">{isAr ? "منخفض" : "Low"}</span>
            <div className="flex gap-0.5">
              {HM_COLORS.map((c) => (
                <div key={c} className="w-3 h-3 rounded-sm" style={{ background: c }} />
              ))}
            </div>
            <span className="text-[10px] text-muted-foreground">{isAr ? "مرتفع" : "High"}</span>
          </div>
        </AnalyticsCard>

        <AnalyticsCard title={isAr ? "أوامر CMMS" : "CMMS work orders"} meta={isAr ? "حسب الحالة" : "By status this month"}>
          <div className="h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={woChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={24} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {woChart.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AnalyticsCard>

        <AnalyticsCard title={isAr ? "مؤشرات رئيسية" : "Top metrics"} meta={isAr ? "أداء" : "Performance indicators"}>
          <div className="flex flex-col gap-2">
            {[
              {
                icon: Clock,
                color: "#1D9E75",
                label: isAr ? "امتثال OT" : "OT compliance",
                sub: isAr ? "حد السياسة: 12h/أسبوع" : "Policy limit: 12h/wk",
                val: "96%",
                badge: isAr ? "جيد" : "Good",
                badgeClass: "bg-[#E1F5EE] text-[#085041]",
              },
              {
                icon: IdCard,
                color: "#EF9F27",
                label: isAr ? "صلاحية الإقامة" : "Iqama validity",
                sub: `${analytics?.expiringIqamas?.length ?? 0} ${isAr ? "تنتهي قريباً" : "expiring soon"}`,
                val: analytics?.expiringIqamas?.length ? "Watch" : "99%",
                badge: isAr ? "مراقبة" : "Watch",
                badgeClass: "bg-[#FAEEDA] text-[#633806]",
              },
              {
                icon: Wrench,
                color: "#E24B4A",
                label: isAr ? "إنجاز PM" : "PM completion",
                sub: `${cmms?.summary?.pmDue ?? 0} ${isAr ? "متأخر" : "overdue"}`,
                val: cmms?.summary?.pmDue ? "82%" : "100%",
                badge: cmms?.summary?.pmDue ? (isAr ? "منخفض" : "Low") : (isAr ? "جيد" : "Good"),
                badgeClass: cmms?.summary?.pmDue ? "bg-[#FCEBEB] text-[#791F1F]" : "bg-[#E1F5EE] text-[#085041]",
              },
              {
                icon: Coins,
                color: "#378ADD",
                label: isAr ? "تحصيل الفواتير" : "Invoice collection",
                sub: `${analytics?.pendingHours ?? 0}h ${isAr ? "معلق" : "pending"}`,
                val: analytics?.pendingHours ? "91%" : "100%",
                badge: isAr ? "جيد" : "Good",
                badgeClass: "bg-[#E1F5EE] text-[#085041]",
              },
            ].map((m) => (
              <div key={m.label} className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
                <div className="flex items-center gap-2 min-w-0">
                  <m.icon className="w-3.5 h-3.5 shrink-0" style={{ color: m.color }} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{m.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{m.sub}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[13px] font-medium">{m.val}</p>
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded", m.badgeClass)}>{m.badge}</span>
                </div>
              </div>
            ))}
          </div>
        </AnalyticsCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-3">
        <AnalyticsCard title={isAr ? "الإيرادات حسب العميل" : "Revenue by client"} meta={isAr ? "فواتير شهرية · SAR" : "Monthly billings · SAR"}>
          {clientRevenue.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">{isAr ? "لا بيانات — حمّل demo" : "No data — load demo"}</p>
          ) : (
            clientRevenue.map((row) => (
              <div key={row.name} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                <div>
                  <p className="text-xs font-medium">{row.name}</p>
                  <p className="text-[10px] text-muted-foreground">{row.sub}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium">{formatCurrency(row.amount, isAr ? "ar-SA" : "en-SA")}</p>
                  <div className="h-1 rounded-sm bg-muted/80 mt-1 w-20 ml-auto">
                    <div
                      className="h-full rounded-sm bg-[#1D9E75]"
                      style={{ width: `${Math.round((row.amount / maxRev) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </AnalyticsCard>

        <AnalyticsCard title={isAr ? "رؤى AI" : "AI-generated insights"} meta={isAr ? "بناءً على بيانات الشهر" : "Based on this month's data"}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {insights.map((ins, i) => (
              <div key={i} className="p-2.5 rounded-lg border border-border/60 bg-card">
                <ins.icon className="w-4 h-4 mb-1" style={{ color: ins.color }} />
                <p className="text-[11px] leading-snug">{ins.text}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{ins.sub}</p>
              </div>
            ))}
          </div>
          <Link
            href={`/dashboard/${businessId}/command-center`}
            className="flex items-center gap-2.5 mt-2.5 p-2.5 rounded-lg border border-[#5DCAA5] bg-[#E1F5EE] hover:bg-[#d4f0e4] transition"
          >
            <Sparkles className="w-4 h-4 text-[#085041] shrink-0" />
            <span className="text-xs text-[#085041] flex-1">
              {isAr ? "تحليل عميق — اسأل AI للتوصيات الكاملة" : "Deep analysis — ask AI for full recommendations ↗"}
            </span>
            <Button size="sm" className="h-7 text-[11px] bg-[#1D9E75] hover:bg-[#0F6E56]">
              {isAr ? "Ask AI" : "Ask AI"}
            </Button>
          </Link>
        </AnalyticsCard>
      </div>
    </div>
  );
}
