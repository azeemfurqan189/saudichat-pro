"use client";

import Link from "next/link";
import { ArrowLeft, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export function ManpowerPageShell({
  children,
  analytics,
}: {
  children: React.ReactNode;
  analytics?: boolean;
}) {
  return (
    <div className={cn("relative min-h-full", analytics ? "-m-4 md:-m-6" : "")}>
      <div className={cn("relative space-y-4", analytics ? "p-0" : "")}>{children}</div>
    </div>
  );
}

export function ManpowerHeroHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
  backHref,
  titleExtra,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  locale?: Locale;
  actions?: React.ReactNode;
  backHref?: string;
  titleExtra?: React.ReactNode;
}) {
  return (
    <div className="rounded-[10px] border border-[#E8E8E8] bg-white p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          {backHref && (
            <Button variant="ghost" size="icon" className="shrink-0 mt-0.5" asChild>
              <Link href={backHref}>
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1.5 flex-wrap">
              {Icon && (
                <div className="w-9 h-9 rounded-lg bg-[#1D9E75] flex items-center justify-center shrink-0">
                  <Icon className="w-[18px] h-[18px] text-white" />
                </div>
              )}
              <h1 className="text-[22px] font-semibold tracking-tight text-[#1a1a1a]">{title}</h1>
              {titleExtra}
            </div>
            {subtitle && <p className="text-[13px] text-[#5c5c5c] max-w-3xl leading-relaxed">{subtitle}</p>}
          </div>
        </div>
        {actions}
      </div>
    </div>
  );
}

export function ManpowerStatCard({
  label,
  value,
  sub,
  accent = "border-[#E8E8E8]",
  valueClassName,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
  valueClassName?: string;
}) {
  return (
    <div className={cn("rounded-[10px] border bg-white p-4", accent)}>
      <p className="text-[10px] uppercase tracking-[0.06em] text-[#9a9a9a] font-medium">{label}</p>
      <p className={cn("text-[22px] font-semibold mt-1 tabular-nums text-[#1a1a1a]", valueClassName)}>{value}</p>
      {sub && <p className="text-[11px] text-[#9a9a9a] mt-1">{sub}</p>}
    </div>
  );
}

export function ManpowerGlassCard({
  title,
  icon: Icon,
  action,
  children,
  className,
}: {
  title: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-[10px] border border-[#E8E8E8] bg-white overflow-hidden", className)}>
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[#E8E8E8] bg-[#FAFAF8]">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-[#1D9E75]" />}
          <h2 className="text-[13px] font-medium text-[#1a1a1a]">{title}</h2>
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
