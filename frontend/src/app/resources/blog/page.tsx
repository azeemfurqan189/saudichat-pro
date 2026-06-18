"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { PageHero } from "@/components/marketing/page-hero";
import { useApp } from "@/lib/context";

const posts = [
  {
    titleEn: "5 Ways WhatsApp Automation Boosts Saudi Restaurant Sales",
    titleAr: "5 طرق تزيد أتمتة واتساب مبيعات المطاعم السعودية",
    dateEn: "May 15, 2026",
    dateAr: "15 مايو 2026",
    categoryEn: "Restaurants",
    categoryAr: "مطاعم",
  },
  {
    titleEn: "How AI Chatbots Are Changing Customer Service in the GCC",
    titleAr: "كيف تغيّر البوتات الذكية خدمة العملاء في الخليج",
    dateEn: "May 1, 2026",
    dateAr: "1 مايو 2026",
    categoryEn: "AI",
    categoryAr: "ذكاء اصطناعي",
  },
  {
    titleEn: "WhatsApp Business API: Complete Setup Guide for 2026",
    titleAr: "واتساب Business API: دليل الإعداد الكامل 2026",
    dateEn: "April 20, 2026",
    dateAr: "20 أبريل 2026",
    categoryEn: "Guide",
    categoryAr: "دليل",
  },
];

export default function BlogPage() {
  const { locale } = useApp();
  const isAr = locale === "ar";

  return (
    <div>
      <PageHero
        icon={FileText}
        title={{ en: "Blog", ar: "المدونة" }}
        subtitle={{
          en: "Tips, updates, and best practices for WhatsApp business automation.",
          ar: "نصائح وتحديثات وأفضل الممارسات لأتمتة واتساب للأعمال.",
        }}
      />
      <section className="mx-auto max-w-4xl px-4 py-16">
        <div className="space-y-6">
          {posts.map((post, i) => (
            <article key={i} className="section-card card-hover">
              <span className="rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">
                {isAr ? post.categoryAr : post.categoryEn}
              </span>
              <h2 className="mt-3 text-xl font-bold">{isAr ? post.titleAr : post.titleEn}</h2>
              <p className="mt-2 text-sm text-slate-500">{isAr ? post.dateAr : post.dateEn}</p>
              <Link href="#" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
                {isAr ? "اقرأ المزيد ←" : "Read more →"}
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
