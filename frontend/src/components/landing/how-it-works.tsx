"use client";

import Link from "next/link";
import { Store, MessageSquare, Bot, Zap } from "lucide-react";
import { useApp } from "@/lib/context";

export function HowItWorks() {
  const { locale } = useApp();
  const isAr = locale === "ar";

  const steps = [
    { icon: Store, titleEn: "Sign Up", titleAr: "سجّل", descEn: "Create your account in minutes", descAr: "أنشئ حسابك في دقائق" },
    { icon: MessageSquare, titleEn: "Connect WhatsApp", titleAr: "اربط واتساب", descEn: "Link your business number", descAr: "اربط رقم منشأتك" },
    { icon: Bot, titleEn: "Customize Bot", titleAr: "خصّص البوت", descEn: "Set menu, hours & auto-replies", descAr: "حدد القائمة والردود" },
    { icon: Zap, titleEn: "Start Selling", titleAr: "ابدأ البيع", descEn: "Take orders & bookings 24/7", descAr: "استقبل الطلبات على مدار الساعة" },
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-20">
      <h2 className="text-center text-3xl font-bold">{isAr ? "كيف يعمل؟" : "How it works"}</h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-slate-600 dark:text-slate-400">
        {isAr ? "اربط واتساب وابدأ البيع في 4 خطوات بسيطة" : "Connect WhatsApp and start selling in 4 simple steps"}
      </p>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(({ icon: Icon, titleEn, titleAr, descEn, descAr }, i) => (
          <div key={titleEn} className="section-card card-hover relative text-center">
            <div className="absolute -top-3 start-1/2 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-xs font-bold text-white rtl:translate-x-1/2">
              {i + 1}
            </div>
            <Icon className="mx-auto mt-2 h-8 w-8 text-primary" />
            <h3 className="mt-4 font-semibold">{isAr ? titleAr : titleEn}</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{isAr ? descAr : descEn}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProductShowcase() {
  const { locale } = useApp();
  const isAr = locale === "ar";

  const products = [
    { href: "/products/whatsapp", emoji: "💬", titleEn: "WhatsApp API", titleAr: "واتساب API" },
    { href: "/products/ai-bot", emoji: "🤖", titleEn: "AI Chatbot", titleAr: "بوت ذكي" },
    { href: "/products/orders", emoji: "🛒", titleEn: "Orders", titleAr: "الطلبات" },
    { href: "/products/appointments", emoji: "📅", titleEn: "Appointments", titleAr: "المواعيد" },
    { href: "/products/analytics", emoji: "📊", titleEn: "Analytics", titleAr: "التحليلات" },
    { href: "/products/marketing", emoji: "📣", titleEn: "Marketing", titleAr: "التسويق" },
  ];

  return (
    <section id="features" className="border-t border-slate-200 bg-slate-50/50 px-4 py-20 dark:border-slate-800 dark:bg-slate-900/30">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-center text-3xl font-bold">{isAr ? "منتجاتنا" : "Our Products"}</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-slate-600 dark:text-slate-400">
          {isAr ? "كل ما تحتاجه لأتمتة واتساب" : "Everything you need to automate WhatsApp"}
        </p>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <Link key={p.href} href={p.href} className="section-card card-hover group flex items-center gap-4">
              <span className="text-3xl">{p.emoji}</span>
              <div>
                <h3 className="font-semibold group-hover:text-primary">{isAr ? p.titleAr : p.titleEn}</h3>
                <p className="text-sm text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  {isAr ? "اعرف المزيد ←" : "Learn more →"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
