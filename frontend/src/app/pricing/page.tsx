"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/marketing/page-hero";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { useApp } from "@/lib/context";
import { pricingPlans, loc } from "@/lib/site-config";

export default function PricingPage() {
  const { locale } = useApp();
  const isAr = locale === "ar";

  const faqs = [
    {
      q: { en: "Can I change plans later?", ar: "هل يمكنني تغيير الخطة لاحقاً؟" },
      a: { en: "Yes, upgrade or downgrade anytime from your dashboard.", ar: "نعم، يمكنك الترقية أو التخفيض في أي وقت من لوحة التحكم." },
    },
    {
      q: { en: "Is there a free trial?", ar: "هل هناك تجربة مجانية؟" },
      a: { en: "Yes, start free with no credit card required.", ar: "نعم، ابدأ مجاناً بدون بطاقة ائتمان." },
    },
    {
      q: { en: "What payment methods do you accept?", ar: "ما طرق الدفع المقبولة؟" },
      a: { en: "We accept Mada, Visa, Mastercard, and bank transfer.", ar: "نقبل مدى وفيزا وماستركارد والتحويل البنكي." },
    },
  ];

  return (
    <div>
      <PageHero
        title={{ en: "Simple, Transparent Pricing", ar: "أسعار بسيطة وشفافة" }}
        subtitle={{
          en: "Choose the plan that fits your business. All plans include WhatsApp API access.",
          ar: "اختر الخطة المناسبة لمنشأتك. جميع الخطط تشمل وصول واتساب API.",
        }}
        ctaHref="/signup"
        ctaLabel={{ en: "Start Free", ar: "ابدأ مجاناً" }}
      />
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid gap-8 md:grid-cols-3">
          {pricingPlans.map((plan) => (
            <div
              key={loc(plan.name, "en")}
              className={`section-card relative ${plan.popular ? "ring-2 ring-secondary shadow-elevated" : ""}`}
            >
              {plan.popular && (
                <span className="absolute -top-3 start-1/2 -translate-x-1/2 rounded-full bg-secondary px-4 py-0.5 text-xs font-bold text-white">
                  {isAr ? "الأكثر شعبية" : "Popular"}
                </span>
              )}
              <h3 className="text-xl font-bold">{loc(plan.name, locale)}</h3>
              <div className="mt-4">
                <span className="text-5xl font-bold text-primary">{plan.price}</span>
                <span className="text-slate-500"> {isAr ? "ر.س/شهر" : "SAR/mo"}</span>
              </div>
              <ul className="mt-8 space-y-3">
                {plan.features[locale].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="block">
                <Button className="mt-8 w-full rounded-full" variant={plan.popular ? "default" : "outline"}>
                  {isAr ? "ابدأ الآن" : "Get Started"}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </section>
      <section className="border-t border-slate-200 bg-slate-50/50 px-4 py-16 dark:border-slate-800 dark:bg-slate-900/30">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-bold">{isAr ? "أسئلة شائعة" : "FAQ"}</h2>
          <div className="mt-8 space-y-6">
            {faqs.map((faq, i) => (
              <div key={i} className="section-card">
                <h3 className="font-semibold">{loc(faq.q, locale)}</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{loc(faq.a, locale)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <CtaBanner />
    </div>
  );
}
