"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, Mail, MapPin } from "lucide-react";
import { useApp } from "@/lib/context";
import { siteConfig, footerColumns, loc } from "@/lib/site-config";

export function SiteFooter() {
  const { locale } = useApp();
  const pathname = usePathname();

  if (pathname === "/") return null;

  return (
    <footer id="contact" className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid gap-12 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 font-bold text-primary">
              <MessageCircle className="h-6 w-6" />
              SaudiChat <span className="text-secondary">Pro</span>
            </Link>
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
              {loc(siteConfig.tagline, locale)}
            </p>
            <div className="mt-6 space-y-2 text-sm text-slate-500">
              <a href={`mailto:${siteConfig.email}`} className="flex items-center gap-2 hover:text-primary">
                <Mail className="h-4 w-4" />
                {siteConfig.email}
              </a>
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {loc(siteConfig.location, locale)}
              </p>
            </div>
          </div>

          {footerColumns.map((col) => (
            <div key={loc(col.title, "en")}>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                {loc(col.title, locale)}
              </h3>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-600 transition-colors hover:text-primary dark:text-slate-400"
                    >
                      {loc(link.title, locale)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-8 text-sm text-slate-500 dark:border-slate-800 sm:flex-row">
          <p>
            © {new Date().getFullYear()} SaudiChat Pro.{" "}
            {locale === "ar" ? "جميع الحقوق محفوظة" : "All rights reserved"}.
          </p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-primary">
              {locale === "ar" ? "الخصوصية" : "Privacy"}
            </Link>
            <Link href="/terms" className="hover:text-primary">
              {locale === "ar" ? "الشروط" : "Terms"}
            </Link>
            <Link href="/support" className="hover:text-primary">
              {locale === "ar" ? "الدعم" : "Support"}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
