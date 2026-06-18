"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Boxes,
  AlertTriangle,
  Package,
  TrendingDown,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  RotateCcw,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api, SparePartRow } from "@/lib/api";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { ManpowerHeroHeader, ManpowerPageShell, ManpowerStatCard } from "@/components/dashboard/manpower-shell";
import { CmmsDemoBanner } from "@/components/dashboard/cmms-demo-banner";

const CATEGORIES = [
  { value: "", en: "All", ar: "الكل" },
  { value: "BEARING", en: "Bearings", ar: "محامل" },
  { value: "MOTOR", en: "Motors", ar: "محركات" },
  { value: "VALVE", en: "Valves", ar: "صمامات" },
  { value: "GASKET", en: "Gaskets", ar: "حشيات" },
  { value: "OIL", en: "Oil", ar: "زيوت" },
  { value: "FILTER", en: "Filters", ar: "فلاتر" },
];

const TXN_TYPES = [
  { value: "RECEIVE" as const, en: "Receive", ar: "استلام", icon: ArrowDownToLine, color: "text-emerald-700 bg-emerald-50" },
  { value: "ISSUE" as const, en: "Issue", ar: "صرف", icon: ArrowUpFromLine, color: "text-blue-700 bg-blue-50" },
  { value: "TRANSFER" as const, en: "Transfer", ar: "نقل", icon: ArrowLeftRight, color: "text-violet-700 bg-violet-50" },
  { value: "RETURN" as const, en: "Return", ar: "إرجاع", icon: RotateCcw, color: "text-amber-700 bg-amber-50" },
];

function categoryLabel(cat: string | undefined, isAr: boolean) {
  return CATEGORIES.find((c) => c.value === cat)?.[isAr ? "ar" : "en"] ?? cat ?? "—";
}

export default function SparesPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();

  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState<SparePartRow | null>(null);
  const [txnType, setTxnType] = useState<(typeof TXN_TYPES)[number]["value"]>("ISSUE");
  const [qty, setQty] = useState("1");
  const [reference, setReference] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newPart, setNewPart] = useState({ sku: "", name: "", category: "BEARING", stockQty: "0", reorderPoint: "5", unitCost: "" });

  const { data: parts = [], isLoading } = useQuery({
    queryKey: ["spare-parts", businessId, category],
    queryFn: async () => (await api.getSpareParts(businessId, category || undefined)).data ?? [],
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["inventory-transactions", businessId],
    queryFn: async () => (await api.getInventoryTransactions(businessId)).data ?? [],
  });

  const stats = useMemo(() => {
    const lowStock = parts.filter((p) => p.stockQty <= p.reorderPoint).length;
    const totalValue = parts.reduce((s, p) => s + p.stockQty * (p.unitCost ?? 0), 0);
    return { total: parts.length, lowStock, totalValue };
  }, [parts]);

  const txnMut = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("Select a material");
      return api.postInventoryTransaction(businessId, {
        type: txnType,
        sparePartId: selected.id,
        qty: parseFloat(qty) || 0,
        reference: reference || undefined,
        toLocation: toLocation || undefined,
        notes: notes || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["spare-parts", businessId] });
      qc.invalidateQueries({ queryKey: ["inventory-transactions", businessId] });
      setQty("1");
      setReference("");
      setNotes("");
      toast.success(isAr ? "تم تسجيل الحركة" : "Transaction recorded");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addPartMut = useMutation({
    mutationFn: () =>
      api.createSparePart(businessId, {
        sku: newPart.sku,
        name: newPart.name,
        category: newPart.category,
        stockQty: parseInt(newPart.stockQty, 10) || 0,
        reorderPoint: parseInt(newPart.reorderPoint, 10) || 5,
        unitCost: newPart.unitCost ? parseFloat(newPart.unitCost) : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["spare-parts", businessId] });
      setNewPart({ sku: "", name: "", category: "BEARING", stockQty: "0", reorderPoint: "5", unitCost: "" });
      setShowAdd(false);
      toast.success(isAr ? "تمت إضافة الصنف" : "Part added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <ManpowerPageShell>
      <ManpowerHeroHeader
        icon={Boxes}
        title={t(locale, "dashboard", "spares")}
        subtitle={
          isAr
            ? "قسم المخزن — محامل، محركات، صمامات، حشيات، زيوت، فلاتر"
            : "Store department — bearings, motors, valves, gaskets, oil, filters"
        }
      />

      <CmmsDemoBanner businessId={businessId} isAr={isAr} hasData={parts.length > 0} />

      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)}>
          {isAr ? "إضافة صنف" : "Add part"}
        </Button>
      </div>
      {showAdd && (
        <div className="rounded-[10px] border border-[#E8E8E8] bg-white p-4 grid sm:grid-cols-3 gap-2">
          <Input placeholder="SKU" value={newPart.sku} onChange={(e) => setNewPart({ ...newPart, sku: e.target.value })} className="h-9" />
          <Input placeholder={isAr ? "الاسم" : "Name"} value={newPart.name} onChange={(e) => setNewPart({ ...newPart, name: e.target.value })} className="h-9" />
          <select className="h-9 rounded border px-2 text-sm" value={newPart.category} onChange={(e) => setNewPart({ ...newPart, category: e.target.value })}>
            {CATEGORIES.filter((c) => c.value).map((c) => (
              <option key={c.value} value={c.value}>{isAr ? c.ar : c.en}</option>
            ))}
          </select>
          <Input type="number" placeholder={isAr ? "المخزون" : "Stock"} value={newPart.stockQty} onChange={(e) => setNewPart({ ...newPart, stockQty: e.target.value })} className="h-9" />
          <Input type="number" placeholder={isAr ? "حد إعادة الطلب" : "Reorder pt"} value={newPart.reorderPoint} onChange={(e) => setNewPart({ ...newPart, reorderPoint: e.target.value })} className="h-9" />
          <Button size="sm" disabled={!newPart.sku || !newPart.name || addPartMut.isPending} onClick={() => addPartMut.mutate()}>
            {isAr ? "حفظ" : "Save"}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ManpowerStatCard label={isAr ? "إجمالي الأصناف" : "Total SKUs"} value={isLoading ? "—" : stats.total} />
        <ManpowerStatCard
          label={isAr ? "مخزون منخفض" : "Low stock"}
          value={isLoading ? "—" : stats.lowStock}
          accent={stats.lowStock > 0 ? "border-amber-200 bg-amber-50/50" : undefined}
        />
        <ManpowerStatCard
          label={isAr ? "قيمة المخزون" : "Stock value"}
          value={isLoading ? "—" : formatCurrency(stats.totalValue, isAr ? "ar-SA" : "en-SA")}
        />
        <ManpowerStatCard label={isAr ? "الحركات" : "Movements"} value={transactions.length} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c.value || "all"}
            type="button"
            onClick={() => setCategory(c.value)}
            className={cn(
              "px-3 py-1 rounded-full text-[11px] border transition-colors",
              category === c.value
                ? "bg-[#F5EDE4] border-[#E8D5C4] text-[#1a1a1a] font-medium"
                : "bg-white border-[#E8E8E8] text-[#666] hover:bg-[#FAFAF8]"
            )}
          >
            {isAr ? c.ar : c.en}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_minmax(300px,360px)] gap-4">
        <div className="rounded-[10px] border border-[#E8E8E8] bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8E8E8] bg-[#FAFAF8]">
            <p className="text-[13px] font-medium">{isAr ? "سجل المواد" : "Material register"}</p>
            {stats.lowStock > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                <AlertTriangle className="w-3 h-3" />
                {stats.lowStock} {isAr ? "تحت الحد" : "below reorder"}
              </span>
            )}
          </div>
          <div className="grid grid-cols-6 gap-2 px-4 py-2 border-b text-[10px] font-semibold uppercase text-[#9a9a9a] bg-[#FAFAF8]">
            <span>SKU</span>
            <span className="col-span-2">{isAr ? "الاسم" : "Name"}</span>
            <span>{isAr ? "الفئة" : "Category"}</span>
            <span>{isAr ? "المخزون" : "Stock"}</span>
            <span>{isAr ? "الموقع" : "Bin"}</span>
          </div>
          {isLoading ? (
            <p className="p-8 text-center text-[#9a9a9a] text-sm">{isAr ? "جاري التحميل..." : "Loading..."}</p>
          ) : parts.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <Package className="w-8 h-8 mx-auto text-[#9a9a9a]" />
              <p className="text-sm text-[#5c5c5c]">{isAr ? "لا مواد — حمّل CMMS demo" : "No materials — load CMMS demo"}</p>
            </div>
          ) : (
            parts.map((p) => {
              const low = p.stockQty <= p.reorderPoint;
              const active = selected?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelected(p);
                    setToLocation(p.storeLocation ?? "");
                  }}
                  className={cn(
                    "w-full grid grid-cols-6 gap-2 px-4 py-3 border-b text-sm items-center text-left hover:bg-[#FAFAF8]/80",
                    low && "bg-amber-50/60",
                    active && "bg-[#F5EDE4]"
                  )}
                >
                  <span className="font-mono text-xs text-[#5c5c5c]">{p.sku}</span>
                  <span className="col-span-2 font-medium text-[#1a1a1a] flex items-center gap-1.5">
                    {low && <TrendingDown className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                    {p.name}
                  </span>
                  <span className="text-[11px] text-[#888]">{categoryLabel(p.category, isAr)}</span>
                  <span className={cn("tabular-nums", low ? "text-amber-700 font-semibold" : "")}>
                    {p.stockQty} / {p.reorderPoint}
                  </span>
                  <span className="text-[10px] text-[#888] truncate">{p.binCode ?? p.storeLocation ?? "—"}</span>
                </button>
              );
            })
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-[10px] border border-[#E8E8E8] bg-white overflow-hidden">
            <div className="px-4 py-3 border-b bg-[#FAFAF8]">
              <p className="text-[13px] font-medium">
                {selected ? selected.name : isAr ? "اختر مادة" : "Select material"}
              </p>
              {selected && (
                <p className="text-[11px] text-[#888] font-mono mt-0.5">
                  {selected.sku} · {categoryLabel(selected.category, isAr)} · {selected.stockQty} {isAr ? "متاح" : "on hand"}
                </p>
              )}
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-1.5">
                {TXN_TYPES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      disabled={!selected}
                      onClick={() => setTxnType(t.value)}
                      className={cn(
                        "flex items-center gap-1.5 px-2 py-2 rounded-md border text-[11px] transition-colors",
                        txnType === t.value ? t.color + " border-current font-medium" : "border-[#E8E8E8] text-[#666]",
                        !selected && "opacity-50"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {isAr ? t.ar : t.en}
                    </button>
                  );
                })}
              </div>
              <Input
                type="number"
                min="0.01"
                step="1"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder={isAr ? "الكمية" : "Quantity"}
                className="h-9"
                disabled={!selected}
              />
              {(txnType === "ISSUE" || txnType === "RETURN") && (
                <Input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder={isAr ? "مرجع WO / موقع" : "WO / site reference"}
                  className="h-9"
                  disabled={!selected}
                />
              )}
              {(txnType === "TRANSFER" || txnType === "RECEIVE") && (
                <Input
                  value={toLocation}
                  onChange={(e) => setToLocation(e.target.value)}
                  placeholder={isAr ? "موقع / bin (Store-A / A-01-02)" : "Location / bin (Store-A / A-01-02)"}
                  className="h-9"
                  disabled={!selected}
                />
              )}
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isAr ? "ملاحظات" : "Notes"}
                className="h-9"
                disabled={!selected}
              />
              <Button
                size="sm"
                className="w-full h-9"
                disabled={!selected || !qty || txnMut.isPending}
                onClick={() => txnMut.mutate()}
              >
                {isAr ? "تسجيل الحركة" : "Post transaction"}
              </Button>
            </div>
          </div>

          <div className="rounded-[10px] border border-[#E8E8E8] bg-white overflow-hidden">
            <div className="px-4 py-3 border-b bg-[#FAFAF8] flex items-center gap-2">
              <History className="w-4 h-4 text-[#888]" />
              <p className="text-[13px] font-medium">{isAr ? "سجل الحركات" : "Transaction log"}</p>
            </div>
            <div className="divide-y max-h-[280px] overflow-y-auto">
              {transactions.length === 0 ? (
                <p className="p-4 text-center text-[11px] text-[#888]">
                  {isAr ? "لا حركات بعد" : "No transactions yet"}
                </p>
              ) : (
                transactions.slice(0, 15).map((tx) => {
                  const meta = TXN_TYPES.find((t) => t.value === tx.type);
                  return (
                    <div key={tx.id} className="px-4 py-2.5 text-[12px]">
                      <div className="flex justify-between gap-2">
                        <span className="font-medium">{tx.sparePart?.sku ?? "—"}</span>
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded", meta?.color ?? "bg-muted")}>
                          {meta ? (isAr ? meta.ar : meta.en) : tx.type}
                        </span>
                      </div>
                      <p className="text-[#888] text-[11px] mt-0.5">
                        {tx.qty} × {tx.sparePart?.name}
                        {tx.reference && ` · ${tx.reference}`}
                      </p>
                      <p className="text-[10px] text-[#aaa]">{formatDate(tx.createdAt, locale)}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </ManpowerPageShell>
  );
}
