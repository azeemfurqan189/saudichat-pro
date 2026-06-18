"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { COUNTRY_CODES, CountryCode, getCountryByCode } from "@/lib/country-codes";

interface CountryCodePickerProps {
  value: string;
  onChange: (code: string) => void;
  locale?: "en" | "ar";
  error?: boolean;
}

export function CountryCodePicker({ value, onChange, locale = "en", error }: CountryCodePickerProps) {
  const isAr = locale === "ar";
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const selected = getCountryByCode(value);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = COUNTRY_CODES.filter((c) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      c.code.includes(q) ||
      c.country.toLowerCase().includes(q) ||
      c.countryAr.includes(search.trim()) ||
      c.code.replace("+", "").includes(q)
    );
  });

  const pick = (c: CountryCode) => {
    onChange(c.code);
    setOpen(false);
    setSearch("");
  };

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-10 min-w-[118px] items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-sm",
          "hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
          "dark:border-slate-700 dark:bg-slate-900",
          error && "border-red-500",
          open && "border-primary ring-2 ring-primary/30"
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="text-base leading-none">{selected.flag}</span>
        <span className="font-medium" dir="ltr">{selected.code}</span>
        <ChevronDown className={cn("ml-auto h-3.5 w-3.5 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-[min(100vw-2rem,280px)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
          role="listbox"
        >
          <div className="border-b border-slate-100 p-2 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isAr ? "ابحث عن دولة..." : "Search country..."}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                autoFocus
              />
            </div>
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-sm text-slate-400">
                {isAr ? "لا توجد نتائج" : "No results"}
              </li>
            ) : (
              filtered.map((c) => (
                <li key={c.code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={c.code === value}
                    onClick={() => pick(c)}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-primary/5",
                      c.code === value && "bg-primary/10 font-medium text-primary"
                    )}
                  >
                    <span className="text-lg leading-none">{c.flag}</span>
                    <span className="min-w-0 flex-1 truncate">
                      {isAr ? c.countryAr : c.country}
                    </span>
                    <span className="shrink-0 font-mono text-xs text-slate-500" dir="ltr">
                      {c.code}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
          <p className="border-t border-slate-100 px-3 py-1.5 text-center text-[10px] text-slate-400 dark:border-slate-800">
            {COUNTRY_CODES.length} {isAr ? "دولة" : "countries"}
          </p>
        </div>
      )}
    </div>
  );
}
