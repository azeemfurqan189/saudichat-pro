"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, MessageSquare, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";

const chatMessages = [
  { from: "customer", text: "السلام عليكم، أبي أطلب" },
  { from: "bot", text: "مرحباً! 👋 كيف يمكنني مساعدتك؟" },
  { from: "customer", text: "أبي دجاج مقلي وكولا" },
  { from: "bot", text: "✅ تم إضافة:\n• دجاج مقلي × 1 - 18 SAR\n• كولا × 1 - 5 SAR\n\nالإجمالي: 23 SAR\nتأكيد الطلب؟" },
];

export function HeroSection() {
  const { locale } = useApp();
  const isAr = locale === "ar";

  return (
    <section className="hero-glow relative overflow-hidden">
      <div className="dot-grid-bg absolute inset-0" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 lg:grid-cols-2 lg:py-28">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            {isAr ? "واتساب للأعمال · السعودية" : "WhatsApp Business · Saudi Arabia"}
          </div>
          <h1 className="text-balance text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
            <span className="gradient-text">{t(locale, "hero", "title")}</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-600 dark:text-slate-400">
            {t(locale, "hero", "subtitle")}
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/signup">
              <Button size="lg" className="h-12 rounded-full px-8 text-base shadow-lg shadow-primary/25">
                {t(locale, "hero", "cta")}
                <ArrowRight className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
              </Button>
            </Link>
            <Link href="/demo">
              <Button size="lg" variant="outline" className="h-12 rounded-full px-8 text-base">
                {t(locale, "hero", "demo")}
              </Button>
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: isAr ? -40 : 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.65, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto w-full max-w-md"
        >
          <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-primary/30 via-teal-400/20 to-secondary/10 blur-3xl" />
          <div className="animate-float relative rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-5 shadow-2xl backdrop-blur dark:border-slate-600/50 dark:bg-slate-900/90">
            <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-teal-500 text-white shadow-md">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">{isAr ? "مطعم الذوق" : "Al-Dhawq Restaurant"}</p>
                <p className="flex items-center gap-1.5 text-xs text-green-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  {isAr ? "متصل · بوت ذكي نشط" : "Online · AI bot active"}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {chatMessages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.15 }}
                  className={`flex ${msg.from === "customer" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line ${
                      msg.from === "customer"
                        ? "rounded-ee-md bg-gradient-to-br from-primary to-teal-600 text-white shadow-md"
                        : "rounded-es-md bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                    }`}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      <div className="relative border-t border-slate-200/80 bg-white/60 backdrop-blur dark:border-slate-800 dark:bg-slate-950/60">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-center gap-10 px-4 py-8 sm:gap-16">
          {[
            { v: "10,000+", l: t(locale, "hero", "stats.businesses") },
            { v: "1M+", l: t(locale, "hero", "stats.messages") },
            { v: "99.9%", l: t(locale, "hero", "stats.uptime") },
            { v: "4.9★", l: isAr ? "تقييم العملاء" : "Customer Rating" },
          ].map((s) => (
            <div key={s.l} className="text-center">
              <p className="text-2xl font-black text-primary sm:text-3xl">{s.v}</p>
              <p className="mt-0.5 text-xs font-medium uppercase tracking-wider text-slate-500">{s.l}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
