"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";

const chatMessages = [
  { from: "customer", text: "السلام عليكم، أبي أطلب" },
  { from: "bot", text: "مرحباً! 👋 كيف يمكنني مساعدتك؟" },
  { from: "customer", text: "أبي دجاج مقلي وكولا" },
  { from: "bot", text: "✅ تم إضافة:\n• دجاج مقلي × 1 - 18 SAR\n• كولا × 1 - 5 SAR\n\nالإجمالي: 23 SAR\nتأكيد الطلب؟" },
];

export function Hero() {
  const { locale } = useApp();
  const fontClass = locale === "ar" ? "font-arabic" : "";

  return (
    <section className="pt-32 pb-20 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-hero opacity-5" />
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: locale === "ar" ? 30 : -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className={fontClass}
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {t(locale, "hero", "title")}
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-lg">
            {t(locale, "hero", "subtitle")}
          </p>
          <div className="flex flex-wrap gap-4 mb-12">
            <Link href="/signup">
              <Button variant="gold" size="lg" className="shadow-glow">{t(locale, "hero", "cta")}</Button>
            </Link>
            <Button variant="outline" size="lg">{t(locale, "hero", "demo")}</Button>
          </div>
          <div className="grid grid-cols-3 gap-6">
            {[
              { value: 10000, suffix: "+", label: t(locale, "hero", "stats.businesses") },
              { value: 1000000, suffix: "+", label: t(locale, "hero", "stats.messages") },
              { value: 99.9, suffix: "%", label: t(locale, "hero", "stats.uptime"), decimals: 1 },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="text-center"
              >
                <div className="text-2xl md:text-3xl font-bold text-primary">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} decimals={stat.decimals} />
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative"
        >
          <div className="glass-card max-w-sm mx-auto animate-float">
            <div className="flex items-center gap-3 pb-4 border-b border-border mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">🍗</div>
              <div>
                <div className="font-semibold text-sm">Al Baik Restaurant</div>
                <div className="text-xs text-green-500">● Online</div>
              </div>
            </div>
            <div className="space-y-3 max-h-80 overflow-hidden">
              {chatMessages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.4 }}
                  className={`flex ${msg.from === "customer" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm whitespace-pre-line ${
                      msg.from === "customer"
                        ? "bg-primary text-white rounded-br-sm"
                        : "bg-gray-100 dark:bg-gray-800 rounded-bl-sm"
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
    </section>
  );
}
