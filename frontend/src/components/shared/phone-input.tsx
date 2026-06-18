"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  buildFullPhone,
  getCountryByCode,
  parsePhoneValue,
} from "@/lib/country-codes";
import { CountryCodePicker } from "./country-code-picker";

interface PhoneInputProps {
  label?: string;
  value: string;
  onChange: (fullPhone: string) => void;
  error?: string;
  locale?: "en" | "ar";
  className?: string;
}

export function PhoneInput({
  label,
  value,
  onChange,
  error,
  locale = "en",
  className,
}: PhoneInputProps) {
  const isAr = locale === "ar";
  const { countryCode, localNumber } = useMemo(() => parsePhoneValue(value), [value]);
  const selected = getCountryByCode(countryCode);

  const handleCountryChange = (code: string) => {
    onChange(buildFullPhone(code, localNumber));
  };

  const handleLocalChange = (local: string) => {
    const cleaned = local.replace(/[^\d]/g, "");
    onChange(buildFullPhone(countryCode, cleaned));
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      )}
      <div className="flex gap-2" dir="ltr">
        <CountryCodePicker
          value={countryCode}
          onChange={handleCountryChange}
          locale={locale}
          error={!!error}
        />
        <input
          type="tel"
          inputMode="numeric"
          value={localNumber}
          onChange={(e) => handleLocalChange(e.target.value)}
          placeholder={selected.placeholder}
          className={cn(
            "flex h-10 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm",
            "placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
            "dark:border-slate-700 dark:bg-slate-900",
            error && "border-red-500"
          )}
        />
      </div>
      <p className="text-xs text-slate-400">
        {isAr ? "اختر رمز الدولة ثم أدخل رقمك — مثال:" : "Select country code, then enter number — e.g."}{" "}
        <span dir="ltr" className="font-mono">
          {buildFullPhone(selected.code, selected.placeholder)}
        </span>
      </p>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

export { DEFAULT_COUNTRY } from "@/lib/country-codes";
