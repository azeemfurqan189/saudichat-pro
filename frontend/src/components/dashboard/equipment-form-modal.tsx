"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AgencyEquipmentItem, EquipmentColumn, FunctionalLocation } from "@/lib/api";
import { FunctionalLocationSelect } from "@/components/dashboard/functional-location-select";
import { ReminderNotificationPanel } from "@/components/dashboard/reminder-notification-panel";
import { reminderItemKey } from "@/lib/reminder-notify-types";

const COLUMNS: EquipmentColumn[] = ["STOCK", "ISSUED", "INSPECTION", "MAINTENANCE"];

const COLUMN_LABELS: Record<EquipmentColumn, { en: string; ar: string }> = {
  STOCK: { en: "In Stock", ar: "في المخزن" },
  ISSUED: { en: "Issued On Site", ar: "مسلّم للموقع" },
  INSPECTION: { en: "Inspection", ar: "فحص" },
  MAINTENANCE: { en: "Maintenance", ar: "صيانة" },
};

const CONDITIONS = ["GOOD", "FAIR", "POOR"] as const;

export type EquipmentFormValues = {
  name: string;
  category: string;
  serialNumber: string;
  quantity: string;
  boardColumn: EquipmentColumn;
  functionalLocationId: string;
  projectId: string;
  workerProfileId: string;
  issuedAt: string;
  expectedReturnAt: string;
  lastInspectionAt: string;
  nextInspectionAt: string;
  condition: string;
  notes: string;
};

function toDatetimeLocal(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value: string) {
  if (!value.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function emptyEquipmentForm(defaultColumn: EquipmentColumn = "STOCK"): EquipmentFormValues {
  return {
    name: "",
    category: "",
    serialNumber: "",
    quantity: "1",
    boardColumn: defaultColumn,
    functionalLocationId: "",
    projectId: "",
    workerProfileId: "",
    issuedAt: "",
    expectedReturnAt: "",
    lastInspectionAt: "",
    nextInspectionAt: "",
    condition: "GOOD",
    notes: "",
  };
}

export function equipmentToForm(item: AgencyEquipmentItem): EquipmentFormValues {
  return {
    name: item.name,
    category: item.category ?? "",
    serialNumber: item.serialNumber ?? item.assetTag ?? "",
    quantity: String(item.quantity ?? 1),
    boardColumn: item.boardColumn,
    functionalLocationId: item.functionalLocationId ?? "",
    projectId: item.projectId ?? "",
    workerProfileId: item.workerProfileId ?? "",
    issuedAt: toDatetimeLocal(item.issuedAt),
    expectedReturnAt: toDatetimeLocal(item.expectedReturnAt),
    lastInspectionAt: toDatetimeLocal(item.lastInspectionAt),
    nextInspectionAt: toDatetimeLocal(item.nextInspectionAt),
    condition: item.condition || "GOOD",
    notes: item.notes ?? "",
  };
}

export function formToPayload(form: EquipmentFormValues) {
  const qty = parseInt(form.quantity, 10);
  return {
    name: form.name.trim(),
    category: form.category.trim() || undefined,
    serialNumber: form.serialNumber.trim() || undefined,
    quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
    boardColumn: form.boardColumn,
    functionalLocationId: form.functionalLocationId || null,
    projectId: form.projectId || null,
    workerProfileId: form.workerProfileId || null,
    issuedAt: fromDatetimeLocal(form.issuedAt),
    expectedReturnAt: fromDatetimeLocal(form.expectedReturnAt),
    lastInspectionAt: fromDatetimeLocal(form.lastInspectionAt),
    nextInspectionAt: fromDatetimeLocal(form.nextInspectionAt),
    condition: form.condition,
    notes: form.notes.trim() || null,
  };
}

function FieldSelect({
  label,
  value,
  onChange,
  children,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
      >
        {children}
      </select>
    </div>
  );
}

export function EquipmentFormModal({
  open,
  isAr,
  editing,
  initial,
  businessId,
  projects,
  locations,
  workers,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  isAr: boolean;
  editing: AgencyEquipmentItem | null;
  initial: EquipmentFormValues;
  businessId: string;
  projects: Array<{ id: string; name: string; siteName?: string | null }>;
  locations: FunctionalLocation[];
  workers: Array<{ id: string; name: string }>;
  saving?: boolean;
  onClose: () => void;
  onSave: (form: EquipmentFormValues) => void;
}) {
  const [form, setForm] = useState(initial);

  useEffect(() => {
    if (open) setForm(initial);
  }, [open, initial]);

  if (!open) return null;

  const set = (patch: Partial<EquipmentFormValues>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative z-10 w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-xl border bg-background shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-background/95 backdrop-blur px-4 py-3">
          <div>
            <h2 className="text-base font-semibold">
              {editing
                ? isAr
                  ? "تعديل المعدة"
                  : "Edit equipment"
                : isAr
                  ? "إضافة معدة / أداة"
                  : "Add equipment / tool"}
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {isAr
                ? "اسم، فئة، رقم الأصل، الموقع، المسؤول، التواريخ، والملاحظات"
                : "Name, category, asset tag, site, assignee, dates & notes"}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-md hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form
          className="p-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.name.trim()) return;
            onSave(form);
          }}
        >
          <div className="grid sm:grid-cols-2 gap-3">
            <Input
              label={isAr ? "اسم المعدة *" : "Equipment name *"}
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder={isAr ? "مثال: Welding machine — Lincoln 400A" : "e.g. Welding machine — Lincoln 400A"}
              required
              className="sm:col-span-2"
            />
            <Input
              label={isAr ? "الفئة" : "Category"}
              value={form.category}
              onChange={(e) => set({ category: e.target.value })}
              placeholder={isAr ? "مثال: Welding" : "e.g. Welding"}
            />
            <Input
              label={isAr ? "رقم الأصل / Tag" : "Asset tag / serial"}
              value={form.serialNumber}
              onChange={(e) => set({ serialNumber: e.target.value })}
              placeholder="WM-28491"
            />
            <Input
              label={isAr ? "الكمية" : "Quantity"}
              type="number"
              min={1}
              value={form.quantity}
              onChange={(e) => set({ quantity: e.target.value })}
            />
            <FieldSelect
              label={isAr ? "الحالة / العمود" : "Status / column"}
              value={form.boardColumn}
              onChange={(v) => set({ boardColumn: v as EquipmentColumn })}
            >
              {COLUMNS.map((c) => (
                <option key={c} value={c}>
                  {isAr ? COLUMN_LABELS[c].ar : COLUMN_LABELS[c].en}
                </option>
              ))}
            </FieldSelect>
            <FieldSelect
              label={isAr ? "الحالة الفنية" : "Condition"}
              value={form.condition}
              onChange={(v) => set({ condition: v })}
            >
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </FieldSelect>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 pt-1 border-t border-border/40">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {isAr ? "الموقع (مكتب / مستودع / موقع)" : "Location (office / warehouse / site)"}
              </label>
              <FunctionalLocationSelect
                businessId={businessId}
                locations={locations}
                value={form.functionalLocationId}
                boardColumn={form.boardColumn}
                isAr={isAr}
                onChange={(id, loc) => {
                  const patch: Partial<EquipmentFormValues> = { functionalLocationId: id };
                  if (loc?.type === "HEAD_OFFICE" || loc?.type === "WAREHOUSE") {
                    patch.projectId = "";
                  } else if (loc?.projectId) {
                    patch.projectId = loc.projectId;
                  }
                  set(patch);
                }}
              />
            </div>
            {(form.boardColumn === "ISSUED" || form.projectId) && (
              <FieldSelect
                label={isAr ? "مشروع الموقع (اختياري)" : "Site project (optional)"}
                value={form.projectId}
                onChange={(v) => set({ projectId: v })}
              >
                <option value="">{isAr ? "— بدون مشروع —" : "— No project —"}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.siteName || p.name}
                  </option>
                ))}
              </FieldSelect>
            )}
            <FieldSelect
              label={isAr ? "مسؤول / العامل" : "Assigned to"}
              value={form.workerProfileId}
              onChange={(v) => set({ workerProfileId: v })}
            >
              <option value="">{isAr ? "— بدون —" : "— None —"}</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </FieldSelect>
          </div>

          <ReminderNotificationPanel
            businessId={businessId}
            itemKey={editing ? reminderItemKey("equipment", editing.id) : null}
            isAr={isAr}
            compact
            subtitle={
              isAr
                ? "تنبيه قبل موعد الفحص أو الإرجاع"
                : "Alert before inspection or return due date"
            }
          />

          <div className="grid sm:grid-cols-2 gap-3 pt-1 border-t border-border/40">
            <Input
              label={isAr ? "تاريخ الإصدار" : "Issued date"}
              type="datetime-local"
              value={form.issuedAt}
              onChange={(e) => set({ issuedAt: e.target.value })}
            />
            <Input
              label={isAr ? "موعد الإرجاع" : "Return due"}
              type="datetime-local"
              value={form.expectedReturnAt}
              onChange={(e) => set({ expectedReturnAt: e.target.value })}
            />
            <Input
              label={isAr ? "آخر فحص" : "Last inspection"}
              type="datetime-local"
              value={form.lastInspectionAt}
              onChange={(e) => set({ lastInspectionAt: e.target.value })}
            />
            <Input
              label={isAr ? "الفحص القادم" : "Next inspection"}
              type="datetime-local"
              value={form.nextInspectionAt}
              onChange={(e) => set({ nextInspectionAt: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {isAr ? "ملاحظات" : "Notes"}
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => set({ notes: e.target.value })}
              rows={3}
              placeholder={
                isAr ? "مثال: Jubail Industrial Gate 4 — shutdown project" : "e.g. Jubail Industrial Gate 4 — shutdown project"
              }
              className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 min-h-[72px]"
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-2 sticky bottom-0 bg-background pb-1">
            <Button type="submit" disabled={!form.name.trim() || saving}>
              {saving
                ? isAr
                  ? "جاري الحفظ..."
                  : "Saving..."
                : editing
                  ? isAr
                    ? "حفظ التعديلات"
                    : "Save changes"
                  : isAr
                    ? "إضافة المعدة"
                    : "Add equipment"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
