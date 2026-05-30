"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";

export function Navbar() {
  const { locale } = useApp();
  const fontClass = locale === "ar" ? "font-arabic" : "";

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 inset-x-0 z-50 glass border-b border-white/10"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <span className={`font-bold text-lg ${fontClass}`}>
              SaudiChat <span className="text-secondary">Pro</span>
            </span>
          </Link>

          <div className={`hidden md:flex items-center gap-6 ${fontClass}`}>
            {["features", "pricing", "industries", "contact"].map((item) => (
              <a key={item} href={`#${item}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                {t(locale, "nav", item)}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <Link href="/login" className="hidden sm:block">
              <Button variant="ghost" size="sm">{t(locale, "nav", "login")}</Button>
            </Link>
            <Link href="/signup">
              <Button variant="gold" size="sm" className="shadow-glow">{t(locale, "nav", "signup")}</Button>
            </Link>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
