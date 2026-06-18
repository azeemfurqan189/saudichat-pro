"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle, AlertCircle, Bot } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, BotSetupStatus } from "@/lib/api";
import { cn } from "@/lib/utils";
import { getIndustryLabel, normalizeBusinessType } from "@/lib/industry-config";

interface BotSetupChecklistProps {
  businessId: string;
  businessType?: string;
  locale?: "en" | "ar";
  compact?: boolean;
}

export function BotSetupChecklist({
  businessId,
  businessType,
  locale = "en",
}: BotSetupChecklistProps) {
  const isAr = locale === "ar";
  const type = normalizeBusinessType(businessType);

  const { data: setup, isLoading } = useQuery({
    queryKey: ["bot-setup", businessId],
    queryFn: async () => {
      const res = await api.getBotSetupStatus(businessId);
      return res.data as BotSetupStatus;
    },
  });

  if (isLoading || !setup) return null;

  const items = [
    {
      ok: setup.checks.whatsappConnected,
      labelEn: "WhatsApp connected",
      labelAr: "واتساب متصل",
      href: `/dashboard/${businessId}/settings?tab=whatsapp`,
    },
    {
      ok: setup.checks.businessDescription,
      labelEn: "Business description added",
      labelAr: "وصف المنشأة مضاف",
      href: `/dashboard/${businessId}/settings?tab=general`,
    },
    {
      ok: setup.checks.hasProfile,
      labelEn: `${getIndustryLabel(type, "en")} profile filled`,
      labelAr: `ملف ${getIndustryLabel(type, "ar")} مكتمل`,
      href: `/dashboard/${businessId}/settings?tab=profile`,
    },
    {
      ok: setup.checks.hasMenu,
      labelEn: "Catalog / menu items added",
      labelAr: "منتجات/خدمات في الكatalog",
      href: `/dashboard/${businessId}/catalog`,
    },
    {
      ok: setup.checks.aiConfigured,
      labelEn: "AI API configured (Groq/OpenAI)",
      labelAr: "AI API مفعّل",
      href: `/dashboard/${businessId}/settings?tab=aiBot`,
    },
    {
      ok: !setup.checks.aiPaused,
      labelEn: "AI Bot is ON (not paused)",
      labelAr: "البوت نشط (غير متوقف)",
      href: `/dashboard/${businessId}/ai`,
    },
    {
      ok: setup.checks.knowledgeDocs > 0,
      labelEn: "Knowledge base (FAQs) added",
      labelAr: "قاعدة المعرفة مضافة",
      optional: true,
      href: `/dashboard/${businessId}/ai`,
    },
  ];

  const done = items.filter((i) => i.ok).length;
  const required = items.filter((i) => !i.optional);
  const requiredDone = required.filter((i) => i.ok).length;
  const allRequired = requiredDone === required.length;

  if (allRequired && setup.readyForChat) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-800">
        <CardContent className="!p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
              {isAr ? "البوت جاهز للعمل!" : "Bot is ready!"}
            </p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              {isAr
                ? `${done}/${items.length} خطوات مكتملة — جرّب إرسال رسالة على واتساب`
                : `${done}/${items.length} setup steps complete — send a WhatsApp test message`}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" />
          {isAr ? "إعداد البوت" : "Bot Setup Checklist"}
          <span className="text-xs font-normal text-muted-foreground ms-auto">
            {requiredDone}/{required.length} {isAr ? "مطلوب" : "required"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {!allRequired && (
          <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-2 mb-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {isAr
              ? "أكمل الخطوات أدناه حتى يرد البوت بذكاء على عملائك"
              : "Complete the steps below so your bot answers customers intelligently"}
          </div>
        )}
        {items.map((item) => (
          <Link
            key={item.labelEn}
            href={item.href}
            className={cn(
              "flex items-center gap-2 p-2 rounded-lg text-sm transition-colors hover:bg-muted/60",
              item.ok ? "text-muted-foreground" : "text-foreground font-medium"
            )}
          >
            {item.ok ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
            )}
            <span>
              {isAr ? item.labelAr : item.labelEn}
              {item.optional && (
                <span className="text-xs text-muted-foreground ms-1">({isAr ? "اختياري" : "optional"})</span>
              )}
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
