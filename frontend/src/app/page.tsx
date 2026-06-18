"use client";

import { WhyChooseSection } from "@/components/landing/why-choose-section";
import { IndustriesSection } from "@/components/landing/industries-section";
import {
  N8nHero,
  LogoMarquee,
  WorkflowShowcase,
  StatsRow,
  SplitFeatureUI,
  SplitFeatureSpeed,
  BentoFeatures,
  IntegrationsMarquee,
  SocialProofBadges,
  CaseStudiesMarquee,
  N8nEnterprise,
  TestimonialsMarquee,
  CtaFooterBar,
} from "@/components/landing/n8n-home";
import { N8nFooter } from "@/components/landing/n8n-footer";

export default function HomePage() {
  return (
    <div className="n8n-home font-body overflow-x-hidden">
      <N8nHero />
      <LogoMarquee />
      <WorkflowShowcase />
      <StatsRow />
      <WhyChooseSection />
      <section className="space-y-0">
        <SplitFeatureUI />
        <IndustriesSection />
        <SplitFeatureSpeed />
      </section>
      <BentoFeatures />
      <IntegrationsMarquee />
      <SocialProofBadges />
      <CaseStudiesMarquee />
      <N8nEnterprise />
      <TestimonialsMarquee />
      <CtaFooterBar />
      <N8nFooter />
    </div>
  );
}
