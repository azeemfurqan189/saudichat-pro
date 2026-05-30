"use client";

import { motion } from "framer-motion";
import {
  Bot, BarChart3, MessageSquare, Clock, Users, Zap,
} from "lucide-react";
import { useApp } from "@/lib/context";

const features = [
  { icon: Bot, titleEn: "AI-Powered Bot", titleAr: "بوت ذكي", descEn: "GPT-4 powered conversations in Arabic & English", descAr: "محادثات مدعومة بالذكاء الاصطناعي بالعربية والإنجليزية" },
  { icon: MessageSquare, titleEn: "WhatsApp Native", titleAr: "واتساب أصلي", descEn: "Official WhatsApp Business API integration", descAr: "تكامل رسمي مع واتساب للأعمال" },
  { icon: BarChart3, titleEn: "Analytics Dashboard", titleAr: "لوحة تحليلات", descEn: "Real-time insights and performance metrics", descAr: "رؤى فورية ومقاييس الأداء" },
  { icon: Clock, titleEn: "24/7 Automation", titleAr: "أتمتة 24/7", descEn: "Never miss an order or booking again", descAr: "لا تفوت أي طلب أو حجز" },
  { icon: Users, titleEn: "Multi-Tenant", titleAr: "متعدد المستأجرين", descEn: "Each business gets its own dashboard & bot", descAr: "كل منشأة لها لوحة تحكم وبوت خاص" },
  { icon: Zap, titleEn: "Instant Setup", titleAr: "إعداد فوري", descEn: "Go live in minutes with industry templates", descAr: "انطلق في دقائق مع قوالب جاهزة" },
];

export function Features() {
  const { locale } = useApp();

  return (
    <section id="features" className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-3xl md:text-4xl font-bold text-center mb-4"
        >
          {locale === "ar" ? "لماذا SaudiChat Pro؟" : "Why SaudiChat Pro?"}
        </motion.h2>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          {locale === "ar" ? "كل ما تحتاجه لتحويل واتساب إلى محرك مبيعات" : "Everything you need to turn WhatsApp into a sales engine"}
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.02, y: -4 }}
              className="glass-card group cursor-default"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <f.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{locale === "ar" ? f.titleAr : f.titleEn}</h3>
              <p className="text-sm text-muted-foreground">{locale === "ar" ? f.descAr : f.descEn}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
