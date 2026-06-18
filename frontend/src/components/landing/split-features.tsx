"use client";

import Link from "next/link";
import { ArrowRight, Bot, BarChart3, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/landing/scroll-reveal";
import { useApp } from "@/lib/context";

function BotMockup({ isAr }: { isAr: boolean }) {
  return (
    <div className="mockup-frame p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-green-400" />
        <span className="text-xs font-medium text-slate-500">
          {isAr ? "بوت ذكي · GPT-4" : "AI Bot · GPT-4"}
        </span>
      </div>
      <div className="space-y-3">
        <div className="ms-auto max-w-[80%] rounded-2xl rounded-ee-sm bg-primary px-4 py-2.5 text-sm text-white">
          {isAr ? "عندكم توصيل للرياض؟" : "Do you deliver to Riyadh?"}
        </div>
        <div className="max-w-[85%] rounded-2xl rounded-es-sm bg-slate-100 px-4 py-2.5 text-sm dark:bg-slate-800">
          {isAr ? "نعم! 🚚 نوصّل لجميع أحياء الرياض. أبي أعرض لك القائمة؟" : "Yes! 🚚 We deliver across Riyadh. Want to see the menu?"}
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2 text-xs text-primary">
          <Bot className="h-3.5 w-3.5" />
          {isAr ? "فهم النية: استفسار توصيل" : "Intent detected: delivery inquiry"}
        </div>
      </div>
    </div>
  );
}

function OrderMockup({ isAr }: { isAr: boolean }) {
  const steps = isAr
    ? ["طلب جديد", "قيد التحضير", "جاهز", "في الطريق"]
    : ["New Order", "Preparing", "Ready", "On the way"];

  return (
    <div className="mockup-frame p-5">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
        {isAr ? "طلب #1847" : "Order #1847"}
      </p>
      <div className="flex gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex-1">
            <div className={`mb-2 h-2 rounded-full ${i <= 2 ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"}`} />
            <p className={`text-[10px] font-medium leading-tight ${i <= 2 ? "text-primary" : "text-slate-400"}`}>{s}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950/40">
        <p className="text-xs font-medium text-green-700 dark:text-green-400">
          {isAr ? "✅ تم إشعار العميل عبر واتساب" : "✅ Customer notified via WhatsApp"}
        </p>
      </div>
    </div>
  );
}

function DashboardMockup({ isAr }: { isAr: boolean }) {
  const bars = [40, 65, 45, 80, 55, 90, 70];
  return (
    <div className="mockup-frame p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500">
          {isAr ? "إيرادات الأسبوع" : "Weekly Revenue"}
        </span>
        <BarChart3 className="h-4 w-4 text-primary" />
      </div>
      <div className="flex h-32 items-end gap-2">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-md bg-gradient-to-t from-primary to-teal-400 opacity-90"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { v: "847", l: isAr ? "طلبات" : "Orders" },
          { v: "12.4k", l: isAr ? "رسائل" : "Messages" },
          { v: "98%", l: isAr ? "رضا" : "Satisfaction" },
        ].map((s) => (
          <div key={s.l} className="rounded-lg bg-slate-50 p-2 text-center dark:bg-slate-800">
            <p className="text-sm font-bold text-primary">{s.v}</p>
            <p className="text-[10px] text-slate-500">{s.l}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

type Feature = {
  badge: { en: string; ar: string };
  title: { en: string; ar: string };
  desc: { en: string; ar: string };
  bullets: { en: string; ar: string }[];
  href: string;
  cta: { en: string; ar: string };
  mockup: "bot" | "orders" | "dashboard";
  flip?: boolean;
};

const features: Feature[] = [
  {
    badge: { en: "AI Chatbot", ar: "بوت ذكي" },
    title: {
      en: "WhatsApp bots you can actually control",
      ar: "بوتات واتساب تتحكم بها فعلاً",
    },
    desc: {
      en: "Deploy GPT-4 bots that understand Arabic and English naturally. Set rules, train on your menu, and hand off to staff when needed.",
      ar: "انشر بوتات GPT-4 تفهم العربية والإنجليزية طبيعياً. حدد القواعد، درّب على قائمتك، وحوّل للمو Staff عند الحاجة.",
    },
    bullets: [
      { en: "Bilingual natural conversations", ar: "محادثات طبيعية ثنائية اللغة" },
      { en: "Custom training on your business", ar: "تدريب مخصص على منشأتك" },
      { en: "Smart handoff to human agents", ar: "تحويل ذكي للمو Staff" },
    ],
    href: "/products/ai-bot",
    cta: { en: "Explore AI Bot", ar: "استكشف البوت الذكي" },
    mockup: "bot",
  },
  {
    badge: { en: "24/7 Automation", ar: "أتمتة 24/7" },
    title: {
      en: "Never miss an order, even at 2 AM",
      ar: "لا تفوت أي طلب، حتى الساعة 2 صباحاً",
    },
    desc: {
      en: "Customers order via WhatsApp chat. Every step triggers an automatic notification — from confirmation to delivery.",
      ar: "العملاء يطلبون عبر واتساب. كل خطوة ترسل إشعاراً تلقائياً — من التأكيد إلى التوصيل.",
    },
    bullets: [
      { en: "In-chat catalog and checkout", ar: "كتalog ودفع داخل المحادثة" },
      { en: "Live order status updates", ar: "تحديثات حالة الطلب فورية" },
      { en: "Kitchen dashboard in real-time", ar: "لوحة مطبخ مباشرة" },
    ],
    href: "/products/orders",
    cta: { en: "See Order Flow", ar: "شاهد تدفق الطلبات" },
    mockup: "orders",
    flip: true,
  },
  {
    badge: { en: "Analytics", ar: "تحليلات" },
    title: {
      en: "See every message, order, and revenue",
      ar: "شاهد كل رسالة وطلب وإيراد",
    },
    desc: {
      en: "Real-time dashboards show what's working. Track bot performance, customer satisfaction, and revenue trends at a glance.",
      ar: "لوحات فورية تُظهر ما ينجح. تتبع أداء البوت ورضا العملاء واتجاهات الإيرادات بنظرة واحدة.",
    },
    bullets: [
      { en: "Revenue and order analytics", ar: "تحليلات الإيرادات والطلبات" },
      { en: "Bot resolution rate tracking", ar: "تتبع معدل حل البوت" },
      { en: "Exportable PDF reports", ar: "تقارير PDF قابلة للتصدير" },
    ],
    href: "/products/analytics",
    cta: { en: "View Analytics", ar: "عرض التحليلات" },
    mockup: "dashboard",
  },
];

export function SplitFeatures() {
  const { locale } = useApp();
  const isAr = locale === "ar";

  return (
    <section className="overflow-hidden">
      {features.map((f, idx) => {
        const flip = f.flip ?? idx % 2 === 1;
        return (
          <div
            key={f.mockup}
            className={`py-20 ${idx % 2 === 0 ? "bg-white dark:bg-slate-950" : "bg-slate-50/80 dark:bg-slate-900/40"}`}
          >
            <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 lg:grid-cols-2 lg:gap-16">
              <ScrollReveal className={flip ? "lg:order-2" : ""} delay={0.1}>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                  <Clock className="h-3 w-3" />
                  {isAr ? f.badge.ar : f.badge.en}
                </span>
                <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                  {isAr ? f.title.ar : f.title.en}
                </h2>
                <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
                  {isAr ? f.desc.ar : f.desc.en}
                </p>
                <ul className="mt-6 space-y-3">
                  {f.bullets.map((b) => (
                    <li key={b.en} className="flex items-start gap-3 text-sm">
                      <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs text-primary">✓</span>
                      {isAr ? b.ar : b.en}
                    </li>
                  ))}
                </ul>
                <Link href={f.href} className="mt-8 inline-block">
                  <Button variant="outline" className="rounded-full gap-2">
                    {isAr ? f.cta.ar : f.cta.en}
                    <ArrowRight className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
                  </Button>
                </Link>
              </ScrollReveal>

              <ScrollReveal className={flip ? "lg:order-1" : ""} delay={0.2}>
                <div className="relative">
                  <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/20 via-teal-400/10 to-transparent blur-2xl" />
                  {f.mockup === "bot" && <BotMockup isAr={isAr} />}
                  {f.mockup === "orders" && <OrderMockup isAr={isAr} />}
                  {f.mockup === "dashboard" && <DashboardMockup isAr={isAr} />}
                </div>
              </ScrollReveal>
            </div>
          </div>
        );
      })}
    </section>
  );
}
