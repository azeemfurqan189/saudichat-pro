"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Workflow, Zap, Play, Pause } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api, AutomationWorkflow } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";

const TRIGGER_LABELS: Record<string, string> = {
  order_status_changed: "Order Status Changed",
  abandoned_cart: "Abandoned Cart",
  new_customer: "New Customer",
  appointment_reminder: "Appointment Reminder",
  customer_inactive: "Inactive Customer",
};

export default function WorkflowsPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ["automation-workflows", businessId],
    queryFn: async () => (await api.getAutomationWorkflows(businessId)).data ?? [],
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.updateAutomationWorkflow(businessId, id, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automation-workflows", businessId] });
      toast.success(isAr ? "تم التحديث" : "Workflow updated");
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t(locale, "dashboard", "workflows")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isAr ? "أتمتة رسائل WhatsApp والتذكيرات" : "Automate WhatsApp messages and reminders"}
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">{t(locale, "dashboard", "loading")}</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {workflows.map((wf: AutomationWorkflow) => (
            <Card key={wf.id} className={cn(!wf.isActive && "opacity-60")}>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Workflow className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{wf.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{TRIGGER_LABELS[wf.triggerType] || wf.triggerType}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={wf.isActive ? "outline" : "default"}
                  onClick={() => toggleMutation.mutate({ id: wf.id, isActive: !wf.isActive })}
                >
                  {wf.isActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                </Button>
              </CardHeader>
              <CardContent>
                {wf.description && <p className="text-sm text-muted-foreground mb-3">{wf.description}</p>}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Zap className="w-3 h-3" />{wf.runsCount} {isAr ? "تشغيل" : "runs"}</span>
                  {wf.lastRunAt && <span>{formatDate(wf.lastRunAt, locale)}</span>}
                </div>
                <div className="mt-3 flex gap-1 flex-wrap">
                  {(wf.steps as Array<Record<string, unknown>>).map((step, i) => (
                    <span key={i} className="text-xs bg-muted px-2 py-1 rounded-lg">
                      {String(step.type)}{step.minutes ? ` ${step.minutes}m` : ""}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
