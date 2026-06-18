import { MarketingPage } from "@/components/marketing/marketing-page";
import { productPages } from "@/lib/site-config";

export function generateStaticParams() {
  return productPages.map((p) => ({ slug: p.slug }));
}

export default function ProductPage({ params }: { params: { slug: string } }) {
  return (
    <MarketingPage
      slug={params.slug}
      type="product"
      parentLabel={{ en: "Products", ar: "المنتجات" }}
      parentHref="/#features"
    />
  );
}
