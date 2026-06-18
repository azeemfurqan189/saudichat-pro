"use client";

import { useEffect, useRef, useState } from "react";
import {
  Clock,
  Download,
  MoreVertical,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function ProjectWorkerMenu({
  isAr,
  onDailySheet,
  onMonthlySheet,
  onDownload,
  canTimesheet,
  canExport,
}: {
  isAr: boolean;
  onDailySheet: () => void;
  onMonthlySheet: () => void;
  onDownload: () => void;
  canTimesheet: boolean;
  canExport: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const items = [
    ...(canTimesheet
      ? [
          { label: isAr ? "سجل اليوم" : "Daily entry", icon: Clock, action: onDailySheet },
          { label: isAr ? "سجل الشهر" : "Monthly sheet", icon: Calendar, action: onMonthlySheet },
        ]
      : []),
    ...(canExport
      ? [{ label: isAr ? "تحميل Excel" : "Download Excel", icon: Download, action: onDownload }]
      : []),
  ];

  if (items.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground"
        aria-label="Options"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute end-0 top-full mt-1 z-40 min-w-[160px] rounded-lg border bg-popover shadow-lg py-1">
          {items.map(({ label, icon: Icon, action }) => (
            <button
              key={label}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                action();
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-start hover:bg-muted/60"
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function MonthlyTimesheetPanel({
  workerName,
  month,
  entries,
  isAr,
  onClose,
}: {
  workerName: string;
  month: string;
  entries: Array<{
    id: string;
    workDate?: string;
    date?: string;
    regularHours?: number;
    overtimeHours?: number;
    hoursWorked: number;
    status?: string;
  }>;
  isAr: boolean;
  onClose: () => void;
}) {
  const totalReg = entries.reduce((s, e) => s + (e.regularHours ?? e.hoursWorked ?? 0), 0);
  const totalOt = entries.reduce((s, e) => s + (e.overtimeHours ?? 0), 0);

  return (
    <div className="p-4 rounded-xl border-2 border-violet-300/50 bg-violet-50/30 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-violet-700 font-semibold">
            {isAr ? "سجل الشهر" : "Monthly Timesheet"}
          </p>
          <p className="font-semibold">{workerName}</p>
          <p className="text-xs text-muted-foreground">{month}</p>
        </div>
        <button type="button" onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
          {isAr ? "إغلاق" : "Close"}
        </button>
      </div>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          {isAr ? "لا سجلات هذا الشهر" : "No entries this month"}
        </p>
      ) : (
        <div className="max-h-48 overflow-y-auto rounded-lg border bg-white divide-y text-xs">
          {entries.map((e) => (
            <div key={e.id} className="flex justify-between px-3 py-2">
              <span>{(e.workDate || e.date || "").slice(0, 10)}</span>
              <span>
                {(e.regularHours ?? e.hoursWorked) ?? 0}h
                {(e.overtimeHours ?? 0) > 0 && (
                  <span className="text-orange-600 ml-1">+{e.overtimeHours} OT</span>
                )}
              </span>
              <span className={cn("text-[10px] px-1.5 rounded", "bg-muted")}>{e.status ?? "—"}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-4 text-sm font-semibold border-t pt-2">
        <span>{isAr ? "أساسي:" : "Regular:"} {totalReg}h</span>
        <span className="text-orange-600">OT: {totalOt}h</span>
        <span>{isAr ? "الإجمالي:" : "Total:"} {totalReg + totalOt}h</span>
      </div>
    </div>
  );
}
