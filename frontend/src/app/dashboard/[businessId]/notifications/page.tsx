"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Mail,
  Smartphone,
  MessageCircle,
  BellRing,
  Loader2,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { ManpowerHeroHeader, ManpowerPageShell, ManpowerStatCard } from "@/components/dashboard/manpower-shell";

const CHANNEL_ICONS: Record<string, typeof Mail> = {
  EMAIL: Mail,
  SMS: Smartphone,
  WHATSAPP: MessageCircle,
  PUSH: BellRing,
};

const CHANNEL_COLORS: Record<string, string> = {
  EMAIL: "border-blue-200 bg-blue-50/50",
  SMS: "border-violet-200 bg-violet-50/50",
  WHATSAPP: "border-green-200 bg-green-50/50",
  PUSH: "border-amber-200 bg-amber-50/50",
};

export default function NotificationCenterPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();

  const [testChannel, setTestChannel] = useState("WHATSAPP");
  const [testRecipient, setTestRecipient] = useState("");

  const { data: center, isLoading } = useQuery({
    queryKey: ["notification-center", businessId],
    queryFn: async () => (await api.getNotificationCenter(businessId)).data,
  });

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: async () => (await api.getMe()).data });
  const isOwner = me?.businesses?.find((b) => b.id === businessId)?.memberRole === "OWNER";

  const seedMut = useMutation({
    mutationFn: () => api.seedNotificationCenter(businessId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification-center", businessId] });
      toast.success(isAr ? "تم تحميل مركز الإشعارات" : "Notification center demo loaded");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: ({ channel, isEnabled }: { channel: string; isEnabled: boolean }) =>
      api.toggleNotificationChannel(businessId, channel, isEnabled),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification-center", businessId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const testMut = useMutation({
    mutationFn: (recipient: string) => api.sendTestNotification(businessId, testChannel, recipient),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification-center", businessId] });
      toast.success(isAr ? "تم إرسال الاختبار" : "Test notification sent");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const hasData = (center?.recentDeliveries.length ?? 0) > 0;

  return (
    <ManpowerPageShell>
      <ManpowerHeroHeader
        icon={Bell}
        title={t(locale, "dashboard", "notificationCenter")}
        subtitle={
          isAr
            ? "Email · SMS · WhatsApp · Push — تنبيهات CMMS"
            : "Email · SMS · WhatsApp · Push — CMMS alerts"
        }
      />

      <div className="flex flex-wrap gap-2 justify-end">
        {!hasData && (
          <Button size="sm" variant="outline" onClick={() => seedMut.mutate()} disabled={seedMut.isPending}>
            {seedMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : isAr ? "Demo إشعارات" : "Load demo"}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ManpowerStatCard label={isAr ? "مرسل اليوم" : "Sent today"} value={isLoading ? "—" : center?.stats.sentToday ?? 0} />
        <ManpowerStatCard label={isAr ? "إجمالي" : "Total log"} value={isLoading ? "—" : center?.stats.totalDeliveries ?? 0} />
        <ManpowerStatCard label={isAr ? "Push غير مقروء" : "Unread push"} value={isLoading ? "—" : center?.stats.inAppUnread ?? 0} />
        <ManpowerStatCard
          label={isAr ? "قنوات مفعّلة" : "Channels on"}
          value={isLoading ? "—" : center?.channels.filter((c) => c.isEnabled).length ?? 0}
        />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {center?.channels.map((ch) => {
          const Icon = CHANNEL_ICONS[ch.channel] ?? Bell;
          return (
            <div key={ch.channel} className={cn("rounded-[10px] border p-4", CHANNEL_COLORS[ch.channel] ?? "border-[#E8E8E8] bg-white")}>
              <div className="flex items-start justify-between gap-2">
                <Icon className="w-5 h-5 text-[#5c5c5c]" />
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => toggleMut.mutate({ channel: ch.channel, isEnabled: !ch.isEnabled })}
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-medium border",
                      ch.isEnabled ? "bg-[#1D9E75]/10 text-[#1D9E75] border-[#1D9E75]/30" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {ch.isEnabled ? (isAr ? "مفعّل" : "ON") : (isAr ? "متوقف" : "OFF")}
                  </button>
                )}
              </div>
              <p className="font-semibold text-sm mt-2">{isAr ? ch.labelAr : ch.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {ch.configured ? (isAr ? "مهيّأ" : "Configured") : (isAr ? "Demo / غير مهيّأ" : "Demo / not configured")}
                · {center?.stats.byChannel[ch.channel] ?? 0} {isAr ? "مرسل" : "sent"}
              </p>
            </div>
          );
        })}
      </div>

      <div className="rounded-[10px] border border-[#E8E8E8] bg-white p-4 space-y-3">
        <p className="text-sm font-semibold">{isAr ? "إرسال اختبار" : "Send test notification"}</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <select
            className="rounded-lg border border-[#E8E8E8] px-3 py-2 text-sm"
            value={testChannel}
            onChange={(e) => {
              setTestChannel(e.target.value);
              if (e.target.value === "EMAIL") setTestRecipient(center?.defaultRecipient.email ?? "");
              else if (e.target.value === "PUSH") setTestRecipient("dashboard");
              else setTestRecipient(center?.defaultRecipient.phone ?? "");
            }}
          >
            <option value="EMAIL">Email</option>
            <option value="SMS">SMS</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="PUSH">Push Notification</option>
          </select>
          <Input
            placeholder={testChannel === "EMAIL" ? "email@company.com" : testChannel === "PUSH" ? "dashboard" : "+966..."}
            value={testRecipient || (testChannel === "EMAIL" ? center?.defaultRecipient.email ?? "" : testChannel === "PUSH" ? "dashboard" : center?.defaultRecipient.phone ?? "")}
            onChange={(e) => setTestRecipient(e.target.value)}
            disabled={testChannel === "PUSH"}
          />
          <Button
            size="sm"
            onClick={() => {
              const recipient =
                testRecipient ||
                (testChannel === "EMAIL"
                  ? center?.defaultRecipient.email
                  : testChannel === "PUSH"
                    ? "dashboard"
                    : center?.defaultRecipient.phone) ||
                "";
              if (!recipient && testChannel !== "PUSH") {
                toast.error(isAr ? "أدخل المستلم" : "Enter recipient");
                return;
              }
              testMut.mutate(recipient);
            }}
            disabled={testMut.isPending}
          >
            {testMut.isPending ? <Loader2 className="w-4 h-4 animate-spin me-1" /> : <Send className="w-4 h-4 me-1" />}
            {isAr ? "اختبار" : "Send test"}
          </Button>
        </div>
      </div>

      <div className="rounded-[10px] border border-[#E8E8E8] bg-white overflow-hidden">
        <div className="p-3 bg-[#FAFAF8] text-xs font-semibold border-b">
          {isAr ? "قواعد الأحداث × القنوات" : "Event rules × channels"}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-[#FAFAF8]">
                <th className="text-left p-2 font-semibold">{isAr ? "الحدث" : "Event"}</th>
                {["EMAIL", "SMS", "WHATSAPP", "PUSH"].map((c) => (
                  <th key={c} className="p-2 text-center font-semibold">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {center?.eventTypes.map((ev) => {
                const rules = center.eventRules[ev.key] ?? {};
                return (
                  <tr key={ev.key} className="border-b last:border-0">
                    <td className="p-2">{isAr ? ev.labelAr : ev.label}</td>
                    {(["email", "sms", "whatsapp", "push"] as const).map((k) => (
                      <td key={k} className="p-2 text-center">
                        {rules[k] ? (
                          <CheckCircle2 className="w-4 h-4 text-[#1D9E75] mx-auto" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-[10px] border border-[#E8E8E8] bg-white divide-y">
        <div className="p-3 bg-[#FAFAF8] text-xs font-semibold">
          {isAr ? "سجل الإرسال" : "Delivery log"}
        </div>
        {isLoading ? (
          <p className="p-6 text-center text-muted-foreground text-sm">{isAr ? "جاري التحميل..." : "Loading..."}</p>
        ) : (center?.recentDeliveries.length ?? 0) === 0 ? (
          <p className="p-6 text-center text-muted-foreground text-sm">{isAr ? "لا سجل — Demo" : "No log — load demo"}</p>
        ) : (
          center?.recentDeliveries.map((d) => {
            const Icon = CHANNEL_ICONS[d.channel] ?? Bell;
            return (
              <div key={d.id} className="p-3 flex flex-wrap gap-3 items-start">
                <div className={cn("p-2 rounded-lg", CHANNEL_COLORS[d.channel]?.split(" ")[1] ?? "bg-muted")}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-sm">{d.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-mono">{d.eventType}</span>
                    {d.status === "SENT" ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#1D9E75]" />
                    ) : d.status === "FAILED" ? (
                      <XCircle className="w-3.5 h-3.5 text-red-500" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{d.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {d.channel}{d.recipient ? ` → ${d.recipient}` : ""} · {formatDate(d.createdAt, locale)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </ManpowerPageShell>
  );
}
