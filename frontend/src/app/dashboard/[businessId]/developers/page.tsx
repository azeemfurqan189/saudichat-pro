"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Key, Plus, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api } from "@/lib/api";
import { getApiUrl } from "@/lib/api-config";

export default function DevelopersPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ["api-keys", businessId],
    queryFn: async () => (await api.getApiKeys(businessId)).data ?? [],
  });

  const createMutation = useMutation({
    mutationFn: (n: string) => api.createApiKey(businessId, n),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["api-keys", businessId] });
      setName("");
      if (res.data?.key) setNewKey(res.data.key);
      toast.success(isAr ? "تم إنشاء المفتاح" : "API key created");
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => api.revokeApiKey(businessId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api-keys", businessId] }),
  });

  const apiBase = getApiUrl();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t(locale, "dashboard", "developers")}</h1>
      <p className="text-sm text-muted-foreground">
        {isAr ? "مفاتيح API للتكامل مع أنظمتك" : "API keys for integrating with your systems"}
      </p>

      {newKey && (
        <Card className="p-4 border-primary bg-primary/5">
          <p className="text-sm font-medium mb-2">{isAr ? "انسخ المفتاح الآن — لن يظهر مرة أخرى" : "Copy this key now — it won't show again"}</p>
          <div className="flex gap-2">
            <code className="flex-1 text-xs bg-muted p-2 rounded break-all">{newKey}</code>
            <Button size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(newKey); toast.success(isAr ? "تم النسخ" : "Copied"); }}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-4 flex gap-3">
        <Input placeholder={isAr ? "اسم المفتاح" : "Key name"} value={name} onChange={(e) => setName(e.target.value)} />
        <Button onClick={() => name && createMutation.mutate(name)} loading={createMutation.isPending}>
          <Plus className="w-4 h-4" />
        </Button>
      </Card>

      <Card className="p-4">
        <p className="text-xs text-muted-foreground mb-2">Base URL: <code>{apiBase}</code></p>
        <p className="text-xs text-muted-foreground">Header: <code>Authorization: Bearer YOUR_API_KEY</code></p>
      </Card>

      {isLoading ? (
        <p>{t(locale, "dashboard", "loading")}</p>
      ) : (
        <div className="space-y-2">
          {keys.map((k) => (
            <Card key={k.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">{k.name}</p>
                  <p className="text-xs text-muted-foreground">{k.keyPrefix}•••• · {k.isActive ? "Active" : "Revoked"}</p>
                </div>
              </div>
              {k.isActive && (
                <Button variant="ghost" size="icon" onClick={() => revokeMutation.mutate(k.id)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
      {!isLoading && keys.length === 0 && (
        <p className="text-muted-foreground">{t(locale, "dashboard", "noData")}</p>
      )}
    </div>
  );
}
