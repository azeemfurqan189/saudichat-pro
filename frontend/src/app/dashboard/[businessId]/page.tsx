"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  ShoppingBag,
  DollarSign,
  Clock,
  Calendar,
  Scissors,
  Stethoscope,
  MessageSquare,
  ArrowRight,
  Bot,
  Settings,
  Users,
  UserCog,
  CheckSquare,
} from "lucide-react";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton, StatsSkeleton } from "@/components/ui/skeleton";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api, DashboardData, Order, Appointment, Conversation } from "@/lib/api";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { BotSetupChecklist } from "@/components/dashboard/bot-setup-checklist";
import { ManpowerAnalyticsDashboard } from "@/components/dashboard/manpower-analytics-dashboard";
import { ManpowerPageShell } from "@/components/dashboard/manpower-shell";
import { getIndustryLabel, normalizeBusinessType, getIndustryCategory } from "@/lib/industry-config";
import { useIsManpowerTheme } from "@/hooks/use-is-manpower-theme";

type IndustryType = "RESTAURANT" | "SALON" | "CLINIC";

const statConfig: Record<
  IndustryType,
  Array<{ key: string; labelKey: string; icon: typeof ShoppingBag; format?: "currency" }>
> = {
  RESTAURANT: [
    { key: "todayOrders", labelKey: "todayOrders", icon: ShoppingBag },
    { key: "revenue", labelKey: "revenue", icon: DollarSign, format: "currency" },
    { key: "avgOrder", labelKey: "avgOrder", icon: DollarSign, format: "currency" },
    { key: "pending", labelKey: "pending", icon: Clock },
  ],
  SALON: [
    { key: "todayAppointments", labelKey: "todayAppointments", icon: Calendar },
    { key: "revenue", labelKey: "revenue", icon: DollarSign, format: "currency" },
    { key: "servicesBooked", labelKey: "servicesBooked", icon: Scissors },
    { key: "staffUtilized", labelKey: "staffUtilized", icon: Clock },
  ],
  CLINIC: [
    { key: "todayPatients", labelKey: "todayPatients", icon: Stethoscope },
    { key: "consultations", labelKey: "consultations", icon: Calendar },
    { key: "revenue", labelKey: "revenue", icon: DollarSign, format: "currency" },
    { key: "onlineConsultations", labelKey: "onlineConsultations", icon: MessageSquare },
  ],
};

function buildChartData(stats: Record<string, number>) {
  const keys = Object.keys(stats).filter((k) => k.startsWith("day") || k.includes("Day"));
  if (keys.length > 0) {
    return keys.map((k) => ({ name: k.replace(/day/i, "D"), value: stats[k] }));
  }
  return Object.entries(stats)
    .slice(0, 7)
    .map(([name, value]) => ({ name: name.slice(0, 8), value }));
}

function StatCards({
  type,
  stats,
  locale,
}: {
  type: IndustryType;
  stats: Record<string, number>;
  locale: "en" | "ar";
}) {
  const config = statConfig[type] ?? statConfig.RESTAURANT;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {config.map(({ key, labelKey, icon: Icon, format }, i) => (
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
        >
          <Card className="!hover:scale-100">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t(locale, "dashboard", labelKey)}</p>
                  <p className="text-2xl font-bold mt-1">
                    {format === "currency" ? (
                      formatCurrency(stats[key] ?? 0, locale === "ar" ? "ar-SA" : "en-SA")
                    ) : (
                      <AnimatedCounter value={stats[key] ?? 0} />
                    )}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

function RecentOrdersList({ orders, locale, businessId }: { orders: Order[]; locale: "en" | "ar"; businessId: string }) {
  if (orders.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">{t(locale, "dashboard", "noData")}</p>;
  }

  return (
    <div className="space-y-3">
      {orders.slice(0, 5).map((order) => (
        <div
          key={order.id}
          className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
        >
          <div>
            <p className="font-medium text-sm">#{order.orderNumber}</p>
            <p className="text-xs text-muted-foreground">{order.customer?.name || order.customerId}</p>
          </div>
          <div className="text-end">
            <p className="font-medium text-sm">{formatCurrency(order.total, locale === "ar" ? "ar-SA" : "en-SA")}</p>
            <span className={cn("text-xs px-2 py-0.5 rounded-full capitalize", statusColor(order.status))}>
              {order.status.toLowerCase()}
            </span>
          </div>
        </div>
      ))}
      <Link href={`/dashboard/${businessId}/orders`}>
        <Button variant="ghost" size="sm" className="w-full mt-2">
          {t(locale, "common", "viewAll")} <ArrowRight className="w-4 h-4 rtl-flip" />
        </Button>
      </Link>
    </div>
  );
}

function UpcomingAppointmentsList({
  appointments,
  locale,
  businessId,
}: {
  appointments: Appointment[];
  locale: "en" | "ar";
  businessId: string;
}) {
  if (appointments.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">{t(locale, "dashboard", "noData")}</p>;
  }

  return (
    <div className="space-y-3">
      {appointments.slice(0, 5).map((apt) => (
        <div
          key={apt.id}
          className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
        >
          <div>
            <p className="font-medium text-sm">{apt.customer?.name || apt.serviceName}</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(`${apt.date}T${apt.startTime}`, locale)}
            </p>
          </div>
          <span className={cn("text-xs px-2 py-0.5 rounded-full capitalize", statusColor(apt.status))}>
            {apt.status.toLowerCase()}
          </span>
        </div>
      ))}
      <Link href={`/dashboard/${businessId}/appointments`}>
        <Button variant="ghost" size="sm" className="w-full mt-2">
          {t(locale, "common", "viewAll")} <ArrowRight className="w-4 h-4 rtl-flip" />
        </Button>
      </Link>
    </div>
  );
}

function RecentConversationsList({
  conversations,
  locale,
  businessId,
}: {
  conversations: Conversation[];
  locale: "en" | "ar";
  businessId: string;
}) {
  if (conversations.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">{t(locale, "dashboard", "noData")}</p>;
  }

  return (
    <div className="space-y-3">
      {conversations.slice(0, 5).map((conv) => (
        <div
          key={conv.id}
          className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
            {(conv.customer?.name || "C")[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{conv.customer?.name || conv.customerId}</p>
            <p className="text-xs text-muted-foreground">{formatDate(conv.lastMessageAt, locale)}</p>
          </div>
          {conv.isBotHandling && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent">Bot</span>
          )}
        </div>
      ))}
      <Link href={`/dashboard/${businessId}/conversations`}>
        <Button variant="ghost" size="sm" className="w-full mt-2">
          {t(locale, "common", "viewAll")} <ArrowRight className="w-4 h-4 rtl-flip" />
        </Button>
      </Link>
    </div>
  );
}

function statusColor(status: string) {
  const s = status.toUpperCase();
  if (s === "PENDING") return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
  if (s === "CONFIRMED" || s === "COMPLETED") return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  if (s === "CANCELLED") return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  return "bg-muted text-muted-foreground";
}

export default function DashboardOverviewPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const { locale } = useApp();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard", businessId],
    queryFn: async () => {
      const res = await api.getDashboard(businessId);
      return res.data as DashboardData;
    },
  });

  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.getMe()).data,
  });

  const memberRole = meData?.businesses?.find((b) => b.id === businessId)?.memberRole;
  const businessType = meData?.businesses?.find((b) => b.id === businessId)?.type;
  const isManpowerHint = useIsManpowerTheme(businessId, businessType);
  const showWorkforceStats = memberRole === "OWNER" || memberRole === "MANAGER";
  const isManpowerAccount = isManpowerHint;

  const { data: workforceStats } = useQuery({
    queryKey: ["workforce-stats", businessId],
    queryFn: async () => (await api.getWorkforceStats(businessId)).data,
    enabled: showWorkforceStats && !isManpowerAccount,
  });

  if (isLoading) {
    if (isManpowerHint && showWorkforceStats) {
      return (
        <ManpowerPageShell analytics>
          <div className="space-y-4 p-4 md:p-6">
            <Skeleton className="h-24 rounded-[10px]" />
            <StatsSkeleton />
            <Skeleton className="h-64 rounded-[10px]" />
          </div>
        </ManpowerPageShell>
      );
    }
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <StatsSkeleton />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="glass-card text-center py-16 space-y-4">
        <p className="text-muted-foreground">{t(locale, "dashboard", "error")}</p>
        <Button onClick={() => refetch()}>{t(locale, "dashboard", "retry")}</Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="glass-card text-center py-16">
        <p className="text-muted-foreground">{t(locale, "dashboard", "noData")}</p>
      </div>
    );
  }

  const industryType = (data.type?.toUpperCase() || "RESTAURANT") as IndustryType;
  const industryCat = getIndustryCategory(normalizeBusinessType(data.type ?? businessType));
  const chartData = buildChartData(data.stats);

  if ((industryCat === "manpower" || isManpowerHint) && showWorkforceStats) {
    const isAr = locale === "ar";
    return (
      <ManpowerPageShell analytics>
        <ManpowerAnalyticsDashboard businessId={businessId} isAr={isAr} />
      </ManpowerPageShell>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold">{t(locale, "dashboard", "overview")}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {getIndustryLabel(normalizeBusinessType(industryType), locale === "ar" ? "ar" : "en")}
        </p>
      </div>

      {showWorkforceStats && workforceStats && industryCat !== "manpower" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: t(locale, "dashboard", "staff"), value: workforceStats.totalMembers, icon: Users },
            { label: locale === "ar" ? "المشرفون" : "Managers", value: workforceStats.managers, icon: UserCog },
            { label: t(locale, "dashboard", "schedule"), value: workforceStats.todayShifts, icon: Calendar },
            { label: t(locale, "dashboard", "tasks"), value: workforceStats.openTasks, icon: CheckSquare },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold">{value}</p>
                </div>
                <Icon className="w-8 h-8 text-primary opacity-80" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {industryCat !== "manpower" && (
        <BotSetupChecklist
          businessId={businessId}
          businessType={industryType}
          locale={locale === "ar" ? "ar" : "en"}
        />
      )}

      {industryCat !== "manpower" && <StatCards type={industryType} stats={data.stats} locale={locale} />}

      {industryCat !== "manpower" && (
      <>
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="!hover:scale-100">
          <CardHeader>
            <CardTitle>{t(locale, "dashboard", "revenue")}</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.75rem",
                    }}
                  />
                  <Line type="monotone" dataKey="value" stroke="#0B5E42" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-16">{t(locale, "dashboard", "noData")}</p>
            )}
          </CardContent>
        </Card>

        <Card className="!hover:scale-100">
          <CardHeader>
            <CardTitle>
              {industryType === "RESTAURANT"
                ? t(locale, "dashboard", "todayOrders")
                : t(locale, "dashboard", "todayAppointments")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.75rem",
                    }}
                  />
                  <Bar dataKey="value" fill="#14B8A6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-16">{t(locale, "dashboard", "noData")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Industry-specific sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {(industryType === "RESTAURANT" || data.recentOrders) && (
          <Card className="!hover:scale-100">
            <CardHeader>
              <CardTitle>{t(locale, "dashboard", "liveOrders")}</CardTitle>
            </CardHeader>
            <CardContent>
              <RecentOrdersList
                orders={data.recentOrders ?? []}
                locale={locale}
                businessId={businessId}
              />
            </CardContent>
          </Card>
        )}

        {(industryType === "SALON" || industryType === "CLINIC" || data.upcomingAppointments) && (
          <Card className="!hover:scale-100">
            <CardHeader>
              <CardTitle>{t(locale, "dashboard", "upcomingAppointments")}</CardTitle>
            </CardHeader>
            <CardContent>
              <UpcomingAppointmentsList
                appointments={data.upcomingAppointments ?? []}
                locale={locale}
                businessId={businessId}
              />
            </CardContent>
          </Card>
        )}

        <Card className="!hover:scale-100">
          <CardHeader>
            <CardTitle>{t(locale, "dashboard", "recentConversations")}</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentConversationsList
              conversations={data.recentConversations ?? []}
              locale={locale}
              businessId={businessId}
            />
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <Card className="!hover:scale-100">
        <CardHeader>
          <CardTitle>{t(locale, "dashboard", "quickActions")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {(industryCat === "food" || industryCat === "retail") && (
              <Link href={`/dashboard/${businessId}/orders`}>
                <Button variant="outline">{t(locale, "dashboard", "orders")}</Button>
              </Link>
            )}
            {industryCat === "service" && (
              <Link href={`/dashboard/${businessId}/appointments`}>
                <Button variant="outline">{t(locale, "dashboard", "appointments")}</Button>
              </Link>
            )}
            <Link href={`/dashboard/${businessId}/conversations`}>
              <Button variant="outline">{t(locale, "dashboard", "conversations")}</Button>
            </Link>
            <Link href={`/dashboard/${businessId}/catalog`}>
              <Button className="btn-primary">{t(locale, "dashboard", "catalog")}</Button>
            </Link>
            <Link href={`/dashboard/${businessId}/settings?tab=profile`}>
              <Button variant="outline">
                {locale === "ar" ? "ملف المنشأة" : "Business Profile"}
              </Button>
            </Link>
            <Link href={`/dashboard/${businessId}/ai`}>
              <Button variant="outline" className="gap-2">
                <Bot className="w-4 h-4" />
                {t(locale, "dashboard", "aiBot")}
              </Button>
            </Link>
            <Link href={`/dashboard/${businessId}/settings?tab=aiBot`}>
              <Button variant="outline" className="gap-2">
                <Settings className="w-4 h-4" />
                {t(locale, "dashboard", "settings")}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
      </>
      )}
    </motion.div>
  );
}
