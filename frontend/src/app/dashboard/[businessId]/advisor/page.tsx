"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function AdvisorPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";

  const { data, isLoading } = useQuery({
    queryKey: ["ai-advisor", businessId],
    queryFn: async () => (await api.getAiAdvisor(businessId)).data,
  });

  const impactIcon = (impact: string) => {
    if (impact === "warning" || impact === "negative") return AlertTriangle;
    if (impact === "positive" || impact === "opportunity") return TrendingUp;
    return CheckCircle;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{t(locale, "dashboard", "advisor")}</h1>
          <p className="text-sm text-muted-foreground">{isAr ? "توصيات ذكية لنمو عملك" : "AI-powered growth recommendations"}</p>
        </div>
      </div>

      {isLoading ? <p>{t(locale, "dashboard", "loading")}</p> : data && (
        <>
          <Card className="p-6 bg-gradient-to-r from-primary/5 to-violet-500/5">
            <p className="text-sm text-muted-foreground">{isAr ? "صحة الأعمال" : "Business Health"}</p>
            <p className="text-4xl font-bold text-primary">{data.healthScore}/100</p>
            <p className="mt-3 text-sm leading-relaxed">{data.narrative}</p>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            {data.recommendations.map((rec) => {
              const Icon = impactIcon(rec.impact);
              return (
                <Card key={rec.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Icon className={cn("w-4 h-4", rec.impact === "warning" ? "text-yellow-500" : "text-primary")} />
                      {rec.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-2">{rec.action}</p>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">ROI {rec.expectedRoi}</span>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
