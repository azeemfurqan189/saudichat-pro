"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Check, CreditCard, Zap, MessageSquare, Users, ArrowUpRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api } from "@/lib/api";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { useIsManpowerTheme } from "@/hooks/use-is-manpower-theme";
import { ManpowerHeroHeader, ManpowerPageShell } from "@/components/dashboard/manpower-shell";

/** Payment / Moyasar disabled — all accounts on free trial for now */
const PAYMENTS_ENABLED = false;

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    nameAr: "المبتدئ",
    price: 299,
    messages: 1000,
    numbers: 1,
    features: ["Basic Bot", "Order Management", "Email Support"],
    featuresAr: ["بوت أساسي", "إدارة الطلبات", "دعم بالبريد"],
  },
  {
    id: "business",
    name: "Business",
    nameAr: "الأعمال",
    price: 599,
    messages: 10000,
    numbers: 3,
    popular: true,
    features: ["AI Bot", "Analytics", "Marketing", "Priority Support"],
    featuresAr: ["بوت AI", "تحليلات", "تسويق", "دعم أولوية"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    nameAr: "المؤسسات",
    price: 1499,
    messages: Infinity,
    numbers: Infinity,
    features: ["Custom AI", "API Access", "Dedicated Manager", "SLA"],
    featuresAr: ["AI مخصص", "API", "مدير مخصص", "SLA"],
  },
];

const MOCK_INVOICES = [
  { id: "inv_001", date: "2026-05-01", amount: 599, status: "paid" },
  { id: "inv_002", date: "2026-04-01", amount: 599, status: "paid" },
  { id: "inv_003", date: "2026-03-01", amount: 599, status: "paid" },
];

export default function BillingPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const { locale } = useApp();
  const isAr = locale === "ar";

  const { data: business } = useQuery({
    queryKey: ["business", businessId],
    queryFn: async () => {
      const res = await api.getBusiness(businessId);
      return res.data;
    },
  });

  const currentPlanId = (business?.subscriptionPlan || "starter").toLowerCase();
  const isManpower = useIsManpowerTheme(businessId, business?.type);
  const currentPlan = PLANS.find((p) => p.id === currentPlanId) ?? PLANS[0];

  const usage = {
    messages: 3240,
    messagesLimit: currentPlan.messages === Infinity ? 50000 : currentPlan.messages,
    staff: 3,
    staffLimit: currentPlanId === "enterprise" ? 50 : currentPlanId === "business" ? 10 : 3,
    customers: 847,
    customersLimit: currentPlanId === "enterprise" ? Infinity : currentPlanId === "business" ? 5000 : 500,
  };

  const UsageMeter = ({
    label,
    used,
    limit,
  }: {
    label: string;
    used: number;
    limit: number;
  }) => {
    const pct = limit === Infinity ? 15 : Math.min(100, (used / limit) * 100);
    return (
      <div>
        <div className="flex justify-between text-sm mb-2">
          <span>{label}</span>
          <span className="text-muted-foreground">
            {used.toLocaleString()}
            {limit !== Infinity ? ` / ${limit.toLocaleString()}` : ""}
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1 }}
            className={cn(
              "h-full rounded-full",
              pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-primary"
            )}
          />
        </div>
      </div>
    );
  };

  const billingContent = (
    <>
      {!PAYMENTS_ENABLED && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <p className="text-sm font-medium">
              {isAr
                ? "جميع الحسابات مجانية حالياً — لا حاجة للدفع. الدفع سيُفعّل لاحقاً."
                : "All accounts are free right now — no payment required. Billing will be enabled later."}
            </p>
          </CardContent>
        </Card>
      )}
      {isManpower ? (
        <ManpowerHeroHeader
          title={t(locale, "dashboard", "billing")}
          subtitle={isAr ? "إدارة الاشتراك والفواتير" : "Manage subscription and invoices"}
          icon={CreditCard}
        />
      ) : (
        <div>
          <h1 className="text-2xl font-bold">{t(locale, "dashboard", "billing")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAr ? "إدارة الاشتراك والفواتير" : "Manage subscription and invoices"}
          </p>
        </div>
      )}

      {/* Current plan */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-primary opacity-5" />
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{isAr ? "خطتك الحالية" : "Current Plan"}</p>
              <h2 className="text-2xl font-bold mt-1">
                {isAr ? currentPlan.nameAr : currentPlan.name}
              </h2>
              <p className="text-muted-foreground mt-1">
                {!PAYMENTS_ENABLED
                  ? isAr
                    ? "مجاني — تجربة"
                    : "Free — trial access"
                  : `${formatCurrency(currentPlan.price, isAr ? "ar-SA" : "en-SA")}${isAr ? " / شهر" : " / month"}`}
              </p>
              <span
                className={cn(
                  "inline-block mt-2 text-xs px-2 py-0.5 rounded-full capitalize",
                  business?.subscriptionStatus === "active"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30"
                    : "bg-amber-100 text-amber-700"
                )}
              >
                {business?.subscriptionStatus || "active"}
              </span>
            </div>
            <Button variant="gold" disabled={!PAYMENTS_ENABLED}>
              <ArrowUpRight className="w-4 h-4" />
              {isAr ? "ترقية الخطة" : "Upgrade Plan"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage meters */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              {isAr ? "الرسائل" : "Messages"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UsageMeter label="" used={usage.messages} limit={usage.messagesLimit} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              {isAr ? "الفريق" : "Team"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UsageMeter label="" used={usage.staff} limit={usage.staffLimit} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              {isAr ? "العملاء" : "Customers"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UsageMeter label="" used={usage.customers} limit={usage.customersLimit as number} />
          </CardContent>
        </Card>
      </div>

      {/* Upgrade options */}
      <div>
        <h2 className="text-lg font-semibold mb-4">{isAr ? "الخطط المتاحة" : "Available Plans"}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan, i) => {
            const isCurrent = plan.id === currentPlanId;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card
                  className={cn(
                    "relative h-full",
                    plan.popular && "ring-2 ring-secondary",
                    isCurrent && "ring-2 ring-primary"
                  )}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-gold text-white text-xs font-bold px-3 py-0.5 rounded-full">
                      {isAr ? "الأكثر شعبية" : "Popular"}
                    </span>
                  )}
                  <CardHeader>
                    <CardTitle>{isAr ? plan.nameAr : plan.name}</CardTitle>
                    <p className="text-2xl font-bold text-primary">
                      <AnimatedCounter value={plan.price} suffix={isAr ? " ر.س" : " SAR"} />
                      <span className="text-sm font-normal text-muted-foreground">
                        {isAr ? "/شهر" : "/mo"}
                      </span>
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 mb-6">
                      {(isAr ? plan.featuresAr : plan.features).map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-primary shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant={isCurrent ? "outline" : plan.popular ? "gold" : "default"}
                      className="w-full"
                      disabled={isCurrent || !PAYMENTS_ENABLED}
                    >
                      {!PAYMENTS_ENABLED
                        ? isAr
                          ? "قريباً"
                          : "Coming soon"
                        : isCurrent
                          ? isAr
                            ? "الخطة الحالية"
                            : "Current Plan"
                          : isAr
                            ? "ترقية"
                            : "Upgrade"}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Invoice history */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            {isAr ? "سجل الفواتير" : "Invoice History"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground">
                  <th className="text-start p-3">{isAr ? "الفاتورة" : "Invoice"}</th>
                  <th className="text-start p-3">{t(locale, "common", "date")}</th>
                  <th className="text-start p-3">{t(locale, "common", "total")}</th>
                  <th className="text-start p-3">{t(locale, "common", "status")}</th>
                  <th className="text-start p-3">{t(locale, "dashboard", "actions")}</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_INVOICES.map((inv) => (
                  <tr key={inv.id} className="border-b border-border/30">
                    <td className="p-3 font-mono text-xs">{inv.id}</td>
                    <td className="p-3">{formatDate(inv.date, locale)}</td>
                    <td className="p-3 font-medium">
                      {formatCurrency(inv.amount, isAr ? "ar-SA" : "en-SA")}
                    </td>
                    <td className="p-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 capitalize">
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );

  return isManpower ? (
    <ManpowerPageShell>{billingContent}</ManpowerPageShell>
  ) : (
    <div className="space-y-6">{billingContent}</div>
  );
}
