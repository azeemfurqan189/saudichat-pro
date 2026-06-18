"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Database, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

const CMMS_QUERY_KEYS = (businessId: string) => [
  ["location-tree", businessId],
  ["cmms-locations", businessId],
  ["asset-tree", businessId],
  ["cmms-assets", businessId],
  ["spare-parts", businessId],
  ["inventory-transactions", businessId],
  ["inventory-summary", businessId],
  ["work-requests", businessId],
  ["work-orders", businessId],
  ["planner", businessId],
  ["cmms-finance", businessId],
  ["cmms-ai-engine", businessId],
  ["notification-center", businessId],
  ["cmms-security", businessId],
  ["cmms-dashboard", businessId],
  ["maintenance-plans", businessId],
  ["pm-history", businessId],
  ["procurement", businessId],
  ["sidebar-wr", businessId],
];

interface CmmsDemoBannerProps {
  businessId: string;
  isAr: boolean;
  hasData: boolean;
  autoLoad?: boolean;
  compact?: boolean;
}

export function CmmsDemoBanner({
  businessId,
  isAr,
  hasData,
  autoLoad = true,
  compact = false,
}: CmmsDemoBannerProps) {
  const qc = useQueryClient();
  const autoRan = useRef(false);

  const demoMutation = useMutation({
    mutationFn: () => api.seedCmmsDemo(businessId),
    onSuccess: () => {
      CMMS_QUERY_KEYS(businessId).forEach((key) => qc.invalidateQueries({ queryKey: key }));
      toast.success(isAr ? "تم تحميل بيانات CMMS التجريبية" : "CMMS demo data loaded");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  useEffect(() => {
    if (!autoLoad || hasData || autoRan.current) return;
    autoRan.current = true;
    demoMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad, hasData]);

  if (hasData && compact) return null;

  if (hasData) return null;

  return (
    <div className="rounded-[10px] border border-dashed border-[#1D9E75]/40 bg-[#EAF3DE]/40 p-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-[#1a1a1a]">
          {isAr ? "بيانات CMMS تجريبية" : "CMMS demo data"}
        </p>
        {!compact && (
          <p className="text-[11px] text-[#5c5c5c] mt-0.5">
            {isAr
              ? "مواقع، أصول، طلبات صيانة، أوامر عمل، قطع غيار، وخطط PM"
              : "Locations, assets, work requests, work orders, spares & PM plans"}
          </p>
        )}
      </div>
      <Button
        size="sm"
        variant="outline"
        className="border-[#1D9E75]/50 bg-white"
        onClick={() => demoMutation.mutate()}
        disabled={demoMutation.isPending}
      >
        {demoMutation.isPending ? (
          <Loader2 className="w-4 h-4 me-1 animate-spin" />
        ) : (
          <Database className="w-4 h-4 me-1" />
        )}
        {isAr ? "تحميل Demo" : "Load Demo"}
      </Button>
    </div>
  );
}
