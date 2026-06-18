"use client";

import Link from "next/link";
import { MessageCircle, Share2, Globe, Mail, ExternalLink } from "lucide-react";
import { useApp } from "@/lib/context";
import { footerColumns, loc, siteConfig } from "@/lib/site-config";

export function N8nFooter() {
  const { locale } = useApp();
  const isAr = locale === "ar";

  return (
    <footer className="relative overflow-hidden">
      {/* Orange glow horizon */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,109,63,0.35),transparent_70%)]" />
      <div className="n8n-stars pointer-events-none absolute inset-x-0 top-0 h-48 opacity-60" />

      <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-24">
        <div className="rounded-3xl border border-white/10 bg-[#0e0e16]/95 p-8 backdrop-blur-xl sm:p-12">
          <div className="grid gap-10 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <Link href="/" className="flex items-center gap-2 font-display text-xl font-bold text-white">
                <MessageCircle className="h-6 w-6 text-accent" />
                SaudiChat <span className="text-violet-400">Pro</span>
              </Link>
              <p className="mt-3 max-w-xs text-sm text-neutral-400">
                {loc(siteConfig.tagline, locale)}
              </p>
              <div className="mt-6 flex gap-3">
                {[Share2, Globe, Mail, ExternalLink].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-neutral-400 transition-colors hover:border-violet-500/40 hover:text-white"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>

            {footerColumns.slice(0, 3).map((col) => (
              <div key={loc(col.title, "en")}>
                <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-neutral-500">
                  {loc(col.title, locale)}
                </h3>
                <ul className="space-y-2.5">
                  {col.links.slice(0, 6).map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-neutral-400 transition-colors hover:text-white"
                      >
                        {loc(link.title, locale)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/8 pt-8 text-xs text-neutral-500 sm:flex-row">
            <div className="flex flex-wrap justify-center gap-4 sm:justify-start">
              <Link href="/privacy" className="hover:text-white">
                {isAr ? "الخصوصية" : "Privacy"}
              </Link>
              <Link href="/terms" className="hover:text-white">
                {isAr ? "الشروط" : "Terms"}
              </Link>
              <Link href="/support" className="hover:text-white">
                {isAr ? "الدعم" : "Support"}
              </Link>
            </div>
            <p>
              © {new Date().getFullYear()} SaudiChat Pro ·{" "}
              {isAr ? "جميع الحقوق محفوظة" : "All rights reserved"}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
