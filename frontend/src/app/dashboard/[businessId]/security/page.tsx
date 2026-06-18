"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Loader2, Check, X, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ManpowerHeroHeader, ManpowerPageShell, ManpowerStatCard } from "@/components/dashboard/manpower-shell";

const ACTION_LABELS: Record<string, { en: string; ar: string }> = {
  view: { en: "View", ar: "عرض" },
  create: { en: "Create", ar: "إنشاء" },
  edit: { en: "Edit", ar: "تعديل" },
  approve: { en: "Approve", ar: "اعتماد" },
  delete: { en: "Delete", ar: "حذف" },
};

const LAYER_COLORS: Record<string, string> = {
  OWNER: "bg-rose-500/10 text-rose-700",
  OFFICE: "bg-blue-500/10 text-blue-700",
  SITE: "bg-amber-500/10 text-amber-700",
};

export default function CmmsSecurityPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string>("OPERATOR");

  const { data: security, isLoading } = useQuery({
    queryKey: ["cmms-security", businessId],
    queryFn: async () => (await api.getCmmsSecurity(businessId)).data,
  });

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: async () => (await api.getMe()).data });
  const isOwner = me?.businesses?.find((b) => b.id === businessId)?.memberRole === "OWNER";

  const seedMut = useMutation({
    mutationFn: () => api.seedCmmsSecurity(businessId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cmms-security", businessId] });
      toast.success(isAr ? "تم تعيين أدوار CMMS" : "CMMS roles assigned");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const roleMut = useMutation({
    mutationFn: ({ memberId, cmmsRole }: { memberId: string; cmmsRole: string }) =>
      api.updateMemberCmmsRole(businessId, memberId, cmmsRole),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cmms-security", businessId] });
      toast.success(isAr ? "تم تحديث الدور" : "Role updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activeMatrix = security?.roleMatrix.find((r) => r.role === selectedRole);
  const roles = security?.roles ?? [];

  return (
    <ManpowerPageShell>
      <ManpowerHeroHeader
        icon={ShieldCheck}
        title={t(locale, "dashboard", "cmmsSecurity")}
        subtitle={
          isAr
            ? "Operator · Technician · Supervisor · Planner · Storekeeper · Manager · Admin"
            : "Operator · Technician · Supervisor · Planner · Storekeeper · Manager · Admin"
        }
      />

      <div className="flex flex-wrap gap-2 justify-end">
        {isOwner && (
          <Button size="sm" variant="outline" onClick={() => seedMut.mutate()} disabled={seedMut.isPending}>
            {seedMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : isAr ? "تعيين أدوار Demo" : "Assign demo roles"}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ManpowerStatCard label={isAr ? "الأدوار" : "Roles"} value={isLoading ? "—" : security?.stats.roles ?? 7} />
        <ManpowerStatCard label={isAr ? "الوحدات" : "Modules"} value={isLoading ? "—" : security?.stats.modules ?? 12} />
        <ManpowerStatCard label={isAr ? "الصلاحيات" : "Actions"} value={isLoading ? "—" : security?.stats.actions ?? 5} />
        <ManpowerStatCard label={isAr ? "أعضاء الفريق" : "Team members"} value={isLoading ? "—" : security?.stats.members ?? 0} />
      </div>

      <div className="rounded-[10px] border border-[#E8E8E8] bg-white p-4">
        <div className="flex items-center gap-2 mb-3">
          <Lock className="w-4 h-4 text-[#1D9E75]" />
          <p className="text-sm font-semibold">{isAr ? "مصفوفة الصلاحيات" : "Permission matrix"}</p>
        </div>
        <p className="text-[11px] text-muted-foreground mb-4">
          {isAr
            ? "View · Create · Edit · Approve · Delete — لكل وحدة CMMS"
            : "View · Create · Edit · Approve · Delete — per CMMS module"}
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {roles.map((role) => (
            <button
              key={role.key}
              type="button"
              onClick={() => setSelectedRole(role.key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition",
                selectedRole === role.key
                  ? "border-[#1D9E75] bg-[#EAF3DE] text-[#1a1a1a]"
                  : "border-[#E8E8E8] bg-white text-muted-foreground hover:border-[#1D9E75]/40"
              )}
            >
              {isAr ? role.labelAr : role.labelEn}
              <span className={cn("ml-1.5 px-1.5 py-0.5 rounded text-[9px]", LAYER_COLORS[role.layer] ?? "")}>
                {role.layer}
              </span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-4 font-medium text-muted-foreground">{isAr ? "الوحدة" : "Module"}</th>
                  {security?.actions.map((action) => (
                    <th key={action} className="py-2 px-2 text-center font-medium text-muted-foreground text-xs">
                      {isAr ? ACTION_LABELS[action]?.ar : ACTION_LABELS[action]?.en}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeMatrix?.modules.map((mod) => (
                  <tr key={mod.module} className="border-b last:border-0">
                    <td className="py-2.5 pr-4 font-medium">{isAr ? mod.labelAr : mod.labelEn}</td>
                    {security?.actions.map((action) => {
                      const allowed = mod.permissions[action];
                      return (
                        <td key={action} className="py-2.5 px-2 text-center">
                          {allowed ? (
                            <Check className="w-4 h-4 mx-auto text-[#1D9E75]" />
                          ) : (
                            <X className="w-4 h-4 mx-auto text-[#E8E8E8]" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {!activeMatrix?.modules.length && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      {isAr ? "لا توجد صلاحيات لهذا الدور" : "No permissions for this role"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-[10px] border border-[#E8E8E8] bg-white p-4">
        <p className="text-sm font-semibold mb-3">{isAr ? "تعيين أدوار الفريق" : "Team role assignments"}</p>
        <div className="space-y-2">
          {(security?.team ?? []).map((member) => {
            const roleInfo = roles.find((r) => r.key === member.cmmsRole);
            return (
              <div
                key={member.memberId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
              >
                <div>
                  <p className="font-medium text-sm">{member.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {member.email} · {member.systemRole} · {member.permissionCount}{" "}
                    {isAr ? "صلاحية" : "permissions"}
                  </p>
                </div>
                {isOwner ? (
                  <select
                    className="text-sm border rounded-md px-2 py-1.5 bg-white min-w-[140px]"
                    value={member.cmmsRole}
                    disabled={roleMut.isPending}
                    onChange={(e) =>
                      roleMut.mutate({ memberId: member.memberId, cmmsRole: e.target.value })
                    }
                  >
                    {roles.map((r) => (
                      <option key={r.key} value={r.key}>
                        {isAr ? r.labelAr : r.labelEn}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className={cn("text-xs px-2 py-1 rounded-full font-medium", LAYER_COLORS[roleInfo?.layer ?? "SITE"])}>
                    {isAr ? roleInfo?.labelAr : roleInfo?.labelEn}
                  </span>
                )}
              </div>
            );
          })}
          {!security?.team?.length && (
            <p className="text-sm text-muted-foreground text-center py-6">
              {isAr ? "لا يوجد أعضاء — أضف فريقاً من الإعدادات" : "No team members — add staff in Settings"}
            </p>
          )}
        </div>
      </div>
    </ManpowerPageShell>
  );
}
