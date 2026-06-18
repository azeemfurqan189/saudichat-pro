"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import {
  DEFAULT_REMINDER_NOTIFY,
  REMINDER_ROLE_OPTIONS,
  ReminderNotifyConfig,
  ReminderNotifyRole,
} from "@/lib/reminder-notify-types";

export function ReminderNotificationPanel({
  businessId,
  itemKey,
  isAr,
  title,
  subtitle,
  compact,
}: {
  businessId: string;
  itemKey: string | null;
  isAr: boolean;
  title?: string;
  subtitle?: string;
  compact?: boolean;
}) {
  const qc = useQueryClient();
  const [local, setLocal] = useState<ReminderNotifyConfig>(DEFAULT_REMINDER_NOTIFY);

  const { data: loaded } = useQuery({
    queryKey: ["reminder-notify", businessId, itemKey],
    queryFn: async () => {
      if (!itemKey) return DEFAULT_REMINDER_NOTIFY;
      return (await api.getReminderNotify(businessId, itemKey)).data ?? DEFAULT_REMINDER_NOTIFY;
    },
    enabled: !!itemKey,
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["workforce-members", businessId],
    queryFn: async () => (await api.getWorkforceMembers(businessId)).data ?? [],
    enabled: local.enabled,
  });

  useEffect(() => {
    if (loaded) setLocal(loaded);
  }, [loaded]);

  const saveMut = useMutation({
    mutationFn: (config: ReminderNotifyConfig) => {
      if (!itemKey) return Promise.resolve(config);
      return api.saveReminderNotify(businessId, itemKey, config).then((r) => r.data ?? config);
    },
    onSuccess: (data) => {
      if (itemKey) {
        qc.setQueryData(["reminder-notify", businessId, itemKey], data);
      }
      toast.success(isAr ? "تم حفظ إعدادات الإشعار" : "Notification settings saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleRole = (role: ReminderNotifyRole) => {
    setLocal((prev) => {
      const roles = prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role];
      const next = { ...prev, roles: roles.length ? roles : [role] };
      if (itemKey) saveMut.mutate(next);
      return next;
    });
  };

  const toggleMember = (memberId: string) => {
    setLocal((prev) => {
      const memberIds = prev.memberIds.includes(memberId)
        ? prev.memberIds.filter((id) => id !== memberId)
        : [...prev.memberIds, memberId];
      const next = { ...prev, memberIds };
      if (itemKey) saveMut.mutate(next);
      return next;
    });
  };

  const toggleEnabled = () => {
    setLocal((prev) => {
      const next = { ...prev, enabled: !prev.enabled };
      if (itemKey) saveMut.mutate(next);
      return next;
    });
  };

  if (!itemKey && !compact) return null;

  return (
    <div
      className={cn(
        "rounded-[10px] border border-[#E8E8E8] bg-[#FAFAF8] p-3 space-y-3",
        compact && "p-2.5"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-[#1a1a1a] flex items-center gap-2">
            {local.enabled ? (
              <Bell className="w-4 h-4 text-[#1D9E75]" />
            ) : (
              <BellOff className="w-4 h-4 text-[#9a9a9a]" />
            )}
            {title ?? (isAr ? "إشعار التذكير" : "Reminder notification")}
          </p>
          {(subtitle || !compact) && (
            <p className="text-[11px] text-[#5c5c5c] mt-0.5">
              {subtitle ??
                (isAr
                  ? "فعّل لإرسال تنبيه للمالك / المدير / المكتب أو شخص محدد"
                  : "Turn on to alert Boss / Manager / Admin or a specific person")}
            </p>
          )}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={local.enabled}
          onClick={toggleEnabled}
          disabled={!itemKey || saveMut.isPending}
          className={cn(
            "relative shrink-0 w-10 h-5 rounded-full transition-colors",
            local.enabled ? "bg-[#1D9E75]" : "bg-[#D4D4D4]",
            !itemKey && "opacity-50 cursor-not-allowed"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
              local.enabled ? "translate-x-5 rtl:-translate-x-5" : "translate-x-0.5"
            )}
          />
        </button>
      </div>

      {local.enabled && (
        <>
          <div>
            <p className="text-[10px] font-semibold uppercase text-[#9a9a9a] mb-1.5">
              {isAr ? "إرسال إلى (دور)" : "Send to (role)"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {REMINDER_ROLE_OPTIONS.map((opt) => {
                const on = local.roles.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleRole(opt.value)}
                    className={cn(
                      "text-[11px] px-2.5 py-1 rounded-full border transition",
                      on
                        ? "bg-[#E1F5EE] border-[#1D9E75] text-[#085041] font-medium"
                        : "bg-white border-[#E8E8E8] text-[#5c5c5c] hover:bg-[#EFEFEF]"
                    )}
                  >
                    {isAr ? opt.labelAr : opt.labelEn}
                  </button>
                );
              })}
            </div>
          </div>

          {staff.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase text-[#9a9a9a] mb-1.5">
                {isAr ? "أو شخص محدد" : "Or specific person"}
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {staff.map((m) => {
                  const on = local.memberIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleMember(m.id)}
                      className={cn(
                        "text-[11px] px-2.5 py-1 rounded-full border transition truncate max-w-[160px]",
                        on
                          ? "bg-[#E6F1FB] border-[#378ADD] text-[#0C447C] font-medium"
                          : "bg-white border-[#E8E8E8] text-[#5c5c5c] hover:bg-[#EFEFEF]"
                      )}
                    >
                      {m.user?.name || m.user?.phone || m.role}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!itemKey && (
            <p className="text-[10px] text-amber-700">
              {isAr ? "احفظ السجل أولاً لتفعيل الإشعار" : "Save the record first to enable notifications"}
            </p>
          )}
        </>
      )}
    </div>
  );
}
