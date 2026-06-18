"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api, WorkOrderRow } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ManpowerHeroHeader, ManpowerPageShell, ManpowerStatCard } from "@/components/dashboard/manpower-shell";
import { CmmsDemoBanner } from "@/components/dashboard/cmms-demo-banner";
import { CmmsKanbanBoard } from "@/components/dashboard/cmms-kanban-board";
import { CmmsAlertsPanel } from "@/components/dashboard/cmms-alerts-panel";

const WO_COLUMNS = [
  { id: "OPEN" as const, label: "Open", labelAr: "مفتوح", accent: "border-blue-200 bg-blue-50/40" },
  { id: "IN_PROGRESS" as const, label: "In Progress", labelAr: "قيد التنفيذ", accent: "border-amber-200 bg-amber-50/40" },
  { id: "ON_HOLD" as const, label: "On Hold", labelAr: "معلق", accent: "border-violet-200 bg-violet-50/40" },
  { id: "COMPLETED" as const, label: "Completed", labelAr: "مكتمل", accent: "border-emerald-200 bg-emerald-50/40" },
];

type WoStatus = (typeof WO_COLUMNS)[number]["id"];

function normalizeStatus(s: string): WoStatus {
  if (WO_COLUMNS.some((c) => c.id === s)) return s as WoStatus;
  return "OPEN";
}

export default function WorkOrdersPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();
  const [issueWo, setIssueWo] = useState<WorkOrderRow | null>(null);
  const [issuePartId, setIssuePartId] = useState("");
  const [issueQty, setIssueQty] = useState("1");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["work-orders", businessId],
    queryFn: async () => (await api.getWorkOrders(businessId)).data ?? [],
  });

  const { data: parts = [] } = useQuery({
    queryKey: ["spare-parts", businessId],
    queryFn: async () => (await api.getSpareParts(businessId)).data ?? [],
    enabled: !!issueWo,
  });

  const issueEquipmentId = issueWo?.equipment?.id;

  const { data: bomSuggestions = [] } = useQuery({
    queryKey: ["bom-suggestions", businessId, issueEquipmentId],
    queryFn: async () => (await api.getBomSuggestions(businessId, issueEquipmentId!)).data ?? [],
    enabled: !!issueEquipmentId,
  });

  const issueMut = useMutation({
    mutationFn: () => {
      if (!issueWo) throw new Error("No work order");
      return api.issuePartToWorkOrder(businessId, issueWo.id, {
        sparePartId: issuePartId,
        qty: parseFloat(issueQty) || 1,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work-orders", businessId] });
      qc.invalidateQueries({ queryKey: ["spare-parts", businessId] });
      setIssueWo(null);
      toast.success(isAr ? "تم صرف القطعة" : "Part issued");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patchWorkOrder(businessId, id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work-orders", businessId] });
      qc.invalidateQueries({ queryKey: ["cmms-dashboard", businessId] });
      qc.invalidateQueries({ queryKey: ["cmms-alerts", businessId] });
      toast.success(isAr ? "تم تحديث أمر العمل" : "Work order updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activeOrders = orders.filter((o) => normalizeStatus(o.status) !== "COMPLETED");

  return (
    <ManpowerPageShell>
      <ManpowerHeroHeader
        icon={ClipboardCheck}
        title={t(locale, "dashboard", "workOrders")}
        subtitle={
          isAr
            ? "اسحب وأفلت بين الأعمدة — المكتب ينشئ، الموقع ينفّذ"
            : "Drag & drop between columns — office creates, site executes"
        }
      />
      <CmmsDemoBanner businessId={businessId} isAr={isAr} hasData={orders.length > 0} />
      <CmmsAlertsPanel isAr={isAr} compact />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ManpowerStatCard label={isAr ? "إجمالي" : "Total"} value={orders.length} />
        <ManpowerStatCard label={isAr ? "مفتوحة" : "Open"} value={orders.filter((o) => o.status === "OPEN").length} />
        <ManpowerStatCard label={isAr ? "قيد التنفيذ" : "In progress"} value={orders.filter((o) => o.status === "IN_PROGRESS").length} />
        <ManpowerStatCard label={isAr ? "مكتملة" : "Completed"} value={orders.filter((o) => o.status === "COMPLETED").length} />
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">{isAr ? "جاري التحميل..." : "Loading..."}</p>
      ) : orders.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          {isAr ? "لا أوامر عمل — حوّل طلباً من Work Requests" : "No work orders — convert a request"}
        </p>
      ) : (
        <CmmsKanbanBoard
          columns={WO_COLUMNS}
          items={activeOrders.length > 0 ? activeOrders : orders}
          getColumn={(o) => normalizeStatus(o.status)}
          onMove={(id, col) => updateMut.mutate({ id, status: col })}
          isAr={isAr}
          renderCard={(wo, dragging) => (
            <div
              className={cn(
                "rounded-lg border border-[#E8E8E8] bg-white p-3 shadow-sm transition",
                dragging && "opacity-40 scale-95"
              )}
            >
              <span className="font-mono text-[10px] text-muted-foreground">{wo.number}</span>
              <span className="text-[9px] ml-1 px-1 py-0.5 rounded bg-muted">{wo.type}</span>
              <p className="font-semibold text-xs mt-1 leading-snug">{wo.title}</p>
              {wo.functionalLocation && (
                <p className="text-[10px] text-muted-foreground mt-0.5">{wo.functionalLocation.name}</p>
              )}
              {wo.equipment?.assetTag && (
                <p className="text-[10px] text-primary mt-0.5">Tag: {wo.equipment.assetTag}</p>
              )}
              <button
                type="button"
                className="text-[10px] text-[#1D9E75] mt-1 underline"
                onClick={(e) => {
                  e.stopPropagation();
                  setIssueWo(wo);
                }}
              >
                {isAr ? "صرف قطعة" : "Issue part"}
              </button>
            </div>
          )}
        />
      )}

      {orders.some((o) => o.status === "COMPLETED") && (
        <details className="rounded-[10px] border border-[#E8E8E8] bg-white p-3">
          <summary className="text-sm font-semibold cursor-pointer">
            {isAr ? "المكتملة" : "Completed"} ({orders.filter((o) => o.status === "COMPLETED").length})
          </summary>
          <div className="mt-2 space-y-2">
            {orders
              .filter((o) => o.status === "COMPLETED")
              .map((wo) => (
                <div key={wo.id} className="text-xs p-2 rounded bg-muted/30 flex justify-between gap-2">
                  <span>{wo.number} — {wo.title}</span>
                  {wo.downtimeMinutes != null && (
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {isAr ? "توقف" : "Downtime"}: {wo.downtimeMinutes} min
                    </span>
                  )}
                </div>
              ))}
          </div>
        </details>
      )}

      {issueWo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg p-4 w-full max-w-sm space-y-3">
            <p className="font-semibold text-sm">{isAr ? "صرف قطعة —" : "Issue part —"} {issueWo.number}</p>
            {bomSuggestions.length > 0 && (
              <div className="rounded border border-[#E8E8E8] bg-[#FAFAF8] p-2 space-y-1">
                <p className="text-[10px] font-semibold uppercase text-[#888]">{isAr ? "اقتراح BOM" : "BOM suggestions"}</p>
                {bomSuggestions.map((s) => (
                  <button
                    key={s.sparePartId}
                    type="button"
                    className="w-full text-left text-[11px] px-2 py-1 rounded hover:bg-white flex justify-between gap-2"
                    onClick={() => {
                      setIssuePartId(s.sparePartId);
                      setIssueQty(String(s.qty));
                    }}
                  >
                    <span>{s.sku} — {s.name} (×{s.qty})</span>
                    <span className={s.inStock ? "text-emerald-600" : "text-red-600"}>
                      {s.inStock ? (isAr ? "متوفر" : "In stock") : (isAr ? "نقص" : "Low")}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <select className="w-full rounded border px-2 py-2 text-sm" value={issuePartId} onChange={(e) => setIssuePartId(e.target.value)}>
              <option value="">{isAr ? "اختر قطعة" : "Select part"}</option>
              {parts.map((p) => (
                <option key={p.id} value={p.id}>{p.sku} — {p.name} ({p.stockQty})</option>
              ))}
            </select>
            <Input type="number" min="1" value={issueQty} onChange={(e) => setIssueQty(e.target.value)} placeholder={isAr ? "الكمية" : "Qty"} />
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" disabled={!issuePartId || issueMut.isPending} onClick={() => issueMut.mutate()}>
                {isAr ? "صرف" : "Issue"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIssueWo(null)}>{t(locale, "dashboard", "cancel")}</Button>
            </div>
          </div>
        </div>
      )}
    </ManpowerPageShell>
  );
}
