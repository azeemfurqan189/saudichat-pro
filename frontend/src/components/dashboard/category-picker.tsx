"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Search, ChevronDown, X, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  OIL_GAS_CATEGORY_GROUPS,
  mergeCategories,
  searchCategories,
  categoryColor,
} from "@/lib/manpower-categories";

function CategoryModal({
  open,
  onClose,
  value,
  onChange,
  customCategories,
  isAr,
}: {
  open: boolean;
  onClose: () => void;
  value: string;
  onChange: (v: string) => void;
  customCategories: string[];
  isAr: boolean;
}) {
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (open) {
      setDraft(value);
      setSearch("");
    }
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const groups = useMemo(
    () => (search ? searchCategories(search, customCategories) : OIL_GAS_CATEGORY_GROUPS),
    [search, customCategories]
  );

  const totalCount = mergeCategories(customCategories).length;

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button type="button" className="absolute inset-0 bg-black/60" aria-label="Close" onClick={onClose} />
      <div className="relative z-[201] w-full sm:max-w-lg max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between gap-3 p-4 border-b border-border shrink-0">
          <div>
            <p className="font-semibold">{isAr ? "اختر التصنيف" : "Select Trade Category"}</p>
            <p className="text-xs text-muted-foreground">{totalCount}+ {isAr ? "تصنيف Oil & Gas" : "oil & gas trades"}</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-3 border-b border-border shrink-0">
          <div className="relative">
            <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="ps-9"
              placeholder={isAr ? "بحث Welder, HSC, Rigger..." : "Search Welder, HSC, Rigger..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4 min-h-0">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                {isAr ? group.labelAr : group.label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {group.items.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setDraft(item)}
                    className={cn(
                      "text-xs px-2.5 py-1.5 rounded-lg border transition-colors",
                      draft === item
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-muted/50 hover:bg-muted"
                    )}
                  >
                    {draft === item && <Check className="w-3 h-3 inline me-0.5" />}
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-border shrink-0 space-y-2 bg-muted/20">
          <Input
            placeholder={isAr ? "أو اكتب تصنيفاً جديداً" : "Or type custom category name"}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              className="flex-1"
              onClick={() => {
                if (draft.trim()) onChange(draft.trim());
                onClose();
              }}
            >
              {isAr ? "تأكيد" : "Confirm"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function CategoryPicker({
  value,
  onChange,
  customCategories = [],
  isAr,
  placeholder,
  compact = false,
}: {
  value: string;
  onChange: (v: string) => void;
  customCategories?: string[];
  isAr: boolean;
  placeholder?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className={cn("flex flex-wrap items-center gap-2", !compact && "w-full")}>
        {value ? (
          <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", categoryColor(value))}>{value}</span>
        ) : (
          <span className="text-xs text-muted-foreground">{isAr ? "لم يُحدد تصنيف" : "No trade selected"}</span>
        )}
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          {value ? (isAr ? "تغيير" : "Change") : (isAr ? "اختر التصنيف" : "Choose Trade")}
          <ChevronDown className="w-3.5 h-3.5 ms-1 opacity-60" />
        </Button>
      </div>
      {!compact && !value && placeholder && (
        <p className="text-[10px] text-muted-foreground mt-1">{placeholder}</p>
      )}
      <CategoryModal
        open={open}
        onClose={() => setOpen(false)}
        value={value}
        onChange={onChange}
        customCategories={customCategories}
        isAr={isAr}
      />
    </>
  );
}

/** Sticky category navigation for project worker section */
export function ProjectCategoryNav({
  categories,
  totalWorkers,
  selected,
  onSelect,
  isAr,
}: {
  categories: Array<{ category: string; count: number }>;
  totalWorkers: number;
  selected: string | null;
  onSelect: (c: string | null) => void;
  isAr: boolean;
}) {
  return (
    <div className="sticky top-0 z-30 py-1.5">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 px-0.5">
        {isAr ? "تصفح حسب التصنيف" : "Browse by Trade"}
      </p>
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={cn(
            "shrink-0 text-[11px] px-2.5 py-1 rounded-full font-medium border transition-colors",
            !selected ? "bg-primary text-primary-foreground border-primary" : "bg-muted/60 border-transparent hover:bg-muted"
          )}
        >
          {isAr ? "الكل" : "All"} ({totalWorkers})
        </button>
        {categories.map(({ category, count }) => (
          <button
            key={category}
            type="button"
            onClick={() => onSelect(selected === category ? null : category)}
            className={cn(
              "shrink-0 text-[11px] px-2.5 py-1 rounded-full font-medium border transition-colors whitespace-nowrap",
              selected === category ? "bg-primary text-primary-foreground border-primary" : categoryColor(category)
            )}
          >
            {category} · {count}
          </button>
        ))}
        {categories.length === 0 && (
          <span className="text-[11px] text-muted-foreground py-1 px-0.5">
            {isAr ? "أضف عمالاً لعرض التصنيفات" : "Add workers to see trades"}
          </span>
        )}
      </div>
    </div>
  );
}

export function CategoryFilterBar({
  categories,
  selected,
  onSelect,
  isAr,
}: {
  categories: string[];
  selected: string | null;
  onSelect: (c: string | null) => void;
  isAr: boolean;
}) {
  const [search, setSearch] = useState("");
  const filtered = categories.filter((c) => c.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-2">
      <div className="relative max-w-xs">
        <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="ps-9 h-9"
          placeholder={isAr ? "بحث تصنيف..." : "Search category..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={cn(
            "text-xs px-2.5 py-1 rounded-full border font-medium transition-colors",
            !selected ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 border-transparent hover:bg-muted"
          )}
        >
          {isAr ? "الكل" : "All"}
        </button>
        {filtered.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onSelect(selected === c ? null : c)}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full border font-medium transition-colors",
              selected === c ? "bg-primary text-primary-foreground border-primary" : categoryColor(c)
            )}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
