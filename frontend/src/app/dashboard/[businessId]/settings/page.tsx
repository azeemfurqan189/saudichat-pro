"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  MessageCircle,
  Clock,
  Zap,
  Bell,
  Users,
  CreditCard,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api, AutoReply, Staff } from "@/lib/api";
import { cn } from "@/lib/utils";

type Tab = "general" | "whatsapp" | "hours" | "autoReplies" | "notifications" | "team" | "billing";

const TABS: { id: Tab; labelEn: string; labelAr: string; icon: typeof Settings }[] = [
  { id: "general", labelEn: "General", labelAr: "عام", icon: Settings },
  { id: "whatsapp", labelEn: "WhatsApp", labelAr: "واتساب", icon: MessageCircle },
  { id: "hours", labelEn: "Working Hours", labelAr: "ساعات العمل", icon: Clock },
  { id: "autoReplies", labelEn: "Auto-Replies", labelAr: "ردود تلقائية", icon: Zap },
  { id: "notifications", labelEn: "Notifications", labelAr: "إشعارات", icon: Bell },
  { id: "team", labelEn: "Team", labelAr: "الفريق", icon: Users },
  { id: "billing", labelEn: "Billing", labelAr: "الفواتير", icon: CreditCard },
];

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export default function SettingsPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const { locale } = useApp();
  const isAr = locale === "ar";
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>("general");
  const [generalForm, setGeneralForm] = useState({ name: "", nameAr: "", description: "" });
  const [whatsappForm, setWhatsappForm] = useState({ phoneId: "", token: "", number: "" });
  const [hours, setHours] = useState(
    DAYS.map((_, i) => ({ day: i, open: "09:00", close: "22:00", closed: i === 5 }))
  );
  const [autoReplyForm, setAutoReplyForm] = useState({
    keywords: "",
    responseAr: "",
    responseEn: "",
  });

  const { data: business, isLoading: businessLoading } = useQuery({
    queryKey: ["business", businessId],
    queryFn: async () => {
      const res = await api.getBusiness(businessId);
      return res.data;
    },
  });

  useEffect(() => {
    if (business) {
      setGeneralForm({
        name: business.name || "",
        nameAr: business.nameAr || "",
        description: business.description || "",
      });
      setWhatsappForm((prev) => ({
        ...prev,
        number: business.whatsappNumber || "",
      }));
    }
  }, [business]);

  const { data: autoReplies = [], isLoading: autoLoading } = useQuery({
    queryKey: ["auto-replies", businessId],
    queryFn: async () => {
      const res = await api.getAutoReplies(businessId);
      return res.data ?? [];
    },
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["staff", businessId],
    queryFn: async () => {
      const res = await api.getStaff(businessId);
      return res.data ?? [];
    },
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", businessId],
    queryFn: async () => {
      const res = await api.getNotifications(businessId);
      return res.data ?? [];
    },
  });

  const updateBusinessMutation = useMutation({
    mutationFn: (data: Parameters<typeof api.updateBusiness>[1]) =>
      api.updateBusiness(businessId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business", businessId] });
      toast.success(isAr ? "تم الحفظ" : "Saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const testWhatsAppMutation = useMutation({
    mutationFn: () => api.testWhatsApp(businessId, whatsappForm.phoneId, whatsappForm.token),
    onSuccess: () => toast.success(isAr ? "الاتصال ناجح" : "Connection successful"),
    onError: (err: Error) => toast.error(err.message),
  });

  const createAutoReplyMutation = useMutation({
    mutationFn: (data: Partial<AutoReply>) => api.createAutoReply(businessId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auto-replies", businessId] });
      setAutoReplyForm({ keywords: "", responseAr: "", responseEn: "" });
      toast.success(isAr ? "تمت الإضافة" : "Rule added");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteAutoReplyMutation = useMutation({
    mutationFn: (id: string) => api.deleteAutoReply(businessId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auto-replies", businessId] });
      toast.success(isAr ? "تم الحذف" : "Deleted");
    },
  });

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    updateBusinessMutation.mutate(generalForm);
  };

  const handleSaveWhatsApp = () => {
    updateBusinessMutation.mutate({
      whatsappNumber: whatsappForm.number,
      whatsappPhoneId: whatsappForm.phoneId,
      whatsappToken: whatsappForm.token,
    });
  };

  const handleAddAutoReply = (e: React.FormEvent) => {
    e.preventDefault();
    createAutoReplyMutation.mutate({
      triggerKeywords: autoReplyForm.keywords.split(",").map((k) => k.trim()).filter(Boolean),
      triggerType: "keyword",
      responseAr: autoReplyForm.responseAr,
      responseEn: autoReplyForm.responseEn,
      priority: autoReplies.length,
      isActive: true,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t(locale, "dashboard", "settings")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isAr ? "إعدادات المنشأة" : "Business configuration"}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <nav className="lg:w-56 shrink-0 flex lg:flex-col gap-2 overflow-x-auto pb-1 lg:pb-0">
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
        </nav>

        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
            >
              {tab === "general" && (
                <Card>
                  <CardHeader>
                    <CardTitle>{isAr ? "معلومات عامة" : "General Information"}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {businessLoading ? (
                      <TableSkeleton rows={3} />
                    ) : (
                      <form onSubmit={handleSaveGeneral} className="space-y-4 max-w-lg">
                        <Input
                          label={isAr ? "اسم المنشأة (EN)" : "Business Name (EN)"}
                          value={generalForm.name}
                          onChange={(e) => setGeneralForm({ ...generalForm, name: e.target.value })}
                        />
                        <Input
                          label={isAr ? "اسم المنشأة (AR)" : "Business Name (AR)"}
                          value={generalForm.nameAr}
                          onChange={(e) => setGeneralForm({ ...generalForm, nameAr: e.target.value })}
                        />
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-muted-foreground">
                            {isAr ? "الوصف" : "Description"}
                          </label>
                          <textarea
                            value={generalForm.description}
                            onChange={(e) =>
                              setGeneralForm({ ...generalForm, description: e.target.value })
                            }
                            rows={3}
                            className="w-full rounded-xl border border-border bg-white/50 dark:bg-gray-900/50 p-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                          />
                        </div>
                        <Button type="submit" loading={updateBusinessMutation.isPending}>
                          {t(locale, "dashboard", "save")}
                        </Button>
                      </form>
                    )}
                  </CardContent>
                </Card>
              )}

              {tab === "whatsapp" && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t(locale, "setup", "connectWhatsApp")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 max-w-lg">
                    <Input
                      label={isAr ? "رقم واتساب" : "WhatsApp Number"}
                      value={whatsappForm.number}
                      onChange={(e) => setWhatsappForm({ ...whatsappForm, number: e.target.value })}
                      dir="ltr"
                    />
                    <Input
                      label="Phone ID"
                      value={whatsappForm.phoneId}
                      onChange={(e) => setWhatsappForm({ ...whatsappForm, phoneId: e.target.value })}
                      dir="ltr"
                    />
                    <Input
                      label="Access Token"
                      type="password"
                      value={whatsappForm.token}
                      onChange={(e) => setWhatsappForm({ ...whatsappForm, token: e.target.value })}
                      dir="ltr"
                    />
                    <div className="flex gap-3">
                      <Button onClick={handleSaveWhatsApp} loading={updateBusinessMutation.isPending}>
                        {t(locale, "dashboard", "save")}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => testWhatsAppMutation.mutate()}
                        loading={testWhatsAppMutation.isPending}
                      >
                        {isAr ? "اختبار الاتصال" : "Test Connection"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {tab === "hours" && (
                <Card>
                  <CardHeader>
                    <CardTitle>{isAr ? "ساعات العمل" : "Working Hours"}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {hours.map((h, i) => (
                      <div
                        key={i}
                        className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-muted/40"
                      >
                        <span className="w-24 text-sm font-medium">
                          {isAr ? DAYS_AR[i] : DAYS[i]}
                        </span>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={!h.closed}
                            onChange={(e) => {
                              const next = [...hours];
                              next[i] = { ...next[i], closed: !e.target.checked };
                              setHours(next);
                            }}
                            className="rounded accent-primary"
                          />
                          {isAr ? "مفتوح" : "Open"}
                        </label>
                        {!h.closed && (
                          <>
                            <input
                              type="time"
                              value={h.open}
                              onChange={(e) => {
                                const next = [...hours];
                                next[i] = { ...next[i], open: e.target.value };
                                setHours(next);
                              }}
                              className="h-9 rounded-lg border border-border px-2 text-sm"
                            />
                            <span>—</span>
                            <input
                              type="time"
                              value={h.close}
                              onChange={(e) => {
                                const next = [...hours];
                                next[i] = { ...next[i], close: e.target.value };
                                setHours(next);
                              }}
                              className="h-9 rounded-lg border border-border px-2 text-sm"
                            />
                          </>
                        )}
                      </div>
                    ))}
                    <Button
                      onClick={() =>
                        updateBusinessMutation.mutate({ settings: { workingHours: hours } })
                      }
                    >
                      {t(locale, "dashboard", "save")}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {tab === "autoReplies" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>{isAr ? "إضافة رد تلقائي" : "Add Auto-Reply"}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleAddAutoReply} className="space-y-4 max-w-lg">
                        <Input
                          label={isAr ? "كلمات مفتاحية (مفصولة بفاصلة)" : "Keywords (comma-separated)"}
                          value={autoReplyForm.keywords}
                          onChange={(e) =>
                            setAutoReplyForm({ ...autoReplyForm, keywords: e.target.value })
                          }
                        />
                        <Input
                          label={isAr ? "الرد (عربي)" : "Response (Arabic)"}
                          value={autoReplyForm.responseAr}
                          onChange={(e) =>
                            setAutoReplyForm({ ...autoReplyForm, responseAr: e.target.value })
                          }
                        />
                        <Input
                          label={isAr ? "الرد (إنجليزي)" : "Response (English)"}
                          value={autoReplyForm.responseEn}
                          onChange={(e) =>
                            setAutoReplyForm({ ...autoReplyForm, responseEn: e.target.value })
                          }
                        />
                        <Button type="submit" loading={createAutoReplyMutation.isPending}>
                          <Plus className="w-4 h-4" />
                          {t(locale, "dashboard", "add")}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>{isAr ? "القواعد النشطة" : "Active Rules"}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {autoLoading ? (
                        <TableSkeleton rows={3} />
                      ) : autoReplies.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t(locale, "dashboard", "noData")}</p>
                      ) : (
                        <div className="space-y-2">
                          {autoReplies.map((rule) => (
                            <div
                              key={rule.id}
                              className="flex items-start justify-between p-3 rounded-xl bg-muted/40"
                            >
                              <div>
                                <p className="text-sm font-medium">
                                  {rule.triggerKeywords.join(", ")}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {isAr ? rule.responseAr : rule.responseEn}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteAutoReplyMutation.mutate(rule.id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {tab === "notifications" && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t(locale, "dashboard", "notifications")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { key: "orders", labelEn: "New Orders", labelAr: "طلبات جديدة" },
                      { key: "messages", labelEn: "New Messages", labelAr: "رسائل جديدة" },
                      { key: "appointments", labelEn: "Appointments", labelAr: "مواعيد" },
                    ].map((pref) => (
                      <label
                        key={pref.key}
                        className="flex items-center justify-between p-3 rounded-xl bg-muted/40 cursor-pointer"
                      >
                        <span className="text-sm font-medium">
                          {isAr ? pref.labelAr : pref.labelEn}
                        </span>
                        <input type="checkbox" defaultChecked className="rounded accent-primary" />
                      </label>
                    ))}
                    <p className="text-xs text-muted-foreground">
                      {notifications.length} {isAr ? "إشعار في السجل" : "notifications in history"}
                    </p>
                  </CardContent>
                </Card>
              )}

              {tab === "team" && (
                <Card>
                  <CardHeader>
                    <CardTitle>{isAr ? "أعضاء الفريق" : "Team Members"}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {staff.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t(locale, "dashboard", "noData")}</p>
                    ) : (
                      <div className="space-y-2">
                        {(staff as Staff[]).map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-3 rounded-xl bg-muted/40"
                          >
                            <div>
                              <p className="font-medium">{member.name}</p>
                              <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                            </div>
                            <span
                              className={cn(
                                "text-xs px-2 py-0.5 rounded-full",
                                member.isActive
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {member.isActive ? (isAr ? "نشط" : "Active") : isAr ? "غير نشط" : "Inactive"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {tab === "billing" && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t(locale, "dashboard", "billing")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {isAr ? "الخطة الحالية:" : "Current plan:"}{" "}
                      <span className="font-semibold text-foreground capitalize">
                        {business?.subscriptionPlan || "Starter"}
                      </span>
                    </p>
                    <Button variant="outline" onClick={() => window.location.href = `/dashboard/${businessId}/billing`}>
                      {isAr ? "إدارة الفواتير" : "Manage Billing"}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
