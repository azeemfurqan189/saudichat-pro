"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/context";
import Link from "next/link";

const plans = [
  {
    name: "Starter",
    nameAr: "المبتدئ",
    price: 299,
    features: ["1 WhatsApp Number", "1,000 Messages/mo", "Basic Bot", "Order Management", "Email Support"],
    featuresAr: ["رقم واتساب واحد", "1000 رسالة/شهر", "بوت أساسي", "إدارة الطلبات", "دعم بالبريد"],
  },
  {
    name: "Business",
    nameAr: "الأعمال",
    price: 599,
    popular: true,
    features: ["3 WhatsApp Numbers", "10,000 Messages/mo", "AI Bot + GPT-4", "Analytics Dashboard", "Marketing Campaigns", "Priority Support"],
    featuresAr: ["3 أرقام واتساب", "10000 رسالة/شهر", "بوت AI + GPT-4", "لوحة تحليلات", "حملات تسويقية", "دعم أولوية"],
  },
  {
    name: "Enterprise",
    nameAr: "المؤسسات",
    price: 1499,
    features: ["Unlimited Numbers", "Unlimited Messages", "Custom AI Training", "API Access", "Dedicated Manager", "SLA Guarantee"],
    featuresAr: ["أرقام غير محدودة", "رسائل غير محدودة", "تدريب AI مخصص", "وصول API", "مدير مخصص", "ضمان SLA"],
  },
];

export function Pricing() {
  const { locale } = useApp();

  return (
    <section id="pricing" className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          {locale === "ar" ? "خطط الأسعار" : "Pricing Plans"}
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`glass-card relative ${plan.popular ? "ring-2 ring-secondary shadow-glow scale-105" : ""}`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-gold text-white text-xs font-bold px-4 py-1 rounded-full">
                  {locale === "ar" ? "الأكثر شعبية" : "Most Popular"}
                </span>
              )}
              <h3 className="text-xl font-bold mb-2">{locale === "ar" ? plan.nameAr : plan.name}</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-primary">{plan.price}</span>
                <span className="text-muted-foreground"> {locale === "ar" ? "ر.س/شهر" : "SAR/mo"}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {(locale === "ar" ? plan.featuresAr : plan.features).map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup">
                <Button variant={plan.popular ? "gold" : "outline"} className="w-full">
                  {locale === "ar" ? "ابدأ الآن" : "Get Started"}
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
