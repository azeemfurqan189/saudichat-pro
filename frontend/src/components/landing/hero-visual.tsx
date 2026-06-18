"use client";

import { Bot, MessageCircle, ShoppingCart, Sparkles } from "lucide-react";
import { useApp } from "@/lib/context";

/** Hero WhatsApp chat mockup — shown on tablet & laptop only */
export function HeroVisual() {
  const { locale } = useApp();
  const isAr = locale === "ar";

  return (
    <div className="relative mx-auto w-full max-w-md lg:ms-auto lg:max-w-none">
      <div className="pointer-events-none absolute -inset-8 rounded-full bg-[radial-gradient(circle,rgba(37,211,102,0.12),transparent_70%)]" />

      <div className="relative overflow-hidden rounded-2xl bg-[#111b21] shadow-[0_24px_80px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.08]">
        <div className="flex items-center gap-3 border-b border-white/[0.06] bg-[#1f2c34] px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366]/20">
            <MessageCircle className="h-5 w-5 text-[#25D366]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              {isAr ? "مطعم الذوق" : "Al-Dhawq Restaurant"}
            </p>
            <p className="text-[10px] text-[#25D366]">● {isAr ? "بوت نشط" : "bot online"}</p>
          </div>
        </div>

        <div className="space-y-3 px-4 py-5">
          <div className="ms-auto max-w-[82%] rounded-xl rounded-ee-sm bg-[#005c4b] px-3 py-2 text-xs text-[#e9edef]">
            {isAr ? "عندكم توصيل للرياض؟" : "Do you deliver to Riyadh?"}
          </div>
          <div className="max-w-[88%] rounded-xl rounded-es-sm bg-[#202c33] px-3 py-2 text-xs text-[#e9edef]">
            {isAr ? "نعم! 🚚 أبي أعرض القائمة؟" : "Yes! 🚚 Want to see the menu?"}
          </div>
          <div className="ms-auto max-w-[75%] rounded-xl rounded-ee-sm bg-[#005c4b] px-3 py-2 text-xs text-[#e9edef]">
            {isAr ? "أبي 2 برجر" : "I'll take 2 burgers"}
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-[#25D366]/10 px-2.5 py-1.5">
            <Bot className="h-3.5 w-3.5 text-[#25D366]" />
            <span className="text-[10px] text-[#25D366]">
              {isAr ? "GPT-4 · طلب جديد #1847" : "GPT-4 · New order #1847"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-white/[0.06] bg-[#0b141a] px-4 py-3">
          {[
            { icon: MessageCircle, label: isAr ? "واتساب" : "WhatsApp", color: "#25D366" },
            { icon: Bot, label: "AI", color: "#34d399" },
            { icon: ShoppingCart, label: isAr ? "طلب" : "Order", color: "#25D366" },
          ].map((step, i) => (
            <div key={step.label} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-neutral-600">→</span>}
              <div className="flex items-center gap-1 rounded-md bg-white/[0.04] px-2 py-1">
                <step.icon className="h-3 w-3" style={{ color: step.color }} />
                <span className="text-[9px] font-medium text-neutral-400">{step.label}</span>
              </div>
            </div>
          ))}
          <Sparkles className="ms-auto h-3.5 w-3.5 text-[#25D366]/60 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
