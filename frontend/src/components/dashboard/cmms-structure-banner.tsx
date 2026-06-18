"use client";

import { CMMS_FLOW, CMMS_LAYERS, CmmsLevel } from "@/lib/cmms-config";
import { cn } from "@/lib/utils";
import { ArrowDown, Crown, Building2, HardHat } from "lucide-react";

export function CmmsStructureBanner({ isAr, level }: { isAr: boolean; level?: CmmsLevel }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card/90 p-4 space-y-4">
      <div className="grid md:grid-cols-3 gap-3">
        {(
          [
            { key: "OWNER" as const, icon: Crown, color: "border-violet-500/30 bg-violet-500/5" },
            { key: "OFFICE" as const, icon: Building2, color: "border-blue-500/30 bg-blue-500/5" },
            { key: "SITE" as const, icon: HardHat, color: "border-emerald-500/30 bg-emerald-500/5" },
          ] as const
        ).map(({ key, icon: Icon, color }) => (
          <div
            key={key}
            className={cn(
              "rounded-xl border p-3 transition",
              color,
              level === key && "ring-2 ring-primary ring-offset-2 ring-offset-background"
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-4 h-4 text-primary" />
              <p className="text-xs font-bold uppercase tracking-wide">{key}</p>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {isAr ? CMMS_LAYERS[key].ar : CMMS_LAYERS[key].en}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1 py-2">
        {CMMS_FLOW.map((step, i) => (
          <div key={step.key} className="flex items-center gap-1">
            <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-muted border">
              {isAr ? step.ar : step.en}
            </span>
            {i < CMMS_FLOW.length - 1 && <ArrowDown className="w-3 h-3 text-muted-foreground rotate-[-90deg] hidden sm:block" />}
          </div>
        ))}
      </div>
    </div>
  );
}
