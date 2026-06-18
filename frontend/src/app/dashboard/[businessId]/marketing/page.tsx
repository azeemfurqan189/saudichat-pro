"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Megaphone,
  Send,
  Calendar,
  Tag,
  Gift,
  Plus,
  Clock,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api, Campaign, PromoCode } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";

type Tab = "broadcast" | "campaigns" | "promo" | "loyalty";

const TABS: { id: Tab; labelEn: string; labelAr: string; icon: typeof Megaphone }[] = [
  { id: "broadcast", labelEn: "Broadcast", labelAr: "بث", icon: Send },
  { id: "campaigns", labelEn: "Campaigns", labelAr: "حملات", icon: Megaphone },
  { id: "promo", labelEn: "Promo Codes", labelAr: "أكواد خصم", icon: Tag },
  { id: "loyalty", labelEn: "Loyalty", labelAr: "الولاء", icon: Gift },
];

export default function MarketingPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const { locale } = useApp();
  const isAr = locale === "ar";
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>("broadcast");
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [promoForm, setPromoForm] = useState({
    code: "",
    discountType: "percentage",
    discountValue: "",
    maxUses: "",
  });
  const [loyaltyForm, setLoyaltyForm] = useState({
    name: "",
    nameAr: "",
    pointsRequired: "",
    description: "",
  });

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ["campaigns", businessId],
    queryFn: async () => {
      const res = await api.getCampaigns(businessId);
      return res.data ?? [];
    },
  });

  const { data: promoCodes = [], isLoading: promoLoading } = useQuery({
    queryKey: ["promo-codes", businessId],
    queryFn: async () => {
      const res = await api.getPromoCodes(businessId);
      return res.data ?? [];
    },
  });

  const { data: loyaltyRewards = [], isLoading: loyaltyLoading } = useQuery({
    queryKey: ["loyalty", businessId],
    queryFn: async () => {
      const res = await api.getLoyaltyRewards(businessId);
      return res.data ?? [];
    },
  });

  const createCampaignMutation = useMutation({
    mutationFn: (data: Partial<Campaign>) => api.createCampaign(businessId, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", businessId] });
      const sent = (res as { sendResult?: { sent: number } }).sendResult?.sent;
      if (sent != null) {
        toast.success(isAr ? `تم الإرسال إلى ${sent} عميل` : `Sent to ${sent} customers`);
      } else {
        toast.success(isAr ? "تم الجدولة" : "Broadcast scheduled");
      }
      setBroadcastMsg("");
      setScheduleDate("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createLoyaltyMutation = useMutation({
    mutationFn: (data: Partial<{ name: string; nameAr: string; pointsRequired: number; description: string; isActive: boolean }>) =>
      api.createLoyaltyReward(businessId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty", businessId] });
      toast.success(isAr ? "تم إنشاء المكافأة" : "Reward created");
      setLoyaltyForm({ name: "", nameAr: "", pointsRequired: "", description: "" });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createPromoMutation = useMutation({
    mutationFn: (data: Partial<PromoCode>) => api.createPromoCode(businessId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promo-codes", businessId] });
      toast.success(isAr ? "تم إنشاء الكود" : "Promo code created");
      setPromoForm({ code: "", discountType: "percentage", discountValue: "", maxUses: "" });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const broadcastHistory = campaigns.filter((c) => c.type === "broadcast" || c.type === "BROADCAST");
  const regularCampaigns = campaigns.filter((c) => c.type !== "broadcast" && c.type !== "BROADCAST");

  const handleBroadcast = (scheduled: boolean) => {
    if (!broadcastMsg.trim()) {
      toast.error(isAr ? "اكتب الرسالة" : "Enter a message");
      return;
    }
    createCampaignMutation.mutate({
      name: isAr ? "بث جماعي" : "Broadcast",
      type: "broadcast",
      message: broadcastMsg,
      status: scheduled ? "SCHEDULED" : "ACTIVE",
      scheduledAt: scheduled && scheduleDate ? scheduleDate : undefined,
    });
  };

  const handleCreatePromo = (e: React.FormEvent) => {
    e.preventDefault();
    createPromoMutation.mutate({
      code: promoForm.code.toUpperCase(),
      discountType: promoForm.discountType,
      discountValue: parseFloat(promoForm.discountValue) || 0,
      maxUses: promoForm.maxUses ? parseInt(promoForm.maxUses, 10) : undefined,
      isActive: true,
      usedCount: 0,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t(locale, "dashboard", "marketing")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isAr ? "إدارة الحملات والعروض" : "Manage campaigns and promotions"}
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(({ id, labelEn, labelAr, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
              tab === id
                ? "bg-gradient-primary text-white shadow-glow-green"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            )}
          >
            <Icon className="w-4 h-4" />
            {isAr ? labelAr : labelEn}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
        >
          {tab === "broadcast" && (
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{isAr ? "إنشاء بث" : "Compose Broadcast"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <textarea
                    value={broadcastMsg}
                    onChange={(e) => setBroadcastMsg(e.target.value)}
                    rows={6}
                    placeholder={isAr ? "اكتب رسالتك هنا..." : "Write your message..."}
                    className="w-full rounded-xl border border-border bg-white/50 dark:bg-gray-900/50 p-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-none"
                  />
                  <Input
                    label={isAr ? "جدولة (اختياري)" : "Schedule (optional)"}
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                  />
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleBroadcast(false)}
                      loading={createCampaignMutation.isPending}
                      className="flex-1"
                    >
                      <Send className="w-4 h-4" />
                      {isAr ? "إرسال الآن" : "Send Now"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleBroadcast(true)}
                      disabled={!scheduleDate}
                      className="flex-1"
                    >
                      <Calendar className="w-4 h-4" />
                      {isAr ? "جدولة" : "Schedule"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{isAr ? "معاينة" : "Preview"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-w-xs mx-auto bg-[#e5ddd5] dark:bg-gray-800 rounded-2xl p-4 shadow-inner">
                    <div className="bg-white dark:bg-gray-700 rounded-xl p-3 text-sm shadow-sm">
                      {broadcastMsg || (isAr ? "معاينة الرسالة..." : "Message preview...")}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 text-end">12:00 ✓✓</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    {isAr ? "سجل البث" : "Broadcast History"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {campaignsLoading ? (
                    <TableSkeleton rows={3} />
                  ) : broadcastHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t(locale, "dashboard", "noData")}</p>
                  ) : (
                    <div className="space-y-2">
                      {broadcastHistory.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-muted/40 text-sm"
                        >
                          <div>
                            <p className="font-medium line-clamp-1">{c.message}</p>
                            <p className="text-xs text-muted-foreground capitalize">{c.status}</p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {c.sentAt || c.scheduledAt
                              ? formatDate(c.sentAt || c.scheduledAt!, locale)
                              : "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {tab === "campaigns" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{isAr ? "الحملات" : "Campaigns"}</CardTitle>
                <Button size="sm">
                  <Plus className="w-4 h-4" />
                  {t(locale, "dashboard", "add")}
                </Button>
              </CardHeader>
              <CardContent>
                {campaignsLoading ? (
                  <TableSkeleton rows={4} />
                ) : regularCampaigns.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t(locale, "dashboard", "noData")}</p>
                ) : (
                  <div className="space-y-3">
                    {regularCampaigns.map((c) => (
                      <CampaignRow key={c.id} campaign={c} locale={locale} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {tab === "promo" && (
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{isAr ? "إنشاء كود خصم" : "Create Promo Code"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreatePromo} className="space-y-4">
                    <Input
                      label={isAr ? "الكود" : "Code"}
                      value={promoForm.code}
                      onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value })}
                      required
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-muted-foreground">
                          {isAr ? "نوع الخصم" : "Type"}
                        </label>
                        <select
                          value={promoForm.discountType}
                          onChange={(e) =>
                            setPromoForm({ ...promoForm, discountType: e.target.value })
                          }
                          className="w-full h-11 rounded-xl border border-border bg-white/50 dark:bg-gray-900/50 px-4 text-sm"
                        >
                          <option value="percentage">{isAr ? "نسبة %" : "Percentage %"}</option>
                          <option value="fixed">{isAr ? "مبلغ ثابت" : "Fixed Amount"}</option>
                        </select>
                      </div>
                      <Input
                        label={isAr ? "القيمة" : "Value"}
                        type="number"
                        value={promoForm.discountValue}
                        onChange={(e) =>
                          setPromoForm({ ...promoForm, discountValue: e.target.value })
                        }
                        required
                      />
                    </div>
                    <Input
                      label={isAr ? "حد الاستخدام" : "Max Uses"}
                      type="number"
                      value={promoForm.maxUses}
                      onChange={(e) => setPromoForm({ ...promoForm, maxUses: e.target.value })}
                    />
                    <Button type="submit" loading={createPromoMutation.isPending} className="w-full">
                      {t(locale, "dashboard", "add")}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{isAr ? "أكواد نشطة" : "Active Codes"}</CardTitle>
                </CardHeader>
                <CardContent>
                  {promoLoading ? (
                    <TableSkeleton rows={3} />
                  ) : promoCodes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t(locale, "dashboard", "noData")}</p>
                  ) : (
                    <div className="space-y-2">
                      {promoCodes.map((p) => (
                        <PromoRow key={p.id} promo={p} isAr={isAr} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {tab === "loyalty" && (
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{isAr ? "إضافة مكافأة" : "Add Reward"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      createLoyaltyMutation.mutate({
                        name: loyaltyForm.name,
                        nameAr: loyaltyForm.nameAr || loyaltyForm.name,
                        pointsRequired: parseInt(loyaltyForm.pointsRequired, 10) || 0,
                        description: loyaltyForm.description,
                        isActive: true,
                      });
                    }}
                    className="space-y-4"
                  >
                    <Input
                      label={isAr ? "الاسم (EN)" : "Name (EN)"}
                      value={loyaltyForm.name}
                      onChange={(e) => setLoyaltyForm({ ...loyaltyForm, name: e.target.value })}
                      required
                    />
                    <Input
                      label={isAr ? "الاسم (AR)" : "Name (AR)"}
                      value={loyaltyForm.nameAr}
                      onChange={(e) => setLoyaltyForm({ ...loyaltyForm, nameAr: e.target.value })}
                    />
                    <Input
                      label={isAr ? "النقاط المطلوبة" : "Points Required"}
                      type="number"
                      value={loyaltyForm.pointsRequired}
                      onChange={(e) => setLoyaltyForm({ ...loyaltyForm, pointsRequired: e.target.value })}
                      required
                    />
                    <Input
                      label={isAr ? "الوصف" : "Description"}
                      value={loyaltyForm.description}
                      onChange={(e) => setLoyaltyForm({ ...loyaltyForm, description: e.target.value })}
                    />
                    <Button type="submit" loading={createLoyaltyMutation.isPending} className="w-full">
                      {t(locale, "dashboard", "add")}
                    </Button>
                  </form>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{isAr ? "برنامج الولاء" : "Loyalty Program"}</CardTitle>
                </CardHeader>
                <CardContent>
                  {loyaltyLoading ? (
                    <TableSkeleton rows={4} />
                  ) : loyaltyRewards.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t(locale, "dashboard", "noData")}</p>
                  ) : (
                    <div className="grid gap-4">
                      {loyaltyRewards.map((reward) => (
                        <div
                          key={reward.id}
                          className="p-4 rounded-xl bg-muted/40 flex items-center gap-4"
                        >
                          <div className="w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center">
                            <Gift className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <p className="font-semibold">
                              {isAr && reward.nameAr ? reward.nameAr : reward.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {reward.pointsRequired} {isAr ? "نقطة" : "points"}
                            </p>
                          </div>
                          {reward.isActive && (
                            <CheckCircle className="w-5 h-5 text-primary ms-auto" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function CampaignRow({ campaign, locale }: { campaign: Campaign; locale: string }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/40">
      <div>
        <p className="font-medium">{campaign.name}</p>
        <p className="text-xs text-muted-foreground capitalize">{campaign.status}</p>
      </div>
      {campaign.stats && (
        <div className="flex gap-4 text-xs text-muted-foreground">
          {Object.entries(campaign.stats).map(([k, v]) => (
            <span key={k}>
              {k}: {v}
            </span>
          ))}
        </div>
      )}
      {(campaign.sentAt || campaign.scheduledAt) && (
        <span className="text-xs text-muted-foreground">
          {formatDate(campaign.sentAt || campaign.scheduledAt!, locale)}
        </span>
      )}
    </div>
  );
}

function PromoRow({ promo, isAr }: { promo: PromoCode; isAr: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
      <code className="font-bold text-primary">{promo.code}</code>
      <span className="text-sm">
        {promo.discountType === "percentage"
          ? `${promo.discountValue}%`
          : `${promo.discountValue} ${isAr ? "ر.س" : "SAR"}`}
      </span>
      <span className="text-xs text-muted-foreground">
        {promo.usedCount}
        {promo.maxUses ? `/${promo.maxUses}` : ""} {isAr ? "استخدام" : "uses"}
      </span>
    </div>
  );
}
