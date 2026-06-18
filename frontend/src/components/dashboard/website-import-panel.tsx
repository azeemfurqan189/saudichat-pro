"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe, RefreshCw, ScanLine, Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, WebsitePreviewResult } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

interface WebsiteImportPanelProps {
  businessId: string;
  locale: "en" | "ar";
  compact?: boolean;
}

export function WebsiteImportPanel({ businessId, locale, compact }: WebsiteImportPanelProps) {
  const isAr = locale === "ar";
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<WebsitePreviewResult | null>(null);
  const [applyProfile, setApplyProfile] = useState(true);

  const { data: status } = useQuery({
    queryKey: ["website-import", businessId],
    queryFn: async () => (await api.getWebsiteImportStatus(businessId)).data,
  });

  useEffect(() => {
    if (status?.websiteUrl && !url) setUrl(status.websiteUrl);
  }, [status?.websiteUrl, url]);

  const previewMutation = useMutation({
    mutationFn: () => api.previewWebsiteImport(businessId, url),
    onSuccess: (res) => {
      const data = res.data!;
      setPreview(data);
      toast.success(
        isAr
          ? `تم العثور على ${data.items.length} عنصر في ${data.categories.length} فئة`
          : `Found ${data.items.length} items in ${data.categories.length} categories`
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const importMutation = useMutation({
    mutationFn: () =>
      api.importWebsite(businessId, {
        url,
        applyProfile,
        applyCatalog: true,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["catalog", businessId] });
      queryClient.invalidateQueries({ queryKey: ["business", businessId] });
      queryClient.invalidateQueries({ queryKey: ["website-import", businessId] });
      const d = res.data!;
      toast.success(
        isAr
          ? `تمت الإضافة: ${d.totalItems} عنصر، ${d.categories} فئة (${d.itemsCreated} جديد، ${d.itemsUpdated} محدّث). المزامنة التلقائية كل 24 ساعة.`
          : `Catalog updated: ${d.totalItems} items, ${d.categories} categories (${d.itemsCreated} new, ${d.itemsUpdated} updated). Auto-sync every 24h.`
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const syncMutation = useMutation({
    mutationFn: () => api.syncWebsite(businessId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["catalog", businessId] });
      queryClient.invalidateQueries({ queryKey: ["website-import", businessId] });
      const d = res.data!;
      toast.success(
        isAr
          ? `تمت المزامنة: ${d.totalItems} عنصر، ${d.categories} فئة`
          : `Synced: ${d.totalItems} items, ${d.categories} categories`
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const displayUrl = url || status?.websiteUrl || "";
  const grouped = preview
    ? preview.categories.map((cat) => ({
        cat,
        items: preview.items.filter((i) => (i.category || "Menu") === cat),
      }))
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5" />
          {isAr ? "موقعك = القائمة التلقائية" : "Your Website = Auto Catalog"}
        </CardTitle>
        {!compact && (
          <p className="text-sm text-muted-foreground">
            {isAr
              ? "أدخل رابط موقعك الرسمي. النظام يمسح كل الصفحات والفئات ويضيف القائمة كاملة إلى الكatalog. كل 24 ساعة يحدّث الأسعار والعروض تلقائياً — لا حاجة لإضافة المنتجات يدوياً."
              : "Enter your official website URL. We scan all menu pages and categories and add everything to Catalog. Every 24 hours prices and discounts update automatically — no manual product entry needed."}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          label={isAr ? "رابط الموقع الرسمي" : "Official Website URL"}
          value={displayUrl}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://yourrestaurant.com"
        />

        {status?.websiteImportEnabled && status.websiteLastSyncAt && (
          <p className="text-xs text-muted-foreground">
            {isAr ? "✓ المزامنة التلقائية مفعّلة — آخر مسح:" : "✓ Auto-sync ON — last scan:"}{" "}
            {new Date(String(status.websiteLastSyncAt)).toLocaleString(isAr ? "ar-SA" : "en")}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => importMutation.mutate()}
            loading={importMutation.isPending}
            disabled={!displayUrl.trim()}
          >
            <ScanLine className="w-4 h-4" />
            {isAr ? "مسح الموقع وإضافة للقائمة" : "Scan Site & Fill Catalog"}
          </Button>
          <Button
            variant="outline"
            onClick={() => previewMutation.mutate()}
            loading={previewMutation.isPending}
            disabled={!displayUrl.trim()}
          >
            <Eye className="w-4 h-4" />
            {isAr ? "معاينة فقط" : "Preview Only"}
          </Button>
          {status?.websiteImportEnabled && (
            <Button
              variant="outline"
              onClick={() => syncMutation.mutate()}
              loading={syncMutation.isPending}
            >
              <RefreshCw className="w-4 h-4" />
              {isAr ? "مزامنة الآن" : "Sync Now"}
            </Button>
          )}
        </div>

        {!compact && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={applyProfile}
              onChange={(e) => setApplyProfile(e.target.checked)}
              className="rounded accent-primary"
            />
            {isAr ? "تحديث ملف المنشأة أيضاً (عنوان، ساعات، نبذة)" : "Also update business profile (address, hours, about)"}
          </label>
        )}

        {preview && preview.items.length > 0 && (
          <div className="border rounded-xl overflow-hidden">
            <div className="px-4 py-2 bg-muted/50 text-sm font-medium">
              {isAr ? "معاينة" : "Preview"} — {preview.items.length}{" "}
              {isAr ? "عنصر" : "items"}, {preview.categories.length}{" "}
              {isAr ? "فئة" : "categories"},{" "}
              {preview.items.filter((i) => i.image).length} {isAr ? "بصورة" : "with photos"}
              {preview.pagesScanned ? ` · ${preview.pagesScanned} pages` : ""} ({preview.source})
            </div>
            <div className="max-h-72 overflow-y-auto divide-y">
              {(grouped.length ? grouped : [{ cat: "Menu", items: preview.items }]).map(({ cat, items }) => (
                <div key={cat}>
                  <div className="px-4 py-1.5 bg-muted/30 text-xs font-semibold uppercase tracking-wide">{cat}</div>
                  {items.slice(0, 30).map((item, i) => (
                    <div key={`${cat}-${item.nameEn}-${i}`} className="px-4 py-2 text-sm flex items-center gap-3">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover shrink-0 bg-muted"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-muted shrink-0" />
                      )}
                      <span className="flex-1 min-w-0 truncate">{item.nameEn}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {item.discountPrice ? (
                          <>
                            <s>{formatCurrency(item.price)}</s> {formatCurrency(item.discountPrice)}
                          </>
                        ) : (
                          formatCurrency(item.price)
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
