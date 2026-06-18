"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Truck, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api, Delivery } from "@/lib/api";

const STATUSES = ["PENDING", "ASSIGNED", "IN_TRANSIT", "DELIVERED", "CANCELLED"];

export default function DeliveriesPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();
  const [form, setForm] = useState({ orderId: "", driverName: "", address: "" });

  const { data: deliveries = [], isLoading } = useQuery({
    queryKey: ["deliveries", businessId],
    queryFn: async () => (await api.getDeliveries(businessId)).data ?? [],
  });

  const createMutation = useMutation({
    mutationFn: (d: Partial<Delivery>) => api.createDelivery(businessId, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deliveries", businessId] });
      setForm({ orderId: "", driverName: "", address: "" });
      toast.success(isAr ? "تمت الإضافة" : "Delivery created");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.updateDelivery(businessId, id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deliveries", businessId] }),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t(locale, "dashboard", "deliveries")}</h1>
      <Card className="p-4 flex gap-3 flex-wrap">
        <Input
          placeholder={isAr ? "رقم الطلب" : "Order ID"}
          value={form.orderId}
          onChange={(e) => setForm({ ...form, orderId: e.target.value })}
        />
        <Input
          placeholder={isAr ? "اسم السائق" : "Driver name"}
          value={form.driverName}
          onChange={(e) => setForm({ ...form, driverName: e.target.value })}
        />
        <Input
          placeholder={isAr ? "العنوان" : "Address"}
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          className="flex-1 min-w-[200px]"
        />
        <Button
          onClick={() => form.address && createMutation.mutate({ ...form, status: "PENDING" })}
          loading={createMutation.isPending}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </Card>
      {isLoading ? (
        <p>{t(locale, "dashboard", "loading")}</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {deliveries.map((d) => (
            <Card key={d.id} className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Truck className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">{d.driverName || (isAr ? "بدون سائق" : "No driver")}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.address} {d.orderId ? `· #${d.orderId.slice(0, 8)}` : ""}
                  </p>
                </div>
              </div>
              <select
                className="text-xs border rounded-lg px-2 py-1"
                value={d.status}
                onChange={(e) => updateMutation.mutate({ id: d.id, status: e.target.value })}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Card>
          ))}
        </div>
      )}
      {!isLoading && deliveries.length === 0 && (
        <p className="text-muted-foreground">{t(locale, "dashboard", "noData")}</p>
      )}
    </div>
  );
}
