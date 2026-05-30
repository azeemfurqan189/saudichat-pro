import { Inter, Cairo } from "next/font/google";
import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { Navbar, SiteFooter } from "@/components/layout/navbar";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "SaudiChat Pro - WhatsApp Business Automation",
  description: "Turn WhatsApp into your smart store. Automate orders, bookings, and customer support for Saudi SMEs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${cairo.variable} min-h-full flex flex-col antialiased`}>
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
