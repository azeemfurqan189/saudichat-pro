"use client";

import { useApp } from "@/lib/context";

const logos = [
  "Al-Dhawq Restaurant",
  "Glow Salon",
  "Al-Noor Clinic",
  "Riyadh Retail Co.",
  "FitZone Gym",
  "Saudi Properties",
];

export function LogoStrip() {
  const { locale } = useApp();
  const isAr = locale === "ar";

  return (
    <section className="border-b border-slate-200 bg-white py-10 dark:border-slate-800 dark:bg-slate-950">
      <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-slate-400">
        {isAr ? "آلاف العملاء في السعودية يثقون بنا" : "Trusted by thousands of Saudi businesses"}
      </p>
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-4">
        {logos.map((name) => (
          <span
            key={name}
            className="text-sm font-bold tracking-tight text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
          >
            {name}
          </span>
        ))}
      </div>
    </section>
  );
}
