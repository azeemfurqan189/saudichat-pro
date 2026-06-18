"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Calendar,
  GripVertical,
  MapPin,
  Package,
  Pencil,
  Plus,
  Trash2,
  User,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
import {
  api,
  AgencyEquipmentItem,
  EquipmentColumn,
} from "@/lib/api";
import { ManpowerGlassCard, ManpowerStatCard } from "@/components/dashboard/manpower-shell";
import {
  EquipmentFormModal,
  emptyEquipmentForm,
  equipmentToForm,
  formToPayload,
  type EquipmentFormValues,
} from "@/components/dashboard/equipment-form-modal";

const COLUMNS: EquipmentColumn[] = ["STOCK", "ISSUED", "INSPECTION", "MAINTENANCE"];

const COLUMN_META: Record<
  EquipmentColumn,
  { en: string; ar: string; hintEn: string; hintAr: string; accent: string }
> = {
  STOCK: {
    en: "In Stock",
    ar: "في المخزن",
    hintEn: "Available — drag to issue when site needs it",
    hintAr: "متاح — اسحب للإصدار عند الحاجة",
    accent: "border-emerald-500/30 bg-emerald-500/5",
  },
  ISSUED: {
    en: "Issued On Site",
    ar: "مسلّم للموقع",
    hintEn: "Who has it, since when, expected return",
    hintAr: "من لديه، منذ متى، موعد الإرجاع",
    accent: "border-blue-500/30 bg-blue-500/5",
  },
  INSPECTION: {
    en: "Inspection",
    ar: "فحص",
    hintEn: "Last check & next due date",
    hintAr: "آخر فحص وموعد الفحص القادم",
    accent: "border-amber-500/30 bg-amber-500/5",
  },
  MAINTENANCE: {
    en: "Maintenance",
    ar: "صيانة",
    hintEn: "Under repair — move back when ready",
    hintAr: "تحت الصيانة — انقل عند الجاهزية",
    accent: "border-rose-500/30 bg-rose-500/5",
  },
};

function daysBetween(from: string | null | undefined, to: Date = new Date()) {
  if (!from) return null;
  const start = new Date(from);
  return Math.floor((to.getTime() - start.getTime()) / 86400000);
}

function EquipmentCard({
  item,
  isAr,
  compact,
  dragging,
  onDragStart,
  onEdit,
  onDelete,
}: {
  item: AgencyEquipmentItem;
  isAr: boolean;
  compact?: boolean;
  dragging?: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onEdit?: (item: AgencyEquipmentItem) => void;
  onDelete?: (id: string) => void;
}) {
  const overdue =
    item.nextInspectionAt && new Date(item.nextInspectionAt) < new Date() && item.boardColumn !== "MAINTENANCE";
  const onSiteDays = item.issuedAt ? daysBetween(item.issuedAt) : null;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item.id)}
      className={cn(
        "rounded-xl border bg-card/90 p-3 shadow-sm cursor-grab active:cursor-grabbing transition",
        dragging && "opacity-40 scale-95",
        overdue && "border-amber-500/50 ring-1 ring-amber-500/20"
      )}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <p className={cn("font-semibold leading-snug", compact ? "text-xs" : "text-sm")}>{item.name}</p>
            <div className="flex items-center gap-0.5 shrink-0">
              {onEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(item);
                  }}
                  className="text-muted-foreground hover:text-primary p-0.5"
                  aria-label={isAr ? "تعديل" : "Edit"}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item.id);
                  }}
                  className="text-muted-foreground hover:text-destructive p-0.5"
                  aria-label={isAr ? "حذف" : "Delete"}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {item.category && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-medium">{item.category}</span>
            )}
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
              ×{item.quantity}
            </span>
            {item.serialNumber && (
              <span className="text-[10px] px-1.5 py-0.5 rounded border text-muted-foreground">{item.serialNumber}</span>
            )}
          </div>
          {!compact && item.functionalLocation && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {item.functionalLocation.code} — {item.functionalLocation.name}
            </p>
          )}
          {!compact && !item.functionalLocation && item.project && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {item.project.siteName || item.project.name}
            </p>
          )}
          {!compact && item.workerProfile && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <User className="w-3 h-3" />
              {item.workerProfile.name}
            </p>
          )}
          {item.issuedAt && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {isAr ? "أُصدر" : "Issued"}: {formatDate(item.issuedAt, isAr ? "ar-SA" : "en-SA")}
              {onSiteDays !== null && (
                <span className="text-primary font-medium">
                  · {onSiteDays}d {isAr ? "في الموقع" : "on site"}
                </span>
              )}
            </p>
          )}
          {item.expectedReturnAt && (
            <p className="text-[10px] text-muted-foreground">
              {isAr ? "إرجاع متوقع" : "Return due"}: {formatDate(item.expectedReturnAt, isAr ? "ar-SA" : "en-SA")}
            </p>
          )}
          {(item.lastInspectionAt || item.nextInspectionAt) && (
            <p className={cn("text-[10px] flex items-center gap-1", overdue ? "text-amber-600 font-medium" : "text-muted-foreground")}>
              {overdue && <AlertTriangle className="w-3 h-3" />}
              {isAr ? "فحص" : "Inspection"}:{" "}
              {item.lastInspectionAt
                ? formatDate(item.lastInspectionAt, isAr ? "ar-SA" : "en-SA")
                : "—"}
              {item.nextInspectionAt && (
                <> → {formatDate(item.nextInspectionAt, isAr ? "ar-SA" : "en-SA")}</>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ColumnDropZone({
  column,
  items,
  isAr,
  compact,
  limit,
  dragId,
  onDragStart,
  onDrop,
  onEdit,
  onDelete,
}: {
  column: EquipmentColumn;
  items: AgencyEquipmentItem[];
  isAr: boolean;
  compact?: boolean;
  limit?: number;
  dragId: string | null;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDrop: (column: EquipmentColumn, targetId?: string) => void;
  onEdit?: (item: AgencyEquipmentItem) => void;
  onDelete?: (id: string) => void;
}) {
  const meta = COLUMN_META[column];
  const [over, setOver] = useState(false);
  const shown = limit ? items.slice(0, limit) : items;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onDrop(column);
      }}
      className={cn(
        "rounded-xl border min-h-[140px] flex flex-col",
        meta.accent,
        over && "ring-2 ring-primary/40"
      )}
    >
      <div className="px-3 py-2 border-b border-border/40">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold">{isAr ? meta.ar : meta.en}</p>
          <span className="text-[10px] font-bold tabular-nums bg-background/80 px-1.5 py-0.5 rounded">
            {items.length}
          </span>
        </div>
        {!compact && (
          <p className="text-[10px] text-muted-foreground mt-0.5">{isAr ? meta.hintAr : meta.hintEn}</p>
        )}
      </div>
      <div className="p-2 space-y-2 flex-1">
        {shown.length === 0 ? (
          <p className="text-[10px] text-muted-foreground text-center py-6">
            {isAr ? "اسحب المعدات هنا" : "Drag equipment here"}
          </p>
        ) : (
          shown.map((item) => (
            <EquipmentCard
              key={item.id}
              item={item}
              isAr={isAr}
              compact={compact}
              dragging={dragId === item.id}
              onDragStart={onDragStart}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        )}
        {limit && items.length > limit && (
          <p className="text-[10px] text-center text-primary font-medium">+{items.length - limit} more</p>
        )}
      </div>
    </div>
  );
}

export function ManpowerEquipmentBoard({
  businessId,
  isAr,
  compact,
  showStats = true,
  showAddForm = true,
}: {
  businessId: string;
  isAr: boolean;
  compact?: boolean;
  showStats?: boolean;
  showAddForm?: boolean;
}) {
  const qc = useQueryClient();
  const [dragId, setDragId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AgencyEquipmentItem | null>(null);
  const [formInitial, setFormInitial] = useState<EquipmentFormValues>(emptyEquipmentForm());

  const { data, isLoading } = useQuery({
    queryKey: ["manpower-equipment", businessId],
    queryFn: async () => (await api.getEquipmentBoard(businessId)).data,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["manpower-projects", businessId],
    queryFn: async () => (await api.getManpowerProjects(businessId)).data ?? [],
    enabled: showAddForm && !compact,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["cmms-locations", businessId],
    queryFn: async () => (await api.getFunctionalLocations(businessId)).data ?? [],
    enabled: showAddForm && !compact,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: workers = [] } = useQuery({
    queryKey: ["manpower-workers", businessId],
    queryFn: async () => (await api.getManpowerWorkers(businessId)).data ?? [],
    enabled: showAddForm && !compact,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["manpower-equipment", businessId] });

  const moveMut = useMutation({
    mutationFn: ({ id, boardColumn }: { id: string; boardColumn: EquipmentColumn }) =>
      api.moveEquipment(businessId, id, { boardColumn }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const createMut = useMutation({
    mutationFn: (form: EquipmentFormValues) =>
      api.createEquipment(businessId, formToPayload(form)),
    onSuccess: () => {
      setFormOpen(false);
      setEditingItem(null);
      invalidate();
      toast.success(isAr ? "تمت إضافة المعدة" : "Equipment added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, form }: { id: string; form: EquipmentFormValues }) =>
      api.updateEquipment(businessId, id, formToPayload(form)),
    onSuccess: () => {
      setFormOpen(false);
      setEditingItem(null);
      invalidate();
      toast.success(isAr ? "تم حفظ التعديلات" : "Equipment updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.deleteEquipment(businessId, id),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const openAddForm = () => {
    setEditingItem(null);
    setFormInitial(emptyEquipmentForm("STOCK"));
    setFormOpen(true);
  };

  const openEditForm = (item: AgencyEquipmentItem) => {
    setEditingItem(item);
    setFormInitial(equipmentToForm(item));
    setFormOpen(true);
  };

  const handleSaveForm = (form: EquipmentFormValues) => {
    if (editingItem) {
      updateMut.mutate({ id: editingItem.id, form });
    } else {
      createMut.mutate(form);
    }
  };

  const handleDrop = useCallback(
    (column: EquipmentColumn) => {
      if (!dragId) return;
      const item = COLUMNS.flatMap((c) => data?.columns[c] ?? []).find((r) => r.id === dragId);
      if (!item || item.boardColumn === column) {
        setDragId(null);
        return;
      }
      moveMut.mutate({ id: dragId, boardColumn: column });
      setDragId(null);
    },
    [dragId, data, moveMut]
  );

  const summary = data?.summary;
  const columns = data?.columns;

  if (isLoading) {
    return (
      <ManpowerGlassCard title={isAr ? "المعدات والأدوات" : "Equipment & Tools"} icon={Wrench}>
        <p className="text-sm text-muted-foreground py-8 text-center">{isAr ? "جاري التحميل..." : "Loading..."}</p>
      </ManpowerGlassCard>
    );
  }

  return (
    <div className="space-y-4">
      {showStats && summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <ManpowerStatCard
            label={isAr ? "إجمالي المعدات" : "Total items"}
            value={summary.total}
            accent="from-slate-500/15 to-gray-500/5"
          />
          <ManpowerStatCard
            label={isAr ? "في المخزن" : "In stock"}
            value={summary.stock}
            accent="from-emerald-500/15 to-teal-500/5"
          />
          <ManpowerStatCard
            label={isAr ? "مسلّم" : "Issued"}
            value={summary.issued}
            accent="from-blue-500/15 to-cyan-500/5"
          />
          <ManpowerStatCard
            label={isAr ? "فحص" : "Inspection"}
            value={summary.inspection}
            accent="from-amber-500/15 to-orange-500/5"
          />
          <ManpowerStatCard
            label={isAr ? "فحص متأخر" : "Overdue inspect."}
            value={summary.inspectionOverdue}
            sub={summary.inspectionOverdue > 0 ? (isAr ? "يتطلب إجراء" : "Action needed") : undefined}
            accent="from-rose-500/15 to-red-500/5"
          />
        </div>
      )}

      <ManpowerGlassCard
        title={isAr ? "لوحة المعدات — اسحب وأفلت" : "Equipment board — drag & drop"}
        icon={Package}
        action={
          compact ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/${businessId}/equipment`}>
                {isAr ? "فتح كامل" : "Open full board"}
              </Link>
            </Button>
          ) : undefined
        }
      >
        {showAddForm && !compact && (
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-4 border-b border-border/40">
            <p className="text-xs text-muted-foreground">
              {isAr
                ? "أضف معدة بكل التفاصيل — موقع، مسؤول، تواريخ فحص وإرجاع"
                : "Add with full details — site, assignee, inspection & return dates"}
            </p>
            <Button size="sm" onClick={openAddForm}>
              <Plus className="w-4 h-4 mr-1" />
              {isAr ? "إضافة معدة" : "Add equipment"}
            </Button>
          </div>
        )}

        <div className={cn("grid gap-3", compact ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-4")}>
          {COLUMNS.map((col) => (
            <ColumnDropZone
              key={col}
              column={col}
              items={columns?.[col] ?? []}
              isAr={isAr}
              compact={compact}
              limit={compact ? 2 : undefined}
              dragId={dragId}
              onDragStart={(_, id) => setDragId(id)}
              onDrop={handleDrop}
              onEdit={compact ? undefined : openEditForm}
              onDelete={compact ? undefined : (id) => deleteMut.mutate(id)}
            />
          ))}
        </div>
      </ManpowerGlassCard>

      <EquipmentFormModal
        open={formOpen}
        isAr={isAr}
        editing={editingItem}
        initial={formInitial}
        businessId={businessId}
        projects={projects}
        locations={locations}
        workers={workers}
        saving={createMut.isPending || updateMut.isPending}
        onClose={() => {
          setFormOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveForm}
      />
    </div>
  );
}
