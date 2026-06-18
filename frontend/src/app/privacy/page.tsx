"use client";

import { Shield } from "lucide-react";
import { PageHero } from "@/components/marketing/page-hero";
import { useApp } from "@/lib/context";

export default function PrivacyPage() {
  const { locale } = useApp();
  const isAr = locale === "ar";

  const sections = isAr
    ? [
        { title: "جمع البيانات", body: "نجمع البيانات اللازمة لتقديم خدماتنا، بما في ذلك معلومات الحساب وبيانات المحادثات." },
        { title: "استخدام البيانات", body: "نستخدم بياناتك لتشغيل المنصة وتحسين الخدمة والتواصل معك." },
        { title: "حماية البيانات", body: "نستخدم التشفير والتخزين الآمن لحماية معلوماتك." },
        { title: "حقوقك", body: "يمكنك طلب الوصول إلى بياناتك أو حذفها بالتواصل معنا على support@saudichat.pro." },
      ]
    : [
        { title: "Data Collection", body: "We collect data necessary to provide our services, including account information and conversation data." },
        { title: "Data Usage", body: "We use your data to operate the platform, improve our service, and communicate with you." },
        { title: "Data Protection", body: "We use encryption and secure storage to protect your information." },
        { title: "Your Rights", body: "You can request access to or deletion of your data by contacting us at support@saudichat.pro." },
      ];

  return (
    <div>
      <PageHero
        icon={Shield}
        title={{ en: "Privacy Policy", ar: "سياسة الخصوصية" }}
        subtitle={{
          en: "Last updated: June 1, 2026",
          ar: "آخر تحديث: 1 يونيو 2026",
        }}
        ctaHref="/contact"
        ctaLabel={{ en: "Contact Us", ar: "تواصل معنا" }}
      />
      <section className="mx-auto max-w-3xl space-y-8 px-4 py-16">
        {sections.map((s) => (
          <div key={s.title}>
            <h2 className="text-xl font-bold">{s.title}</h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">{s.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
