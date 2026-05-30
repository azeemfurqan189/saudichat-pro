"use client";

import { useApp } from "@/lib/context";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export function LanguageToggle() {
  const { locale, setLocale } = useApp();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLocale(locale === "en" ? "ar" : "en")}
      className="gap-1.5"
    >
      <Globe className="h-4 w-4" />
      <span className="hidden sm:inline">{locale === "en" ? "العربية" : "EN"}</span>
    </Button>
  );
}
