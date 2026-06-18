"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { HardHat, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ManpowerHeroHeader, ManpowerPageShell, ManpowerStatCard } from "@/components/dashboard/manpower-shell";

export default function SubcontractorsPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [trade, setTrade] = useState("");
  const [email, setEmail] = useState("");
  const [poAmount, setPoAmount] = useState("");
  const [selectedId, setSelectedId] = useState("");

  const { data: projects = [] } = useQuery({
    queryKey: ["manpower-projects", businessId],
    queryFn: async () => (await api.getManpowerProjects(businessId)).data ?? [],
  });

  const { data: subs = [], isLoading } = useQuery({
    queryKey: ["subcontractors", businessId],
    queryFn: async () => (await api.getSubcontractors(businessId)).data ?? [],
  });

  const createMut = useMutation({
    mutationFn: () => api.postSubcontractor(businessId, { name, trade: trade || undefined, contactEmail: email || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subcontractors", businessId] });
      setName(""); setTrade(""); setEmail(""); setShowForm(false);
      toast.success(isAr ? "تم إضافة المقاول" : "Subcontractor added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const poMut = useMutation({
    mutationFn: () => api.postSubcontractorPo(businessId, {
      subcontractorId: selectedId,
      projectId: projects[0]?.id,
      amountSar: parseFloat(poAmount) || 0,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subcontractors", businessId] });
      setPoAmount("");
      toast.success(isAr ? "تم إصدار PO" : "PO issued");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <ManpowerPageShell>
      <ManpowerHeroHeader
        icon={HardHat}
        title={t(locale, "dashboard", "subcontractors")}
        subtitle={isAr ? "مقاولين فرعيين — PO · timesheet · فواتير" : "Third-party subs — PO, timesheets, and invoices"}
      />

      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 me-1" />{isAr ? "مقاول جديد" : "New subcontractor"}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-[10px] border bg-white p-4 grid sm:grid-cols-3 gap-2">
          <Input placeholder={isAr ? "الاسم" : "Company name"} value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder={isAr ? "التخصص" : "Trade"} value={trade} onChange={(e) => setTrade(e.target.value)} />
          <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button className="sm:col-span-3" disabled={!name.trim() || createMut.isPending} onClick={() => createMut.mutate()}>
            {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : isAr ? "حفظ" : "Save"}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <ManpowerStatCard label={isAr ? "مقاولين" : "Subcontractors"} value={isLoading ? "—" : subs.length} />
        <ManpowerStatCard label="POs" value={isLoading ? "—" : subs.reduce((s, x) => s + (x._count?.pos ?? 0), 0)} />
        <ManpowerStatCard label="Timesheets" value={isLoading ? "—" : subs.reduce((s, x) => s + (x._count?.timesheets ?? 0), 0)} />
      </div>

      <div className="rounded-[10px] border bg-white divide-y">
        {isLoading ? (
          <p className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></p>
        ) : subs.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">{isAr ? "لا مقاولين — Finance demo se bhi load ho sakta hai" : "No subcontractors — or load from Finance → Project demo"}</p>
        ) : (
          subs.map((s) => (
            <div key={s.id} className={cn("p-4 flex flex-wrap justify-between gap-2", selectedId === s.id && "bg-[#FAFAF8]")}>
              <div>
                <p className="font-semibold text-sm">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.trade ?? "—"} · PO: {s._count?.pos ?? 0} · TS: {s._count?.timesheets ?? 0}</p>
              </div>
              <div className="flex gap-2 items-end">
                <Input type="number" className="h-8 w-28 text-xs" placeholder="PO SAR" value={selectedId === s.id ? poAmount : ""} onFocus={() => setSelectedId(s.id)} onChange={(e) => { setSelectedId(s.id); setPoAmount(e.target.value); }} />
                <Button size="sm" variant="outline" disabled={selectedId !== s.id || !poAmount || poMut.isPending} onClick={() => poMut.mutate()}>PO</Button>
              </div>
            </div>
          ))
        )}
      </div>
    </ManpowerPageShell>
  );
}
