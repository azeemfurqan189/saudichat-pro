"use client";

import { useApp } from "@/lib/context";
import { loc, type Localized } from "@/lib/site-config";

type Step = { title: Localized; description: Localized };

export function HowItWorksSteps({
  title = { en: "How it works", ar: "كيف يعمل؟" },
  steps,
}: {
  title?: Localized;
  steps: Step[];
}) {
  const { locale } = useApp();

  return (
    <section className="border-t border-slate-200 bg-slate-50/50 px-4 py-16 dark:border-slate-800 dark:bg-slate-900/30">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">{loc(title, locale)}</h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {steps.map((step, i) => (
            <div key={i} className="relative text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-white">
                {i + 1}
              </div>
              <h3 className="font-semibold">{loc(step.title, locale)}</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                {loc(step.description, locale)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
