"use client";

import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/marketing/breadcrumb";
import { PageHero } from "@/components/marketing/page-hero";
import { BenefitCards } from "@/components/marketing/benefit-cards";
import { FeatureSplit } from "@/components/marketing/feature-split";
import { HowItWorksSteps } from "@/components/marketing/how-it-works-steps";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { useApp } from "@/lib/context";
import { getProductPage, getSolutionPage, loc, type Localized } from "@/lib/site-config";

type Props = {
  slug: string;
  type: "product" | "solution";
  parentLabel: Localized;
  parentHref: string;
};

export function MarketingPage({ slug, type, parentLabel, parentHref }: Props) {
  const { locale } = useApp();
  const page = type === "product" ? getProductPage(slug) : getSolutionPage(slug);

  if (!page) notFound();

  return (
    <div>
      <PageHero icon={page.icon} title={page.title} subtitle={page.subtitle} />
      <div className="mx-auto max-w-7xl px-4 pt-8">
        <Breadcrumb
          items={[
            { label: { en: "Home", ar: "الرئيسية" }, href: "/" },
            { label: parentLabel, href: parentHref },
            { label: page.title },
          ]}
        />
        <p className="max-w-3xl text-lg text-slate-600 dark:text-slate-400">
          {loc(page.description, locale)}
        </p>
      </div>
      <BenefitCards benefits={page.benefits} />
      <FeatureSplit features={page.features} />
      <HowItWorksSteps steps={page.steps} />
      <CtaBanner />
    </div>
  );
}
