"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Globe, Share2, Mail, Phone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";

const CHANNEL_ICON: Record<string, typeof MessageSquare> = {
  whatsapp: MessageSquare,
  livechat: Globe,
  instagram: Share2,
  email: Mail,
  sms: Phone,
};

const CHANNEL_COLOR: Record<string, string> = {
  whatsapp: "bg-green-100 text-green-700",
  livechat: "bg-blue-100 text-blue-700",
  instagram: "bg-pink-100 text-pink-700",
  email: "bg-purple-100 text-purple-700",
  sms: "bg-orange-100 text-orange-700",
};

export default function InboxPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const router = useRouter();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["unified-inbox", businessId],
    queryFn: async () => (await api.getUnifiedInbox(businessId)).data ?? [],
    refetchInterval: 10000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t(locale, "dashboard", "inbox")}</h1>
        <p className="text-sm text-muted-foreground">{isAr ? "واتساب + محادثة الموقع في مكان واحد" : "WhatsApp + Website chat in one place"}</p>
      </div>
      {isLoading ? <p>{t(locale, "dashboard", "loading")}</p> : items.length === 0 ? (
        <p className="text-muted-foreground">{t(locale, "dashboard", "noData")}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const Icon = CHANNEL_ICON[item.channel] || MessageSquare;
            return (
              <Card
                key={`${item.type}-${item.id}`}
                className="p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  if (item.type === "conversation") router.push(`/dashboard/${businessId}/conversations`);
                  else router.push(`/dashboard/${businessId}/conversations`);
                }}
              >
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", CHANNEL_COLOR[item.channel] || "bg-muted")}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.customerName}</p>
                  <p className="text-sm text-muted-foreground truncate">{item.lastMessage}</p>
                </div>
                <div className="text-end shrink-0">
                  <span className={cn("text-xs px-2 py-0.5 rounded-full capitalize", CHANNEL_COLOR[item.channel])}>{item.channel}</span>
                  <p className="text-xs text-muted-foreground mt-1">{formatDate(item.lastMessageAt, locale)}</p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
