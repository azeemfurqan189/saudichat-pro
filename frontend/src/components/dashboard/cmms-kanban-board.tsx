"use client";

import { useCallback, useState, ReactNode } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export type KanbanColumn<T extends string> = {
  id: T;
  label: string;
  labelAr?: string;
  accent?: string;
};

type CmmsKanbanBoardProps<T extends string, Item extends { id: string }> = {
  columns: KanbanColumn<T>[];
  items: Item[];
  getColumn: (item: Item) => T;
  onMove: (itemId: string, toColumn: T) => void;
  renderCard: (item: Item, dragging: boolean) => ReactNode;
  isAr?: boolean;
  emptyLabel?: string;
};

export function CmmsKanbanBoard<T extends string, Item extends { id: string }>({
  columns,
  items,
  getColumn,
  onMove,
  renderCard,
  isAr,
  emptyLabel,
}: CmmsKanbanBoardProps<T, Item>) {
  const [dragId, setDragId] = useState<string | null>(null);

  const handleDrop = useCallback(
    (column: T) => {
      if (!dragId) return;
      const item = items.find((i) => i.id === dragId);
      if (!item || getColumn(item) === column) {
        setDragId(null);
        return;
      }
      onMove(dragId, column);
      setDragId(null);
    },
    [dragId, items, getColumn, onMove]
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 overflow-x-auto pb-2">
      {columns.map((col) => {
        const colItems = items.filter((i) => getColumn(i) === col.id);
        return (
          <div
            key={col.id}
            className={cn(
              "rounded-[10px] border min-h-[200px] flex flex-col",
              col.accent ?? "border-[#E8E8E8] bg-[#FAFAF8]"
            )}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(col.id)}
          >
            <div className="px-3 py-2 border-b border-inherit flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#5c5c5c]">
                {isAr && col.labelAr ? col.labelAr : col.label}
              </p>
              <span className="text-[10px] tabular-nums text-muted-foreground">{colItems.length}</span>
            </div>
            <div className="p-2 space-y-2 flex-1">
              {colItems.length === 0 ? (
                <p className="text-[10px] text-center text-muted-foreground py-6">
                  {emptyLabel ?? (isAr ? "اسحب هنا" : "Drop here")}
                </p>
              ) : (
                colItems.map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => setDragId(item.id)}
                    onDragEnd={() => setDragId(null)}
                    className="cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex gap-1">
                      <GripVertical className="w-3 h-3 text-muted-foreground shrink-0 mt-2 opacity-50" />
                      <div className="flex-1 min-w-0">{renderCard(item, dragId === item.id)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
