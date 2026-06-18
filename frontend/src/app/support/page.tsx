"use client";

import { HelpCircle, ChevronDown } from "lucide-react";
import { useState } from "react";
import { PageHero } from "@/components/marketing/page-hero";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { useApp } from "@/lib/context";
import { loc } from "@/lib/site-config";

const faqs = [
  {
    q: { en: "How do I connect WhatsApp?", ar: "كيف أربط واتساب؟" },
    a: {
      en: "Go to Settings > WhatsApp in your dashboard and follow the Meta verification steps. We guide you through the entire process.",
      ar: "اذهب إلى الإعدادات > واتساب في لوحة التحكم واتبع خطوات التحقق من ميتا. نرشدك خلال العملية بالكامل.",
    },
  },
  {
    q: { en: "Does the AI bot support Arabic?", ar: "هل يدعم البوت الذكي العربية؟" },
    a: {
      en: "Yes! Our AI bot is fully bilingual — fluent in both Arabic and English with natural conversation flow.",
      ar: "نعم! بوتنا الذكي ثنائي اللغة بالكامل — يتحدث العربية والإنجليزية بطلاقة.",
    },
  },
  {
    q: { en: "Can I try before paying?", ar: "هل يمكنني التجربة قبل الدفع؟" },
    a: {
      en: "Absolutely. Start with our free Starter plan. No credit card required.",
      ar: "بالتأكيد. ابدأ بخطتنا المجانية. بدون بطاقة ائتمان.",
    },
  },
  {
    q: { en: "How long does setup take?", ar: "كم يستغرق الإعداد؟" },
    a: {
      en: "Most businesses go live within 15-30 minutes. WhatsApp verification may take up to 24 hours.",
      ar: "معظم المنشآت تنطلق خلال 15-30 دقيقة. التحقق من واتساب قد يستغرق حتى 24 ساعة.",
    },
  },
  {
    q: { en: "Is my data secure?", ar: "هل بياناتي آمنة؟" },
    a: {
      en: "Yes. We use encrypted connections, secure database storage, and follow industry best practices for data protection.",
      ar: "نعم. نستخدم اتصالات مشفرة وتخزين آمن ونتبع أفضل ممارسات حماية البيانات.",
    },
  },
];

export default function SupportPage() {
  const { locale } = useApp();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div>
      <PageHero
        icon={HelpCircle}
        title={{ en: "Help Center", ar: "مركز المساعدة" }}
        subtitle={{
          en: "Find answers to common questions or contact our support team.",
          ar: "اعثر على إجابات للأسئلة الشائعة أو تواصل مع فريق الدعم.",
        }}
        ctaHref="/contact"
        ctaLabel={{ en: "Contact Support", ar: "تواصل مع الدعم" }}
      />
      <section className="mx-auto max-w-3xl px-4 py-16">
        <h2 className="mb-8 text-2xl font-bold">{locale === "ar" ? "الأسئلة الشائعة" : "Frequently Asked Questions"}</h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="section-card">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between text-start"
              >
                <span className="font-semibold">{loc(faq.q, locale)}</span>
                <ChevronDown className={`h-5 w-5 shrink-0 transition-transform ${open === i ? "rotate-180" : ""}`} />
              </button>
              {open === i && (
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{loc(faq.a, locale)}</p>
              )}
            </div>
          ))}
        </div>
      </section>
      <CtaBanner
        title={{ en: "Still need help?", ar: "ما زلت بحاجة للمساعدة؟" }}
        subtitle={{ en: "Our support team is ready to assist you", ar: "فريق الدعم جاهز لمساعدتك" }}
        ctaHref="/contact"
        ctaLabel={{ en: "Contact Us", ar: "تواصل معنا" }}
      />
    </div>
  );
}
