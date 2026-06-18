"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Component,
  ChevronDown,
  ChevronRight,
  Download,
  Factory,
  Pencil,
  Plus,
  Trash2,
  AlertTriangle,
  QrCode,
  Layers,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api, AssetTreeNode, CmmsAssetRecord, AssetHierarchyData } from "@/lib/api";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { ManpowerHeroHeader, ManpowerPageShell, ManpowerStatCard } from "@/components/dashboard/manpower-shell";
import { CmmsDemoBanner } from "@/components/dashboard/cmms-demo-banner";
import { FunctionalLocationSelect } from "@/components/dashboard/functional-location-select";
import { ReminderNotificationPanel } from "@/components/dashboard/reminder-notification-panel";
import { reminderItemKey } from "@/lib/reminder-notify-types";

const CRITICALITY_COLORS: Record<string, string> = {
  HIGH: "text-red-700 bg-red-50",
  MEDIUM: "text-amber-700 bg-amber-50",
  LOW: "text-emerald-700 bg-emerald-50",
};

type AssetForm = {
  name: string;
  assetTag: string;
  description: string;
  category: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  functionalLocationId: string;
  criticality: string;
  installationDate: string;
  purchaseCost: string;
  replacementCost: string;
  warrantyExpiry: string;
  drawingUrl: string;
  notes: string;
  parentEquipmentId: string;
  runningHours: string;
};

const emptyForm = (): AssetForm => ({
  name: "",
  assetTag: "",
  description: "",
  category: "",
  manufacturer: "",
  model: "",
  serialNumber: "",
  functionalLocationId: "",
  criticality: "MEDIUM",
  installationDate: "",
  purchaseCost: "",
  replacementCost: "",
  warrantyExpiry: "",
  drawingUrl: "",
  notes: "",
  parentEquipmentId: "",
  runningHours: "",
});

function assetToForm(a: CmmsAssetRecord): AssetForm {
  return {
    name: a.name ?? "",
    assetTag: a.assetTag ?? "",
    description: a.description ?? "",
    category: a.category ?? "",
    manufacturer: a.manufacturer ?? "",
    model: a.model ?? "",
    serialNumber: a.serialNumber ?? "",
    functionalLocationId: a.functionalLocationId ?? "",
    criticality: a.criticality ?? "MEDIUM",
    installationDate: a.installationDate ? a.installationDate.slice(0, 10) : "",
    purchaseCost: a.purchaseCost != null ? String(a.purchaseCost) : "",
    replacementCost: a.replacementCost != null ? String(a.replacementCost) : "",
    warrantyExpiry: a.warrantyExpiry ? a.warrantyExpiry.slice(0, 10) : "",
    drawingUrl: a.drawingUrl ?? "",
    notes: a.notes ?? "",
    parentEquipmentId: a.parentEquipmentId ?? "",
    runningHours: a.runningHours != null ? String(a.runningHours) : "",
  };
}

function flattenAssets(nodes: AssetTreeNode[], unassigned: CmmsAssetRecord[]): CmmsAssetRecord[] {
  const out: CmmsAssetRecord[] = [...unassigned];
  function walk(list: AssetTreeNode[]) {
    for (const n of list) {
      if (n.kind === "asset") out.push(n.asset);
      else walk(n.children);
    }
  }
  walk(nodes);
  return out;
}

function TreeNode({
  node,
  depth,
  selectedId,
  expanded,
  onToggle,
  onSelect,
  isAr,
}: {
  node: AssetTreeNode;
  depth: number;
  selectedId: string | null;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (asset: CmmsAssetRecord) => void;
  isAr: boolean;
}) {
  if (node.kind === "asset") {
    const a = node.asset;
    const active = selectedId === a.id;
    return (
      <button
        type="button"
        onClick={() => onSelect(a)}
        className={cn(
          "w-full text-left flex items-center gap-1.5 py-1.5 px-2 rounded-md text-[13px] transition-colors",
          active ? "bg-[#F5EDE4] text-[#1a1a1a] font-medium" : "hover:bg-[#FAFAF8] text-[#444]"
        )}
        style={{ paddingInlineStart: `${depth * 16 + 8}px` }}
      >
        <Component className="w-3.5 h-3.5 shrink-0 text-[#888]" />
        <span className="font-mono text-[11px] text-[#666]">{a.assetTag || "—"}</span>
        <span className="truncate">{a.name}</span>
        {a.criticality === "HIGH" && (
          <span className="ms-auto text-[9px] px-1.5 py-0.5 rounded bg-red-50 text-red-600">
            {isAr ? "حرج" : "Critical"}
          </span>
        )}
      </button>
    );
  }

  const open = expanded.has(node.id);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <button
        type="button"
        onClick={() => onToggle(node.id)}
        className="w-full text-left flex items-center gap-1 py-1.5 px-2 rounded-md text-[13px] font-medium text-[#1a1a1a] hover:bg-[#FAFAF8]"
        style={{ paddingInlineStart: `${depth * 16 + 4}px` }}
      >
        {hasChildren ? (
          open ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <span className="w-3.5" />
        )}
        <Factory className="w-3.5 h-3.5 shrink-0 text-[#888]" />
        <span className="font-mono text-[11px] text-[#666]">{node.code}</span>
        <span className="truncate">{node.name}</span>
      </button>
      {open &&
        node.children.map((child) => (
          <TreeNode
            key={child.kind === "asset" ? child.asset.id : child.id}
            node={child}
            depth={depth + 1}
            selectedId={selectedId}
            expanded={expanded}
            onToggle={onToggle}
            onSelect={onSelect}
            isAr={isAr}
          />
        ))}
    </div>
  );
}

function DetailField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase text-[#9a9a9a] mb-0.5">{label}</p>
      <p className="text-[13px] text-[#1a1a1a]">{value || "—"}</p>
    </div>
  );
}

export default function AssetsPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();

  const [selected, setSelected] = useState<CmmsAssetRecord | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<AssetForm>(emptyForm());
  const [newComponentName, setNewComponentName] = useState("");
  const [newBomPartId, setNewBomPartId] = useState("");
  const [newBomQty, setNewBomQty] = useState("1");

  const { data: treeData, isLoading } = useQuery({
    queryKey: ["asset-tree", businessId],
    queryFn: async () => (await api.getAssetTree(businessId)).data,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["cmms-locations", businessId],
    queryFn: async () => (await api.getFunctionalLocations(businessId)).data ?? [],
    staleTime: 0,
    refetchOnMount: "always",
  });

  const summary = treeData?.summary;
  const tree = useMemo(() => treeData?.tree ?? [], [treeData?.tree]);
  const unassigned = useMemo(() => treeData?.unassigned ?? [], [treeData?.unassigned]);
  const hasData = (summary?.totalAssets ?? 0) > 0;

  const allAssets = useMemo(() => flattenAssets(tree, unassigned), [tree, unassigned]);

  const { data: hierarchy } = useQuery({
    queryKey: ["asset-hierarchy", businessId, selected?.id],
    queryFn: async () => (await api.getAssetHierarchy(businessId, selected!.id)).data as AssetHierarchyData,
    enabled: !!selected && !adding && !editing,
  });

  const { data: spareParts = [] } = useQuery({
    queryKey: ["spare-parts", businessId],
    queryFn: async () => (await api.getSpareParts(businessId)).data ?? [],
    enabled: !!selected && !adding,
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        assetTag: form.assetTag || undefined,
        description: form.description || undefined,
        category: form.category || undefined,
        manufacturer: form.manufacturer || undefined,
        model: form.model || undefined,
        serialNumber: form.serialNumber || undefined,
        functionalLocationId: form.functionalLocationId || null,
        criticality: form.criticality,
        installationDate: form.installationDate || null,
        purchaseCost: form.purchaseCost ? parseFloat(form.purchaseCost) : null,
        replacementCost: form.replacementCost ? parseFloat(form.replacementCost) : null,
        warrantyExpiry: form.warrantyExpiry || null,
        drawingUrl: form.drawingUrl || null,
        notes: form.notes || undefined,
        parentEquipmentId: form.parentEquipmentId || null,
        runningHours: form.runningHours ? parseFloat(form.runningHours) : null,
      };
      if (adding) {
        return (await api.createCmmsAsset(businessId, payload)).data;
      }
      if (!selected) throw new Error("No asset selected");
      return (await api.updateCmmsAsset(businessId, selected.id, payload)).data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["asset-tree", businessId] });
      setEditing(false);
      setAdding(false);
      if (data) setSelected(data);
      toast.success(isAr ? "تم حفظ الأصل" : "Asset saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("No asset selected");
      return api.deleteCmmsAsset(businessId, selected.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["asset-tree", businessId] });
      setSelected(null);
      setEditing(false);
      toast.success(isAr ? "تم إيقاف الأصل" : "Asset retired");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const qrMut = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("No asset selected");
      return api.postAssetQrToken(businessId, selected.id);
    },
    onSuccess: (res) => {
      const url = res.data?.scanUrl;
      if (url) {
        navigator.clipboard?.writeText(url);
        toast.success(isAr ? "تم نسخ رابط QR" : "QR scan link copied");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addComponentMut = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("No asset");
      return api.postAssetComponent(businessId, selected.id, { name: newComponentName });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["asset-hierarchy", businessId, selected?.id] });
      setNewComponentName("");
      toast.success(isAr ? "تمت إضافة المكون" : "Component added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addBomMut = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("No asset");
      return api.postAssetBomItem(businessId, selected.id, {
        sparePartId: newBomPartId,
        qty: parseFloat(newBomQty) || 1,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["asset-hierarchy", businessId, selected?.id] });
      setNewBomPartId("");
      setNewBomQty("1");
      toast.success(isAr ? "تمت إضافة BOM" : "BOM item added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    const ids = new Set<string>();
    function walk(nodes: AssetTreeNode[]) {
      for (const n of nodes) {
        if (n.kind === "location") {
          ids.add(n.id);
          walk(n.children);
        }
      }
    }
    walk(tree);
    setExpanded(ids);
  };

  const startAdd = () => {
    setAdding(true);
    setEditing(true);
    setSelected(null);
    setForm(emptyForm());
  };

  const startEdit = () => {
    if (!selected) return;
    setEditing(true);
    setAdding(false);
    setForm(assetToForm(selected));
  };

  const downloadCsv = () => {
    const headers = [
      "Asset ID",
      "Tag",
      "Name",
      "Description",
      "Category",
      "Manufacturer",
      "Model",
      "Serial",
      "Location",
      "Criticality",
      "Install Date",
      "Purchase Cost",
      "Replacement Cost",
      "Warranty",
    ];
    const rows = allAssets.map((a) =>
      [
        a.assetNumber,
        a.assetTag,
        a.name,
        a.description,
        a.category,
        a.manufacturer,
        a.model,
        a.serialNumber,
        a.functionalLocation ? `${a.functionalLocation.code} ${a.functionalLocation.name}` : "",
        a.criticality,
        a.installationDate ? a.installationDate.slice(0, 10) : "",
        a.purchaseCost,
        a.replacementCost,
        a.warrantyExpiry ? a.warrantyExpiry.slice(0, 10) : "",
      ]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `assets-${businessId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const docs = (selected?.documentUrls as Array<{ name: string; url: string }> | null) ?? [];
  const photos = (selected?.photoUrls as string[] | null) ?? [];

  return (
    <ManpowerPageShell>
      <ManpowerHeroHeader
        icon={Component}
        title={t(locale, "dashboard", "assets")}
        subtitle={
          isAr
            ? "أساس النظام — كل أصل مسجل هنا: مصنع ← منطقة ← مضخة/محرك/صمام"
            : "System foundation — every asset registered here: Plant → Area → Pump/Motor/Valve"
        }
      />

      <CmmsDemoBanner businessId={businessId} isAr={isAr} hasData={hasData} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ManpowerStatCard label={isAr ? "إجمالي الأصول" : "Total assets"} value={isLoading ? "—" : summary?.totalAssets ?? 0} />
        <ManpowerStatCard label={isAr ? "المواقع" : "Locations"} value={isLoading ? "—" : summary?.totalLocations ?? 0} />
        <ManpowerStatCard
          label={isAr ? "حرجة" : "Critical"}
          value={isLoading ? "—" : summary?.critical ?? 0}
          accent={(summary?.critical ?? 0) > 0 ? "border-red-200 bg-red-50/50" : undefined}
        />
        <ManpowerStatCard
          label={isAr ? "بدون موقع" : "Unassigned"}
          value={isLoading ? "—" : summary?.unassigned ?? 0}
          accent={(summary?.unassigned ?? 0) > 0 ? "border-amber-200 bg-amber-50/50" : undefined}
        />
      </div>

      <div className="grid lg:grid-cols-[minmax(280px,340px)_1fr] gap-4 min-h-[480px]">
        {/* Tree panel */}
        <div className="rounded-[10px] border border-[#E8E8E8] bg-white overflow-hidden flex flex-col">
          <div className="px-3 py-2.5 border-b border-[#E8E8E8] bg-[#FAFAF8] flex items-center justify-between gap-2">
            <p className="text-[13px] font-medium">{isAr ? "شجرة الأصول" : "Asset hierarchy"}</p>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-7 text-[11px] px-2" onClick={expandAll}>
                {isAr ? "فتح الكل" : "Expand all"}
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={downloadCsv} disabled={!allAssets.length}>
                <Download className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {isLoading ? (
              <p className="p-4 text-center text-sm text-muted-foreground">{isAr ? "جاري التحميل..." : "Loading..."}</p>
            ) : tree.length === 0 && unassigned.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">
                {isAr ? "لا أصول — حمّل CMMS demo" : "No assets — load CMMS demo"}
              </p>
            ) : (
              <>
                {tree.map((node) => (
                  <TreeNode
                    key={node.kind === "asset" ? node.asset.id : node.id}
                    node={node}
                    depth={0}
                    selectedId={selected?.id ?? null}
                    expanded={expanded}
                    onToggle={toggleExpand}
                    onSelect={(a) => {
                      setSelected(a);
                      setEditing(false);
                      setAdding(false);
                    }}
                    isAr={isAr}
                  />
                ))}
                {unassigned.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-[10px] font-semibold uppercase text-amber-700 px-2 mb-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {isAr ? "بدون موقع" : "Unassigned"}
                    </p>
                    {unassigned.map((a) => (
                      <TreeNode
                        key={a.id}
                        node={{ kind: "asset", asset: a }}
                        depth={0}
                        selectedId={selected?.id ?? null}
                        expanded={expanded}
                        onToggle={toggleExpand}
                        onSelect={(asset) => {
                          setSelected(asset);
                          setEditing(false);
                          setAdding(false);
                        }}
                        isAr={isAr}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="p-2 border-t">
            <Button size="sm" className="w-full h-8" onClick={startAdd}>
              <Plus className="w-3.5 h-3.5 me-1" />
              {isAr ? "أصل جديد" : "New asset"}
            </Button>
          </div>
        </div>

        {/* Detail panel */}
        <div className="rounded-[10px] border border-[#E8E8E8] bg-white overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-[#E8E8E8] bg-[#FAFAF8] flex items-center justify-between gap-2">
            <div>
              <p className="text-[13px] font-medium">
                {adding
                  ? isAr
                    ? "أصل جديد"
                    : "New asset"
                  : selected
                    ? selected.name
                    : isAr
                      ? "اختر أصلًا"
                      : "Select an asset"}
              </p>
              {selected?.assetNumber && !adding && (
                <p className="text-[11px] text-[#888] font-mono">{selected.assetNumber}</p>
              )}
            </div>
            {(selected || adding) && !editing && selected && (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-8" onClick={startEdit}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-red-600 hover:text-red-700"
                  onClick={() => deleteMut.mutate()}
                  disabled={deleteMut.isPending}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
            {editing && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => {
                    setEditing(false);
                    setAdding(false);
                  }}
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </Button>
                <Button size="sm" className="h-8" disabled={!form.name || saveMut.isPending} onClick={() => saveMut.mutate()}>
                  {isAr ? "حفظ" : "Save"}
                </Button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {!selected && !adding ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-[#888] gap-2">
                <Component className="w-10 h-10 opacity-30" />
                <p className="text-sm">{isAr ? "اختر أصلًا من الشجرة" : "Pick an asset from the tree"}</p>
                <p className="text-[11px] max-w-xs">
                  {isAr
                    ? "Plant → Area A → Pump P-101 — كل سجل يحمل Tag، Serial، Criticality، Warranty..."
                    : "Plant → Area A → Pump P-101 — each record holds Tag, Serial, Criticality, Warranty..."}
                </p>
              </div>
            ) : editing ? (
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-semibold uppercase text-[#9a9a9a]">{isAr ? "الاسم" : "Name"} *</label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-9 mt-1" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-[#9a9a9a]">{isAr ? "رقم Tag" : "Tag number"}</label>
                  <Input value={form.assetTag} onChange={(e) => setForm({ ...form, assetTag: e.target.value })} className="h-9 mt-1 font-mono" placeholder="P-101" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-[#9a9a9a]">{isAr ? "الفئة" : "Category"}</label>
                  <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="h-9 mt-1" placeholder="Pump" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-semibold uppercase text-[#9a9a9a]">{isAr ? "الوصف" : "Description"}</label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="h-9 mt-1" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-[#9a9a9a]">{isAr ? "الشركة المصنعة" : "Manufacturer"}</label>
                  <Input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} className="h-9 mt-1" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-[#9a9a9a]">{isAr ? "الموديل" : "Model"}</label>
                  <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className="h-9 mt-1" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-[#9a9a9a]">{isAr ? "الرقم التسلسلي" : "Serial number"}</label>
                  <Input value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} className="h-9 mt-1 font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-[#9a9a9a]">{isAr ? "الموقع" : "Location"}</label>
                  <FunctionalLocationSelect
                    businessId={businessId}
                    locations={locations}
                    value={form.functionalLocationId}
                    isAr={isAr}
                    boardColumn="STOCK"
                    emptyLabel={isAr ? "— اختر موقع —" : "— Select location —"}
                    onChange={(id) => setForm({ ...form, functionalLocationId: id })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-[#9a9a9a]">{isAr ? "الأهمية" : "Criticality"}</label>
                  <select
                    value={form.criticality}
                    onChange={(e) => setForm({ ...form, criticality: e.target.value })}
                    className="h-9 w-full rounded-md border px-2 text-sm bg-background mt-1"
                  >
                    <option value="HIGH">{isAr ? "عالية" : "High"}</option>
                    <option value="MEDIUM">{isAr ? "متوسطة" : "Medium"}</option>
                    <option value="LOW">{isAr ? "منخفضة" : "Low"}</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-[#9a9a9a]">{isAr ? "تاريخ التركيب" : "Installation date"}</label>
                  <Input type="date" value={form.installationDate} onChange={(e) => setForm({ ...form, installationDate: e.target.value })} className="h-9 mt-1" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-[#9a9a9a]">{isAr ? "تكلفة الشراء" : "Purchase cost"}</label>
                  <Input type="number" value={form.purchaseCost} onChange={(e) => setForm({ ...form, purchaseCost: e.target.value })} className="h-9 mt-1" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-[#9a9a9a]">{isAr ? "تكلفة الاستبدال" : "Replacement cost"}</label>
                  <Input type="number" value={form.replacementCost} onChange={(e) => setForm({ ...form, replacementCost: e.target.value })} className="h-9 mt-1" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-[#9a9a9a]">{isAr ? "انتهاء الضمان" : "Warranty expiry"}</label>
                  <Input type="date" value={form.warrantyExpiry} onChange={(e) => setForm({ ...form, warrantyExpiry: e.target.value })} className="h-9 mt-1" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-[#9a9a9a]">{isAr ? "ساعات التشغيل" : "Running hours"}</label>
                  <Input type="number" value={form.runningHours} onChange={(e) => setForm({ ...form, runningHours: e.target.value })} className="h-9 mt-1" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-[#9a9a9a]">{isAr ? "الأصل الأب" : "Parent asset"}</label>
                  <select
                    value={form.parentEquipmentId}
                    onChange={(e) => setForm({ ...form, parentEquipmentId: e.target.value })}
                    className="h-9 w-full rounded-md border px-2 text-sm bg-background mt-1"
                  >
                    <option value="">{isAr ? "— لا يوجد —" : "— None —"}</option>
                    {allAssets.filter((a) => a.id !== selected?.id).map((a) => (
                      <option key={a.id} value={a.id}>{a.assetTag || a.name} — {a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-[#9a9a9a]">{isAr ? "رسم" : "Drawing URL"}</label>
                  <Input value={form.drawingUrl} onChange={(e) => setForm({ ...form, drawingUrl: e.target.value })} className="h-9 mt-1" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-semibold uppercase text-[#9a9a9a]">{isAr ? "ملاحظات" : "Notes"}</label>
                  <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="h-9 mt-1" />
                </div>
                <div className="sm:col-span-2">
                  <ReminderNotificationPanel
                    businessId={businessId}
                    itemKey={
                      selected && !adding ? reminderItemKey("asset", selected.id) : null
                    }
                    isAr={isAr}
                    subtitle={
                      isAr
                        ? "تنبيه قبل انتهاء الضمان أو موعد PM"
                        : "Alert before warranty expiry or PM due"
                    }
                  />
                </div>
              </div>
            ) : selected ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {selected.criticality && (
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", CRITICALITY_COLORS[selected.criticality] ?? "bg-muted")}>
                      {selected.criticality}
                    </span>
                  )}
                  {selected.category && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FAFAF8] border">{selected.category}</span>
                  )}
                  {selected.assetStatus && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">{selected.assetStatus}</span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={qrMut.isPending} onClick={() => qrMut.mutate()}>
                    <QrCode className="w-3.5 h-3.5 me-1" />
                    {isAr ? "QR للمسح" : "Asset QR scan"}
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <a href={`/dashboard/${businessId}/reliability`}>{isAr ? "MTBF/MTTR" : "Reliability KPIs"}</a>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <a href={`/dashboard/${businessId}/iot-monitoring`}>{isAr ? "IoT / حساسات" : "IoT / Sensors"}</a>
                  </Button>
                </div>

                {hierarchy?.parentEquipment && (
                  <DetailField
                    label={isAr ? "الأصل الأب" : "Parent asset"}
                    value={`${hierarchy.parentEquipment.assetTag ?? ""} ${hierarchy.parentEquipment.name}`.trim()}
                  />
                )}
                {hierarchy?.runningHours != null && hierarchy.runningHours > 0 && (
                  <DetailField label={isAr ? "ساعات التشغيل" : "Running hours"} value={String(hierarchy.runningHours)} />
                )}

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <DetailField label={isAr ? "رقم الأصل" : "Asset ID"} value={selected.assetNumber} />
                  <DetailField label={isAr ? "Tag" : "Tag number"} value={selected.assetTag} />
                  <DetailField label={isAr ? "الوصف" : "Description"} value={selected.description} />
                  <DetailField label={isAr ? "الرقم التسلسلي" : "Serial number"} value={selected.serialNumber} />
                  <DetailField label={isAr ? "الشركة المصنعة" : "Manufacturer"} value={selected.manufacturer} />
                  <DetailField label={isAr ? "الموديل" : "Model"} value={selected.model} />
                  <DetailField
                    label={isAr ? "الموقع" : "Location"}
                    value={
                      selected.functionalLocation
                        ? `${selected.functionalLocation.code} — ${selected.functionalLocation.name}`
                        : null
                    }
                  />
                  <DetailField
                    label={isAr ? "تاريخ التركيب" : "Installation date"}
                    value={selected.installationDate ? formatDate(selected.installationDate, locale) : null}
                  />
                  <DetailField
                    label={isAr ? "تكلفة الشراء" : "Purchase cost"}
                    value={
                      selected.purchaseCost != null
                        ? formatCurrency(selected.purchaseCost, isAr ? "ar-SA" : "en-SA")
                        : null
                    }
                  />
                  <DetailField
                    label={isAr ? "تكلفة الاستبدال" : "Replacement cost"}
                    value={
                      selected.replacementCost != null
                        ? formatCurrency(selected.replacementCost, isAr ? "ar-SA" : "en-SA")
                        : null
                    }
                  />
                  <DetailField
                    label={isAr ? "الضمان حتى" : "Warranty until"}
                    value={selected.warrantyExpiry ? formatDate(selected.warrantyExpiry, locale) : null}
                  />
                </div>

                {selected.drawingUrl && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-[#9a9a9a] mb-1">{isAr ? "الرسم" : "Drawing"}</p>
                    <a href={selected.drawingUrl} className="text-[13px] text-primary underline" target="_blank" rel="noreferrer">
                      {selected.drawingUrl}
                    </a>
                  </div>
                )}

                {docs.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-[#9a9a9a] mb-1">{isAr ? "المستندات" : "Documents"}</p>
                    <ul className="space-y-1">
                      {docs.map((d, i) => (
                        <li key={i}>
                          <a href={d.url} className="text-[13px] text-primary underline" target="_blank" rel="noreferrer">
                            {d.name}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {photos.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-[#9a9a9a] mb-1">{isAr ? "الصور" : "Photos"}</p>
                    <ul className="space-y-1">
                      {photos.map((p, i) => (
                        <li key={i}>
                          <a href={p} className="text-[13px] text-primary underline" target="_blank" rel="noreferrer">
                            {p.split("/").pop()}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selected.notes && (
                  <DetailField label={isAr ? "ملاحظات" : "Notes"} value={selected.notes} />
                )}

                <div className="pt-3 border-t space-y-3">
                  <p className="text-[11px] font-semibold uppercase text-[#9a9a9a] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    {isAr ? "التسلسل الهرمي والمكونات" : "Hierarchy & components"}
                  </p>
                  {hierarchy?.childEquipment && hierarchy.childEquipment.length > 0 && (
                    <div className="text-[12px] space-y-1">
                      <p className="text-[10px] text-muted-foreground">{isAr ? "أصول فرعية" : "Child assets"}</p>
                      {hierarchy.childEquipment.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="block w-full text-left px-2 py-1 rounded hover:bg-muted/50 font-mono text-[11px]"
                          onClick={() => {
                            const found = allAssets.find((a) => a.id === c.id);
                            if (found) setSelected(found);
                          }}
                        >
                          {c.assetTag} — {c.name}
                        </button>
                      ))}
                    </div>
                  )}
                  {hierarchy?.components && hierarchy.components.length > 0 ? (
                    <ul className="text-[12px] space-y-1">
                      {hierarchy.components.map((c) => (
                        <li key={c.id} className="flex items-center gap-2 px-2 py-1 rounded bg-[#FAFAF8]">
                          <Component className="w-3 h-3 text-[#888]" />
                          <span>{c.name}</span>
                          {c.partNumber && <span className="font-mono text-[10px] text-muted-foreground">{c.partNumber}</span>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">{isAr ? "لا مكونات بعد" : "No components yet"}</p>
                  )}
                  <div className="flex gap-2">
                    <Input
                      value={newComponentName}
                      onChange={(e) => setNewComponentName(e.target.value)}
                      placeholder={isAr ? "مكون جديد (مثال: Motor)" : "New component (e.g. Motor)"}
                      className="h-8 text-xs flex-1"
                    />
                    <Button size="sm" className="h-8" disabled={!newComponentName || addComponentMut.isPending} onClick={() => addComponentMut.mutate()}>
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="pt-3 border-t space-y-3">
                  <p className="text-[11px] font-semibold uppercase text-[#9a9a9a] flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5" />
                    {isAr ? "قائمة المواد BOM" : "Bill of Materials (BOM)"}
                  </p>
                  {hierarchy?.bomItems && hierarchy.bomItems.length > 0 ? (
                    <div className="text-[12px] border rounded overflow-hidden">
                      {hierarchy.bomItems.map((b) => (
                        <div key={b.id} className="flex items-center justify-between px-3 py-2 border-b last:border-0">
                          <span>{b.sparePart.sku} — {b.sparePart.name}</span>
                          <span className="text-[11px] tabular-nums text-muted-foreground">×{b.qty} · stock {b.sparePart.stockQty}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">{isAr ? "لا BOM — أضف قطع غيار مرتبطة" : "No BOM — link spare parts below"}</p>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <select className="rounded border px-2 py-1.5 text-xs flex-1 min-w-[140px]" value={newBomPartId} onChange={(e) => setNewBomPartId(e.target.value)}>
                      <option value="">{isAr ? "قطعة غيار" : "Spare part"}</option>
                      {spareParts.map((p) => (
                        <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
                      ))}
                    </select>
                    <Input type="number" min="1" value={newBomQty} onChange={(e) => setNewBomQty(e.target.value)} className="h-8 w-16 text-xs" />
                    <Button size="sm" className="h-8" disabled={!newBomPartId || addBomMut.isPending} onClick={() => addBomMut.mutate()}>
                      {isAr ? "إضافة" : "Add"}
                    </Button>
                  </div>
                </div>

                <ReminderNotificationPanel
                  businessId={businessId}
                  itemKey={reminderItemKey("asset", selected.id)}
                  isAr={isAr}
                  subtitle={
                    isAr
                      ? "تنبيه الضمان / PM — Boss, Manager, Admin"
                      : "Warranty / PM alert — Boss, Manager, Admin"
                  }
                />

                <div className="pt-3 border-t flex gap-2">
                  <Button size="sm" variant="outline" onClick={startEdit}>
                    <Pencil className="w-3.5 h-3.5 me-1" />
                    {isAr ? "تعديل" : "Edit"}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </ManpowerPageShell>
  );
}
