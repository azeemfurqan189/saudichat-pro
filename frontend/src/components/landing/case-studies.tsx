"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ScrollReveal } from "@/components/landing/scroll-reveal";
import { useApp } from "@/lib/context";

const cases = [
  {
    stat: "40%",
    statLabel: { en: "order increase", ar: "زيادة في الطلبات" },
    title: {
      en: "How Al-Dhawq Restaurant automated WhatsApp orders",
      ar: "كيف أتمت مطعم الذوق طلبات واتساب",
    },
    quote: {
      en: "SaudiChat Pro was the unlock. We went from missing late-night orders to serving customers 24/7 without extra staff.",
      ar: "SaudiChat Pro كان المفتاح. انتقلنا من فوات طلبات الليل إلى خدمة العملاء 24/7 بدون مو Staff إضافي.",
    },
    author: { en: "Ahmed Al-Rashid", ar: "أحمد الراشد" },
    role: { en: "Owner, Al-Dhawq Restaurant", ar: "مالك، مطعم الذوق" },
    href: "/solutions/restaurant",
    accent: "from-emerald-500/20 to-teal-500/5",
  },
  {
    stat: "80%",
    statLabel: { en: "queries handled by AI", ar: "استفسارات يعالجها الذكاء الاصطناعي" },
    title: {
      en: "How Al-Noor Clinic reduced front-desk load",
      ar: "كيف قلّلت عيادة النور ضغط الاستقبال",
    },
    quote: {
      en: "Patients book appointments in Arabic via WhatsApp. Our staff only handles complex cases now.",
      ar: "المرضى يحجزون بالعربية عبر واتساب. فريقنا يتعامل الآن مع الحالات المعقدة فقط.",
    },
    author: { en: "Dr. Khalid Al-Mutairi", ar: "د. خالد المطيري" },
    role: { en: "Director, Al-Noor Clinic", ar: "مدير، عيادة النور" },
    href: "/solutions/clinic",
    accent: "from-primary/20 to-emerald-500/5",
  },
];

export function CaseStudies() {
  const { locale } = useApp();
  const isAr = locale === "ar";

  return (
    <section className="border-t border-slate-200 px-4 py-24 dark:border-slate-800">
      <div className="mx-auto max-w-7xl">
        <ScrollReveal>
          <p className="text-center text-sm font-bold uppercase tracking-widest text-primary">
            {isAr ? "قصص نجاح" : "Case Studies"}
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold sm:text-4xl">
            {isAr ? "نتائج حقيقية من منشآت سعودية" : "Real results from Saudi businesses"}
          </h2>
        </ScrollReveal>

        <div className="mt-14 grid gap-8 lg:grid-cols-2">
          {cases.map((c, i) => (
            <ScrollReveal key={c.href} delay={i * 0.1}>
              <div className={`relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br ${c.accent} p-8 dark:border-slate-700`}>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-primary">{c.stat}</span>
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {isAr ? c.statLabel.ar : c.statLabel.en}
                  </span>
                </div>
                <h3 className="mt-6 text-xl font-bold leading-snug">
                  {isAr ? c.title.ar : c.title.en}
                </h3>
                <blockquote className="mt-4 border-s-4 border-primary/30 ps-4 text-slate-600 dark:text-slate-400">
                  &ldquo;{isAr ? c.quote.ar : c.quote.en}&rdquo;
                </blockquote>
                <div className="mt-6">
                  <p className="font-semibold">{isAr ? c.author.ar : c.author.en}</p>
                  <p className="text-sm text-slate-500">{isAr ? c.role.ar : c.role.en}</p>
                </div>
                <Link
                  href={c.href}
                  className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                >
                  {isAr ? "اقرأ القصة" : "Read the story"}
                  <ArrowRight className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
                </Link>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
