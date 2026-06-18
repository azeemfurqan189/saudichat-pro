"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useApp } from "@/lib/context";
import { loc, type Localized } from "@/lib/site-config";

type Crumb = { label: Localized; href?: string };

export function Breadcrumb({ items }: { items: Crumb[] }) {
  const { locale } = useApp();
  const isAr = locale === "ar";

  return (
    <nav className="mb-6 flex flex-wrap items-center gap-1 text-sm text-slate-500">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && (
            <ChevronRight className={`h-3.5 w-3.5 ${isAr ? "rotate-180" : ""}`} />
          )}
          {item.href ? (
            <Link href={item.href} className="hover:text-primary">
              {loc(item.label, locale)}
            </Link>
          ) : (
            <span className="text-foreground">{loc(item.label, locale)}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
