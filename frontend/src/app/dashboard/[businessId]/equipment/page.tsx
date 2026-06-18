"use client";

import { useParams } from "next/navigation";
import { Wrench } from "lucide-react";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import {
  ManpowerHeroHeader,
  ManpowerPageShell,
} from "@/components/dashboard/manpower-shell";
import { ManpowerEquipmentBoard } from "@/components/dashboard/manpower-equipment-board";
import { ManpowerDemoBanner } from "@/components/dashboard/manpower-demo-banner";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function EquipmentPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";

  const { data: projects = [] } = useQuery({
    queryKey: ["manpower-projects", businessId],
    queryFn: async () => (await api.getManpowerProjects(businessId)).data ?? [],
  });

  return (
    <ManpowerPageShell>
      <ManpowerHeroHeader
        icon={Wrench}
        title={t(locale, "dashboard", "equipment")}
        subtitle={
          isAr
            ? "تتبع المعدات — متى أُصدرت، من لديه، مدة الاستخدام، ومواعيد الفحص. اسحب بين الأعمدة حسب الحاجة."
            : "Track tools & equipment — when issued, who has it, time on site, inspection dates. Drag between columns as needs change."
        }
      />
      <ManpowerDemoBanner
        businessId={businessId}
        isAr={isAr}
        projectCount={projects.length}
      />
      <ManpowerEquipmentBoard businessId={businessId} isAr={isAr} showAddForm />
    </ManpowerPageShell>
  );
}
