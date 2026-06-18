"use client";

import Link from "next/link";
import { Calendar, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHero } from "@/components/marketing/page-hero";
import { useApp } from "@/lib/context";

export default function DemoPage() {
  const { locale } = useApp();
  const isAr = locale === "ar";

  const benefits = isAr
    ? ["عرض مباشر للمنصة", "إجابة على جميع أسئلتك", "خطة مخصصة لمنشأتك", "بدون التزام"]
    : ["Live platform walkthrough", "All your questions answered", "Custom plan for your business", "No commitment required"];

  return (
    <div>
      <PageHero
        icon={Calendar}
        badge={{ en: "Free Demo", ar: "عرض مجاني" }}
        title={{ en: "Book a Demo", ar: "احجز عرضاً توضيحياً" }}
        subtitle={{
          en: "See SaudiChat Pro in action. Our team will show you how to automate WhatsApp for your business.",
          ar: "شاهد SaudiChat Pro عملياً. سيريك فريقنا كيف تؤتمت واتساب لمنشأتك.",
        }}
        ctaHref="#demo-form"
        ctaLabel={{ en: "Schedule Now", ar: "جدول الآن" }}
      />
      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-16 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold">{isAr ? "ماذا ستحصل عليه" : "What You'll Get"}</h2>
          <ul className="mt-6 space-y-4">
            {benefits.map((b) => (
              <li key={b} className="flex items-center gap-3">
                <Check className="h-5 w-5 shrink-0 text-primary" />
                {b}
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm text-slate-500">
            {isAr ? "أو ابدأ مباشرة بدون عرض" : "Or start directly without a demo"}{" "}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              {isAr ? "ابدأ مجاناً" : "Start Free"}
            </Link>
          </p>
        </div>
        <form id="demo-form" className="section-card space-y-4" onSubmit={(e) => e.preventDefault()}>
          <h2 className="text-xl font-bold">{isAr ? "طلب عرض توضيحي" : "Request a Demo"}</h2>
          <Input label={isAr ? "الاسم الكامل" : "Full Name"} />
          <Input label={isAr ? "البريد الإلكتروني" : "Email"} type="email" dir="ltr" />
          <Input label={isAr ? "رقم الجوال" : "Phone Number"} dir="ltr" />
          <Input label={isAr ? "اسم المنشأة" : "Business Name"} />
          <div>
            <label className="mb-1.5 block text-sm font-medium">{isAr ? "نوع النشاط" : "Business Type"}</label>
            <select className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
              <option>{isAr ? "مطعم" : "Restaurant"}</option>
              <option>{isAr ? "صالون" : "Salon"}</option>
              <option>{isAr ? "عيادة" : "Clinic"}</option>
              <option>{isAr ? "تجزئة" : "Retail"}</option>
              <option>{isAr ? "أخرى" : "Other"}</option>
            </select>
          </div>
          <Button type="submit" className="w-full rounded-full">
            {isAr ? "احجز العرض" : "Book Demo"}
          </Button>
        </form>
      </section>
    </div>
  );
}
