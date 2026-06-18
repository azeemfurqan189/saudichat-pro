"use client";

import Link from "next/link";
import { useApp } from "@/lib/context";
import { loc, type NavGroup, type NavItem } from "@/lib/site-config";

function MegaMenuItem({ item, dark }: { item: NavItem; dark?: boolean }) {
  const { locale } = useApp();
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={`group flex gap-3 rounded-xl p-3 transition-colors ${
        dark ? "hover:bg-white/5" : "hover:bg-primary/5"
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
          dark
            ? "bg-white/5 text-neutral-300 group-hover:bg-accent/20 group-hover:text-accent"
            : "bg-slate-100 text-slate-700 group-hover:bg-primary/10 group-hover:text-primary dark:bg-slate-800 dark:text-slate-300"
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${dark ? "text-white" : ""}`}>
            {loc(item.title, locale)}
          </span>
          {item.comingSoon && (
            <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-bold text-accent">
              {locale === "ar" ? "قريباً" : "Soon"}
            </span>
          )}
        </div>
        <p className={`mt-0.5 text-xs line-clamp-2 ${dark ? "text-neutral-500" : "text-slate-500"}`}>
          {loc(item.description, locale)}
        </p>
      </div>
    </Link>
  );
}

function MegaMenuGroup({ group, dark }: { group: NavGroup; dark?: boolean }) {
  const { locale } = useApp();

  return (
    <div>
      <p
        className={`mb-3 border-b pb-2 text-xs font-bold uppercase tracking-wider ${
          dark ? "border-white/10 text-neutral-500" : "border-slate-100 text-slate-400 dark:border-slate-700"
        }`}
      >
        {loc(group.label, locale)}
      </p>
      <div className="space-y-1">
        {group.items.map((item) => (
          <MegaMenuItem key={item.href} item={item} dark={dark} />
        ))}
      </div>
    </div>
  );
}

export function NavMegaMenu({
  groups,
  items,
  dark,
}: {
  groups?: NavGroup[];
  items?: NavItem[];
  dark?: boolean;
}) {
  const panelClass = dark ? "n8n-mega-panel" : "mega-menu-panel";

  if (groups) {
    return (
      <div className={`${panelClass} grid gap-8 p-6 ${groups.length > 1 ? "w-[560px] grid-cols-2" : "w-[320px]"}`}>
        {groups.map((g) => (
          <MegaMenuGroup key={loc(g.label, "en")} group={g} dark={dark} />
        ))}
      </div>
    );
  }

  if (items) {
    return (
      <div className={`${panelClass} w-[360px] p-4`}>
        <div className="space-y-1">
          {items.map((item) => (
            <MegaMenuItem key={item.href} item={item} dark={dark} />
          ))}
        </div>
      </div>
    );
  }

  return null;
}
