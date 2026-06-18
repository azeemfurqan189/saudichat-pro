"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/context";
import { pricingPlans, loc } from "@/lib/site-config";

export function PricingSection() {
  const { locale } = useApp();
  const isAr = locale === "ar";

  return (
    <section id="pricing" className="mx-auto max-w-7xl px-4 py-20">
      <h2 className="text-center text-3xl font-bold">
        {isAr ? "خطط الأسعار" : "Pricing Plans"}
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-slate-600 dark:text-slate-400">
        {isAr ? "اختر الخطة المناسبة لمنشأتك" : "Choose the plan that fits your business"}
      </p>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {pricingPlans.map((plan) => (
          <div
            key={loc(plan.name, "en")}
            className={`section-card card-hover relative ${plan.popular ? "ring-2 ring-secondary shadow-elevated" : ""}`}
          >
            {plan.popular && (
              <span className="absolute -top-3 start-1/2 -translate-x-1/2 rounded-full bg-secondary px-4 py-0.5 text-xs font-bold text-white">
                {isAr ? "الأكثر شعبية" : "Popular"}
              </span>
            )}
            <h3 className="text-lg font-bold">{loc(plan.name, locale)}</h3>
            <div className="mt-2">
              <span className="text-4xl font-bold text-primary">{plan.price}</span>
              <span className="text-slate-500"> {isAr ? "ر.س/شهر" : "SAR/mo"}</span>
            </div>
            <ul className="mt-6 space-y-3">
              {plan.features[locale].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/signup" className="block">
              <Button className="mt-8 w-full rounded-full" variant={plan.popular ? "default" : "outline"}>
                {isAr ? "ابدأ الآن" : "Get Started"}
              </Button>
            </Link>
          </div>
        ))}
      </div>
      <p className="mt-8 text-center">
        <Link href="/pricing" className="text-sm font-medium text-primary hover:underline">
          {isAr ? "عرض جميع التفاصيل ←" : "View full pricing details →"}
        </Link>
      </p>
    </section>
  );
}
