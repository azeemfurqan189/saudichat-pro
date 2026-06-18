"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api, Lead } from "@/lib/api";
const STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"];

export default function LeadsPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", phone: "", source: "manual" });

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads", businessId],
    queryFn: async () => (await api.getLeads(businessId)).data ?? [],
  });

  const createMutation = useMutation({
    mutationFn: (d: Partial<Lead>) => api.createLead(businessId, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leads", businessId] }); setForm({ name: "", phone: "", source: "manual" }); toast.success(isAr ? "تم" : "Lead added"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.updateLead(businessId, id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads", businessId] }),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t(locale, "dashboard", "leads")}</h1>
      <Card className="p-4 flex gap-3 flex-wrap">
        <Input placeholder={isAr ? "الاسم" : "Name"} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input placeholder={isAr ? "الهاتف" : "Phone"} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" />
        <Button onClick={() => form.name && createMutation.mutate({ ...form, status: "NEW", leadScore: 50 })} loading={createMutation.isPending}><Plus className="w-4 h-4" /></Button>
      </Card>
      {isLoading ? <p>{t(locale, "dashboard", "loading")}</p> : (
        <div className="grid md:grid-cols-2 gap-3">
          {leads.map((lead) => (
            <Card key={lead.id} className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <UserPlus className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">{lead.name}</p>
                  <p className="text-xs text-muted-foreground">{lead.phone} · {lead.source} · Score {lead.leadScore}</p>
                </div>
              </div>
              <select className="text-xs border rounded-lg px-2 py-1" value={lead.status} onChange={(e) => updateMutation.mutate({ id: lead.id, status: e.target.value })}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Card>
          ))}
        </div>
      )}
      {!isLoading && leads.length === 0 && <p className="text-muted-foreground">{t(locale, "dashboard", "noData")}</p>}
    </div>
  );
}
