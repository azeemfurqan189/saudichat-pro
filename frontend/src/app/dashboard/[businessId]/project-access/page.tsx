"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, FolderKanban } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from "@/lib/context";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ProjectAccessManager } from "@/components/dashboard/project-access-panel";
import { MemberInviteSentCard } from "@/components/dashboard/member-invite-sent-card";
import { MemberInvitePayload } from "@/lib/api";
import { ManpowerHeroHeader, ManpowerPageShell } from "@/components/dashboard/manpower-shell";

export default function ProjectAccessPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [sentInvite, setSentInvite] = useState<{ invite: MemberInvitePayload; name?: string } | null>(null);

  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.getMe()).data,
  });
  const memberRole = meData?.businesses?.find((b) => b.id === businessId)?.memberRole;
  const isOwner = memberRole === "OWNER";

  const { data: projects = [] } = useQuery({
    queryKey: ["manpower-projects", businessId],
    queryFn: async () => (await api.getManpowerProjects(businessId)).data ?? [],
    enabled: isOwner,
  });

  const activeProjectId = selectedProjectId || projects[0]?.id || "";

  const { data: accessRows = [], isLoading } = useQuery({
    queryKey: ["project-access", businessId, activeProjectId],
    queryFn: async () => (await api.getProjectAccessList(businessId, activeProjectId)).data ?? [],
    enabled: isOwner && !!activeProjectId,
  });

  const saveMutation = useMutation({
    mutationFn: (data: { phone?: string; name?: string; memberId?: string; permissions: string[] }) =>
      api.upsertProjectAccess(businessId, activeProjectId, data),
    onSuccess: (res, variables) => {
      qc.invalidateQueries({ queryKey: ["project-access", businessId, activeProjectId] });
      qc.invalidateQueries({ queryKey: ["my-project-access", businessId] });
      const invite = res.data?.invite;
      if (invite) {
        setSentInvite({ invite, name: variables.name });
        toast.success(
          isAr
            ? "تم حفظ الصلاحيات وإرسال رابط الدخول"
            : "Access saved — login link sent"
        );
      } else {
        toast.success(isAr ? "تم حفظ الصلاحيات" : "Access saved");
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => api.removeProjectAccess(businessId, activeProjectId, memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-access", businessId, activeProjectId] });
      toast.success(isAr ? "تم إزالة الوصول" : "Access removed");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId),
    [projects, activeProjectId]
  );

  if (memberRole && !isOwner) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        {isAr ? "هذا القسم للمالك فقط" : "Owner-only section"}
      </div>
    );
  }

  return (
    <ManpowerPageShell>
      <ManpowerHeroHeader
        title={isAr ? "صلاحيات المشرفين" : "Manager Access Control"}
        subtitle={
          isAr
            ? "لكل مشروع — امنح المشرف صلاحيات العمال والحضور والساعات"
            : "Per project — grant worker, attendance & timesheet permissions"
        }
        icon={Shield}
      />

      {sentInvite && (
        <MemberInviteSentCard
          isAr={isAr}
          invite={sentInvite.invite}
          memberName={sentInvite.name}
          onClose={() => setSentInvite(null)}
        />
      )}

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FolderKanban className="w-4 h-4" />
            {isAr ? "اختر المشروع" : "Select project"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 pb-4">
          {projects.length === 0 ? (
            <p className="text-xs text-muted-foreground">{isAr ? "لا مشاريع بعد" : "No projects yet"}</p>
          ) : (
            projects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedProjectId(p.id)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-full border font-medium transition-colors",
                  activeProjectId === p.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 border-transparent hover:bg-muted"
                )}
              >
                {p.name}
              </button>
            ))
          )}
        </CardContent>
      </Card>

      {activeProjectId && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">{selectedProject?.name}</CardTitle>
            <p className="text-[10px] text-muted-foreground">
              {isAr ? "اسحب الصلاحيات بين المتاح والممنوح" : "Drag permissions between Available and Granted"}
            </p>
          </CardHeader>
          <CardContent className="pb-4">
            {isLoading ? (
              <p className="text-xs text-muted-foreground py-8 text-center">{isAr ? "جاري التحميل..." : "Loading..."}</p>
            ) : (
              <ProjectAccessManager
                accessRows={accessRows}
                isAr={isAr}
                saving={saveMutation.isPending || removeMutation.isPending}
                onSavePhone={(data) => saveMutation.mutate(data)}
                onSaveMember={(data) => saveMutation.mutate(data)}
                onRemove={(memberId) => removeMutation.mutate(memberId)}
              />
            )}
          </CardContent>
        </Card>
      )}
    </ManpowerPageShell>
  );
}
