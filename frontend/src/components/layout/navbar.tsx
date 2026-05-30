"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MessageCircle, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";

export function Navbar() {
  const pathname = usePathname();
  const { locale } = useApp();
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    setHasToken(!!localStorage.getItem("token"));
  }, [pathname]);

  const isDashboard = pathname.startsWith("/dashboard");
  const isAuth = pathname === "/login" || pathname === "/signup" || pathname === "/forgot-password";
  const isSetup = pathname === "/setup";

  if (isDashboard || isSetup) return null;

  const navLinks = [
    { href: "/#features", label: t(locale, "nav", "features") },
    { href: "/#pricing", label: t(locale, "nav", "pricing") },
    { href: "/#industries", label: t(locale, "nav", "industries") },
    { href: "/#contact", label: t(locale, "nav", "contact") },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-bold text-primary">
          <MessageCircle className="h-6 w-6" />
          <span className="hidden sm:inline">
            SaudiChat <span className="text-secondary">Pro</span>
          </span>
        </Link>

        {!isAuth && (
          <nav className="hidden items-center gap-1 text-sm md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-2 font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
          {hasToken ? (
            <Link href="/setup">
              <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">{locale === "ar" ? "لوحة التحكم" : "Dashboard"}</span>
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">{t(locale, "nav", "login")}</Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">{t(locale, "nav", "signup")}</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const { locale } = useApp();
  const pathname = usePathname();
  const isDashboard = pathname.startsWith("/dashboard");
  const isSetup = pathname === "/setup";

  if (isDashboard || isSetup) return null;

  return (
    <footer
      id="contact"
      className="border-t border-slate-200 py-8 text-center text-sm text-slate-500 dark:border-slate-800"
    >
      <div className="mx-auto max-w-7xl px-4">
        <p className="font-semibold text-foreground">SaudiChat Pro</p>
        <p className="mt-1">
          {locale === "ar"
            ? "أتمتة واتساب للمنشآت السعودية · support@saudichat.pro"
            : "WhatsApp automation for Saudi SMEs · support@saudichat.pro"}
        </p>
        <p className="mt-4">
          © {new Date().getFullYear()} SaudiChat Pro.{" "}
          {locale === "ar" ? "جميع الحقوق محفوظة" : "All rights reserved"}.
        </p>
      </div>
    </footer>
  );
}
