"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/context";
import { loc, type Localized } from "@/lib/site-config";

type Props = {
  icon?: LucideIcon;
  badge?: Localized;
  title: Localized;
  subtitle: Localized;
  ctaHref?: string;
  ctaLabel?: Localized;
  secondaryHref?: string;
  secondaryLabel?: Localized;
};

export function PageHero({
  icon: Icon,
  badge,
  title,
  subtitle,
  ctaHref = "/signup",
  ctaLabel = { en: "Start Free", ar: "ابدأ مجاناً" },
  secondaryHref = "/demo",
  secondaryLabel = { en: "Book a Demo", ar: "احجز عرضاً" },
}: Props) {
  const { locale } = useApp();
  const isAr = locale === "ar";

  return (
    <section className="dot-grid-bg relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-primary/5 to-transparent px-4 py-16 dark:border-slate-800 lg:py-24">
      <div className="mx-auto max-w-7xl">
        {Icon && (
          <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-7 w-7" />
          </div>
        )}
        {badge && (
          <span className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
            {loc(badge, locale)}
          </span>
        )}
        <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          {loc(title, locale)}
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
          {loc(subtitle, locale)}
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link href={ctaHref}>
            <Button size="lg" className="rounded-full px-8">
              {loc(ctaLabel, locale)}
              <ArrowRight className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
            </Button>
          </Link>
          <Link href={secondaryHref}>
            <Button size="lg" variant="outline" className="rounded-full px-8">
              {loc(secondaryLabel, locale)}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
