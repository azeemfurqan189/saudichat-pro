import { Outfit, Syne, Cairo, JetBrains_Mono } from "next/font/google";
import type { Metadata } from "next";
import Script from "next/script";
import { Providers } from "@/components/providers";
import { Navbar, SiteFooter } from "@/components/layout/navbar";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
  adjustFontFallback: true,
  preload: true,
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  adjustFontFallback: true,
  preload: true,
});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
  adjustFontFallback: true,
  preload: true,
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "SaudiChat Pro - WhatsApp Business Automation",
  description: "Turn WhatsApp into your smart store. Automate orders, bookings, and customer support for Saudi SMEs.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="locale-init" strategy="beforeInteractive">
          {`(function(){try{var l=localStorage.getItem("locale");if(l==="ar"||l==="en"){document.documentElement.lang=l;document.documentElement.dir=l==="ar"?"rtl":"ltr";}}catch(e){}})();`}
        </Script>
      </head>
      <body className={`${outfit.variable} ${syne.variable} ${cairo.variable} ${jetbrains.variable} min-h-full flex flex-col antialiased`}>
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
