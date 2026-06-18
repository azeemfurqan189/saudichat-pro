"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api, Deal } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

const STAGES = ["LEAD", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"] as const;

const STAGE_LABELS: Record<string, { en: string; ar: string }> = {
  LEAD: { en: "Lead", ar: "عميل محتمل" },
  CONTACTED: { en: "Contacted", ar: "تم التواصل" },
  QUALIFIED: { en: "Qualified", ar: "مؤهل" },
  PROPOSAL: { en: "Proposal", ar: "عرض" },
  NEGOTIATION: { en: "Negotiation", ar: "تفاوض" },
  WON: { en: "Won", ar: "فوز" },
  LOST: { en: "Lost", ar: "خسارة" },
};

export default function PipelinePage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", value: "", customerName: "" });

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["deals", businessId],
    queryFn: async () => (await api.getDeals(businessId)).data ?? [],
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Deal>) => api.createDeal(businessId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals", businessId] });
      toast.success(isAr ? "تم إنشاء الصفقة" : "Deal created");
      setForm({ title: "", value: "", customerName: "" });
      setShowForm(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) => api.updateDeal(businessId, id, { stage }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deals", businessId] }),
  });

  const totalValue = deals.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t(locale, "dashboard", "pipeline")}</h1>
          <p className="text-sm text-muted-foreground">
            {deals.length} {isAr ? "صفقة" : "deals"} · {formatCurrency(totalValue, isAr ? "ar-SA" : "en-SA")}
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4" />
          {isAr ? "صفقة جديدة" : "New Deal"}
        </Button>
      </div>

      {showForm && (
        <Card className="p-4 grid md:grid-cols-4 gap-3">
          <Input label={isAr ? "العنوان" : "Title"} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input label={isAr ? "القيمة (SAR)" : "Value (SAR)"} type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
          <Input label={isAr ? "ملاحظة" : "Notes"} value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
          <Button
            className="self-end"
            loading={createMutation.isPending}
            onClick={() =>
              createMutation.mutate({
                title: form.title,
                value: parseFloat(form.value) || 0,
                notes: form.customerName,
                stage: "LEAD",
                probability: 20,
              })
            }
          >
            {t(locale, "dashboard", "add")}
          </Button>
        </Card>
      )}

      {isLoading ? (
        <p className="text-muted-foreground">{t(locale, "dashboard", "loading")}</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const col = deals.filter((d) => d.stage === stage);
            return (
              <div key={stage} className="min-w-[200px] flex-shrink-0">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className="text-sm font-semibold">{isAr ? STAGE_LABELS[stage]?.ar : STAGE_LABELS[stage]?.en}</span>
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{col.length}</span>
                </div>
                <div className="space-y-2 min-h-[120px]">
                  {col.map((deal) => (
                    <Card key={deal.id} className="p-3 cursor-pointer hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-2">
                        <GripVertical className="w-3 h-3 text-muted-foreground mt-1 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{deal.title}</p>
                          <p className="text-xs text-primary font-semibold">{formatCurrency(deal.value, isAr ? "ar-SA" : "en-SA")}</p>
                          {deal.customer?.name && <p className="text-xs text-muted-foreground truncate">{deal.customer.name}</p>}
                        </div>
                      </div>
                      <select
                        className="mt-2 w-full text-xs border border-border rounded-lg px-2 py-1 bg-background"
                        value={deal.stage}
                        onChange={(e) => updateMutation.mutate({ id: deal.id, stage: e.target.value })}
                      >
                        {STAGES.map((s) => (
                          <option key={s} value={s}>{isAr ? STAGE_LABELS[s]?.ar : STAGE_LABELS[s]?.en}</option>
                        ))}
                      </select>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
