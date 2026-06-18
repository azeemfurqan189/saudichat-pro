"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, LayoutDashboard, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { NavMegaMenu } from "@/components/layout/nav-mega-menu";
import { MobileNav, MobileNavToggle } from "@/components/layout/mobile-nav";
import { SiteFooter } from "@/components/landing/site-footer";
import { useApp } from "@/lib/context";
import { loc, navMenus } from "@/lib/site-config";

export function Navbar() {
  const pathname = usePathname();
  const { locale } = useApp();
  const [hasToken, setHasToken] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const isHome = pathname === "/";

  useEffect(() => {
    setHasToken(!!localStorage.getItem("token"));
  }, [pathname]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isDashboard = pathname.startsWith("/dashboard");
  const isSetup = pathname === "/setup";

  if (isDashboard || isSetup) return null;

  const linkClass = isHome ? "n8n-nav-link" : "nav-link-hover";

  return (
    <>
      <header
        className={
          isHome
            ? "n8n-nav sticky top-0 z-40"
            : "sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95"
        }
      >
        <div ref={navRef} className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-4">
            <MobileNavToggle onClick={() => setMobileOpen(true)} dark={isHome} />
            <Link
              href="/"
              className={`flex shrink-0 items-center gap-2 font-bold ${isHome ? "text-white" : "text-primary"}`}
            >
              <MessageCircle className={`h-6 w-6 ${isHome ? "text-accent" : ""}`} />
              <span className="hidden sm:inline">
                SaudiChat{" "}
                <span className={isHome ? "text-accent" : "text-secondary"}>Pro</span>
              </span>
            </Link>
          </div>

          <nav className="hidden items-center gap-0.5 md:flex">
            {navMenus.map((menu) => {
              if (menu.href) {
                return (
                  <Link key={menu.id} href={menu.href} className={linkClass}>
                    {loc(menu.label, locale)}
                  </Link>
                );
              }
              const isOpen = openMenu === menu.id;
              return (
                <div key={menu.id} className="relative">
                  <button
                    onClick={() => setOpenMenu(isOpen ? null : menu.id)}
                    className={`${linkClass} flex items-center gap-1`}
                  >
                    {loc(menu.label, locale)}
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="absolute start-0 top-full pt-2">
                      <NavMegaMenu groups={menu.groups} items={menu.items} dark={isHome} />
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageToggle />
            {!isHome && <ThemeToggle />}
            {hasToken ? (
              <Link href="/setup">
                <Button
                  variant="outline"
                  size="sm"
                  className={`hidden rounded-lg sm:flex ${isHome ? "border-white/20 bg-transparent text-white hover:bg-white/5" : ""}`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>{locale === "ar" ? "لوحة التحكم" : "Dashboard"}</span>
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login" className="hidden sm:block">
                  {isHome ? (
                    <span className="n8n-nav-link inline-flex cursor-pointer text-sm">
                      {locale === "ar" ? "دخول" : "Sign in"}
                    </span>
                  ) : (
                    <Button variant="ghost" size="sm" className="rounded-full">
                      {locale === "ar" ? "دخول" : "Sign in"}
                    </Button>
                  )}
                </Link>
                <Link href="/signup">
                  {isHome ? (
                    <span className="n8n-orange-btn inline-flex h-9 cursor-pointer items-center rounded-lg px-4 text-sm font-semibold">
                      {locale === "ar" ? "ابدأ الآن" : "Get Started"}
                    </span>
                  ) : (
                    <Button size="sm" className="rounded-full">
                      {locale === "ar" ? "ابدأ الآن" : "Get Started"}
                    </Button>
                  )}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} dark={isHome} />
    </>
  );
}

export { SiteFooter };
