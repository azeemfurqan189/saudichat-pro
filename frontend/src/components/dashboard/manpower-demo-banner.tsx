"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Database, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";

interface ManpowerDemoBannerProps {
  businessId: string;
  isAr: boolean;
  projectCount: number;
  autoLoad?: boolean;
}

export function ManpowerDemoBanner({
  businessId,
  isAr,
  projectCount,
  autoLoad = false,
}: ManpowerDemoBannerProps) {
  const qc = useQueryClient();
  const autoRan = useRef(false);

  const demoMutation = useMutation({
    mutationFn: () => api.loadManpowerDemo(businessId, projectCount >= 5),
    onSuccess: (res) => {
      const keys = [
        ["manpower-projects", businessId],
        ["manpower-clients", businessId],
        ["manpower-workers", businessId],
        ["manpower-analytics", businessId],
        ["manpower-timesheets", businessId],
        ["manpower-pending-timesheets", businessId],
        ["command-center", businessId],
        ["dashboard", businessId],
      ];
      keys.forEach((key) => qc.invalidateQueries({ queryKey: key }));
      toast.success(res.data?.message || (isAr ? "تم تحميل بيانات التجربة" : "Demo data loaded"));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  useEffect(() => {
    if (!autoLoad || projectCount > 0 || autoRan.current) return;
    autoRan.current = true;
    demoMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad, projectCount]);

  return (
    <Card className="border-dashed border-primary/40 bg-primary/5">
      <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">
            {isAr ? "بيانات تجربة — SABIC, Aramco, NEOM" : "Demo data — SABIC, Aramco, NEOM projects"}
          </p>
          <p className="text-xs text-muted-foreground">
            {isAr
              ? "5 مشاريع، عمال، سجلات ساعات، حضور اليوم، مهام، وعقود للاختبار"
              : "5 projects, workers, timesheets, today attendance, tasks & contracts for testing"}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => demoMutation.mutate()}
          disabled={demoMutation.isPending}
        >
          {demoMutation.isPending ? (
            <Loader2 className="w-4 h-4 me-1 animate-spin" />
          ) : (
            <Database className="w-4 h-4 me-1" />
          )}
          {isAr ? "تحميل Demo" : "Load Demo Data"}
        </Button>
      </CardContent>
    </Card>
  );
}
