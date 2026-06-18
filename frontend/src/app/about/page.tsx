"use client";

import { Users, Target, Heart } from "lucide-react";
import { PageHero } from "@/components/marketing/page-hero";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { useApp } from "@/lib/context";

export default function AboutPage() {
  const { locale } = useApp();
  const isAr = locale === "ar";

  const values = [
    {
      icon: Target,
      titleEn: "Our Mission",
      titleAr: "مهمتنا",
      descEn: "Empower every Saudi SME to automate customer communication through WhatsApp.",
      descAr: "تمكين كل منشأة سعودية من أتمتة التواصل مع العملاء عبر واتساب.",
    },
    {
      icon: Heart,
      titleEn: "Our Values",
      titleAr: "قيمنا",
      descEn: "Simplicity, reliability, and customer success drive everything we build.",
      descAr: "البساطة والموثوقية ونجاح العملاء تقود كل ما نبنيه.",
    },
    {
      icon: Users,
      titleEn: "Our Team",
      titleAr: "فريقنا",
      descEn: "A passionate team based in Riyadh, building for Saudi businesses.",
      descAr: "فريق شغوف مقره الرياض، يبني لمنشآت سعودية.",
    },
  ];

  return (
    <div>
      <PageHero
        title={{ en: "About SaudiChat Pro", ar: "عن SaudiChat Pro" }}
        subtitle={{
          en: "We're on a mission to make WhatsApp the smartest sales channel for Saudi businesses.",
          ar: "مهمتنا جعل واتساب أذكى قناة مبيعات للمنشآت السعودية.",
        }}
      />
      <section className="mx-auto max-w-7xl px-4 py-16">
        <p className="mx-auto max-w-3xl text-center text-lg text-slate-600 dark:text-slate-400">
          {isAr
            ? "SaudiChat Pro منصة سعودية لأتمتة واتساب للأعمال. نساعد المطاعم والصالونات والعيادات والمتاجر على استقبال الطلبات والحجوزات وخدمة العملاء تلقائياً — 24 ساعة في اليوم، 7 أيام في الأسبوع."
            : "SaudiChat Pro is a Saudi-built platform for WhatsApp business automation. We help restaurants, salons, clinics, and stores receive orders, bookings, and customer support automatically — 24 hours a day, 7 days a week."}
        </p>
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {values.map(({ icon: Icon, titleEn, titleAr, descEn, descAr }) => (
            <div key={titleEn} className="section-card text-center">
              <Icon className="mx-auto h-10 w-10 text-primary" />
              <h3 className="mt-4 text-lg font-bold">{isAr ? titleAr : titleEn}</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{isAr ? descAr : descEn}</p>
            </div>
          ))}
        </div>
      </section>
      <CtaBanner />
    </div>
  );
}
