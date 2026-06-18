"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api, type WorkRequestRow } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ManpowerHeroHeader, ManpowerPageShell, ManpowerStatCard } from "@/components/dashboard/manpower-shell";
import { CmmsDemoBanner } from "@/components/dashboard/cmms-demo-banner";
import { CmmsKanbanBoard } from "@/components/dashboard/cmms-kanban-board";

const WR_COLUMNS = [
  { id: "SUBMITTED" as const, label: "Submitted", labelAr: "مُرسَل", accent: "border-amber-200 bg-amber-50/40" },
  { id: "APPROVED" as const, label: "Approved", labelAr: "موافق", accent: "border-blue-200 bg-blue-50/40" },
  { id: "CONVERTED" as const, label: "→ Work Order", labelAr: "→ أمر عمل", accent: "border-emerald-200 bg-emerald-50/40" },
  { id: "REJECTED" as const, label: "Rejected", labelAr: "مرفوض", accent: "border-red-200 bg-red-50/40" },
];

type WrStatus = (typeof WR_COLUMNS)[number]["id"];

function wrColumn(status: string): WrStatus {
  if (WR_COLUMNS.some((c) => c.id === status)) return status as WrStatus;
  return "SUBMITTED";
}

export default function WorkRequestsPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["work-requests", businessId],
    queryFn: async () => (await api.getWorkRequests(businessId)).data ?? [],
  });

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: async () => (await api.getMe()).data });
  const role = me?.businesses?.find((b) => b.id === businessId)?.memberRole;
  const canApprove = role === "OWNER" || role === "MANAGER";

  const createMut = useMutation({
    mutationFn: () => api.createWorkRequest(businessId, { title, description, priority: "MEDIUM" }),
    onSuccess: () => {
      setTitle("");
      setDescription("");
      qc.invalidateQueries({ queryKey: ["work-requests", businessId] });
      qc.invalidateQueries({ queryKey: ["cmms-alerts", businessId] });
      toast.success(isAr ? "تم إرسال البلاغ" : "Request submitted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const actionMut = useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: string; reason?: string }) =>
      api.patchWorkRequest(businessId, id, { action, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work-requests", businessId] });
      qc.invalidateQueries({ queryKey: ["work-orders", businessId] });
      qc.invalidateQueries({ queryKey: ["cmms-alerts", businessId] });
      toast.success(isAr ? "تم التحديث" : "Updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleMove = (itemId: string, toColumn: WrStatus) => {
    if (!canApprove) {
      toast.error(isAr ? "صلاحية المشرف مطلوبة" : "Manager approval required");
      return;
    }
    const item = requests.find((r) => r.id === itemId);
    if (!item) return;
    const from = wrColumn(item.status);
    if (from === toColumn) return;

    if (toColumn === "APPROVED" && from === "SUBMITTED") {
      actionMut.mutate({ id: itemId, action: "approve" });
    } else if (toColumn === "CONVERTED" && (from === "APPROVED" || from === "SUBMITTED")) {
      actionMut.mutate({ id: itemId, action: "convert" });
    } else if (toColumn === "REJECTED" && from === "SUBMITTED") {
      actionMut.mutate({ id: itemId, action: "reject", reason: isAr ? "مرفوض من اللوحة" : "Rejected via board" });
    } else {
      toast.info(isAr ? "لا يمكن نقل هذا الطلب إلى هذا العمود" : "Cannot move to that column");
    }
  };

  return (
    <ManpowerPageShell>
      <ManpowerHeroHeader
        icon={ClipboardList}
        title={t(locale, "dashboard", "workRequests")}
        subtitle={
          isAr
            ? "اسحب بين الأعمدة للموافقة والتحويل — الموظف يبلّغ، المكتب يقرر"
            : "Drag between columns to approve & convert — employee reports, office decides"
        }
      />
      <CmmsDemoBanner businessId={businessId} isAr={isAr} hasData={requests.length > 0} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ManpowerStatCard label={isAr ? "إجمالي" : "Total"} value={requests.length} />
        <ManpowerStatCard label={isAr ? "معلقة" : "Pending"} value={requests.filter((r) => r.status === "SUBMITTED").length} accent="border-amber-200 bg-amber-50/50" />
        <ManpowerStatCard label={isAr ? "موافق عليها" : "Approved"} value={requests.filter((r) => r.status === "APPROVED").length} />
        <ManpowerStatCard label={isAr ? "→ أوامر عمل" : "Converted"} value={requests.filter((r) => r.status === "CONVERTED").length} />
      </div>

      <div className="rounded-[10px] border border-[#E8E8E8] bg-white p-4 space-y-3">
        <p className="text-sm font-semibold">{isAr ? "بلاغ جديد" : "New report"}</p>
        <Input placeholder={isAr ? "مثال: AC not working" : "e.g. AC not working"} value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input placeholder={isAr ? "التفاصيل" : "Details"} value={description} onChange={(e) => setDescription(e.target.value)} />
        <Button size="sm" disabled={!title.trim() || createMut.isPending} onClick={() => createMut.mutate()}>
          {isAr ? "إرسال بلاغ" : "Submit report"}
        </Button>
      </div>

      {isLoading ? (
        <p className="p-6 text-center text-muted-foreground text-sm">{isAr ? "جاري التحميل..." : "Loading..."}</p>
      ) : requests.length === 0 ? (
        <p className="p-6 text-center text-muted-foreground text-sm">{isAr ? "لا طلبات" : "No requests yet"}</p>
      ) : (
        <CmmsKanbanBoard
          columns={WR_COLUMNS}
          items={requests}
          getColumn={(r) => wrColumn(r.status)}
          onMove={handleMove}
          isAr={isAr}
          renderCard={(wr: WorkRequestRow, dragging) => (
            <div
              className={cn(
                "rounded-lg border border-[#E8E8E8] bg-white p-3 shadow-sm",
                dragging && "opacity-40 scale-95"
              )}
            >
              <span className="font-mono text-[10px] text-muted-foreground">{wr.number}</span>
              <p className="font-semibold text-xs mt-1">{wr.title}</p>
              {wr.description && <p className="text-[10px] text-muted-foreground line-clamp-2">{wr.description}</p>}
              {wr.functionalLocation && (
                <p className="text-[10px] text-muted-foreground mt-1">{wr.functionalLocation.code}</p>
              )}
              {wr.workOrder && (
                <p className="text-[10px] text-primary mt-1">WO: {wr.workOrder.number}</p>
              )}
            </div>
          )}
        />
      )}
    </ManpowerPageShell>
  );
}
