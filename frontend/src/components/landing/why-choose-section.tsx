"use client";

import { motion } from "framer-motion";
import {
  Clock,
  HelpCircle,
  UserCheck,
  Layers,
  Languages,
  Database,
  type LucideIcon,
} from "lucide-react";
import { useApp } from "@/lib/context";
import { cn } from "@/lib/utils";

type Feature = {
  icon: LucideIcon;
  accent: string;
  title: { en: string; ar: string };
  desc: { en: string; ar: string };
};

const FEATURES: Feature[] = [
  {
    icon: Clock,
    accent: "#25D366",
    title: { en: "24/7 Automated Support", ar: "دعم آلي على مدار الساعة" },
    desc: {
      en: "Instant responses to customer inquiries around the clock — no queues, no wait times.",
      ar: "ردود فورية على استفسارات العملاء طوال اليوم — بدون انتظار أو طوابير.",
    },
  },
  {
    icon: HelpCircle,
    accent: "#60a5fa",
    title: { en: "FAQ Automation", ar: "أتمتة الأسئلة الشائعة" },
    desc: {
      en: "Personalized answers to frequently asked questions, trained on your business knowledge.",
      ar: "إجابات مخصصة للأسئلة المتكررة، مبنية على معرفة منشأتك.",
    },
  },
  {
    icon: UserCheck,
    accent: "#ff6d3f",
    title: { en: "Live Agent Handoff", ar: "تحويل للموظف البشري" },
    desc: {
      en: "Seamless transfer to human agents when queries need a personal touch.",
      ar: "تحويل سلس للموظفين عندما تحتاج المحادثة لمسة بشرية.",
    },
  },
  {
    icon: Layers,
    accent: "#a78bfa",
    title: { en: "Multi-Channel Deployment", ar: "نشر متعدد القنوات" },
    desc: {
      en: "One chatbot across WhatsApp, Messenger, Instagram, and your website.",
      ar: "بوت واحد عبر واتساب وماسنجر وإنستغرام وموقعك الإلكتروني.",
    },
  },
  {
    icon: Languages,
    accent: "#2dd4bf",
    title: { en: "Arabic & English NLU", ar: "فهم لغوي عربي وإنجليزي" },
    desc: {
      en: "Natural language understanding tuned for Saudi dialects and regional markets.",
      ar: "فهم لغوي طبيعي مُحسَّن للهجات السعودية والأسواق الإقليمية.",
    },
  },
  {
    icon: Database,
    accent: "#f472b6",
    title: { en: "CRM Integration", ar: "تكامل CRM" },
    desc: {
      en: "Native connections to Salesforce, HubSpot, Zoho, and 100+ business systems.",
      ar: "اتصال مباشر مع Salesforce و HubSpot و Zoho وأكثر من 100 نظام.",
    },
  },
];

function FeatureCard({ feature, isAr, index }: { feature: Feature; isAr: boolean; index: number }) {
  const Icon = feature.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: index * 0.07 }}
      className="group relative overflow-hidden rounded-2xl bg-[#141414] p-6 ring-1 ring-white/[0.06] transition-all duration-300 hover:bg-[#181818] hover:ring-white/[0.1]"
    >
      <div
        className="pointer-events-none absolute -end-8 -top-8 h-32 w-32 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
        style={{ backgroundColor: `${feature.accent}18` }}
      />

      <div
        className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl ring-1 ring-white/[0.06]"
        style={{ backgroundColor: `${feature.accent}12` }}
      >
        <Icon className="h-5 w-5" style={{ color: feature.accent }} />
      </div>

      <h3 className="font-display text-base font-bold text-white">
        {isAr ? feature.title.ar : feature.title.en}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-neutral-500">
        {isAr ? feature.desc.ar : feature.desc.en}
      </p>

      <span
        className="absolute bottom-0 start-0 h-0.5 w-0 rounded-full transition-all duration-500 group-hover:w-full"
        style={{ backgroundColor: feature.accent }}
      />
    </motion.div>
  );
}

export function WhyChooseSection() {
  const { locale } = useApp();
  const isAr = locale === "ar";

  return (
    <section className="relative overflow-x-hidden px-4 py-14 sm:py-20 lg:py-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(37,211,102,0.06),transparent_55%)]" />

      <div className="relative mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-[#25D366]/20 bg-[#25D366]/8 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#25D366]">
            {isAr ? "مستوى المؤسسات" : "Enterprise grade"}
          </span>
          <h2 className="mt-5 font-display text-balance text-2xl font-bold text-white sm:text-3xl lg:text-[2.75rem] lg:leading-tight">
            {isAr ? (
              <>
                لماذا تختار الشركات{" "}
                <span className="meta-gradient-text">SaudiChat Pro</span>{" "}
                لبوتات واتساب؟
              </>
            ) : (
              <>
                Why companies choose{" "}
                <span className="meta-gradient-text">SaudiChat Pro</span>{" "}
                for WhatsApp chatbots
              </>
            )}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-neutral-400">
            {isAr
              ? "حلول بوت واتساب بمستوى المؤسسات لخدمة العملاء — أتمتة ذكية مع تحكم كامل وامتثال لميتا."
              : "Enterprise-grade WhatsApp chatbot solutions for customer service — smart automation with full control and Meta compliance."}
          </p>
        </motion.div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {FEATURES.map((feature, i) => (
            <FeatureCard key={feature.title.en} feature={feature} isAr={isAr} index={i} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className={cn(
            "mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t border-white/[0.06] pt-10",
            "text-xs font-medium uppercase tracking-wider text-neutral-600"
          )}
        >
          {[
            { en: "Meta Business Partner", ar: "شريك Meta Business" },
            { en: "GDPR-ready", ar: "متوافق GDPR" },
            { en: "Saudi data residency", ar: "استضافة بيانات سعودية" },
            { en: "99.9% uptime SLA", ar: "SLA 99.9% وقت تشغيل" },
          ].map((badge) => (
            <span key={badge.en} className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-[#25D366]" />
              {isAr ? badge.ar : badge.en}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
