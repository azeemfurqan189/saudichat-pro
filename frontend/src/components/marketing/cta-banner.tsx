"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/context";
import { loc, type Localized } from "@/lib/site-config";

type Props = {
  title?: Localized;
  subtitle?: Localized;
  ctaHref?: string;
  ctaLabel?: Localized;
};

export function CtaBanner({
  title = { en: "Simple enough to start. Powerful enough to scale.", ar: "بسيط للبدء. قوي للتوسع." },
  subtitle = { en: "Join thousands of Saudi businesses automating WhatsApp today.", ar: "انضم لآلاف الشركات السعودية التي تؤتمت واتساب اليوم." },
  ctaHref = "/signup",
  ctaLabel = { en: "Start Building", ar: "ابدأ الآن" },
}: Props) {
  const { locale } = useApp();
  const isAr = locale === "ar";

  return (
    <section className="relative overflow-hidden px-4 py-24">
      <div className="hero-gradient absolute inset-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.12),transparent_50%)]" />
      <div className="relative mx-auto max-w-3xl text-center text-white">
        <Sparkles className="mx-auto mb-4 h-8 w-8 text-white/80" />
        <h2 className="text-balance text-3xl font-bold sm:text-4xl lg:text-5xl">
          {loc(title, locale)}
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-white/85">
          {loc(subtitle, locale)}
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link href={ctaHref}>
            <Button size="lg" variant="secondary" className="h-12 rounded-full px-10 text-base font-semibold">
              {loc(ctaLabel, locale)}
              <ArrowRight className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
            </Button>
          </Link>
          <Link href="/demo">
            <Button
              size="lg"
              variant="outline"
              className="h-12 rounded-full border-white/40 bg-white/10 px-10 text-base text-white hover:bg-white/20"
            >
              {isAr ? "احجز عرضاً" : "Book a Demo"}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
