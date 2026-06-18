"use client";

import { Mail, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHero } from "@/components/marketing/page-hero";
import { useApp } from "@/lib/context";
import { siteConfig, loc } from "@/lib/site-config";

export default function ContactPage() {
  const { locale } = useApp();
  const isAr = locale === "ar";

  return (
    <div>
      <PageHero
        title={{ en: "Contact Us", ar: "تواصل معنا" }}
        subtitle={{
          en: "Have questions? Our team is here to help you get started.",
          ar: "لديك أسئلة؟ فريقنا هنا لمساعدتك على البدء.",
        }}
        ctaHref={`mailto:${siteConfig.email}`}
        ctaLabel={{ en: "Email Us", ar: "راسلنا" }}
        secondaryHref="/demo"
        secondaryLabel={{ en: "Book a Demo", ar: "احجز عرضاً" }}
      />
      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-16 lg:grid-cols-2">
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">{isAr ? "معلومات التواصل" : "Contact Information"}</h2>
          <a href={`mailto:${siteConfig.email}`} className="flex items-center gap-3 text-slate-600 hover:text-primary dark:text-slate-400">
            <Mail className="h-5 w-5 text-primary" />
            {siteConfig.email}
          </a>
          <p className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
            <MapPin className="h-5 w-5 text-primary" />
            {loc(siteConfig.location, locale)}
          </p>
          <p className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
            <Phone className="h-5 w-5 text-primary" />
            +966 11 000 0000
          </p>
        </div>
        <form className="section-card space-y-4" onSubmit={(e) => e.preventDefault()}>
          <h2 className="text-xl font-bold">{isAr ? "أرسل رسالة" : "Send a Message"}</h2>
          <Input label={isAr ? "الاسم" : "Name"} />
          <Input label={isAr ? "البريد الإلكتروني" : "Email"} type="email" dir="ltr" />
          <Input label={isAr ? "الموضوع" : "Subject"} />
          <div>
            <label className="mb-1.5 block text-sm font-medium">{isAr ? "الرسالة" : "Message"}</label>
            <textarea
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              rows={4}
            />
          </div>
          <Button type="submit" className="w-full rounded-full">
            {isAr ? "إرسال" : "Send Message"}
          </Button>
        </form>
      </section>
    </div>
  );
}
