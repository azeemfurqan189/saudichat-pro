"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Download, TrendingUp, Users, ShoppingBag, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsSkeleton } from "@/components/ui/skeleton";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";

type Tab = "overview" | "orders" | "customers" | "marketing" | "conversations";
type Range = "7d" | "30d" | "90d" | "1y";

const TABS: { id: Tab; labelEn: string; labelAr: string }[] = [
  { id: "overview", labelEn: "Overview", labelAr: "نظرة عامة" },
  { id: "orders", labelEn: "Orders", labelAr: "الطلبات" },
  { id: "customers", labelEn: "Customers", labelAr: "العملاء" },
  { id: "marketing", labelEn: "Marketing", labelAr: "التسويق" },
  { id: "conversations", labelEn: "Conversations", labelAr: "المحادثات" },
];

const RANGES: { id: Range; labelEn: string; labelAr: string }[] = [
  { id: "7d", labelEn: "7 Days", labelAr: "7 أيام" },
  { id: "30d", labelEn: "30 Days", labelAr: "30 يوم" },
  { id: "90d", labelEn: "90 Days", labelAr: "90 يوم" },
  { id: "1y", labelEn: "1 Year", labelAr: "سنة" },
];

const CHART_COLORS = ["#10b981", "#f59e0b", "#6366f1", "#ef4444", "#8b5cf6"];

export default function AnalyticsPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const { locale } = useApp();
  const isAr = locale === "ar";

  const [tab, setTab] = useState<Tab>("overview");
  const [range, setRange] = useState<Range>("30d");

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["analytics", businessId, range],
    queryFn: async () => {
      const res = await api.getAnalytics(businessId, range);
      return res.data;
    },
  });

  const { data: executive } = useQuery({
    queryKey: ["executive", businessId, range],
    queryFn: async () => {
      const days = range === "7d" ? 7 : range === "90d" ? 90 : range === "1y" ? 365 : 30;
      const res = await api.getExecutiveDashboard(businessId, days);
      return res.data;
    },
  });

  const ordersChartData = useMemo(() => {
    if (!analytics?.ordersByDay) return [];
    return Object.entries(analytics.ordersByDay).map(([date, count]) => ({
      date: date.slice(5),
      orders: count,
    }));
  }, [analytics]);

  const revenueChartData = useMemo(() => {
    if (!analytics?.revenueByDay) return [];
    return Object.entries(analytics.revenueByDay).map(([date, amount]) => ({
      date: date.slice(5),
      revenue: amount,
    }));
  }, [analytics]);

  const statusPieData = useMemo(() => {
    if (!analytics?.statusDistribution) return [];
    return Object.entries(analytics.statusDistribution).map(([name, value]) => ({
      name,
      value,
    }));
  }, [analytics]);

  const handlePdfReport = () => {
    const days = range === "7d" ? 7 : range === "90d" ? 90 : range === "1y" ? 365 : 30;
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const url = api.getReportPdfUrl(businessId, days);
    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `report-${businessId}.pdf`;
        a.click();
        toast.success(isAr ? "تم تحميل التقرير" : "Report downloaded");
      })
      .catch(() => toast.error(isAr ? "فشل التحميل" : "Download failed"));
  };

  const handleExport = () => {
    if (!analytics) {
      toast.error(t(locale, "dashboard", "noData"));
      return;
    }
    const blob = new Blob([JSON.stringify(analytics, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${businessId}-${range}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(isAr ? "تم التصدير" : "Exported successfully");
  };

  const kpis = [
    {
      label: t(locale, "dashboard", "revenue"),
      value: analytics?.totalRevenue ?? 0,
      icon: DollarSign,
      format: (v: number) => formatCurrency(v, isAr ? "ar-SA" : "en-SA"),
    },
    {
      label: t(locale, "dashboard", "todayOrders"),
      value: analytics?.totalOrders ?? 0,
      icon: ShoppingBag,
      format: (v: number) => String(v),
    },
    {
      label: isAr ? "معدل تحويل البوت" : "Bot Conversion",
      value: analytics?.bot?.conversionRate ?? 0,
      icon: TrendingUp,
      format: (v: number) => `${v}%`,
    },
    {
      label: isAr ? "عملاء محتملون" : "Hot Leads",
      value: analytics?.bot?.intelligence?.hotLeads ?? 0,
      icon: Users,
      format: (v: number) => String(v),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t(locale, "dashboard", "analytics")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAr ? "تحليلات الأداء" : "Performance insights"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                range === r.id
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {isAr ? r.labelAr : r.labelEn}
            </button>
          ))}
          <Button variant="outline" size="sm" onClick={handlePdfReport}>
            <Download className="w-4 h-4" />
            {isAr ? "تقرير PDF" : "PDF Report"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4" />
            {t(locale, "dashboard", "export")}
          </Button>
        </div>
      </div>

      {executive && (
        <Card className="p-4 bg-gradient-to-r from-primary/5 to-emerald-500/5 border-primary/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{isAr ? "صحة الأعمال" : "Business Health Score"}</p>
              <p className="text-3xl font-bold text-primary">{executive.businessHealthScore}/100</p>
              <p className="text-sm mt-1 text-muted-foreground">{executive.aiInsight}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div><p className="text-lg font-bold">{executive.revenueGrowth > 0 ? "+" : ""}{executive.revenueGrowth}%</p><p className="text-xs text-muted-foreground">{isAr ? "نمو" : "Growth"}</p></div>
              <div><p className="text-lg font-bold">{executive.avgClv}</p><p className="text-xs text-muted-foreground">CLV</p></div>
              <div><p className="text-lg font-bold">{executive.openTasks}</p><p className="text-xs text-muted-foreground">{isAr ? "مهام" : "Tasks"}</p></div>
              <div><p className="text-lg font-bold">{executive.lowStockCount}</p><p className="text-xs text-muted-foreground">{isAr ? "مخزون منخفض" : "Low Stock"}</p></div>
            </div>
          </div>
        </Card>
      )}

      {isLoading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="!p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <kpi.icon className="w-4 h-4 text-primary" />
                </div>
                <p className="text-2xl font-bold">
                  {typeof kpi.value === "number" && kpi.label === t(locale, "dashboard", "revenue") ? (
                    kpi.format(kpi.value)
                  ) : (
                    <AnimatedCounter value={kpi.value as number} />
                  )}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(({ id, labelEn, labelAr }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
              tab === id
                ? "bg-gradient-primary text-white shadow-glow-green"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            )}
          >
            {isAr ? labelAr : labelEn}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {(tab === "overview" || tab === "orders") && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                {isAr ? "الطلبات اليومية" : "Daily Orders"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ordersChartData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">
                  {t(locale, "dashboard", "noData")}
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={ordersChartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="orders" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}

        {(tab === "overview" || tab === "orders") && (
          <Card>
            <CardHeader>
              <CardTitle>{isAr ? "الإيرادات" : "Revenue"}</CardTitle>
            </CardHeader>
            <CardContent>
              {revenueChartData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">
                  {t(locale, "dashboard", "noData")}
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={revenueChartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => formatCurrency(Number(v), isAr ? "ar-SA" : "en-SA")} />
                    <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}

        {tab === "overview" && analytics?.avgOrderValue !== undefined && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t(locale, "dashboard", "avgOrder")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">
                {formatCurrency(analytics.avgOrderValue, isAr ? "ar-SA" : "en-SA")}
              </p>
            </CardContent>
          </Card>
        )}

        {(tab === "overview" || tab === "orders") && statusPieData.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{isAr ? "توزيع حالة الطلبات" : "Order Status Distribution"}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {statusPieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {tab === "customers" && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{isAr ? "نمو العملاء" : "Customer Growth"}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                <AnimatedCounter value={analytics?.newCustomers ?? 0} />
                <span className="text-base font-normal text-muted-foreground ms-2">
                  {isAr ? "عميل جديد" : "new customers"}
                </span>
              </p>
            </CardContent>
          </Card>
        )}

        {tab === "marketing" && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{isAr ? "أداء التسويق" : "Marketing Performance"}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {isAr
                  ? "اربط حملاتك لعرض التحليلات التفصيلية"
                  : "Connect campaigns to view detailed marketing analytics"}
              </p>
            </CardContent>
          </Card>
        )}

        {tab === "conversations" && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{isAr ? "المحادثات" : "Conversations"}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                <AnimatedCounter value={analytics?.totalConversations ?? 0} />
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
