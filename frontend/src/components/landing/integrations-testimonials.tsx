"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ScrollReveal } from "@/components/landing/scroll-reveal";
import { useApp } from "@/lib/context";

const integrations = [
  { name: "Meta WhatsApp", abbr: "WA", color: "bg-green-500" },
  { name: "OpenAI GPT-4", abbr: "AI", color: "bg-slate-800" },
  { name: "Stripe", abbr: "ST", color: "bg-indigo-600" },
  { name: "Moyasar", abbr: "MO", color: "bg-emerald-600" },
  { name: "Neon", abbr: "NE", color: "bg-cyan-500" },
  { name: "Railway", abbr: "RW", color: "bg-violet-600" },
  { name: "Vercel", abbr: "VR", color: "bg-black" },
  { name: "Socket.io", abbr: "SO", color: "bg-orange-500" },
];

export function IntegrationsSection() {
  const { locale } = useApp();
  const isAr = locale === "ar";

  return (
    <section className="border-y border-slate-200 bg-slate-50/50 px-4 py-24 dark:border-slate-800 dark:bg-slate-900/30">
      <div className="mx-auto max-w-7xl">
        <ScrollReveal className="text-center">
          <h2 className="text-balance text-3xl font-bold sm:text-4xl">
            {isAr ? "اربط واتساب بأدواتك" : "Plug WhatsApp into your stack"}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
            {isAr
              ? "تكاملات جاهزة مع Meta و OpenAI وبوابات الدفع والبنية التحتية"
              : "Pre-built connections to Meta, OpenAI, payment gateways, and your infrastructure"}
          </p>
        </ScrollReveal>

        <ScrollReveal className="mt-14" delay={0.15}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
            {integrations.map((item) => (
              <div
                key={item.name}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-soft dark:border-slate-700 dark:bg-slate-900"
              >
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.color} text-xs font-bold text-white shadow-md`}>
                  {item.abbr}
                </div>
                <span className="text-center text-[11px] font-semibold leading-tight text-slate-600 group-hover:text-primary dark:text-slate-400">
                  {item.name}
                </span>
              </div>
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal className="mt-10 text-center" delay={0.25}>
          <Link
            href="/products/integrations"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            {isAr ? "استكشف جميع التكاملات" : "Browse all integrations"}
            <ArrowRight className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
          </Link>
        </ScrollReveal>
      </div>
    </section>
  );
}

export function TestimonialsSection() {
  const { locale } = useApp();
  const isAr = locale === "ar";

  const quotes = [
    {
      quoteEn: "SaudiChat Pro was the big unlock for our restaurant. Orders flow automatically now.",
      quoteAr: "SaudiChat Pro كان المفتاح لمطعمنا. الطلبات تتدفق تلقائياً الآن.",
      authorEn: "Ahmed Al-Rashid",
      authorAr: "أحمد الراشد",
      handle: "@aldhawq_riyadh",
    },
    {
      quoteEn: "The AI bot handles 80% of queries in Arabic. Our staff focuses on what matters.",
      quoteAr: "البوت يتعامل مع 80% من الاستفسارات بالعربية. فريقنا يركز على المهم.",
      authorEn: "Dr. Khalid Al-Mutairi",
      authorAr: "د. خالد المطيري",
      handle: "@alnoor_clinic",
    },
    {
      quoteEn: "Setup took 20 minutes. We were taking WhatsApp orders the same day.",
      quoteAr: "الإعداد استغرق 20 دقيقة. كنا نستقبل طلبات واتساب في نفس اليوم.",
      authorEn: "Sara Al-Otaibi",
      authorAr: "سارة العتيبي",
      handle: "@glow_salon",
    },
    {
      quoteEn: "Best WhatsApp automation tool for Saudi SMEs. Nothing else comes close.",
      quoteAr: "أفضل أداة أتمتة واتساب للشركات الصغيرة في السعودية.",
      authorEn: "Fahad Al-Qahtani",
      authorAr: "فهد القحطاني",
      handle: "@fahad_retail",
    },
  ];

  return (
    <section className="overflow-hidden px-4 py-24">
      <div className="mx-auto max-w-7xl">
        <ScrollReveal className="text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            {isAr ? "محبوب من أصحاب الأعمال" : "Loved by business owners"}
          </h2>
        </ScrollReveal>
        <div className="mt-12 flex gap-5 overflow-x-auto pb-4 scrollbar-hide">
          {quotes.map((q, i) => (
            <ScrollReveal key={i} delay={i * 0.08} className="min-w-[300px] max-w-sm shrink-0">
              <div className="h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  &ldquo;{isAr ? q.quoteAr : q.quoteEn}&rdquo;
                </p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                    {(isAr ? q.authorAr : q.authorEn).charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{isAr ? q.authorAr : q.authorEn}</p>
                    <p className="text-xs text-slate-400">{q.handle}</p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
