import { MarketingPage } from "@/components/marketing/marketing-page";
import { solutionPages } from "@/lib/site-config";

export function generateStaticParams() {
  return solutionPages.map((p) => ({ slug: p.slug }));
}

export default function SolutionPage({ params }: { params: { slug: string } }) {
  return (
    <MarketingPage
      slug={params.slug}
      type="solution"
      parentLabel={{ en: "Solutions", ar: "الحلول" }}
      parentHref="/#industries"
    />
  );
}
