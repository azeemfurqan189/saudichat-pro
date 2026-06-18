"use client";

import { useApp } from "@/lib/context";
import { loc, type Localized } from "@/lib/site-config";

type Feature = {
  title: Localized;
  description: Localized;
  imageSide?: "left" | "right";
};

export function FeatureSplit({ features }: { features: Feature[] }) {
  const { locale } = useApp();

  return (
    <section className="border-t border-slate-200 dark:border-slate-800">
      {features.map((f, i) => {
        const imageRight = (f.imageSide ?? "right") === "right";
        return (
          <div
            key={i}
            className={`mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 lg:grid-cols-2 ${
              i % 2 === 1 ? "bg-slate-50/50 dark:bg-slate-900/30" : ""
            }`}
          >
            <div className={imageRight ? "" : "lg:order-2"}>
              <h2 className="text-2xl font-bold sm:text-3xl">{loc(f.title, locale)}</h2>
              <p className="mt-4 text-slate-600 dark:text-slate-400">{loc(f.description, locale)}</p>
            </div>
            <div className={imageRight ? "" : "lg:order-1"}>
              <div className="glass-card flex aspect-video items-center justify-center p-8 shadow-soft">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                    <span className="text-3xl">💬</span>
                  </div>
                  <p className="text-sm font-medium text-slate-500">
                    {locale === "ar" ? "معاينة المنتج" : "Product Preview"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
