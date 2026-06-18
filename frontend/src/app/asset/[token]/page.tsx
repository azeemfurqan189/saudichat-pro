"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Wrench, History, Gauge } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function PublicAssetScanPage() {
  const { token } = useParams() as { token: string };

  const { data: asset, isLoading, error } = useQuery({
    queryKey: ["public-asset", token],
    queryFn: async () => (await api.getPublicAssetScan(token)).data,
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1D9E75]" />
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-muted-foreground">Invalid or expired asset QR code.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] p-4 max-w-lg mx-auto space-y-4">
      <div className="rounded-xl border bg-white p-5 space-y-2">
        <p className="text-xs text-muted-foreground uppercase">Asset Scan</p>
        <h1 className="text-xl font-bold">{asset.name}</h1>
        {asset.assetTag && <p className="font-mono text-sm text-[#1D9E75]">{asset.assetTag}</p>}
        <div className="flex gap-3 text-xs">
          <span>Condition: {asset.condition ?? "—"}</span>
          <span>Criticality: {asset.criticality ?? "—"}</span>
        </div>
        {asset.runningHours != null && (
          <p className="text-xs flex items-center gap-1"><Gauge className="w-3 h-3" /> {asset.runningHours} running hours</p>
        )}
      </div>

      {asset.reliability && (
        <div className="rounded-xl border bg-white p-4 text-sm">
          <p className="font-semibold mb-2">Reliability KPIs</p>
          <p>MTBF: {asset.reliability.mtbfHours ?? "—"} hours</p>
          <p>MTTR: {asset.reliability.mttrHours ?? "—"} hours</p>
          <p>Health score: {asset.reliability.healthScore}/100</p>
        </div>
      )}

      <div className="rounded-xl border bg-white p-4">
        <p className="font-semibold text-sm flex items-center gap-2 mb-3"><Wrench className="w-4 h-4" /> Work Orders</p>
        {(asset.workOrders as Array<{ number: string; title: string; status: string; completedAt?: string }>).length === 0 ? (
          <p className="text-xs text-muted-foreground">No work order history</p>
        ) : (
          (asset.workOrders as Array<{ number: string; title: string; status: string; completedAt?: string }>).map((wo, i) => (
            <div key={i} className="text-xs py-2 border-b last:border-0">
              <span className="font-mono">{wo.number}</span> · {wo.title} · <span className="text-muted-foreground">{wo.status}</span>
            </div>
          ))
        )}
      </div>

      <div className="rounded-xl border bg-white p-4">
        <p className="font-semibold text-sm flex items-center gap-2 mb-3"><History className="w-4 h-4" /> PM History</p>
        {(asset.pmHistory as Array<{ title: string; generatedAt: string; status: string }>).length === 0 ? (
          <p className="text-xs text-muted-foreground">No PM history</p>
        ) : (
          (asset.pmHistory as Array<{ title: string; generatedAt: string; status: string }>).map((pm, i) => (
            <div key={i} className="text-xs py-2 border-b last:border-0">
              {pm.title} · {formatDate(pm.generatedAt)} · {pm.status}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
