"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";
import { ManpowerHeroHeader, ManpowerPageShell, ManpowerStatCard } from "@/components/dashboard/manpower-shell";
import { CmmsDemoBanner } from "@/components/dashboard/cmms-demo-banner";

export default function ProcurementPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();

  const { data: reqs = [], isLoading } = useQuery({
    queryKey: ["procurement", businessId],
    queryFn: async () => (await api.getProcurement(businessId)).data ?? [],
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["purchase-orders", businessId],
    queryFn: async () => (await api.getPurchaseOrders(businessId)).data ?? [],
  });

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: async () => (await api.getMe()).data });
  const isOwner = me?.businesses?.find((b) => b.id === businessId)?.memberRole === "OWNER";

  const approveMut = useMutation({
    mutationFn: (id: string) => api.approveProcurement(businessId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["procurement", businessId] });
      qc.invalidateQueries({ queryKey: ["purchase-orders", businessId] });
      toast.success(isAr ? "تمت الموافقة" : "Approved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const poMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "send_to_vendor" | "in_transit" | "deliver" }) =>
      api.advancePurchaseOrder(businessId, id, action),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-orders", businessId] });
      qc.invalidateQueries({ queryKey: ["spare-parts", businessId] });
      toast.success(isAr ? "تم تحديث PO" : "PO updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const nextPoAction = (status: string): "send_to_vendor" | "in_transit" | "deliver" | null => {
    if (status === "ISSUED") return "send_to_vendor";
    if (status === "SENT_TO_VENDOR") return "in_transit";
    if (status === "IN_TRANSIT") return "deliver";
    return null;
  };

  return (
    <ManpowerPageShell>
      <ManpowerHeroHeader
        icon={ShoppingCart}
        title={t(locale, "dashboard", "procurement")}
        subtitle={isAr ? "مخزون منخفض → طلب شراء → موافقة المكتب → طلب من المورد" : "Low stock → purchase request → office approval → vendor order"}
      />
      <CmmsDemoBanner businessId={businessId} isAr={isAr} hasData={reqs.length > 0 || orders.length > 0} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ManpowerStatCard label={isAr ? "طلبات شراء" : "Requisitions"} value={reqs.length} />
        <ManpowerStatCard label={isAr ? "بانتظار الموافقة" : "Awaiting approval"} value={reqs.filter((r) => r.status === "SUBMITTED").length} />
        <ManpowerStatCard label={isAr ? "أوامر شراء" : "Purchase orders"} value={orders.length} />
        <ManpowerStatCard label={isAr ? "تم التسليم" : "Delivered"} value={orders.filter((o) => o.status === "DELIVERED").length} />
      </div>

      <div className="rounded-[10px] border border-[#E8E8E8] bg-[#FAFAF8] p-3 text-[11px] text-center text-[#5c5c5c]">
        {isAr ? "🏢 المكتب فقط — الموردون من قائمة Suppliers" : "🏢 Office only — vendors from Suppliers list"}
      </div>

      <div className="rounded-[10px] border border-[#E8E8E8] bg-white divide-y">
        <div className="p-3 bg-[#FAFAF8] text-xs font-semibold">{isAr ? "طلبات الشراء" : "Purchase requisitions"}</div>
        {isLoading ? (
          <p className="p-6 text-center text-muted-foreground text-sm">{isAr ? "جاري التحميل..." : "Loading..."}</p>
        ) : reqs.length === 0 ? (
          <p className="p-6 text-center text-muted-foreground text-sm">{isAr ? "لا طلبات شراء" : "No purchase requisitions"}</p>
        ) : (
          reqs.map((pr) => (
            <div key={pr.id} className="p-4 flex flex-wrap justify-between gap-2">
              <div>
                <span className="font-mono text-xs text-muted-foreground">{pr.number}</span>
                <p className="font-semibold text-sm">{pr.supplier?.name ?? (isAr ? "بدون مورد" : "No vendor")}</p>
                {pr.notes && <p className="text-xs text-muted-foreground">{pr.notes}</p>}
              </div>
              <div className="text-right space-y-1">
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", pr.status === "APPROVED" ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600")}>
                  {pr.status}
                </span>
                {pr.totalCost != null && (
                  <p className="text-sm font-bold">{formatCurrency(pr.totalCost, isAr ? "ar-SA" : "en-SA")}</p>
                )}
                {isOwner && pr.status === "SUBMITTED" && (
                  <Button size="sm" className="h-7" onClick={() => approveMut.mutate(pr.id)}>{isAr ? "موافقة" : "Approve"}</Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="rounded-[10px] border border-[#E8E8E8] bg-white divide-y">
        <div className="p-3 bg-[#FAFAF8] text-xs font-semibold">{isAr ? "أوامر الشراء (PO)" : "Purchase orders (PO)"}</div>
        {orders.length === 0 ? (
          <p className="p-6 text-center text-muted-foreground text-sm">{isAr ? "لا PO — وافق على PR أولاً" : "No POs — approve a PR first"}</p>
        ) : (
          orders.map((po) => {
            const action = nextPoAction(po.status);
            return (
              <div key={po.id} className="p-4 flex flex-wrap justify-between gap-2">
                <div>
                  <span className="font-mono text-xs">{po.number}</span>
                  <p className="text-sm font-medium">{po.supplier?.name ?? "—"}</p>
                  {po.requisition && <p className="text-[10px] text-muted-foreground">PR {po.requisition.number}</p>}
                </div>
                <div className="text-right space-y-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted">{po.status}</span>
                  {po.totalCost != null && <p className="text-sm font-bold">{formatCurrency(po.totalCost, isAr ? "ar-SA" : "en-SA")}</p>}
                  {action && (
                    <Button size="sm" className="h-7" onClick={() => poMut.mutate({ id: po.id, action })}>
                      {action === "send_to_vendor" ? (isAr ? "→ مورد" : "→ Vendor") : action === "in_transit" ? (isAr ? "→ transit" : "→ In transit") : isAr ? "تسليم" : "Deliver"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </ManpowerPageShell>
  );
}
