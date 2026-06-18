"use client";

import { motion } from "framer-motion";
import {
  Landmark,
  ShoppingBag,
  HeartPulse,
  GraduationCap,
  Truck,
  Building2,
  type LucideIcon,
} from "lucide-react";
import { Marquee, MarqueeItem } from "@/components/landing/marquee";
import { useApp } from "@/lib/context";

type Industry = {
  icon: LucideIcon;
  accent: string;
  title: { en: string; ar: string };
  desc: { en: string; ar: string };
  tags: { en: string; ar: string }[];
};

const INDUSTRIES: Industry[] = [
  {
    icon: Landmark,
    accent: "#60a5fa",
    title: { en: "BFSI", ar: "البنوك والتمويل" },
    desc: { en: "Banking & insurance", ar: "البنوك والتأمين" },
    tags: [
      { en: "OTP & Alerts", ar: "OTP وتنبيهات" },
      { en: "Transactions", ar: "معاملات" },
      { en: "Support", ar: "دعم" },
    ],
  },
  {
    icon: ShoppingBag,
    accent: "#f472b6",
    title: { en: "E-commerce", ar: "التجارة الإلكترونية" },
    desc: { en: "Retail & marketplaces", ar: "متاجر وأسواق" },
    tags: [
      { en: "Order updates", ar: "طلبات" },
      { en: "Delivery", ar: "توصيل" },
      { en: "Engagement", ar: "تفاعل" },
    ],
  },
  {
    icon: HeartPulse,
    accent: "#25D366",
    title: { en: "Healthcare", ar: "الصحة" },
    desc: { en: "Hospitals & clinics", ar: "مستشفيات وعيادات" },
    tags: [
      { en: "Appointments", ar: "مواعيد" },
      { en: "Health alerts", ar: "تنبيهات" },
      { en: "Patients", ar: "مرضى" },
    ],
  },
  {
    icon: GraduationCap,
    accent: "#a78bfa",
    title: { en: "Education", ar: "التعليم" },
    desc: { en: "Schools & EdTech", ar: "مدارس وتعليم" },
    tags: [
      { en: "Admissions", ar: "قبول" },
      { en: "Fee reminders", ar: "رسوم" },
      { en: "Parents", ar: "أولياء" },
    ],
  },
  {
    icon: Truck,
    accent: "#ff6d3f",
    title: { en: "Logistics", ar: "اللوجستيات" },
    desc: { en: "Transport & delivery", ar: "نقل وتوصيل" },
    tags: [
      { en: "Tracking", ar: "تتبع" },
      { en: "Updates", ar: "تحديثات" },
      { en: "Drivers", ar: "سائقين" },
    ],
  },
  {
    icon: Building2,
    accent: "#2dd4bf",
    title: { en: "Real Estate", ar: "العقارات" },
    desc: { en: "Property & construction", ar: "عقارات وبناء" },
    tags: [
      { en: "Alerts", ar: "تنبيهات" },
      { en: "Site visits", ar: "زيارات" },
      { en: "Payments", ar: "دفعات" },
    ],
  },
];

function IndustryCard({
  industry,
  isAr,
  index,
  marquee,
}: {
  industry: Industry;
  isAr: boolean;
  index: number;
  marquee?: boolean;
}) {
  const Icon = industry.icon;

  const card = (
    <div
      className={
        marquee
          ? "flex h-full w-[210px] shrink-0 flex-col rounded-2xl bg-[#141414] p-5 ring-1 ring-white/[0.07] sm:w-[230px] sm:p-6"
          : "group flex h-full flex-col rounded-2xl bg-[#141414] p-6 ring-1 ring-white/[0.07] transition-all duration-300 hover:bg-[#1a1a1a] hover:ring-white/[0.12]"
      }
    >
      <div
        className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ring-1 ring-white/[0.06]"
        style={{ backgroundColor: `${industry.accent}14` }}
      >
        <Icon className="h-7 w-7" style={{ color: industry.accent }} />
      </div>

      <h3 className="font-display text-lg font-bold text-white">
        {isAr ? industry.title.ar : industry.title.en}
      </h3>
      <p className="mt-1 text-sm text-neutral-500">
        {isAr ? industry.desc.ar : industry.desc.en}
      </p>

      <ul className="mt-auto flex flex-col gap-2 pt-4">
        {industry.tags.map((tag) => (
          <li key={tag.en} className="flex items-center gap-2 text-xs text-neutral-400">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: industry.accent }}
            />
            {isAr ? tag.ar : tag.en}
          </li>
        ))}
      </ul>
    </div>
  );

  if (marquee) return card;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
    >
      {card}
    </motion.div>
  );
}

export function IndustriesSection() {
  const { locale } = useApp();
  const isAr = locale === "ar";

  return (
    <section className="border-y border-white/[0.06] bg-[#0a0e12]/50 px-4 py-14 sm:py-16">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-8 text-center sm:mb-12"
        >
          <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
            {isAr ? "القطاعات التي نخدمها" : "Industries we serve"}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-neutral-400 sm:text-base">
            {isAr
              ? "حلول واتساب متخصصة لكل قطاع — في السعودية والخليج."
              : "Specialized WhatsApp solutions for every industry across Saudi Arabia & the Gulf."}
          </p>
        </motion.div>

        {/* Mobile & tablet — auto-scroll marquee, all industries */}
        <div className="lg:hidden">
          <Marquee speed="slow" pauseOnHover={false}>
            {INDUSTRIES.map((industry, i) => (
              <MarqueeItem key={industry.title.en} className="mx-2">
                <IndustryCard industry={industry} isAr={isAr} index={i} marquee />
              </MarqueeItem>
            ))}
          </Marquee>
        </div>

        {/* Desktop — single row grid */}
        <div className="hidden gap-4 lg:grid lg:grid-cols-6">
          {INDUSTRIES.map((industry, i) => (
            <IndustryCard key={industry.title.en} industry={industry} isAr={isAr} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
