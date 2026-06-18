"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useApp } from "@/lib/context";
import { api } from "@/lib/api";
import { HelpSupportHub } from "@/components/dashboard/help-support-hub";

export default function HelpPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";

  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.getMe()).data,
  });

  const userName = meData?.user?.name || meData?.user?.email;

  return <HelpSupportHub businessId={businessId} isAr={isAr} userName={userName} />;
}
