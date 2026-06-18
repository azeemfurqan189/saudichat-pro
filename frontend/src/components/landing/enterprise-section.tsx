"use client";

import Link from "next/link";
import { Shield, Eye, Code2, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/landing/scroll-reveal";
import { useApp } from "@/lib/context";

const pillars = [
  {
    icon: Shield,
    title: { en: "Security & Control", ar: "الأمان والتحكم" },
    desc: {
      en: "Meta-verified WhatsApp API, encrypted data, role-based dashboard access.",
      ar: "واتساب API معتمد من ميتا، بيانات مشفرة، وصول لوحة حسب الأدوار.",
    },
  },
  {
    icon: Eye,
    title: { en: "Full Observability", ar: "شفافية كاملة" },
    desc: {
      en: "Every conversation logged. Real-time order tracking and bot analytics.",
      ar: "كل محادثة مسجلة. تتبع طلبات فوري وتحليلات البوت.",
    },
  },
  {
    icon: Code2,
    title: { en: "Developer Ready", ar: "جاهز للمطورين" },
    desc: {
      en: "REST API, webhooks, and integrations with your existing stack.",
      ar: "REST API و Webhooks وتكامل مع أنظمتك الحالية.",
    },
  },
  {
    icon: Bot,
    title: { en: "AI Governance", ar: "حوكمة الذكاء الاصطناعي" },
    desc: {
      en: "Human handoff, custom rules, and guardrails for every bot response.",
      ar: "تحويل بشري وقواعد مخصصة وضوابط لكل رد من البوت.",
    },
  },
];

export function EnterpriseSection() {
  const { locale } = useApp();
  const isAr = locale === "ar";

  return (
    <section className="enterprise-bg relative overflow-hidden px-4 py-24 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(20,184,166,0.15),transparent_60%)]" />
      <div className="relative mx-auto max-w-7xl">
        <ScrollReveal>
          <p className="text-sm font-bold uppercase tracking-widest text-teal-300">
            {isAr ? "جاهز للمؤسسات" : "Enterprise Ready"}
          </p>
          <h2 className="mt-3 max-w-2xl text-balance text-3xl font-bold sm:text-4xl">
            {isAr
              ? "موثوق. قابل للتوسع. آمن."
              : "Reliable. Scalable. Secure."}
          </h2>
          <p className="mt-4 max-w-xl text-slate-300">
            {isAr
              ? "انشر على بنيتك أو سحابتنا. أتمتة واتساب بمستوى المؤسسات للمنشآت السعودية."
              : "Deploy on your infrastructure or ours. Enterprise-grade WhatsApp automation for Saudi businesses."}
          </p>
        </ScrollReveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((p, i) => (
            <ScrollReveal key={p.title.en} delay={i * 0.08}>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-colors hover:bg-white/10">
                <p.icon className="h-7 w-7 text-teal-300" />
                <h3 className="mt-4 font-semibold">{isAr ? p.title.ar : p.title.en}</h3>
                <p className="mt-2 text-sm text-slate-400">{isAr ? p.desc.ar : p.desc.en}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal className="mt-12 flex flex-wrap gap-4" delay={0.3}>
          <Link href="/demo">
            <Button size="lg" className="rounded-full bg-white text-slate-900 hover:bg-slate-100">
              {isAr ? "احجز عرضاً للمؤسسات" : "Book Enterprise Demo"}
            </Button>
          </Link>
          <Link href="/contact">
            <Button size="lg" variant="outline" className="rounded-full border-white/30 text-white hover:bg-white/10">
              {isAr ? "تواصل مع المبيعات" : "Talk to Sales"}
            </Button>
          </Link>
        </ScrollReveal>
      </div>
    </section>
  );
}
