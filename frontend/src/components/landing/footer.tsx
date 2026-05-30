"use client";

import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { useApp } from "@/lib/context";

export function Footer() {
  const { locale } = useApp();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card/50 py-12 px-4">
      <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold">SaudiChat Pro</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {locale === "ar" ? "أتمتة واتساب للمنشآت السعودية" : "WhatsApp automation for Saudi businesses"}
          </p>
        </div>
        {[
          { title: locale === "ar" ? "روابط" : "Links", links: ["Features", "Pricing", "Blog", "Docs"] },
          { title: locale === "ar" ? "القطاعات" : "Industries", links: ["Restaurants", "Salons", "Clinics", "Retail"] },
          { title: locale === "ar" ? "تواصل" : "Contact", links: ["support@saudichat.pro", "+966 11 000 0000", "Riyadh, KSA"] },
        ].map((col, i) => (
          <div key={i}>
            <h4 className="font-semibold mb-3">{col.title}</h4>
            <ul className="space-y-2">
              {col.links.map((link) => (
                <li key={link}>
                  <Link href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">{link}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="max-w-7xl mx-auto mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
        © {year} SaudiChat Pro. {locale === "ar" ? "جميع الحقوق محفوظة" : "All rights reserved"}.
      </div>
    </footer>
  );
}
