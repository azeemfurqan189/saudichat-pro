"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { UserPlus, Shield, UserCog, Eye, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableSkeleton } from "@/components/ui/skeleton";
import { MemberInviteSentCard } from "@/components/dashboard/member-invite-sent-card";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api, BusinessMember, MemberInvitePayload } from "@/lib/api";
import { cn, getInitials } from "@/lib/utils";
import { useIsManpowerTheme } from "@/hooks/use-is-manpower-theme";
import { ManpowerHeroHeader, ManpowerPageShell } from "@/components/dashboard/manpower-shell";

const ROLES = [
  {
    id: "MANAGER",
    labelEn: "Manager",
    labelAr: "مشرف",
    descEn: "Manage team, schedule, and assignments",
    descAr: "إدارة الفريق والجدول والمهام",
    icon: UserCog,
  },
  {
    id: "OFFICE_STAFF",
    labelEn: "Office Staff",
    labelAr: "موظف مكتب",
    descEn: "Handle conversations and assigned tasks",
    descAr: "المحادثات والمهام المخصصة",
    icon: Eye,
  },
  {
    id: "FIELD_WORKER",
    labelEn: "Field Worker",
    labelAr: "عامل ميداني",
    descEn: "Deliveries and on-site jobs",
    descAr: "التوصيل والعمل الميداني",
    icon: Shield,
  },
];

export default function StaffPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const { locale } = useApp();
  const isAr = locale === "ar";
  const queryClient = useQueryClient();

  const [showInvite, setShowInvite] = useState(false);
  const [sentInvite, setSentInvite] = useState<{ invite: MemberInvitePayload; name: string } | null>(null);
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "OFFICE_STAFF",
    department: "",
  });

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["workforce-members", businessId],
    queryFn: async () => {
      const res = await api.getWorkforceMembers(businessId);
      return res.data ?? [];
    },
  });

  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.getMe()).data,
  });
  const businessType = meData?.businesses?.find((b) => b.id === businessId)?.type;
  const isManpower = useIsManpowerTheme(businessId, businessType);

  const inviteMutation = useMutation({
    mutationFn: (data: { name: string; email: string; phone: string; role: string; department?: string }) =>
      api.inviteWorkforceMember(businessId, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["workforce-members", businessId] });
      queryClient.invalidateQueries({ queryKey: ["staff", businessId] });
      const invite = res.data?.invite;
      if (invite) {
        setSentInvite({ invite, name: inviteForm.name });
        toast.success(
          isAr
            ? "تم إرسال رابط الدخول — شاركه على واتساب أو الإيميل"
            : "Login link sent — share via WhatsApp or email"
        );
      } else {
        toast.success(isAr ? "تمت إضافة العضو" : "Member added");
      }
      setInviteForm({ name: "", email: "", phone: "", role: "OFFICE_STAFF", department: "" });
      setShowInvite(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deactivateMutation = useMutation({
    mutationFn: (memberId: string) =>
      api.updateWorkforceMember(businessId, memberId, { isActive: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workforce-members", businessId] });
      toast.success(isAr ? "تم إلغاء التفعيل" : "Member deactivated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    inviteMutation.mutate({
      name: inviteForm.name,
      email: inviteForm.email,
      phone: inviteForm.phone,
      role: inviteForm.role,
      department: inviteForm.department || undefined,
    });
  };

  const roleInfo = (roleId: string) => ROLES.find((r) => r.id === roleId) ?? ROLES[1];
  const teamMembers = members.filter((m: BusinessMember) => m.role !== "OWNER");

  const staffContent = (
    <>
      {isManpower ? (
        <ManpowerHeroHeader
          title={t(locale, "dashboard", "staff")}
          subtitle={isAr ? `${teamMembers.length} عضو` : `${teamMembers.length} team members`}
          icon={UserCog}
          actions={
            <Button onClick={() => setShowInvite(!showInvite)}>
              <UserPlus className="w-4 h-4" />
              {isAr ? "دعوة عضو" : "Invite Member"}
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{t(locale, "dashboard", "staff")}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isAr ? `${teamMembers.length} عضو` : `${teamMembers.length} team members`}
            </p>
          </div>
          <Button onClick={() => setShowInvite(!showInvite)}>
            <UserPlus className="w-4 h-4" />
            {isAr ? "دعوة عضو" : "Invite Member"}
          </Button>
        </div>
      )}

      {sentInvite && (
        <MemberInviteSentCard
          isAr={isAr}
          invite={sentInvite.invite}
          memberName={sentInvite.name}
          onClose={() => setSentInvite(null)}
        />
      )}

      {/* Roles overview */}
      <div className="grid md:grid-cols-3 gap-4">
        {ROLES.map((role, i) => (
          <motion.div
            key={role.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="!p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <role.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{isAr ? role.labelAr : role.labelEn}</p>
                  <p className="text-xs text-muted-foreground">
                    {isAr ? role.descAr : role.descEn}
                  </p>
                </div>
              </div>
              <p className="text-2xl font-bold">
                {teamMembers.filter((s) => s.role === role.id).length}
              </p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Invite form */}
      {showInvite && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
          <Card>
            <CardHeader>
              <CardTitle>{isAr ? "دعوة عضو جديد" : "Invite New Member"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInvite} className="grid md:grid-cols-2 gap-4 max-w-2xl">
                <Input
                  label={t(locale, "common", "name")}
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  required
                />
                <Input
                  label={t(locale, "common", "email")}
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  required
                />
                <Input
                  label={t(locale, "common", "phone")}
                  value={inviteForm.phone}
                  onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })}
                  dir="ltr"
                />
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">
                    {isAr ? "الدور" : "Role"}
                  </label>
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                    className="w-full h-11 rounded-xl border border-border bg-white/50 dark:bg-gray-900/50 px-4 text-sm"
                  >
                    {ROLES.map((r) => (
                      <option key={r.id} value={r.id}>
                        {isAr ? r.labelAr : r.labelEn}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2 flex gap-3">
                  <Button type="submit" loading={inviteMutation.isPending}>
                    {isAr ? "إرسال الدعوة" : "Send Invite"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowInvite(false)}>
                    {t(locale, "dashboard", "cancel")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Staff list */}
      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : teamMembers.length === 0 ? (
        <Card className="text-center py-16">
          <UserCog className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{t(locale, "dashboard", "noData")}</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {teamMembers.map((member, i) => {
            const role = roleInfo(member.role);
            const name = member.user?.name || "?";
            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className="!p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold shrink-0">
                      {member.user?.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={member.user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        getInitials(name)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold truncate">{name}</p>
                        <span
                          className={cn(
                            "text-xs px-2 py-0.5 rounded-full shrink-0",
                            member.isActive
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {member.isActive ? (isAr ? "نشط" : "Active") : isAr ? "غير نشط" : "Inactive"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <role.icon className="w-3 h-3 text-primary" />
                        <span className="text-xs text-muted-foreground capitalize">
                          {isAr ? role.labelAr : role.labelEn}
                        </span>
                      </div>
                      {member.user?.email && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2 truncate">
                          <Mail className="w-3 h-3 shrink-0" />
                          {member.user.email}
                        </p>
                      )}
                      {member.user?.phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1" dir="ltr">
                          <Phone className="w-3 h-3 shrink-0" />
                          {member.user.phone}
                        </p>
                      )}
                      {member.isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          onClick={() => deactivateMutation.mutate(member.id)}
                          loading={deactivateMutation.isPending}
                        >
                          {isAr ? "إلغاء التفعيل" : "Deactivate"}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </>
  );

  return isManpower ? (
    <ManpowerPageShell>{staffContent}</ManpowerPageShell>
  ) : (
    <div className="space-y-6">{staffContent}</div>
  );
}
