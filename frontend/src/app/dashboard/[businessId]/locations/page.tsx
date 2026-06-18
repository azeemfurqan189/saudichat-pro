"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MapPin,
  ChevronDown,
  ChevronRight,
  Download,
  Factory,
  Layers,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api, LocationTreeNode } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ManpowerHeroHeader, ManpowerPageShell, ManpowerStatCard } from "@/components/dashboard/manpower-shell";
import { CmmsDemoBanner } from "@/components/dashboard/cmms-demo-banner";

const TYPE_LABELS: Record<string, { en: string; ar: string }> = {
  PLANT: { en: "Plant / Refinery", ar: "مصنع / مجمع" },
  SECTION: { en: "Section / Area", ar: "قسم / منطقة" },
  EQUIPMENT: { en: "Equipment", ar: "معدة" },
  SITE: { en: "Site", ar: "موقع" },
  AREA: { en: "Area", ar: "منطقة" },
  HEAD_OFFICE: { en: "Head Office", ar: "المكتب الرئيسي" },
  WAREHOUSE: { en: "Warehouse", ar: "مستودع" },
  COMPANY: { en: "Company", ar: "شركة" },
};

type LocForm = {
  code: string;
  name: string;
  description: string;
  type: string;
  parentId: string;
  address: string;
};

const emptyForm = (): LocForm => ({
  code: "",
  name: "",
  description: "",
  type: "SECTION",
  parentId: "",
  address: "",
});

function flattenLocations(nodes: LocationTreeNode[]): LocationTreeNode[] {
  const out: LocationTreeNode[] = [];
  function walk(list: LocationTreeNode[]) {
    for (const n of list) {
      out.push(n);
      walk(n.children);
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
  node: LocationTreeNode;
  depth: number;
  selectedId: string | null;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (node: LocationTreeNode) => void;
  isAr: boolean;
}) {
  const open = expanded.has(node.id);
  const hasChildren = node.children.length > 0;
  const active = selectedId === node.id;
  const typeLabel = TYPE_LABELS[node.type]?.[isAr ? "ar" : "en"] ?? node.type;

  return (
    <div>
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={() => (hasChildren ? onToggle(node.id) : undefined)}
          className={cn("shrink-0 px-1 flex items-center", !hasChildren && "invisible")}
          style={{ marginInlineStart: `${depth * 16}px` }}
        >
          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        <button
          type="button"
          onClick={() => onSelect(node)}
          className={cn(
            "flex-1 text-left flex items-center gap-1.5 py-1.5 px-2 rounded-md text-[13px] transition-colors min-w-0",
            active ? "bg-[#F5EDE4] text-[#1a1a1a] font-medium" : "hover:bg-[#FAFAF8] text-[#444]"
          )}
        >
          {depth === 0 ? (
            <Factory className="w-3.5 h-3.5 shrink-0 text-[#888]" />
          ) : (
            <Layers className="w-3.5 h-3.5 shrink-0 text-[#888]" />
          )}
          <span className="font-mono text-[11px] text-[#666]">{node.code}</span>
          <span className="truncate">{node.name}</span>
          <span className="ms-auto text-[9px] text-[#888] shrink-0">{typeLabel}</span>
        </button>
      </div>
      {open &&
        node.children.map((child) => (
          <TreeNode
            key={child.id}
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

export default function LocationsPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();

  const [selected, setSelected] = useState<LocationTreeNode | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<LocForm>(emptyForm());

  const { data: treeData, isLoading } = useQuery({
    queryKey: ["location-tree", businessId],
    queryFn: async () => (await api.getLocationTree(businessId)).data,
  });

  const { data: detail } = useQuery({
    queryKey: ["location-detail", businessId, selected?.id],
    queryFn: async () => {
      if (!selected?.id) return null;
      return (await api.getFunctionalLocation(businessId, selected.id)).data ?? null;
    },
    enabled: !!selected?.id && !adding,
  });

  const tree = useMemo(() => treeData?.tree ?? [], [treeData?.tree]);
  const summary = treeData?.summary;
  const hasData = (summary?.totalLocations ?? 0) > 0;
  const flatList = useMemo(() => flattenLocations(tree), [tree]);

  const parentOptions = useMemo(() => {
    if (!selected || adding) return flatList;
    const blocked = new Set<string>([selected.id]);
    function collectDescendants(nodes: LocationTreeNode[]) {
      for (const n of nodes) {
        blocked.add(n.id);
        collectDescendants(n.children);
      }
    }
    const node = flatList.find((l) => l.id === selected.id);
    if (node) collectDescendants(node.children);
    return flatList.filter((l) => !blocked.has(l.id));
  }, [flatList, selected, adding]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        code: form.code,
        name: form.name,
        description: form.description || undefined,
        type: form.type,
        parentId: form.parentId || null,
        address: form.address || undefined,
      };
      if (adding) {
        return (await api.createFunctionalLocation(businessId, payload)).data;
      }
      if (!selected) throw new Error("No location selected");
      return (await api.updateFunctionalLocation(businessId, selected.id, payload)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["location-tree", businessId] });
      qc.invalidateQueries({ queryKey: ["cmms-locations", businessId] });
      qc.invalidateQueries({ queryKey: ["asset-tree", businessId] });
      setEditing(false);
      setAdding(false);
      toast.success(isAr ? "تم حفظ الموقع" : "Location saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("No location selected");
      return api.deleteFunctionalLocation(businessId, selected.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["location-tree", businessId] });
      qc.invalidateQueries({ queryKey: ["cmms-locations", businessId] });
      setSelected(null);
      setEditing(false);
      toast.success(isAr ? "تم إيقاف الموقع" : "Location deactivated");
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
    setExpanded(new Set(flatList.map((l) => l.id)));
  };

  const startAdd = (parentId?: string) => {
    setAdding(true);
    setEditing(true);
    setSelected(null);
    setForm({ ...emptyForm(), parentId: parentId ?? "" });
  };

  const startEdit = () => {
    if (!selected) return;
    setEditing(true);
    setAdding(false);
    setForm({
      code: selected.code,
      name: selected.name,
      description: selected.description ?? "",
      type: selected.type,
      parentId: selected.parentId ?? "",
      address: selected.address ?? "",
    });
  };

  const downloadCsv = () => {
    const headers = ["Code", "Name", "Description", "Type", "Address", "Assets", "Children"];
    const rows = flatList.map((l) =>
      [l.code, l.name, l.description, l.type, l.address, l.assetCount, l.childCount]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `locations-${businessId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const breadcrumb = detail?.breadcrumb ?? [];

  return (
    <ManpowerPageShell>
      <ManpowerHeroHeader
        icon={MapPin}
        title={t(locale, "dashboard", "locations")}
        subtitle={
          isAr
            ? "SAP PM — هيكل المصنع: مجمع ← قسم ← معدة"
            : "SAP PM — plant hierarchy: Refinery → Section → Equipment"
        }
      />

      <CmmsDemoBanner businessId={businessId} isAr={isAr} hasData={hasData} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ManpowerStatCard label={isAr ? "إجمالي المواقع" : "Total locations"} value={isLoading ? "—" : summary?.totalLocations ?? 0} />
        <ManpowerStatCard label={isAr ? "جذور" : "Root nodes"} value={isLoading ? "—" : summary?.rootLocations ?? 0} />
        <ManpowerStatCard label={isAr ? "أقصى عمق" : "Max depth"} value={isLoading ? "—" : summary?.maxDepth ?? 0} />
        <ManpowerStatCard label={isAr ? "أصول مربوطة" : "Linked assets"} value={isLoading ? "—" : summary?.totalAssets ?? 0} />
      </div>

      <div className="grid lg:grid-cols-[minmax(280px,340px)_1fr] gap-4 min-h-[480px]">
        <div className="rounded-[10px] border border-[#E8E8E8] bg-white overflow-hidden flex flex-col">
          <div className="px-3 py-2.5 border-b border-[#E8E8E8] bg-[#FAFAF8] flex items-center justify-between gap-2">
            <p className="text-[13px] font-medium">{isAr ? "شجرة المواقع" : "Location hierarchy"}</p>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-7 text-[11px] px-2" onClick={expandAll}>
                {isAr ? "فتح الكل" : "Expand all"}
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={downloadCsv} disabled={!flatList.length}>
                <Download className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {isLoading ? (
              <p className="p-4 text-center text-sm text-muted-foreground">{isAr ? "جاري التحميل..." : "Loading..."}</p>
            ) : tree.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">
                {isAr ? "لا مواقع — حمّل CMMS demo" : "No locations — load CMMS demo"}
              </p>
            ) : (
              tree.map((node) => (
                <TreeNode
                  key={node.id}
                  node={node}
                  depth={0}
                  selectedId={selected?.id ?? null}
                  expanded={expanded}
                  onToggle={toggleExpand}
                  onSelect={(n) => {
                    setSelected(n);
                    setEditing(false);
                    setAdding(false);
                  }}
                  isAr={isAr}
                />
              ))
            )}
          </div>
          <div className="p-2 border-t">
            <Button size="sm" className="w-full h-8" onClick={() => startAdd(selected?.id)}>
              <Plus className="w-3.5 h-3.5 me-1" />
              {isAr ? "موقع جديد" : "New location"}
            </Button>
          </div>
        </div>

        <div className="rounded-[10px] border border-[#E8E8E8] bg-white overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-[#E8E8E8] bg-[#FAFAF8] flex items-center justify-between gap-2">
            <div>
              <p className="text-[13px] font-medium">
                {adding
                  ? isAr
                    ? "موقع جديد"
                    : "New location"
                  : selected
                    ? selected.name
                    : isAr
                      ? "اختر موقعًا"
                      : "Select a location"}
              </p>
              {selected && !adding && (
                <p className="text-[11px] text-[#888] font-mono">{selected.code}</p>
              )}
            </div>
            {(selected || adding) && !editing && selected && (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-8" onClick={() => startAdd(selected.id)}>
                  <Plus className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8" onClick={startEdit}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-red-600"
                  onClick={() => deleteMut.mutate()}
                  disabled={deleteMut.isPending || (selected.childCount ?? 0) > 0}
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
                <Button size="sm" className="h-8" disabled={!form.code || !form.name || saveMut.isPending} onClick={() => saveMut.mutate()}>
                  {isAr ? "حفظ" : "Save"}
                </Button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {!selected && !adding ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-[#888] gap-2">
                <MapPin className="w-10 h-10 opacity-30" />
                <p className="text-sm">{isAr ? "اختر موقعًا من الشجرة" : "Pick a location from the tree"}</p>
                <div className="font-mono text-[11px] text-left mt-2 bg-[#FAFAF8] p-3 rounded border">
                  <p>Refinery</p>
                  <p className="pl-3">├── Utilities</p>
                  <p className="pl-3">└── Boiler Area</p>
                  <p className="pl-6">├── Boiler 1</p>
                  <p className="pl-6">└── Boiler 2</p>
                </div>
              </div>
            ) : editing ? (
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase text-[#9a9a9a]">{isAr ? "الكود" : "Code"} *</label>
                  <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="h-9 mt-1 font-mono uppercase" placeholder="BOILER-1" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-[#9a9a9a]">{isAr ? "النوع" : "Type"}</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="h-9 w-full rounded-md border px-2 text-sm bg-background mt-1">
                    {Object.entries(TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{isAr ? v.ar : v.en}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-semibold uppercase text-[#9a9a9a]">{isAr ? "الاسم" : "Name"} *</label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-9 mt-1" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-semibold uppercase text-[#9a9a9a]">{isAr ? "الوصف" : "Description"}</label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="h-9 mt-1" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-[#9a9a9a]">{isAr ? "الموقع الأب" : "Parent location"}</label>
                  <select value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })} className="h-9 w-full rounded-md border px-2 text-sm bg-background mt-1">
                    <option value="">{isAr ? "— جذر —" : "— Root —"}</option>
                    {parentOptions.map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.code} — {loc.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-[#9a9a9a]">{isAr ? "العنوان" : "Address"}</label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="h-9 mt-1" />
                </div>
              </div>
            ) : selected ? (
              <div className="space-y-4">
                {breadcrumb.length > 0 && (
                  <div className="text-[11px] text-[#888] flex flex-wrap items-center gap-1">
                    {breadcrumb.map((b, i) => (
                      <span key={b.id} className="flex items-center gap-1">
                        {i > 0 && <span>/</span>}
                        <span className="font-mono">{b.code}</span>
                      </span>
                    ))}
                    <span>/</span>
                    <span className="font-mono text-[#1a1a1a]">{selected.code}</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FAFAF8] border">
                    {TYPE_LABELS[selected.type]?.[isAr ? "ar" : "en"] ?? selected.type}
                  </span>
                  {(selected.childCount ?? 0) > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                      {selected.childCount} {isAr ? "فرع" : "children"}
                    </span>
                  )}
                  {(selected.assetCount ?? 0) > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                      {selected.assetCount} {isAr ? "أصل" : "assets"}
                    </span>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <DetailField label={isAr ? "الكود" : "Code"} value={selected.code} />
                  <DetailField label={isAr ? "الاسم" : "Name"} value={selected.name} />
                  <DetailField label={isAr ? "الوصف" : "Description"} value={selected.description} />
                  <DetailField label={isAr ? "النوع" : "Type"} value={TYPE_LABELS[selected.type]?.[isAr ? "ar" : "en"] ?? selected.type} />
                  <DetailField label={isAr ? "العنوان" : "Address"} value={selected.address} />
                </div>

                {(detail?.children?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-[#9a9a9a] mb-2">{isAr ? "المواقع الفرعية" : "Child locations"}</p>
                    <div className="space-y-1">
                      {detail!.children!.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            const node = flatList.find((l) => l.id === c.id);
                            if (node) setSelected(node);
                          }}
                          className="w-full text-left px-3 py-2 rounded-md border border-[#E8E8E8] hover:bg-[#FAFAF8] text-[13px] flex justify-between"
                        >
                          <span><span className="font-mono text-[11px] text-[#666] me-2">{c.code}</span>{c.name}</span>
                          <span className="text-[10px] text-[#888]">{c._count?.equipment ?? 0} {isAr ? "أصل" : "assets"}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {(detail?.equipment?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-[#9a9a9a] mb-2">{isAr ? "الأصول في هذا الموقع" : "Assets at this location"}</p>
                    <div className="space-y-1">
                      {detail!.equipment!.map((a) => (
                        <div key={a.id} className="px-3 py-2 rounded-md border border-[#E8E8E8] text-[13px] flex justify-between">
                          <span><span className="font-mono text-[11px] text-[#666] me-2">{a.assetTag ?? "—"}</span>{a.name}</span>
                          {a.criticality === "HIGH" && (
                            <span className="text-[9px] text-red-600">{isAr ? "حرج" : "Critical"}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => startAdd(selected.id)}>
                    <Plus className="w-3.5 h-3.5 me-1" />
                    {isAr ? "إضافة فرع" : "Add child"}
                  </Button>
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
