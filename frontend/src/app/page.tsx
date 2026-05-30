"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bot,
  MessageSquare,
  Store,
  Zap,
  Shield,
  BarChart3,
  Clock,
  Users,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";

const industries = [
  { emoji: "🍽️", en: "Restaurant", ar: "مطعم" },
  { emoji: "💇", en: "Salon", ar: "صالون" },
  { emoji: "🏥", en: "Clinic", ar: "عيادة" },
  { emoji: "🛍️", en: "Retail", ar: "تجزئة" },
  { emoji: "🏋️", en: "Gym", ar: "نادي رياضي" },
  { emoji: "🏠", en: "Real Estate", ar: "عقارات" },
];

const plans = [
  {
    name: "Starter",
    nameAr: "المبتدئ",
    price: 299,
    features: ["1 WhatsApp Number", "1,000 Messages/mo", "Basic Bot", "Order Management"],
    featuresAr: ["رقم واتساب واحد", "1000 رسالة/شهر", "بوت أساسي", "إدارة الطلبات"],
  },
  {
    name: "Business",
    nameAr: "الأعمال",
    price: 599,
    popular: true,
    features: ["3 WhatsApp Numbers", "10,000 Messages/mo", "AI Bot + GPT-4", "Analytics & Marketing"],
    featuresAr: ["3 أرقام واتساب", "10000 رسالة/شهر", "بوت AI", "تحليلات وتسويق"],
  },
  {
    name: "Enterprise",
    nameAr: "المؤسسات",
    price: 1499,
    features: ["Unlimited Numbers", "Unlimited Messages", "Custom AI", "Dedicated Support"],
    featuresAr: ["أرقام غير محدودة", "رسائل غير محدودة", "AI مخصص", "دعم مخصص"],
  },
];

export default function HomePage() {
  const { locale } = useApp();
  const isAr = locale === "ar";

  return (
    <div>
      {/* Hero — clean gradient like CryptoPay */}
      <section className="hero-gradient px-4 py-20 text-white">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1 text-sm backdrop-blur">
            <MessageSquare className="h-4 w-4" />
            {isAr ? "واتساب للأعمال · السعودية" : "WhatsApp Business · Saudi Arabia"}
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            {t(locale, "hero", "title")}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/90">
            {t(locale, "hero", "subtitle")}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" variant="secondary">
                {t(locale, "hero", "cta")}
                <ArrowRight className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="lg"
                variant="outline"
                className="border-white/40 bg-white/10 text-white hover:bg-white/20"
              >
                {t(locale, "hero", "demo")}
              </Button>
            </Link>
          </div>
          <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-white/80">
            <span><strong className="text-white">10,000+</strong> {t(locale, "hero", "stats.businesses")}</span>
            <span><strong className="text-white">1M+</strong> {t(locale, "hero", "stats.messages")}</span>
            <span><strong className="text-white">99.9%</strong> {t(locale, "hero", "stats.uptime")}</span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-2xl font-bold">
          {isAr ? "كيف يعمل؟" : "How it works"}
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Store, titleEn: "Sign Up", titleAr: "سجّل", descEn: "Create your account in minutes", descAr: "أنشئ حسابك في دقائق" },
            { icon: MessageSquare, titleEn: "Connect WhatsApp", titleAr: "اربط واتساب", descEn: "Link your business number", descAr: "اربط رقم منشأتك" },
            { icon: Bot, titleEn: "Customize Bot", titleAr: "خصّص البوت", descEn: "Set menu, hours & auto-replies", descAr: "حدد القائمة والردود" },
            { icon: Zap, titleEn: "Start Selling", titleAr: "ابدأ البيع", descEn: "Take orders & bookings 24/7", descAr: "استقبل الطلبات على مدار الساعة" },
          ].map(({ icon: Icon, titleEn, titleAr, descEn, descAr }) => (
            <div key={titleEn} className="section-card card-hover">
              <Icon className="h-8 w-8 text-primary" />
              <h3 className="mt-4 font-semibold">{isAr ? titleAr : titleEn}</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{isAr ? descAr : descEn}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-slate-200 bg-slate-50/50 px-4 py-16 dark:border-slate-800 dark:bg-slate-900/30">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-2xl font-bold">
            {isAr ? "لماذا SaudiChat Pro؟" : "Why SaudiChat Pro?"}
          </h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            {isAr ? "كل ما تحتاجه لأتمتة واتساب" : "Everything you need to automate WhatsApp"}
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Bot, titleEn: "AI-Powered Bot", titleAr: "بوت ذكي", descEn: "GPT-4 conversations in Arabic & English", descAr: "محادثات GPT-4 بالعربية والإنجليزية" },
              { icon: Shield, titleEn: "WhatsApp Official", titleAr: "واتساب رسمي", descEn: "Meta WhatsApp Business API", descAr: "واجهة واتساب للأعمال من ميتا" },
              { icon: BarChart3, titleEn: "Analytics", titleAr: "تحليلات", descEn: "Real-time dashboard & reports", descAr: "لوحة تحكم وتقارير فورية" },
              { icon: Clock, titleEn: "24/7 Automation", titleAr: "أتمتة 24/7", descEn: "Never miss an order", descAr: "لا تفوت أي طلب" },
              { icon: Users, titleEn: "Multi-Tenant", titleAr: "متعدد المنشآت", descEn: "Each business gets own dashboard", descAr: "كل منشأة لها لوحة خاصة" },
              { icon: Zap, titleEn: "Quick Setup", titleAr: "إعداد سريع", descEn: "Go live in minutes", descAr: "انطلق في دقائق" },
            ].map(({ icon: Icon, titleEn, titleAr, descEn, descAr }) => (
              <div key={titleEn} className="section-card card-hover">
                <Icon className="h-7 w-7 text-primary" />
                <h3 className="mt-3 font-semibold">{isAr ? titleAr : titleEn}</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{isAr ? descAr : descEn}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industries */}
      <section id="industries" className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-2xl font-bold">
          {isAr ? "القطاعات المدعومة" : "Supported Industries"}
        </h2>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {industries.map((ind) => (
            <div
              key={ind.en}
              className="section-card card-hover flex flex-col items-center py-6 text-center"
            >
              <span className="text-3xl">{ind.emoji}</span>
              <span className="mt-2 text-sm font-medium">{isAr ? ind.ar : ind.en}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-slate-200 bg-slate-50/50 px-4 py-16 dark:border-slate-800 dark:bg-slate-900/30">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-2xl font-bold">
            {isAr ? "خطط الأسعار" : "Pricing Plans"}
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`section-card card-hover relative ${plan.popular ? "ring-2 ring-secondary" : ""}`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-secondary px-3 py-0.5 text-xs font-bold text-white">
                    {isAr ? "الأكثر شعبية" : "Popular"}
                  </span>
                )}
                <h3 className="text-lg font-bold">{isAr ? plan.nameAr : plan.name}</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-primary">{plan.price}</span>
                  <span className="text-slate-500"> {isAr ? "ر.س/شهر" : "SAR/mo"}</span>
                </div>
                <ul className="mt-6 space-y-2">
                  {(isAr ? plan.featuresAr : plan.features).map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className="block">
                  <Button className="mt-6 w-full" variant={plan.popular ? "default" : "outline"}>
                    {isAr ? "ابدأ الآن" : "Get Started"}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="hero-gradient px-4 py-16 text-center text-white">
        <h2 className="text-2xl font-bold sm:text-3xl">
          {isAr ? "جاهز لتحويل منشأتك؟" : "Ready to transform your business?"}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-white/90">
          {isAr ? "ابدأ مجاناً اليوم — بدون بطاقة ائتمان" : "Start free today — no credit card required"}
        </p>
        <Link href="/signup">
          <Button size="lg" variant="secondary" className="mt-8">
            {t(locale, "hero", "cta")}
            <ArrowRight className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
          </Button>
        </Link>
      </section>
    </div>
  );
}
