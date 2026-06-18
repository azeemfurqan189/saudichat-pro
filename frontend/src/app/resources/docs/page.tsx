"use client";

import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";
import { PageHero } from "@/components/marketing/page-hero";
import { useApp } from "@/lib/context";

const guides = [
  {
    titleEn: "Getting Started",
    titleAr: "البدء",
    descEn: "Create your account and connect WhatsApp in 15 minutes",
    descAr: "أنشئ حسابك واربط واتساب في 15 دقيقة",
    href: "/setup",
  },
  {
    titleEn: "WhatsApp Setup Guide",
    titleAr: "دليل إعداد واتساب",
    descEn: "Step-by-step Meta Business API verification",
    descAr: "خطوة بخطوة للتحقق من Meta Business API",
    href: "/products/whatsapp",
  },
  {
    titleEn: "Bot Configuration",
    titleAr: "إعداد البوت",
    descEn: "Customize your AI bot menu and auto-replies",
    descAr: "خصّص قائمة البوت والردود التلقائية",
    href: "/products/ai-bot",
  },
  {
    titleEn: "API Reference",
    titleAr: "مرجع API",
    descEn: "Developer documentation for integrations",
    descAr: "توثيق المطورين للتكاملات",
    href: "/products/integrations",
  },
];

export default function DocsPage() {
  const { locale } = useApp();
  const isAr = locale === "ar";

  return (
    <div>
      <PageHero
        icon={BookOpen}
        title={{ en: "Documentation", ar: "التوثيق" }}
        subtitle={{
          en: "Guides and tutorials to help you get the most out of SaudiChat Pro.",
          ar: "أدلة وشروحات لمساعدتك على الاستفادة القصوى من SaudiChat Pro.",
        }}
      />
      <section className="mx-auto max-w-4xl px-4 py-16">
        <div className="space-y-4">
          {guides.map((g) => (
            <Link
              key={g.href}
              href={g.href}
              className="section-card card-hover group flex items-center justify-between"
            >
              <div>
                <h3 className="font-semibold group-hover:text-primary">{isAr ? g.titleAr : g.titleEn}</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{isAr ? g.descAr : g.descEn}</p>
              </div>
              <ArrowRight className={`h-5 w-5 text-slate-400 group-hover:text-primary ${isAr ? "rotate-180" : ""}`} />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
