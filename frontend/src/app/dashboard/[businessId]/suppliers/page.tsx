"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api, Supplier } from "@/lib/api";

export default function SuppliersPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", phone: "", category: "" });

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["suppliers", businessId],
    queryFn: async () => (await api.getSuppliers(businessId)).data ?? [],
  });

  const createMutation = useMutation({
    mutationFn: (d: Partial<Supplier>) => api.createSupplier(businessId, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers", businessId] });
      setForm({ name: "", phone: "", category: "" });
      toast.success(isAr ? "تمت الإضافة" : "Supplier added");
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t(locale, "dashboard", "suppliers")}</h1>
      <Card className="p-4 flex gap-3 flex-wrap">
        <Input
          placeholder={isAr ? "اسم المورد" : "Supplier name"}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Input
          placeholder={isAr ? "الهاتف" : "Phone"}
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          dir="ltr"
        />
        <Input
          placeholder={isAr ? "الفئة" : "Category"}
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        />
        <Button
          onClick={() => form.name && createMutation.mutate({ ...form, isActive: true })}
          loading={createMutation.isPending}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </Card>
      {isLoading ? (
        <p>{t(locale, "dashboard", "loading")}</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {suppliers.map((s) => (
            <Card key={s.id} className="p-4 flex items-center gap-3">
              <Building2 className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">
                  {s.phone} {s.category ? `· ${s.category}` : ""}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
      {!isLoading && suppliers.length === 0 && (
        <p className="text-muted-foreground">{t(locale, "dashboard", "noData")}</p>
      )}
    </div>
  );
}
