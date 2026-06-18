"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, X, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/context";
import { loc, navMenus } from "@/lib/site-config";

export function MobileNav({
  open,
  onClose,
  dark,
}: {
  open: boolean;
  onClose: () => void;
  dark?: boolean;
}) {
  const { locale } = useApp();
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className={`absolute inset-y-0 end-0 w-full max-w-sm overflow-y-auto p-6 shadow-2xl ${
          dark ? "bg-[#111111] text-white" : "bg-white dark:bg-slate-950"
        }`}
      >
        <div className="mb-6 flex items-center justify-between">
          <span className={`font-bold ${dark ? "text-accent" : "text-primary"}`}>SaudiChat Pro</span>
          <button
            onClick={onClose}
            className={`rounded-lg p-2 ${dark ? "hover:bg-white/10" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="space-y-1">
          {navMenus.map((menu) => {
            if (menu.href) {
              return (
                <Link
                  key={menu.id}
                  href={menu.href}
                  onClick={onClose}
                  className={`block rounded-lg px-3 py-3 font-medium ${
                    dark ? "hover:bg-white/5" : "hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {loc(menu.label, locale)}
                </Link>
              );
            }
            const isOpen = expanded === menu.id;
            return (
              <div key={menu.id}>
                <button
                  onClick={() => setExpanded(isOpen ? null : menu.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-3 font-medium ${
                    dark ? "hover:bg-white/5" : "hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {loc(menu.label, locale)}
                  <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <div className={`ms-3 space-y-1 border-s-2 ps-3 ${dark ? "border-accent/30" : "border-primary/20"}`}>
                    {menu.groups?.flatMap((g) => g.items).map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={`block rounded-lg px-3 py-2 text-sm ${
                          dark ? "text-neutral-400 hover:bg-white/5" : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                        }`}
                      >
                        {loc(item.title, locale)}
                      </Link>
                    ))}
                    {menu.items?.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={`block rounded-lg px-3 py-2 text-sm ${
                          dark ? "text-neutral-400 hover:bg-white/5" : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                        }`}
                      >
                        {loc(item.title, locale)}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className={`mt-6 space-y-3 border-t pt-6 ${dark ? "border-white/10" : "border-slate-200 dark:border-slate-800"}`}>
          <Link href="/login" onClick={onClose}>
            <Button
              variant="outline"
              className={`w-full rounded-lg ${dark ? "border-white/20 bg-transparent text-white hover:bg-white/5" : "rounded-full"}`}
            >
              {locale === "ar" ? "دخول" : "Sign in"}
            </Button>
          </Link>
          <Link href="/signup" onClick={onClose}>
            <Button className={`w-full rounded-lg ${dark ? "bg-accent hover:bg-accent-hover" : "rounded-full"}`}>
              {locale === "ar" ? "ابدأ الآن" : "Get Started"}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function MobileNavToggle({ onClick, dark }: { onClick: () => void; dark?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg p-2 md:hidden ${dark ? "text-white hover:bg-white/10" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}
      aria-label="Open menu"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}
