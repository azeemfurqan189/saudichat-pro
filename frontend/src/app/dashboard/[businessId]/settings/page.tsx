"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
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
  Bot,
  Store,
  Globe,
  Share2,
  Shield,
  Mail,
  Smartphone,
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
import { useIsManpowerTheme } from "@/hooks/use-is-manpower-theme";
import { ManpowerHeroHeader, ManpowerPageShell } from "@/components/dashboard/manpower-shell";
import { IndustryProfileForm } from "@/components/dashboard/industry-profile-form";
import { WebsiteImportPanel } from "@/components/dashboard/website-import-panel";
import {
  getProfileTabLabel,
  getAutoReplySuggestions,
  getProfileFields,
  normalizeBusinessType,
} from "@/lib/industry-config";

type Tab =
  | "general"
  | "profile"
  | "website"
  | "whatsapp"
  | "integrations"
  | "aiBot"
  | "hours"
  | "autoReplies"
  | "notifications"
  | "team"
  | "compliance"
  | "billing";

const BASE_TABS: { id: Tab; labelEn: string; labelAr: string; icon: typeof Settings }[] = [
  { id: "general", labelEn: "General", labelAr: "عام", icon: Settings },
  { id: "profile", labelEn: "Profile", labelAr: "الملف", icon: Store },
  { id: "website", labelEn: "Website Import", labelAr: "استيراد الموقع", icon: Globe },
  { id: "whatsapp", labelEn: "WhatsApp", labelAr: "واتساب", icon: MessageCircle },
  { id: "integrations", labelEn: "Integrations", labelAr: "التكاملات", icon: Share2 },
  { id: "aiBot", labelEn: "AI Bot", labelAr: "بوت AI", icon: Bot },
  { id: "hours", labelEn: "Working Hours", labelAr: "ساعات العمل", icon: Clock },
  { id: "autoReplies", labelEn: "Auto-Replies", labelAr: "ردود تلقائية", icon: Zap },
  { id: "notifications", labelEn: "Notifications", labelAr: "إشعارات", icon: Bell },
  { id: "team", labelEn: "Team", labelAr: "الفريق", icon: Users },
  { id: "compliance", labelEn: "PDPL Compliance", labelAr: "امتثال PDPL", icon: Shield },
  { id: "billing", labelEn: "Billing", labelAr: "الفواتير", icon: CreditCard },
];

function formatWorkingHoursText(
  hours: Array<{ day: number; open: string; close: string; closed: boolean }>,
  dayLabels: string[]
): string {
  return hours
    .map((h, i) => {
      if (h.closed) return `${dayLabels[i]}: Closed`;
      return `${dayLabels[i]}: ${h.open} - ${h.close}`;
    })
    .join("; ");
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export default function SettingsPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const searchParams = useSearchParams();
  const { locale } = useApp();
  const isAr = locale === "ar";
  const queryClient = useQueryClient();

  const initialTab = searchParams.get("tab");
  const validTabs: Tab[] = [
    "general", "profile", "website", "whatsapp", "integrations", "aiBot", "hours",
    "autoReplies", "notifications", "team", "compliance", "billing",
  ];
  const [tab, setTab] = useState<Tab>(
    validTabs.includes(initialTab as Tab) ? (initialTab as Tab) : "general"
  );
  const [generalForm, setGeneralForm] = useState({ name: "", nameAr: "", description: "" });
  const [profileSettings, setProfileSettings] = useState<Record<string, string>>({});
  const [whatsappForm, setWhatsappForm] = useState({
    phoneId: "",
    token: "",
    number: "",
    provider: "whapi" as "meta" | "whapi",
  });
  const [botForm, setBotForm] = useState({
    greeting: "",
    language: "both",
  });
  const [hours, setHours] = useState(
    DAYS.map((_, i) => ({ day: i, open: "09:00", close: "22:00", closed: i === 5 }))
  );
  const [autoReplyForm, setAutoReplyForm] = useState({
    keywords: "",
    responseAr: "",
    responseEn: "",
  });
  const [channelForms, setChannelForms] = useState({
    email: { smtpHost: "", smtpUser: "", smtpPass: "", fromEmail: "" },
    sms: { apiKey: "", senderId: "" },
    instagram: { pageId: "", accessToken: "" },
    facebook: { pageId: "", accessToken: "" },
  });
  const [pdplForm, setPdplForm] = useState({ enabled: false, dataRetentionDays: 365 });

  const { data: business, isLoading: businessLoading } = useQuery({
    queryKey: ["business", businessId],
    queryFn: async () => {
      const res = await api.getBusiness(businessId);
      return res.data;
    },
  });
  const isManpower = useIsManpowerTheme(businessId, business?.type);

  useEffect(() => {
    if (business) {
      setGeneralForm({
        name: business.name || "",
        nameAr: business.nameAr || "",
        description: business.description || "",
      });
      const settings = (business.settings || {}) as Record<string, unknown>;
      const type = normalizeBusinessType(business.type);
      const profileKeys = getProfileFields(type).map((f) => f.key);
      const profile: Record<string, string> = {};
      for (const key of profileKeys) {
        const v = settings[key];
        if (v !== undefined && v !== null) profile[key] = String(v);
      }
      setProfileSettings(profile);

      const savedHours = settings.workingHours;
      if (Array.isArray(savedHours) && savedHours.length === 7) {
        setHours(
          savedHours.map((h: { day?: number; open?: string; close?: string; closed?: boolean }, i: number) => ({
            day: h.day ?? i,
            open: h.open || "09:00",
            close: h.close || "22:00",
            closed: h.closed ?? false,
          }))
        );
      }

      const waSettings = settings;
      setWhatsappForm({
        number: business.whatsappNumber || "",
        phoneId: business.whatsappPhoneId || "",
        token: "",
        provider: waSettings.whatsappProvider === "meta" ? "meta" : "whapi",
      });
      setBotForm({
        greeting: String(settings.botGreeting || ""),
        language: String(settings.botLanguage || "both"),
      });
    }
  }, [business]);

  const businessType = normalizeBusinessType(business?.type);
  const tabs = BASE_TABS.map((t) =>
    t.id === "profile"
      ? {
          ...t,
          labelEn: getProfileTabLabel(businessType, "en"),
          labelAr: getProfileTabLabel(businessType, "ar"),
        }
      : t
  );

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

  const { data: channels } = useQuery({
    queryKey: ["channels", businessId],
    queryFn: async () => (await api.getChannels(businessId)).data,
  });

  const { data: compliance } = useQuery({
    queryKey: ["compliance", businessId],
    queryFn: async () => (await api.getComplianceStatus(businessId)).data,
  });

  useEffect(() => {
    if (channels) {
      setChannelForms({
        email: {
          smtpHost: String(channels.email?.config?.smtpHost || ""),
          smtpUser: String(channels.email?.config?.smtpUser || ""),
          smtpPass: "",
          fromEmail: String(channels.email?.config?.fromEmail || ""),
        },
        sms: {
          apiKey: "",
          senderId: String(channels.sms?.config?.senderId || ""),
        },
        instagram: {
          pageId: String(channels.instagram?.config?.pageId || ""),
          accessToken: "",
        },
        facebook: {
          pageId: String(channels.facebook?.config?.pageId || ""),
          accessToken: "",
        },
      });
    }
  }, [channels]);

  useEffect(() => {
    if (compliance) {
      setPdplForm({
        enabled: compliance.pdplEnabled,
        dataRetentionDays: compliance.dataRetentionDays,
      });
    }
  }, [compliance]);

  const updateChannelMutation = useMutation({
    mutationFn: ({ channel, data }: { channel: string; data: { isEnabled?: boolean; config?: Record<string, unknown> } }) =>
      api.updateChannel(businessId, channel, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels", businessId] });
      toast.success(isAr ? "تم الحفظ" : "Channel saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateComplianceMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.updateComplianceSettings(businessId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compliance", businessId] });
      toast.success(isAr ? "تم حفظ إعدادات PDPL" : "PDPL settings saved");
    },
    onError: (err: Error) => toast.error(err.message),
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
    onSuccess: (res) => {
      if (res.success) {
        toast.success(res.message || (isAr ? "الاتصال ناجح" : "Connection successful"));
      } else {
        toast.error(res.message || (isAr ? "فشل الاتصال" : "Connection failed"));
      }
    },
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

  const { data: aiSettings } = useQuery({
    queryKey: ["ai-settings", businessId],
    queryFn: async () => (await api.getAiSettings(businessId)).data,
  });

  const updateAiSettingsMutation = useMutation({
    mutationFn: (data: Parameters<typeof api.updateAiSettings>[1]) => api.updateAiSettings(businessId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-settings", businessId] });
      toast.success(isAr ? "تم حفظ إعدادات البوت" : "AI Bot settings saved");
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

  const handleSaveProfile = () => {
    const prev = (business?.settings || {}) as Record<string, unknown>;
    updateBusinessMutation.mutate({
      settings: { ...prev, ...profileSettings },
    });
  };

  const handleSaveHours = () => {
    const prev = (business?.settings || {}) as Record<string, unknown>;
    const dayLabels = isAr ? DAYS_AR : DAYS;
    updateBusinessMutation.mutate({
      settings: {
        ...prev,
        workingHours: hours,
        workingHoursText: formatWorkingHoursText(hours, dayLabels),
      },
    });
  };

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    updateBusinessMutation.mutate(generalForm);
  };

  const handleSaveWhatsApp = () => {
    const prev = (business?.settings || {}) as Record<string, unknown>;
    updateBusinessMutation.mutate({
      whatsappNumber: whatsappForm.number,
      whatsappPhoneId: whatsappForm.phoneId.trim(),
      ...(whatsappForm.token.trim() ? { whatsappToken: whatsappForm.token.trim() } : {}),
      settings: { ...prev, whatsappProvider: whatsappForm.provider },
    });
  };

  const handleSaveBot = () => {
    const prev = (business?.settings || {}) as Record<string, unknown>;
    updateBusinessMutation.mutate({
      settings: {
        ...prev,
        botGreeting: botForm.greeting.trim() || undefined,
        botLanguage: botForm.language,
      },
    });
  };

  const handleAddAutoReply = (e: React.FormEvent) => {
    e.preventDefault();
    createAutoReplyMutation.mutate({
      triggerKeywords: autoReplyForm.keywords.split(",").map((k) => k.trim()).filter(Boolean),
      triggerType: "CONTAINS",
      responseAr: autoReplyForm.responseAr,
      responseEn: autoReplyForm.responseEn,
      priority: autoReplies.length,
      isActive: true,
    });
  };

  const settingsContent = (
    <>
      {isManpower ? (
        <ManpowerHeroHeader
          title={t(locale, "dashboard", "settings")}
          subtitle={isAr ? "إعدادات المنشأة" : "Business configuration"}
          icon={Settings}
        />
      ) : (
        <div>
          <h1 className="text-2xl font-bold">{t(locale, "dashboard", "settings")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAr ? "إعدادات المنشأة" : "Business configuration"}
          </p>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        <nav className="lg:w-56 shrink-0 flex lg:flex-col gap-2 overflow-x-auto pb-1 lg:pb-0">
          {tabs.map(({ id, labelEn, labelAr, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                tab === id
                  ? isManpower
                    ? "bg-[#1D9E75] text-white"
                    : "bg-gradient-primary text-white shadow-glow-green"
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
              {tab === "profile" && (
                <IndustryProfileForm
                  businessType={businessType}
                  settings={profileSettings}
                  locale={isAr ? "ar" : "en"}
                  onChange={(key, value) => setProfileSettings((p) => ({ ...p, [key]: value }))}
                  onSave={handleSaveProfile}
                  saving={updateBusinessMutation.isPending}
                />
              )}

              {tab === "website" && (
                <WebsiteImportPanel businessId={businessId} locale={isAr ? "ar" : "en"} />
              )}

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

              {tab === "aiBot" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="w-5 h-5" />
                      {isAr ? "بوت الذكاء الاصطناعي" : "AI Bot"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 max-w-lg">
                    <p className="text-sm text-muted-foreground">
                      {isAr
                        ? "رسالة الترحيب ولغة البوت — يمكن تعديلها في أي وقت"
                        : "Greeting message and bot language — edit anytime"}
                    </p>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-muted-foreground">
                        {isAr ? "رسالة الترحيب" : "Greeting message"}
                      </label>
                      <textarea
                        value={botForm.greeting}
                        onChange={(e) => setBotForm({ ...botForm, greeting: e.target.value })}
                        rows={3}
                        placeholder={isAr ? "مرحباً! كيف أقدر أساعدك؟" : "Hello! How can I help you?"}
                        className="w-full rounded-xl border border-border bg-background p-3 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-muted-foreground">
                        {isAr ? "لغة البوت" : "Bot language"}
                      </label>
                      <select
                        value={botForm.language}
                        onChange={(e) => setBotForm({ ...botForm, language: e.target.value })}
                        className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
                      >
                        <option value="both">{isAr ? "عربي + إنجليزي" : "Arabic + English"}</option>
                        <option value="ar">{isAr ? "عربي فقط" : "Arabic only"}</option>
                        <option value="en">{isAr ? "إنجليزي فقط" : "English only"}</option>
                      </select>
                    </div>
                    <Button onClick={handleSaveBot} loading={updateBusinessMutation.isPending}>
                      {t(locale, "dashboard", "save")}
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      {isAr
                        ? "تحكم في البوت، المعرفة، واختبار الردود. إذا لم ترَ «AI Bot» في القائمة الجانبية، استخدم هذا القسم أو الرابط أدناه."
                        : "Control the bot, knowledge base, and test replies. If you don't see AI Bot in the sidebar, use this tab or the link below."}
                    </p>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={aiSettings?.aiPaused === true}
                        onChange={(e) => updateAiSettingsMutation.mutate({ aiPaused: e.target.checked })}
                        className="rounded accent-primary"
                      />
                      {isAr ? "إيقاف AI (ردود تلقائية فقط)" : "Pause AI (auto-replies only)"}
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {aiSettings?.aiPaused
                        ? isAr
                          ? "البوت متوقف — لن يرد GPT"
                          : "AI is paused — GPT will not reply"
                        : isAr
                          ? "البوت نشط — GPT يرد على العملاء"
                          : "AI is active — GPT replies to customers"}
                    </p>
                    <Link href={`/dashboard/${businessId}/ai`}>
                      <Button className="btn-primary w-full sm:w-auto">
                        {isAr ? "فتح صفحة AI Bot الكاملة" : "Open full AI Bot page"}
                      </Button>
                    </Link>
                    <ul className="text-sm text-muted-foreground list-disc ps-5 space-y-1">
                      <li>{isAr ? "Catalog → أضف منتجات للقائمة" : "Catalog → add products for menu"}</li>
                      <li>{isAr ? "General → أضف وصف المنشأة" : "General tab → add business description"}</li>
                      <li>{isAr ? "AI Bot → Knowledge → FAQs" : "AI Bot page → Knowledge → add FAQs"}</li>
                    </ul>
                  </CardContent>
                </Card>
              )}

              {tab === "whatsapp" && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t(locale, "setup", "connectWhatsApp")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 max-w-lg">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        {isAr ? "مزود واتساب" : "WhatsApp provider"}
                      </label>
                      <select
                        value={whatsappForm.provider}
                        onChange={(e) =>
                          setWhatsappForm({
                            ...whatsappForm,
                            provider: e.target.value as "meta" | "whapi",
                          })
                        }
                        className="h-10 w-full max-w-xs rounded-lg border border-border bg-background px-3 text-sm"
                      >
                        <option value="whapi">Whapi.Cloud (panel.whapi.cloud)</option>
                        <option value="meta">Meta Cloud API</option>
                      </select>
                    </div>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 p-4 text-sm space-y-2">
                      <p className="font-medium text-emerald-900 dark:text-emerald-100">
                        {isAr ? "إرشادات الربط" : "Setup guide"}
                      </p>
                      {whatsappForm.provider === "whapi" ? (
                        <ul className="list-disc ps-5 text-emerald-800 dark:text-emerald-200 space-y-1">
                          <li>
                            {isAr
                              ? "Whapi → Channel → Settings: Webhook URL = https://YOUR-BACKEND/webhook/whapi (HTTPS)"
                              : "Whapi → Channel → Settings: Webhook URL = https://YOUR-BACKEND/webhook/whapi (HTTPS, events: messages POST)"}
                          </li>
                          <li>
                            {isAr
                              ? "Channel ID من اللوحة (مثل MANTIS-XXX) → حقل Channel ID أدناه"
                              : "Channel ID from panel (e.g. MANTIS-XXX) → Channel ID field below"}
                          </li>
                          <li>
                            {isAr
                              ? "API Token من اللوحة → حقل Token أدناه (ليس verify token)"
                              : "API Token from panel.whapi.cloud → Token field below"}
                          </li>
                          <li>
                            {isAr
                              ? "اختبر من رقم آخر (ليس نفس الرقم المربوط) — الرسالة تصل للبوت ثم يرد تلقائياً"
                              : "Test from another phone (not the linked business number) — message hits bot and auto-reply"}
                          </li>
                        </ul>
                      ) : (
                        <ul className="list-disc ps-5 text-emerald-800 dark:text-emerald-200 space-y-1">
                          <li>
                            {isAr
                              ? "Railway: webhook /webhook/whatsapp + WHATSAPP_VERIFY_TOKEN"
                              : "Railway: webhook /webhook/whatsapp + WHATSAPP_VERIFY_TOKEN"}
                          </li>
                          <li>
                            {isAr
                              ? "Meta → API Setup: Phone number ID + token (EAA...)"
                              : "Meta → API Setup: Phone number ID + access token (EAA...)"}
                          </li>
                        </ul>
                      )}
                    </div>
                    <Input
                      label={isAr ? "رقم واتساب (عرض فقط)" : "WhatsApp Number (display only)"}
                      value={whatsappForm.number}
                      onChange={(e) => setWhatsappForm({ ...whatsappForm, number: e.target.value })}
                      dir="ltr"
                    />
                    <Input
                      label={
                        whatsappForm.provider === "whapi"
                          ? isAr
                            ? "Channel ID (من Whapi)"
                            : "Channel ID (from Whapi panel)"
                          : isAr
                            ? "Phone number ID (من Meta)"
                            : "Phone number ID (from Meta API Setup)"
                      }
                      value={whatsappForm.phoneId}
                      onChange={(e) => setWhatsappForm({ ...whatsappForm, phoneId: e.target.value })}
                      dir="ltr"
                    />
                    <Input
                      label={
                        whatsappForm.provider === "whapi"
                          ? isAr
                            ? "API Token (من Whapi)"
                            : "API Token (from Whapi panel)"
                          : isAr
                            ? "Access Token (من Meta، EAA...)"
                            : "Access Token (from Meta, starts with EAA)"
                      }
                      type="password"
                      value={whatsappForm.token}
                      onChange={(e) => setWhatsappForm({ ...whatsappForm, token: e.target.value })}
                      dir="ltr"
                    />
                    <p className="text-xs text-muted-foreground">
                      {isAr
                        ? "بعد الحفظ يبقى حقل التوكن فارغاً للأمان — اضغط اختبار الاتصال أو الصق التوكن مرة أخرى"
                        : "After Save, token field stays empty for security — Test Connection uses saved token, or paste token again"}
                    </p>
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
                    <Button onClick={handleSaveHours} loading={updateBusinessMutation.isPending}>
                      {t(locale, "dashboard", "save")}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {tab === "autoReplies" && (
                <div className="space-y-6">
                  <Card className="border-dashed">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        {isAr ? "اقتراحات جاهزة" : "Suggested rules for your industry"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {getAutoReplySuggestions(businessType).map((s) => (
                        <button
                          key={s.keywords}
                          type="button"
                          className="w-full text-start p-3 rounded-xl bg-muted/40 hover:bg-muted text-sm transition-colors"
                          onClick={() =>
                            setAutoReplyForm({
                              keywords: s.keywords,
                              responseEn: s.en,
                              responseAr: s.ar,
                            })
                          }
                        >
                          <span className="font-medium">{s.keywords}</span>
                          <p className="text-xs text-muted-foreground mt-1 truncate">{s.en}</p>
                        </button>
                      ))}
                    </CardContent>
                  </Card>
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

              {tab === "integrations" && (
                <div className="space-y-4">
                  {[
                    {
                      id: "email" as const,
                      labelEn: "Email (SMTP)",
                      labelAr: "البريد الإلكتروني",
                      icon: Mail,
                      fields: [
                        { key: "smtpHost", en: "SMTP Host", ar: "خادم SMTP" },
                        { key: "smtpUser", en: "SMTP User", ar: "المستخدم" },
                        { key: "smtpPass", en: "SMTP Password", ar: "كلمة المرور" },
                        { key: "fromEmail", en: "From Email", ar: "البريد المرسل" },
                      ],
                    },
                    {
                      id: "sms" as const,
                      labelEn: "SMS (Unifonic)",
                      labelAr: "رسائل SMS",
                      icon: Smartphone,
                      fields: [
                        { key: "apiKey", en: "API Key", ar: "مفتاح API" },
                        { key: "senderId", en: "Sender ID", ar: "معرف المرسل" },
                      ],
                    },
                    {
                      id: "instagram" as const,
                      labelEn: "Instagram",
                      labelAr: "إنستغرام",
                      icon: Share2,
                      fields: [
                        { key: "pageId", en: "Page ID", ar: "معرف الصفحة" },
                        { key: "accessToken", en: "Access Token", ar: "رمز الوصول" },
                      ],
                    },
                    {
                      id: "facebook" as const,
                      labelEn: "Facebook",
                      labelAr: "فيسبوك",
                      icon: Share2,
                      fields: [
                        { key: "pageId", en: "Page ID", ar: "معرف الصفحة" },
                        { key: "accessToken", en: "Access Token", ar: "رمز الوصول" },
                      ],
                    },
                  ].map((ch) => (
                    <Card key={ch.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <ch.icon className="w-4 h-4" />
                          {isAr ? ch.labelAr : ch.labelEn}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={channels?.[ch.id]?.isEnabled ?? false}
                            onChange={(e) =>
                              updateChannelMutation.mutate({
                                channel: ch.id,
                                data: { isEnabled: e.target.checked, config: channelForms[ch.id] },
                              })
                            }
                            className="rounded accent-primary"
                          />
                          {isAr ? "مفعّل" : "Enabled"}
                        </label>
                        <div className="grid sm:grid-cols-2 gap-3">
                          {ch.fields.map((f) => (
                            <Input
                              key={f.key}
                              label={isAr ? f.ar : f.en}
                              type={f.key.includes("Pass") || f.key.includes("Token") || f.key === "apiKey" ? "password" : "text"}
                              value={channelForms[ch.id][f.key as keyof typeof channelForms[typeof ch.id]]}
                              onChange={(e) =>
                                setChannelForms((prev) => ({
                                  ...prev,
                                  [ch.id]: { ...prev[ch.id], [f.key]: e.target.value },
                                }))
                              }
                            />
                          ))}
                        </div>
                        <Button
                          onClick={() =>
                            updateChannelMutation.mutate({
                              channel: ch.id,
                              data: { isEnabled: channels?.[ch.id]?.isEnabled ?? false, config: channelForms[ch.id] },
                            })
                          }
                          loading={updateChannelMutation.isPending}
                        >
                          {t(locale, "dashboard", "save")}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {tab === "compliance" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      {isAr ? "امتثال PDPL" : "PDPL Compliance"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={pdplForm.enabled}
                        onChange={(e) => setPdplForm({ ...pdplForm, enabled: e.target.checked })}
                        className="rounded accent-primary"
                      />
                      {isAr ? "تفعيل سياسة PDPL" : "Enable PDPL policy"}
                    </label>
                    <Input
                      label={isAr ? "أيام الاحتفاظ بالبيانات" : "Data retention (days)"}
                      type="number"
                      value={String(pdplForm.dataRetentionDays)}
                      onChange={(e) =>
                        setPdplForm({ ...pdplForm, dataRetentionDays: Number(e.target.value) || 365 })
                      }
                    />
                    {compliance && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          {isAr ? "تغطية الموافقة:" : "Consent coverage:"}{" "}
                          <span className="font-semibold text-foreground">{compliance.consentCoverage}%</span>
                        </p>
                        {compliance.checklist.map((item) => (
                          <div key={item.id} className="flex items-center gap-2 text-sm">
                            <span className={item.done ? "text-green-600" : "text-muted-foreground"}>
                              {item.done ? "✓" : "○"}
                            </span>
                            {item.label}
                          </div>
                        ))}
                      </div>
                    )}
                    <Button
                      onClick={() =>
                        updateComplianceMutation.mutate({
                          enabled: pdplForm.enabled,
                          dataRetentionDays: pdplForm.dataRetentionDays,
                        })
                      }
                      loading={updateComplianceMutation.isPending}
                    >
                      {t(locale, "dashboard", "save")}
                    </Button>
                  </CardContent>
                </Card>
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
    </>
  );

  return isManpower ? (
    <ManpowerPageShell>{settingsContent}</ManpowerPageShell>
  ) : (
    <div className="space-y-6">{settingsContent}</div>
  );
}
