"use client";

import { useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  resolveIsManpowerTheme,
  setCachedBusinessType,
} from "@/lib/business-type-cache";

export function useIsManpowerTheme(businessId: string, businessType?: string | null): boolean {
  const pathname = usePathname();

  useEffect(() => {
    if (businessId && businessType) {
      setCachedBusinessType(businessId, businessType);
    }
  }, [businessId, businessType]);

  return useMemo(
    () => resolveIsManpowerTheme(businessId, businessType, pathname),
    [businessId, businessType, pathname]
  );
}
