"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { FunctionalLocation } from "@/lib/api";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  groupFunctionalLocations,
  locationOptionLabel,
  filterGroupsForColumn,
  CUSTOM_LOCATION_VALUE,
} from "@/lib/functional-location-options";

export function FunctionalLocationSelect({
  businessId,
  locations,
  value,
  onChange,
  isAr,
  boardColumn,
  className,
  allowEmpty = true,
  emptyLabel,
  allowCustom = true,
}: {
  businessId: string;
  locations: FunctionalLocation[];
  value: string;
  onChange: (locationId: string, location?: FunctionalLocation) => void;
  isAr: boolean;
  boardColumn?: string;
  className?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  allowCustom?: boolean;
}) {
  const qc = useQueryClient();
  const [showCustom, setShowCustom] = useState(false);
  const [customCode, setCustomCode] = useState("");
  const [customName, setCustomName] = useState("");
  const [customType, setCustomType] = useState("SITE");

  const groups = filterGroupsForColumn(groupFunctionalLocations(locations), boardColumn ?? "");

  const createMut = useMutation({
    mutationFn: () =>
      api.createFunctionalLocation(businessId, {
        code: customCode.trim(),
        name: customName.trim(),
        type: customType,
      }),
    onSuccess: (res) => {
      const loc = res.data;
      if (loc) {
        qc.invalidateQueries({ queryKey: ["cmms-locations", businessId] });
        qc.invalidateQueries({ queryKey: ["asset-tree", businessId] });
        qc.invalidateQueries({ queryKey: ["location-tree", businessId] });
        onChange(loc.id, loc);
        setShowCustom(false);
        setCustomCode("");
        setCustomName("");
        toast.success(isAr ? "تم إضافة الموقع" : "Location added");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSelectChange = (raw: string) => {
    if (raw === CUSTOM_LOCATION_VALUE) {
      setShowCustom(true);
      return;
    }
    setShowCustom(false);
    const loc = locations.find((l) => l.id === raw);
    onChange(raw, loc);
  };

  return (
    <div className="space-y-2">
      <select
        value={showCustom ? CUSTOM_LOCATION_VALUE : value}
        onChange={(e) => handleSelectChange(e.target.value)}
        className={className ?? "h-9 w-full rounded-md border px-2 text-sm bg-background mt-1"}
      >
        {allowEmpty && !showCustom && (
          <option value="">
            {emptyLabel ?? (isAr ? "— اختر موقع —" : "— Select location —")}
          </option>
        )}
        {groups.map((group) => (
          <optgroup key={group.id} label={isAr ? group.labelAr : group.labelEn}>
            {group.locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {locationOptionLabel(loc, isAr)}
              </option>
            ))}
          </optgroup>
        ))}
        {allowCustom && (
          <option value={CUSTOM_LOCATION_VALUE}>
            {isAr ? "➕ موقع مخصص (Custom)..." : "➕ Custom location..."}
          </option>
        )}
      </select>

      {showCustom && allowCustom && (
        <div className="rounded-lg border border-[#E8E8E8] bg-[#FAFAF8] p-3 space-y-2">
          <p className="text-[11px] font-medium text-[#1a1a1a] flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" />
            {isAr ? "موقع مخصص جديد" : "New custom location"}
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            <Input
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
              placeholder={isAr ? "رمز (مثال: YARD-01)" : "Code (e.g. YARD-01)"}
              className="h-8 text-xs font-mono"
            />
            <Input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={isAr ? "الاسم (مثال: ساحة المعدات)" : "Name (e.g. Equipment yard)"}
              className="h-8 text-xs"
            />
          </div>
          <select
            value={customType}
            onChange={(e) => setCustomType(e.target.value)}
            className="h-8 w-full rounded-md border px-2 text-xs bg-background"
          >
            <option value="SITE">{isAr ? "موقع / مشروع" : "Site / project area"}</option>
            <option value="HEAD_OFFICE">{isAr ? "مكتب" : "Office"}</option>
            <option value="WAREHOUSE">{isAr ? "مستودع" : "Warehouse"}</option>
            <option value="COMPANY">{isAr ? "عميل" : "Client"}</option>
            <option value="AREA">{isAr ? "منطقة" : "Area"}</option>
          </select>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs"
              disabled={!customCode.trim() || !customName.trim() || createMut.isPending}
              onClick={() => createMut.mutate()}
            >
              {isAr ? "إضافة واختيار" : "Add & select"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => {
                setShowCustom(false);
                if (!value) onChange("");
              }}
            >
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
