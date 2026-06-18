"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Building2, ChevronRight, FolderKanban, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api } from "@/lib/api";
import {
  ManpowerHeroHeader,
  ManpowerPageShell,
  ManpowerStatCard,
} from "@/components/dashboard/manpower-shell";
import { ManpowerDemoBanner } from "@/components/dashboard/manpower-demo-banner";

export default function ClientsPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", contactName: "", phone: "", email: "", address: "" });

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["manpower-clients", businessId],
    queryFn: async () => (await api.getManpowerClients(businessId)).data ?? [],
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["manpower-projects", businessId],
    queryFn: async () => (await api.getManpowerProjects(businessId)).data ?? [],
  });

  const createMutation = useMutation({
    mutationFn: () => api.createManpowerClient(businessId, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manpower-clients", businessId] });
      toast.success(isAr ? "تمت إضافة العميل" : "Client added");
      setForm({ name: "", contactName: "", phone: "", email: "", address: "" });
      setShowForm(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const activeClients = clients.filter((c) => (c._count?.projects ?? 0) > 0).length;

  return (
    <ManpowerPageShell>
      <ManpowerHeroHeader
        icon={Building2}
        title={t(locale, "dashboard", "clients")}
        subtitle={isAr ? "شركات العملاء التي تخدمها — اضغط لفتح لوحة العميل" : "Client companies you serve — click a row to open client dashboard"}
        actions={
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 me-2" />
            {isAr ? "عميل جديد" : "New Client"}
          </Button>
        }
      />

      <ManpowerDemoBanner businessId={businessId} isAr={isAr} projectCount={projects.length} autoLoad={projects.length === 0} />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <ManpowerStatCard label={isAr ? "إجمالي العملاء" : "Total clients"} value={clients.length} />
        <ManpowerStatCard label={isAr ? "عملاء نشطون" : "With projects"} value={activeClients} />
        <ManpowerStatCard label={isAr ? "مشاريع مرتبطة" : "Linked projects"} value={projects.length} />
      </div>

      {showForm && (
        <div className="rounded-[10px] border border-[#E8E8E8] bg-white p-4 space-y-3">
          <p className="text-[13px] font-medium">{isAr ? "إضافة عميل" : "Add client company"}</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input placeholder={isAr ? "اسم الشركة" : "Company name"} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder={isAr ? "جهة الاتصال" : "Contact name"} value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
            <Input placeholder={isAr ? "الجوال" : "Phone"} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input className="sm:col-span-2" placeholder={isAr ? "العنوان" : "Address"} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => form.name && createMutation.mutate()} disabled={!form.name || createMutation.isPending}>
              {t(locale, "dashboard", "save")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
              {t(locale, "dashboard", "cancel")}
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-[10px] border border-[#E8E8E8] bg-white overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto] md:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 px-4 py-2.5 border-b border-[#E8E8E8] bg-[#FAFAF8] text-[10px] font-semibold uppercase tracking-wide text-[#9a9a9a]">
          <span>{isAr ? "الشركة" : "Company"}</span>
          <span className="hidden md:block">{isAr ? "جهة الاتصال" : "Contact"}</span>
          <span>{isAr ? "مشاريع" : "Projects"}</span>
          <span className="hidden md:block">{isAr ? "الموقع" : "Location"}</span>
          <span className="w-6" />
        </div>

        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={5} />
          </div>
        ) : clients.length === 0 ? (
          <div className="p-10 text-center">
            <Building2 className="w-10 h-10 mx-auto text-[#9a9a9a] mb-2" />
            <p className="text-sm text-[#5c5c5c]">{t(locale, "dashboard", "noData")}</p>
          </div>
        ) : (
          clients.map((client) => {
            const clientProjects = projects.filter((p) => p.clientCompanyId === client.id);
            const activeProject = clientProjects.find((p) => p.status === "ACTIVE") ?? clientProjects[0];
            const projectCount = client._count?.projects ?? clientProjects.length;

            return (
              <Link
                key={client.id}
                href={`/dashboard/${businessId}/clients/${client.id}`}
                className="grid grid-cols-[1fr_auto_auto_auto] md:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 px-4 py-3.5 border-b border-[#E8E8E8] last:border-0 items-center hover:bg-[#FAFAF8] transition-colors group"
              >
                <div className="min-w-0">
                  <p className="font-medium text-[#1a1a1a] truncate group-hover:text-[#1D9E75]">{client.name}</p>
                  {client.phone && <p className="text-[11px] text-[#9a9a9a] truncate md:hidden">{client.phone}</p>}
                </div>
                <span className="hidden md:block text-sm text-[#5c5c5c] truncate">{client.contactName ?? "—"}</span>
                <span className="inline-flex items-center gap-1 text-sm tabular-nums text-[#1a1a1a]">
                  <FolderKanban className="w-3.5 h-3.5 text-[#9a9a9a]" />
                  {projectCount}
                </span>
                <span className="hidden md:flex items-center gap-1 text-xs text-[#9a9a9a] truncate">
                  <MapPin className="w-3 h-3 shrink-0" />
                  {activeProject?.city ?? client.address?.split(",")[0] ?? "—"}
                </span>
                <ChevronRight className="w-4 h-4 text-[#9a9a9a] group-hover:text-[#1D9E75]" />
              </Link>
            );
          })
        )}
      </div>
    </ManpowerPageShell>
  );
}
