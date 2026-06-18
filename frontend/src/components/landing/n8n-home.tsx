"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Code2,
  Bot,
  MessageSquare,
  Shield,
  Zap,
  Server,
} from "lucide-react";
import { Marquee, MarqueeItem } from "@/components/landing/marquee";
import { WorkflowShowcase } from "@/components/landing/workflow-showcase";
import { HeroVisual } from "@/components/landing/hero-visual";
import { BrandLogo, IntegrationLogo, BUSINESS_LOGOS, INTEGRATION_LOGOS } from "@/components/landing/brand-logos";
import { AnimatedCounter, AnimatedRating } from "@/components/ui/animated-counter";
import { useApp } from "@/lib/context";

/* ─── Hero — split text left / visual right (n8n style) ─── */
export function N8nHero() {
  const { locale } = useApp();
  const isAr = locale === "ar";

  return (
    <section className="n8n-hero-bg relative overflow-hidden pt-12 pb-16 md:pt-14 md:pb-20 lg:pt-20 lg:pb-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_30%,rgba(37,211,102,0.07),transparent_50%)]" />

      <div className="relative mx-auto max-w-7xl px-4">
        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-12 lg:gap-16">
          {/* Text — full width on mobile, left on tablet+ */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 }}
            className="text-center md:text-start"
          >
            <div className="mb-4 inline-flex items-center gap-2 text-xs font-medium text-[#25D366]">
              <MessageSquare className="h-3.5 w-3.5" />
              Meta WhatsApp Business API
            </div>
            <h1 className="font-display text-balance text-2xl font-bold leading-[1.15] tracking-tight text-white sm:text-3xl md:text-4xl lg:text-[2.65rem] lg:leading-[1.08]">
              {isAr ? (
                <>
                  واتساب و AI للتسويق والحجوزات{" "}
                  <span className="meta-gradient-text">تراها وتتحكم بها</span>
                </>
              ) : (
                <>
                  WhatsApp & AI for marketing, leads & bookings{" "}
                  <span className="meta-gradient-text">you can see and control</span>
                </>
              )}
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-neutral-400 sm:mt-5 sm:text-base md:mx-0">
              {isAr
                ? "واتساب كمحفّز — AI يرد، يحجز، يبيع، ويجمع العملاء. كل محادثة على لوحة واحدة."
                : "WhatsApp as the trigger — AI replies, bookings, orders, and marketing. Every conversation on one canvas."}
            </p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-6 flex flex-wrap justify-center gap-3 sm:mt-8 md:justify-start"
            >
              <Link
                href="/signup"
                className="meta-primary-btn inline-flex h-11 items-center gap-2 rounded-lg px-6 text-sm font-semibold"
              >
                {isAr ? "ابدأ مجاناً" : "Get started free"}
                <ArrowRight className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
              </Link>
              <Link
                href="/demo"
                className="n8n-outline-btn inline-flex h-11 items-center rounded-lg border-neutral-700 px-6 text-sm font-semibold text-neutral-300 hover:bg-white/5"
              >
                {isAr ? "تحدث مع المبيعات" : "Talk to sales"}
              </Link>
            </motion.div>
          </motion.div>

          {/* WhatsApp mockup — tablet & laptop only, hidden on mobile */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            className="hidden md:block"
          >
            <HeroVisual />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export { WorkflowShowcase };

/* ─── Auto-scrolling business logos ─── */
export function LogoMarquee() {
  const { locale } = useApp();
  const isAr = locale === "ar";

  return (
    <section className="border-y border-white/[0.04] bg-[#0d1117] py-12">
      <p className="mb-8 text-center text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
        {isAr
          ? "موثوق من قبل فرق رائدة في السعودية والعالم"
          : "Trusted by leading teams in Saudi Arabia and worldwide"}
      </p>
      <Marquee speed="slow">
        {BUSINESS_LOGOS.map((entry) => (
          <MarqueeItem key={entry.name} className="mx-3">
            <BrandLogo entry={entry} size="md" />
          </MarqueeItem>
        ))}
      </Marquee>
    </section>
  );
}

/* ─── Social proof badges ─── */
export function SocialProofBadges() {
  const { locale } = useApp();
  const isAr = locale === "ar";

  const badges = [
    {
      title: isAr ? "أفضل 50 منصة" : "Top 50 Platform",
      sub: isAr ? "أتمتة واتساب في المنطقة" : "WhatsApp automation in MENA",
      stat: "★★★★★",
    },
    {
      title: isAr ? "4.9/5 تقييم" : "4.9/5 stars",
      sub: isAr ? "«أفضل أداة واتساب للشركات الصغيرة»" : "«Best WhatsApp tool for SMEs»",
      stat: "G2",
    },
    {
      title: isAr ? "200k+ عضو" : "200k+ community",
      sub: isAr ? "مجتمع أصحاب الأعمال السعوديين" : "Saudi business owner community",
      stat: "💬",
    },
  ];

  return (
    <section className="px-4 py-20">
      <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-3">
        {badges.map((b) => (
          <div key={b.title} className="n8n-glass-card p-5 text-center">
            <p className="font-mono text-lg text-violet-400">{b.stat}</p>
            <p className="mt-2 font-display font-bold text-white">{b.title}</p>
            <p className="mt-1 text-xs text-neutral-500">{b.sub}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Split feature sections (n8n style) ─── */
function ChatMockup({ isAr }: { isAr: boolean }) {
  return (
    <div className="n8n-glass-card overflow-hidden p-1">
      <div className="rounded-xl bg-[#0c0c14] p-4">
        <div className="mb-3 flex items-center gap-2 border-b border-white/8 pb-3">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-teal-400" />
          <div>
            <p className="text-xs font-semibold text-white">{isAr ? "بوت المطعم" : "Restaurant Bot"}</p>
            <p className="text-[10px] text-teal-400">● {isAr ? "متصل" : "online"}</p>
          </div>
        </div>
        <div className="space-y-2.5">
          <div className="ms-auto max-w-[85%] rounded-2xl rounded-ee-sm bg-violet-600/80 px-3 py-2 text-xs text-white">
            {isAr ? "عندكم توصيل؟" : "Do you deliver?"}
          </div>
          <div className="max-w-[90%] rounded-2xl rounded-es-sm border border-white/8 bg-white/5 px-3 py-2 text-xs text-neutral-300">
            {isAr ? "نعم! 🚚 أبي أعرض القائمة؟" : "Yes! 🚚 Want to see the menu?"}
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-teal-500/10 px-2 py-1.5 text-[10px] text-teal-300">
            <Bot className="h-3 w-3" />
            {isAr ? "GPT-4 · فهم النية" : "GPT-4 · intent detected"}
          </div>
        </div>
      </div>
    </div>
  );
}

function SpeedMockup({ isAr }: { isAr: boolean }) {
  return (
    <div className="relative flex items-center justify-center py-8">
      <div className="absolute h-40 w-40 rounded-full border border-violet-500/20 animate-pulse-glow" />
      <div className="absolute h-56 w-56 rounded-full border border-teal-400/10" />
      <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-teal-500 shadow-[0_0_60px_rgba(139,92,246,0.5)]">
        <Zap className="h-12 w-12 text-white" fill="white" />
      </div>
      <p className="absolute bottom-0 font-mono text-[10px] text-neutral-500">
        {isAr ? "99.9% وقت تشغيل" : "99.9% uptime SLA"}
      </p>
    </div>
  );
}

export function SplitFeatureUI() {
  const { locale } = useApp();
  const isAr = locale === "ar";
  const glow = "rgba(139,92,246,0.15)";

  return (
    <div className="relative overflow-hidden px-4 py-20 sm:py-24">
      <div className={`pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,${glow},transparent_60%)]`} />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <h2 className="font-display text-balance text-3xl font-bold sm:text-4xl">
            {isAr ? "واجهة بصرية أو كود — أنت تختار" : "UI when you need it, code when you don't"}
          </h2>
          <p className="mt-4 text-lg text-neutral-400">
            {isAr
              ? "ابنِ تدفقات واتساب بصرياً. أضف JavaScript وwebhooks عندما تحتاج منطقاً متقدماً."
              : "Build WhatsApp flows visually. Drop into JavaScript and webhooks when you need advanced logic."}
          </p>
          <ul className="mt-6 space-y-3">
            {(isAr
              ? ["منشئ تدفقات بصري", "JavaScript & webhooks", "تكامل GPT-4 جاهز"]
              : ["Visual flow builder", "JavaScript & webhooks", "GPT-4 integration built-in"]
            ).map((b) => (
              <li key={b} className="flex items-center gap-3 text-sm text-neutral-300">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/20 text-violet-400">
                  <Code2 className="h-3 w-3" />
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <ChatMockup isAr={isAr} />
        </div>
      </div>
    </div>
  );
}

export function SplitFeatureSpeed() {
  const { locale } = useApp();
  const isAr = locale === "ar";
  const glow = "rgba(45,212,191,0.12)";

  return (
    <div className="relative overflow-hidden bg-[#0c0c14] px-4 py-20 sm:py-24">
      <div className={`pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,${glow},transparent_60%)]`} />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="lg:order-2">
          <h2 className="font-display text-balance text-3xl font-bold sm:text-4xl">
            {isAr ? "تحرك بسرعة. لا تكسر شيئاً." : "Move fast. Break nothing."}
          </h2>
          <p className="mt-4 text-lg text-neutral-400">
            {isAr
              ? "اختبر البوت قبل الإطلاق. تتبع كل رسالة. أعد المحاولة تلقائياً."
              : "Test bots before launch. Trace every message. Auto-retry on failure."}
          </p>
          <ul className="mt-6 space-y-3">
            {(isAr
              ? ["معاينة المحادثات", "سجل تنفيذ كامل", "إعادة محاولة ذكية"]
              : ["Conversation preview", "Full execution logs", "Smart retry logic"]
            ).map((b) => (
              <li key={b} className="flex items-center gap-3 text-sm text-neutral-300">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/20 text-violet-400">
                  <Code2 className="h-3 w-3" />
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>
        <div className="lg:order-1">
          <SpeedMockup isAr={isAr} />
        </div>
      </div>
    </div>
  );
}

export function SplitFeatureSections() {
  return (
    <section className="space-y-0">
      <SplitFeatureUI />
      <SplitFeatureSpeed />
    </section>
  );
}

/* ─── Bento 3-card grid ─── */
export function BentoFeatures() {
  const { locale } = useApp();
  const isAr = locale === "ar";

  return (
    <section className="px-4 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            {isAr ? "ابنِ ذكاء اصطناعي" : "Build AI agents"}{" "}
            <span className="n8n-gradient-text">{isAr ? "بدون قيود" : "without limits"}</span>
          </h2>
          <p className="mt-4 text-neutral-400">
            {isAr
              ? "اربط أي نموذج. تتبع كل قرار. أبقِ البشر في الحلقة."
              : "Connect any model. Inspect every decision. Keep humans in the loop."}
          </p>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-3 lg:grid-rows-2">
          {/* Tall right card */}
          <div className="n8n-glass-card flex flex-col p-6 lg:col-start-3 lg:row-span-2 lg:row-start-1">
            <h3 className="font-display text-lg font-bold text-white">
              {isAr ? "البشر والمنطق يوجّهون AI" : "People and logic guide AI"}
            </h3>
            <p className="mt-2 text-sm text-neutral-400">
              {isAr
                ? "تحكم في تدفق البيانات. ادمج الموافقات البشرية."
                : "Control data flow. Combine human-in-the-loop approvals."}
            </p>
            <div className="mt-4 flex-1">
              <ChatMockup isAr={isAr} />
            </div>
          </div>

          {/* Top left */}
          <div className="n8n-glass-card p-6 lg:col-span-2">
            <h3 className="font-display text-lg font-bold text-white">
              {isAr ? "ذكاء اصطناعي معقد بدون صندوق" : "Complex AI without getting boxed in"}
            </h3>
            <p className="mt-2 text-sm text-neutral-400">
              {isAr
                ? "بوتات متعددة، RAG، وتدفقات واتساب — كلها على لوحة واحدة."
                : "Multi-agent setups, RAG, and WhatsApp flows — all on one canvas."}
            </p>
            <ul className="mt-5 space-y-2.5">
              {[
                isAr ? "GPT-4 · عربي وإنجليزي" : "GPT-4 · Arabic & English",
                isAr ? "تدفقات واتساب جاهزة" : "Ready-made WhatsApp flows",
                isAr ? "تكامل n8n و Meta API" : "n8n & Meta API integration",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-neutral-300">
                  <Check className="h-4 w-4 shrink-0 text-teal-400" />
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/products/ai-bot" className="n8n-gradient-btn mt-5 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold">
              {isAr ? "استكشف AI" : "Explore AI"}
              <ArrowRight className={`h-3.5 w-3.5 ${isAr ? "rotate-180" : ""}`} />
            </Link>
          </div>

          {/* Bottom left */}
          <div className="n8n-glass-card p-6 lg:col-span-2">
            <h3 className="font-display text-lg font-bold text-white">
              {isAr ? "يعمل حيث تقرر" : "Runs where you decide"}
            </h3>
            <ul className="mt-4 space-y-2">
              {[
                isAr ? "انشر بـ Docker" : "Deploy with Docker",
                isAr ? "الكود المصدري على GitHub" : "Full source on GitHub",
                isAr ? "نسخة مستضافة أيضاً" : "Hosted version available",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-neutral-300">
                  <Check className="h-4 w-4 text-teal-400" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/8 bg-black/30 p-3">
              <Server className="h-5 w-5 text-violet-400" />
              <span className="text-xs font-mono text-neutral-400">SELF HOSTED</span>
              <div className="ms-auto h-5 w-10 rounded-full bg-teal-500/30 p-0.5">
                <div className="h-4 w-4 rounded-full bg-teal-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Integrations dual-row marquee ─── */
export function IntegrationsMarquee() {
  const { locale } = useApp();
  const isAr = locale === "ar";

  return (
    <section className="relative overflow-hidden border-y border-white/[0.06] py-24">
      <div className="relative mx-auto max-w-7xl px-4 text-center">
        <h2 className="font-display text-balance text-3xl font-bold sm:text-4xl">
          {isAr ? "اربط AI ببياناتك" : "Plug AI into your data"}{" "}
          <span className="n8n-gradient-text">{isAr ? "و500+ تكامل" : "& 500+ integrations"}</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-neutral-400">
          {isAr
            ? "وحدات جاهزة للتطبيقات الشائعة. API مخصص لكل شيء آخر."
            : "Pre-built nodes for common apps. Custom API for everything else."}
        </p>

        <div className="mt-14 space-y-4">
          <Marquee speed="normal">
            {INTEGRATION_LOGOS.map((entry) => (
              <MarqueeItem key={entry.name} className="mx-2">
                <IntegrationLogo entry={entry} />
              </MarqueeItem>
            ))}
          </Marquee>
          <Marquee reverse speed="normal">
            {[...INTEGRATION_LOGOS].reverse().map((entry) => (
              <MarqueeItem key={`r-${entry.name}`} className="mx-2">
                <IntegrationLogo entry={entry} />
              </MarqueeItem>
            ))}
          </Marquee>
        </div>

        <Link
          href="/products/integrations"
          className="n8n-gradient-btn mt-10 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold"
        >
          {isAr ? "استكشف جميع التكاملات" : "Browse all integrations"}
          <ArrowRight className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
        </Link>
      </div>
    </section>
  );
}

/* ─── Stats row with animated counters ─── */
export function StatsRow() {
  const { locale } = useApp();
  const isAr = locale === "ar";

  return (
    <section className="px-4 py-14">
      <div className="mx-auto max-w-5xl">
        {/* Minimal live businesses pill */}
        <div className="mb-8 flex justify-center">
          <div className="inline-flex items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse-dot" />
            <span className="text-neutral-400">
              <AnimatedCounter value={10000} suffix="+" className="font-semibold text-white" />{" "}
              {isAr ? "منشأة نشطة" : "active businesses"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl bg-white/[0.04] sm:grid-cols-3">
          <div className="bg-[#0a0e12] px-6 py-8 text-center">
            <p className="text-3xl font-bold meta-gradient-text sm:text-4xl">
              <AnimatedCounter value={10000} suffix="+" />
            </p>
            <p className="mt-2 text-sm font-semibold text-white">
              {isAr ? "منشأة سعودية" : "Saudi businesses"}
            </p>
            <p className="mt-0.5 text-xs text-neutral-500">
              {isAr ? "على المنصة" : "on platform"}
            </p>
          </div>
          <div className="bg-[#0a0e12] px-6 py-8 text-center">
            <p className="text-3xl font-bold meta-gradient-text sm:text-4xl">
              <AnimatedRating value={4.9} />
            </p>
            <p className="mt-2 text-sm font-semibold text-white">
              {isAr ? "تقييم العملاء" : "Customer rating"}
            </p>
            <p className="mt-0.5 text-xs text-neutral-500">G2-style reviews</p>
          </div>
          <div className="bg-[#0a0e12] px-6 py-8 text-center">
            <p className="text-3xl font-bold meta-gradient-text sm:text-4xl">
              <AnimatedCounter value={1000000} suffix="+" compact />
            </p>
            <p className="mt-2 text-sm font-semibold text-white">
              {isAr ? "رسالة شهرياً" : "Messages monthly"}
            </p>
            <p className="mt-0.5 text-xs text-neutral-500">
              {isAr ? "مُعالجة" : "processed"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Case studies auto-scroll ─── */
export function CaseStudiesMarquee() {
  const { locale } = useApp();
  const isAr = locale === "ar";

  const cases = [
    {
      company: "Al-Dhawq",
      stat: isAr ? "40% زيادة طلبات" : "40% order increase",
      title: isAr ? "ثقافة AI-first للمطاعم" : "AI-first restaurant culture",
      quote: isAr
        ? "«SaudiChat Pro كان المفتاح. الطلبات تتدفق تلقائياً الآن.»"
        : "«SaudiChat Pro was the unlock. Orders flow automatically now.»",
      author: isAr ? "أحمد الراشد" : "Ahmed Al-Rashid",
      role: isAr ? "مالك، مطعم الذوق" : "Owner, Al-Dhawq Restaurant",
    },
    {
      company: "Al-Noor Clinic",
      stat: isAr ? "80% استفسارات AI" : "80% AI-handled queries",
      title: isAr ? "قلّلنا ضغط الاستقبال" : "Reduced front-desk load",
      quote: isAr
        ? "«المرضى يحجزون بالعربية عبر واتساب. فريقنا يركز على المهم.»"
        : "«Patients book in Arabic via WhatsApp. Staff focuses on what matters.»",
      author: isAr ? "د. خالد المطيري" : "Dr. Khalid Al-Mutairi",
      role: isAr ? "مدير، عيادة النور" : "Director, Al-Noor Clinic",
    },
    {
      company: "Glow Salon",
      stat: isAr ? "£2.2M وفرنا" : "Saved SAR 2.2M",
      title: isAr ? "حجوزات 24/7 بدون مو Staff" : "24/7 bookings without extra staff",
      quote: isAr
        ? "«الإعداد 20 دقيقة. كنا نستقبل حجوزات في نفس اليوم.»"
        : "«Setup took 20 minutes. We were taking bookings the same day.»",
      author: isAr ? "سارة العتيبي" : "Sara Al-Otaibi",
      role: isAr ? "مؤسسة، Glow Salon" : "Founder, Glow Salon",
    },
    {
      company: "Riyadh Retail",
      stat: isAr ? "3x مبيعات واتساب" : "3x WhatsApp sales",
      title: isAr ? "متجر داخل المحادثة" : "Store inside the chat",
      quote: isAr
        ? "«أفضل أداة أتمتة واتساب للشركات الصغيرة في السعودية.»"
        : "«Best WhatsApp automation for Saudi SMEs. Nothing else comes close.»",
      author: isAr ? "فهد القحطاني" : "Fahad Al-Qahtani",
      role: isAr ? "CEO، Riyadh Retail" : "CEO, Riyadh Retail Co.",
    },
  ];

  return (
    <section className="px-4 py-24">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-center font-display text-3xl font-bold sm:text-4xl">
          {isAr ? "نتائج حقيقية" : "Real results from"}{" "}
          <span className="n8n-gradient-text">{isAr ? "منشآت سعودية" : "Saudi businesses"}</span>
        </h2>
        <div className="mt-12">
          <Marquee speed="slow" pauseOnHover>
            {cases.map((c) => (
              <MarqueeItem key={c.company} className="mx-3 w-[340px] sm:w-[380px]">
                <div className="n8n-glass-card flex h-full flex-col p-6">
                  <p className="font-mono text-xs uppercase tracking-widest text-violet-400">{c.company}</p>
                  <p className="mt-2 font-display text-xl font-bold text-white">{c.stat}</p>
                  <p className="mt-1 text-sm font-semibold text-neutral-300">{c.title}</p>
                  <p className="mt-4 flex-1 text-sm leading-relaxed text-neutral-400">{c.quote}</p>
                  <div className="mt-5 flex items-center gap-3 border-t border-white/8 pt-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-teal-400 text-sm font-bold text-white">
                      {c.author.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{c.author}</p>
                      <p className="text-xs text-neutral-500">{c.role}</p>
                    </div>
                  </div>
                  <Link href="/demo" className="n8n-gradient-btn mt-4 inline-flex w-fit items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold">
                    {isAr ? "اقرأ القصة" : "Read case study"}
                    <ArrowRight className={`h-3 w-3 ${isAr ? "rotate-180" : ""}`} />
                  </Link>
                </div>
              </MarqueeItem>
            ))}
          </Marquee>
        </div>
      </div>
    </section>
  );
}

/* ─── Enterprise section ─── */
export function N8nEnterprise() {
  const { locale } = useApp();
  const isAr = locale === "ar";

  const checks = [
    isAr ? "واتساب API معتمد من Meta" : "Meta-verified WhatsApp API",
    isAr ? "بيانات مشفرة واستضافة سعودية" : "Encrypted data & Saudi hosting",
    isAr ? "REST API و Webhooks" : "REST API & Webhooks",
    isAr ? "تحويل بشري وقواعد AI" : "Human handoff & AI guardrails",
    isAr ? "دعم مخصص 24/7" : "Dedicated 24/7 support",
    isAr ? "SLA 99.9% وقت تشغيل" : "99.9% uptime SLA",
  ];

  return (
    <section className="relative overflow-hidden px-4 py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(45,212,191,0.1),transparent_60%)]" />
      <div className="relative mx-auto max-w-7xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-neutral-300">
          <Shield className="h-3.5 w-3.5 text-teal-400" />
          {isAr ? "جاهز للمؤسسات" : "Enterprise-ready"}
        </div>
        <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
          {isAr ? "موثوق. قابل للتوسع. آمن." : "Reliable. Scalable. Secure."}
        </h2>
        <p className="mt-4 max-w-xl text-neutral-400">
          {isAr
            ? "أتمتة واتساب بمستوى المؤسسات للمنشآت السعودية — على سحابتنا أو بنيتك."
            : "Enterprise-grade WhatsApp automation for Saudi businesses — on our cloud or yours."}
        </p>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {checks.map((c) => (
            <div key={c} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
              <Check className="h-4 w-4 shrink-0 text-teal-400" />
              <span className="text-sm text-neutral-300">{c}</span>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/demo" className="n8n-gradient-btn inline-flex h-11 items-center rounded-xl px-6 text-sm font-semibold">
            {isAr ? "استكشف للمؤسسات" : "Explore for enterprise"}
          </Link>
          <Link href="/contact" className="n8n-outline-btn inline-flex h-11 items-center rounded-xl px-6 text-sm font-semibold">
            {isAr ? "تواصل مع المبيعات" : "Talk to sales"}
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─── Testimonials marquee ─── */
export function TestimonialsMarquee() {
  const { locale } = useApp();
  const isAr = locale === "ar";

  const quotes = [
    { q: isAr ? "«أفضل أداة واتساب للشركات الصغيرة في السعودية. لا شيء يقارن.»" : "«Best WhatsApp tool for Saudi SMEs. Nothing else comes close.»", a: isAr ? "فهد القحطاني" : "Fahad Al-Qahtani", h: "@fahad_retail" },
    { q: isAr ? "«البوت يتعامل مع 80% من الاستفسارات بالعربية.»" : "«The AI bot handles 80% of queries in Arabic.»", a: isAr ? "د. خالد" : "Dr. Khalid", h: "@alnoor_clinic" },
    { q: isAr ? "«الإعداد 20 دقيقة. طلبات في نفس اليوم.»" : "«Setup took 20 minutes. Orders same day.»", a: isAr ? "سارة العتيبي" : "Sara Al-Otaibi", h: "@glow_salon" },
    { q: isAr ? "«SaudiChat Pro كان المفتاح لمطعمنا.»" : "«SaudiChat Pro was the big unlock for our restaurant.»", a: isAr ? "أحمد الراشد" : "Ahmed Al-Rashid", h: "@aldhawq" },
    { q: isAr ? "«لوحة تحكم رائعة. كل رسالة مسجلة.»" : "«Amazing dashboard. Every message logged.»", a: isAr ? "نورة السبيعي" : "Noura Al-Subai", h: "@noura_shop" },
  ];

  return (
    <section className="border-t border-white/8 py-16">
      <Marquee speed="normal" pauseOnHover>
        {quotes.map((item, i) => (
          <MarqueeItem key={i} className="mx-3 w-[300px] sm:w-[340px]">
            <div className="rounded-2xl border border-white/10 bg-[#12121c] p-5">
              <p className="text-sm leading-relaxed text-neutral-300">{item.q}</p>
              <div className="mt-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/30 text-xs font-bold text-violet-300">
                  {item.a.charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">{item.a}</p>
                  <p className="text-[10px] text-neutral-500">{item.h}</p>
                </div>
              </div>
            </div>
          </MarqueeItem>
        ))}
      </Marquee>
    </section>
  );
}

/* ─── Final CTA ─── */
export function CtaFooterBar() {
  const { locale } = useApp();
  const isAr = locale === "ar";

  return (
    <section className="relative overflow-hidden px-4 py-24">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-full bg-[radial-gradient(ellipse_at_50%_100%,rgba(255,109,63,0.25),transparent_65%)]" />
      <div className="n8n-stars pointer-events-none absolute inset-x-0 bottom-0 h-48 opacity-50" />

      <div className="relative mx-auto max-w-3xl text-center">
        <h2 className="font-display text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
          {isAr ? "بسيط للبدء. قوي للتوسع." : "Simple enough to see. Powerful enough to ship."}
        </h2>
        <p className="mt-4 text-lg text-neutral-400">
          {isAr
            ? "انضم للفرق التي تبني أتمتة واتساب يمكنها شرحها."
            : "Join teams building WhatsApp automation they can actually explain."}
        </p>
        <Link
          href="/signup"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#25D366] to-[#0b5e42] px-8 py-4 text-sm font-bold text-white shadow-[0_4px_24px_rgba(37,211,102,0.35)] transition-transform hover:scale-105"
        >
          {isAr ? "ابدأ البناء" : "Start building"}
          <ArrowRight className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
        </Link>
      </div>
    </section>
  );
}

/* Legacy exports kept for compatibility */
export function N8nFeaturesGrid() {
  return <BentoFeatures />;
}

export function EnterpriseLogos() {
  return <LogoMarquee />;
}
