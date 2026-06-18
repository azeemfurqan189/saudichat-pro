"use client";

import { useApp } from "@/lib/context";
import { loc, type Localized } from "@/lib/site-config";

type Benefit = { title: Localized; description: Localized };

export function BenefitCards({ benefits }: { benefits: Benefit[] }) {
  const { locale } = useApp();

  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <div className="grid gap-6 sm:grid-cols-3">
        {benefits.map((b, i) => (
          <div key={i} className="section-card card-hover text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
              {i + 1}
            </div>
            <h3 className="font-semibold">{loc(b.title, locale)}</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {loc(b.description, locale)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
