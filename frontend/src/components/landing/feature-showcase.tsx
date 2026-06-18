"use client";

import Link from "next/link";
import { Bot, Shield, BarChart3, Clock, Users, Zap } from "lucide-react";
import { useApp } from "@/lib/context";

export function FeatureShowcase() {
  const { locale } = useApp();
  const isAr = locale === "ar";

  const features = [
    { icon: Bot, titleEn: "AI-Powered Bot", titleAr: "بوت ذكي", descEn: "GPT-4 conversations in Arabic & English", descAr: "محادثات GPT-4 بالعربية والإنجليزية" },
    { icon: Shield, titleEn: "WhatsApp Official", titleAr: "واتساب رسمي", descEn: "Meta WhatsApp Business API", descAr: "واجهة واتساب للأعمال من ميتا" },
    { icon: BarChart3, titleEn: "Analytics", titleAr: "تحليلات", descEn: "Real-time dashboard & reports", descAr: "لوحة تحكم وتقارير فورية" },
    { icon: Clock, titleEn: "24/7 Automation", titleAr: "أتمتة 24/7", descEn: "Never miss an order", descAr: "لا تفوت أي طلب" },
    { icon: Users, titleEn: "Multi-Tenant", titleAr: "متعدد المنشآت", descEn: "Each business gets own dashboard", descAr: "كل منشأة لها لوحة خاصة" },
    { icon: Zap, titleEn: "Quick Setup", titleAr: "إعداد سريع", descEn: "Go live in minutes", descAr: "انطلق في دقائق" },
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-20">
      <h2 className="text-center text-3xl font-bold">{isAr ? "لماذا SaudiChat Pro؟" : "Why SaudiChat Pro?"}</h2>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ icon: Icon, titleEn, titleAr, descEn, descAr }) => (
          <div key={titleEn} className="section-card card-hover">
            <Icon className="h-7 w-7 text-primary" />
            <h3 className="mt-3 font-semibold">{isAr ? titleAr : titleEn}</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{isAr ? descAr : descEn}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function UseCasesSection() {
  const { locale } = useApp();
  const isAr = locale === "ar";

  const industries = [
    { emoji: "🍽️", en: "Restaurant", ar: "مطعم", href: "/solutions/restaurant" },
    { emoji: "💇", en: "Salon", ar: "صالون", href: "/solutions/salon" },
    { emoji: "🏥", en: "Clinic", ar: "عيادة", href: "/solutions/clinic" },
    { emoji: "🛍️", en: "Retail", ar: "تجزئة", href: "/solutions/retail" },
    { emoji: "🏋️", en: "Gym", ar: "نادي رياضي", href: "/solutions/gym" },
    { emoji: "🏠", en: "Real Estate", ar: "عقارات", href: "/solutions/real-estate" },
  ];

  return (
    <section id="industries" className="border-t border-slate-200 bg-slate-50/50 px-4 py-20 dark:border-slate-800 dark:bg-slate-900/30">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-center text-3xl font-bold">{isAr ? "القطاعات المدعومة" : "Supported Industries"}</h2>
        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {industries.map((ind) => (
            <Link
              key={ind.en}
              href={ind.href}
              className="section-card card-hover group flex flex-col items-center py-8 text-center"
            >
              <span className="text-4xl">{ind.emoji}</span>
              <span className="mt-3 text-sm font-medium group-hover:text-primary">{isAr ? ind.ar : ind.en}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
