"use client";

import { cn } from "@/lib/utils";

type LogoEntry = {
  name: string;
  slug: string;
  color?: string;
};

/** Business / partner logos — Simple Icons CDN */
export const BUSINESS_LOGOS: LogoEntry[] = [
  { name: "Microsoft", slug: "microsoft", color: "FFFFFF" },
  { name: "Meta", slug: "meta", color: "FFFFFF" },
  { name: "Vodafone", slug: "vodafone", color: "FFFFFF" },
  { name: "Google", slug: "google", color: "FFFFFF" },
  { name: "Shopify", slug: "shopify", color: "FFFFFF" },
  { name: "Stripe", slug: "stripe", color: "FFFFFF" },
  { name: "Slack", slug: "slack", color: "FFFFFF" },
  { name: "HubSpot", slug: "hubspot", color: "FFFFFF" },
  { name: "Salesforce", slug: "salesforce", color: "FFFFFF" },
  { name: "OpenAI", slug: "openai", color: "FFFFFF" },
];

/** Integration logos — includes n8n */
export const INTEGRATION_LOGOS: LogoEntry[] = [
  { name: "WhatsApp", slug: "whatsapp", color: "25D366" },
  { name: "OpenAI", slug: "openai", color: "FFFFFF" },
  { name: "n8n", slug: "n8n", color: "EA4B71" },
  { name: "Meta", slug: "meta", color: "0081FB" },
  { name: "Stripe", slug: "stripe", color: "635BFF" },
  { name: "Google", slug: "google", color: "FFFFFF" },
  { name: "Slack", slug: "slack", color: "FFFFFF" },
  { name: "Shopify", slug: "shopify", color: "FFFFFF" },
  { name: "Zapier", slug: "zapier", color: "FF4A00" },
  { name: "HubSpot", slug: "hubspot", color: "FF7A59" },
  { name: "Salesforce", slug: "salesforce", color: "00A1E0" },
  { name: "Discord", slug: "discord", color: "5865F2" },
  { name: "Telegram", slug: "telegram", color: "26A5E4" },
  { name: "Notion", slug: "notion", color: "FFFFFF" },
];

function logoUrl(slug: string, color = "FFFFFF") {
  return `https://cdn.simpleicons.org/${slug}/${color}`;
}

type BrandLogoProps = {
  entry: LogoEntry;
  size?: "sm" | "md" | "lg";
  className?: string;
  colored?: boolean;
};

export function BrandLogo({ entry, size = "md", className, colored = false }: BrandLogoProps) {
  const h = size === "sm" ? "h-6" : size === "lg" ? "h-10" : "h-8";
  const pad = size === "sm" ? "px-6 py-3" : size === "lg" ? "px-10 py-5" : "px-8 py-4";

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02]",
        pad,
        className
      )}
      title={entry.name}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl(entry.slug, entry.color ?? "FFFFFF")}
        alt={entry.name}
        className={cn(
          h,
          "w-auto max-w-[120px] object-contain",
          !colored && "opacity-50 brightness-200 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0"
        )}
      />
    </div>
  );
}

export function IntegrationLogo({ entry, className }: { entry: LogoEntry; className?: string }) {
  return (
    <div
      className={cn(
        "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur transition-all duration-300 hover:scale-105 hover:border-violet-500/30 hover:bg-white/[0.06]",
        className
      )}
      title={entry.name}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl(entry.slug, entry.color ?? "FFFFFF")}
        alt={entry.name}
        className="h-8 w-8 object-contain"
      />
    </div>
  );
}
