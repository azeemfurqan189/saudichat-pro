"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getProfileFields,
  getProfileTabLabel,
  getIndustryLabel,
  normalizeBusinessType,
  BusinessType,
} from "@/lib/industry-config";

interface IndustryProfileFormProps {
  businessType: string;
  settings: Record<string, unknown>;
  locale: "en" | "ar";
  onChange: (key: string, value: string) => void;
  onSave: () => void;
  saving?: boolean;
}

export function IndustryProfileForm({
  businessType,
  settings,
  locale,
  onChange,
  onSave,
  saving,
}: IndustryProfileFormProps) {
  const isAr = locale === "ar";
  const type = normalizeBusinessType(businessType) as BusinessType;
  const fields = getProfileFields(type);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{getProfileTabLabel(type, locale)}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {isAr
            ? `هذه المعلومات يقرأها بوت ${getIndustryLabel(type, "ar")} عند الرد على العملاء (التوصيل، المواعيد، العنوان...)`
            : `Your ${getIndustryLabel(type, "en")} bot reads this when answering customers (delivery, booking, address...)`}
        </p>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
          className="space-y-4 max-w-xl"
        >
          {fields.map((field) => {
            const value = String(settings[field.key] ?? "");
            if (field.type === "textarea") {
              return (
                <div key={field.key} className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">
                    {isAr ? field.labelAr : field.labelEn}
                  </label>
                  <textarea
                    value={value}
                    onChange={(e) => onChange(field.key, e.target.value)}
                    rows={field.rows ?? 3}
                    placeholder={isAr ? field.placeholderAr : field.placeholderEn}
                    className="w-full rounded-xl border border-border bg-white/50 dark:bg-gray-900/50 p-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  />
                </div>
              );
            }
            return (
              <Input
                key={field.key}
                label={isAr ? field.labelAr : field.labelEn}
                type={field.type === "number" ? "number" : "text"}
                value={value}
                onChange={(e) => onChange(field.key, e.target.value)}
                placeholder={isAr ? field.placeholderAr : field.placeholderEn}
              />
            );
          })}
          <Button type="submit" loading={saving}>
            {isAr ? "حفظ ملف المنشأة" : "Save Profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
