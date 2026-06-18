"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Package } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api, CatalogItem } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function InventoryPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["inventory", businessId],
    queryFn: async () => (await api.getInventory(businessId)).data,
  });

  const allItemsQuery = useQuery({
    queryKey: ["catalog", businessId],
    queryFn: async () => {
      const res = await api.getCatalog(businessId);
      return res.data?.[0]?.items ?? [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ itemId, stockQty, lowStockThreshold }: { itemId: string; stockQty: number; lowStockThreshold?: number }) =>
      api.updateInventory(businessId, itemId, { stockQty, lowStockThreshold }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory", businessId] });
      qc.invalidateQueries({ queryKey: ["catalog", businessId] });
      toast.success(isAr ? "تم التحديث" : "Stock updated");
    },
  });

  const items = allItemsQuery.data ?? [];
  const lowStock = data?.lowStock ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t(locale, "dashboard", "inventory")}</h1>
        <p className="text-sm text-muted-foreground">
          {data?.totalTracked ?? 0} {isAr ? "منتج متتبع" : "tracked items"}
          {lowStock.length > 0 && ` · ${lowStock.length} ${isAr ? "مخزون منخفض" : "low stock"}`}
        </p>
      </div>

      {lowStock.length > 0 && (
        <Card className="border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
              <AlertTriangle className="w-4 h-4" />
              {isAr ? "تنبيه مخزون منخفض" : "Low Stock Alert"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {lowStock.map((item) => (
              <span key={item.id} className="text-sm bg-white dark:bg-gray-800 px-3 py-1 rounded-lg">
                {isAr ? item.nameAr : item.nameEn} — {item.stockQty} left
              </span>
            ))}
          </CardContent>
        </Card>
      )}

      {isLoading || allItemsQuery.isLoading ? (
        <p className="text-muted-foreground">{t(locale, "dashboard", "loading")}</p>
      ) : (
        <div className="space-y-3">
          {items.map((item: CatalogItem) => (
            <Card key={item.id} className="p-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-[140px]">
                  <p className="font-medium text-sm">{isAr ? item.nameAr : item.nameEn}</p>
                  <p className="text-xs text-muted-foreground">{item.category || "—"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    className="w-20"
                    placeholder="Qty"
                    defaultValue={item.stockQty ?? ""}
                    id={`stock-${item.id}`}
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      const el = document.getElementById(`stock-${item.id}`) as HTMLInputElement;
                      const qty = parseInt(el?.value || "0", 10);
                      updateMutation.mutate({ itemId: item.id, stockQty: qty });
                    }}
                  >
                    {isAr ? "حفظ" : "Save"}
                  </Button>
                </div>
                <span className={cn("text-xs px-2 py-1 rounded-full", item.stockQty != null && item.stockQty <= (item.lowStockThreshold ?? 5) ? "bg-red-100 text-red-700" : "bg-muted")}>
                  {item.stockQty != null ? `${item.stockQty} in stock` : isAr ? "غير متتبع" : "Not tracked"}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
