"use client";

import { Shield, Zap, MessageSquare, Bot } from "lucide-react";
import { useApp } from "@/lib/context";

export function TrustStrip() {
  const { locale } = useApp();
  const isAr = locale === "ar";

  const items = [
    { icon: MessageSquare, label: isAr ? "واتساب رسمي من ميتا" : "Meta Official WhatsApp API" },
    { icon: Bot, label: isAr ? "بوت ذكي GPT-4" : "GPT-4 AI Chatbot" },
    { icon: Shield, label: isAr ? "بيانات آمنة 100%" : "100% Secure Data" },
    { icon: Zap, label: isAr ? "إعداد في دقائق" : "Setup in Minutes" },
  ];

  return (
    <section className="border-y border-slate-200 bg-white py-6 dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-8 px-4">
        {items.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
            <Icon className="h-5 w-5 text-primary" />
            {label}
          </div>
        ))}
      </div>
    </section>
  );
}
