"use client";

import { Scale } from "lucide-react";
import { PageHero } from "@/components/marketing/page-hero";
import { useApp } from "@/lib/context";

export default function TermsPage() {
  const { locale } = useApp();
  const isAr = locale === "ar";

  const sections = isAr
    ? [
        { title: "قبول الشروط", body: "باستخدام SaudiChat Pro، فإنك توافق على هذه الشروط والأحكام." },
        { title: "استخدام الخدمة", body: "يجب استخدام المنصة للأغراض التجارية المشروعة وفقاً لسياسات ميتا لواتساب." },
        { title: "الاشتراك والدفع", body: "الخطط المدفوعة تُفوتر شهرياً. يمكنك الإلغاء في أي وقت." },
        { title: "حدود المسؤولية", body: "SaudiChat Pro غير مسؤولة عن انقطاعات خدمة طرف ثالث مثل ميتا أو OpenAI." },
      ]
    : [
        { title: "Acceptance of Terms", body: "By using SaudiChat Pro, you agree to these terms and conditions." },
        { title: "Use of Service", body: "The platform must be used for legitimate business purposes in compliance with Meta WhatsApp policies." },
        { title: "Subscription & Payment", body: "Paid plans are billed monthly. You can cancel at any time." },
        { title: "Limitation of Liability", body: "SaudiChat Pro is not liable for third-party service interruptions such as Meta or OpenAI." },
      ];

  return (
    <div>
      <PageHero
        icon={Scale}
        title={{ en: "Terms of Service", ar: "شروط الخدمة" }}
        subtitle={{
          en: "Last updated: June 1, 2026",
          ar: "آخر تحديث: 1 يونيو 2026",
        }}
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
