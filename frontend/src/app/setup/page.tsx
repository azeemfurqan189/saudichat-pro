"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  UtensilsCrossed,
  ShoppingBag,
  Scissors,
  Stethoscope,
  Building2,
  GraduationCap,
  Car,
  BedDouble,
  Truck,
  HardHat,
  MoreHorizontal,
  MessageCircle,
  Check,
  Bot,
  Sparkles,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { AuthGuard } from "@/components/dashboard/auth-guard";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api } from "@/lib/api";
import { warmupApi } from "@/lib/api-config";
import { cn } from "@/lib/utils";

const INDUSTRIES = [
  { id: "restaurant", icon: UtensilsCrossed, labelEn: "Restaurant", labelAr: "مطاعم" },
  { id: "retail", icon: ShoppingBag, labelEn: "Retail", labelAr: "تجزئة" },
  { id: "salon", icon: Scissors, labelEn: "Beauty & Salon", labelAr: "تجميل وصالون" },
  { id: "healthcare", icon: Stethoscope, labelEn: "Healthcare", labelAr: "رعاية صحية" },
  { id: "realestate", icon: Building2, labelEn: "Real Estate", labelAr: "عقارات" },
  { id: "hotel", icon: BedDouble, labelEn: "Hotel", labelAr: "فندق" },
  { id: "logistics", icon: Truck, labelEn: "Logistics", labelAr: "لوجستيات" },
  { id: "education", icon: GraduationCap, labelEn: "Education", labelAr: "تعليم" },
  { id: "automotive", icon: Car, labelEn: "Automotive", labelAr: "سيارات" },
  { id: "manpower", icon: HardHat, labelEn: "Manpower Agency", labelAr: "وكالة manpower" },
  { id: "other", icon: MoreHorizontal, labelEn: "Other", labelAr: "أخرى" },
];

const INDUSTRY_TO_TYPE: Record<string, string> = {
  restaurant: "RESTAURANT",
  retail: "RETAIL",
  salon: "SALON",
  healthcare: "CLINIC",
  realestate: "REAL_ESTATE",
  hotel: "HOTEL",
  logistics: "LOGISTICS",
  education: "EDUCATION",
  automotive: "CAR_WORKSHOP",
  manpower: "MANPOWER",
  other: "CUSTOM",
};

const STEPS = ["step1", "step2", "step3", "step4", "step6"] as const;

const DEFAULT_GREETING_EN = "Hello! How can I help you today?";
const DEFAULT_GREETING_AR = "مرحباً! كيف أقدر أساعدك اليوم؟";

function Confetti() {
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    color: ["#10b981", "#f59e0b", "#6366f1", "#ef4444", "#8b5cf6"][i % 5],
    size: 6 + Math.random() * 8,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: 0 }}
          animate={{ y: "100vh", opacity: 0, rotate: 720 }}
          transition={{ duration: 2.5 + Math.random(), delay: p.delay, ease: "easeOut" }}
          style={{
            position: "absolute",
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
          }}
        />
      ))}
    </div>
  );
}

export default function SetupPage() {
  const { locale, dir } = useApp();
  const router = useRouter();
  const isAr = locale === "ar";
  const BackIcon = dir === "rtl" ? ArrowRight : ArrowLeft;
  const NextIcon = dir === "rtl" ? ArrowLeft : ArrowRight;

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [createdBusinessId, setCreatedBusinessId] = useState<string | null>(null);

  const [form, setForm] = useState({
    industry: "",
    name: "",
    nameAr: "",
    description: "",
    phoneId: "",
    whatsappToken: "",
    whatsappNumber: "",
    botGreeting: "",
    botLanguage: "both",
  });

  const canNext = () => {
    switch (step) {
      case 0:
        return !!form.industry;
      case 1:
        return !!form.name;
      default:
        return true;
    }
  };

  const finishSetup = async () => {
    setLoading(true);
    setLoadingMessage(isAr ? "سرور سے رابطہ..." : "Connecting to server...");
    try {
      await warmupApi(45000);

      setLoadingMessage(isAr ? "اکاؤنٹ بن رہا ہے..." : "Creating your account...");
      const businessType = INDUSTRY_TO_TYPE[form.industry] || "CUSTOM";
      const greeting =
        form.botGreeting.trim() ||
        (isAr ? DEFAULT_GREETING_AR : DEFAULT_GREETING_EN);

      const res = await api.createBusiness({
        name: form.name,
        nameAr: form.nameAr || undefined,
        type: businessType,
        description: form.description || undefined,
        whatsappNumber: form.whatsappNumber.trim() || undefined,
        whatsappPhoneId: form.phoneId.trim() || undefined,
        whatsappToken: form.whatsappToken.trim() || undefined,
        subscriptionPlan: "STARTER",
        settings: {
          botGreeting: greeting,
          botLanguage: form.botLanguage,
          setupSkippedWhatsApp: !form.phoneId && !form.whatsappToken,
          setupSkippedBotConfig: !form.botGreeting.trim(),
        },
      });

      if (!res.data?.id) {
        throw new Error(isAr ? "اکاؤنٹ نہیں بن سکا" : "Could not create account");
      }

      setCreatedBusinessId(res.data.id);

      if (form.phoneId && form.whatsappToken) {
        setLoadingMessage(isAr ? "واتساب ٹیسٹ..." : "Testing WhatsApp...");
        try {
          await api.testWhatsApp(res.data.id, form.phoneId, form.whatsappToken);
        } catch {
          toast.warning(
            isAr
              ? "واتساب بعد میں Settings سے جوڑیں"
              : "Add WhatsApp later in Settings"
          );
        }
      }

      setStep(4);
      setShowConfetti(true);
      toast.success(isAr ? "اکاؤنٹ بن گیا!" : "Account created!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  const handleNext = async () => {
    if (step === 3) {
      await finishSetup();
      return;
    }
    setStep((s) => Math.min(s + 1, 4));
  };

  const handleSkip = async () => {
    if (step === 0 && !form.industry) {
      toast.error(isAr ? "پہلے industry منتخب کریں" : "Select an industry first");
      return;
    }
    if (step === 1 && !form.name.trim()) {
      toast.error(isAr ? "کاروبار کا نام درج کریں" : "Enter business name");
      return;
    }
    await finishSetup();
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const goToDashboard = () => {
    router.push(createdBusinessId ? `/dashboard/${createdBusinessId}` : "/login");
  };

  const goToSettings = (settingsTab: "whatsapp" | "aiBot") => {
    if (!createdBusinessId) return;
    router.push(`/dashboard/${createdBusinessId}/settings?tab=${settingsTab}`);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen gradient-bg py-8 px-4">
        {showConfetti && <Confetti />}

        <div className="absolute top-4 end-4 flex gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">{t(locale, "setup", "title")}</h1>
          </div>

          {/* Progress steps */}
          <div className="flex items-center justify-center gap-2 mb-8 overflow-x-auto pb-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0",
                    i < step
                      ? "bg-primary text-white"
                      : i === step
                        ? "bg-gradient-primary text-white ring-4 ring-primary/20"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {i < step ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span
                  className={cn(
                    "text-xs hidden sm:inline whitespace-nowrap",
                    i === step ? "font-semibold" : "text-muted-foreground"
                  )}
                >
                  {t(locale, "setup", s)}
                </span>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "w-6 h-0.5 shrink-0",
                      i < step ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
              </div>
            ))}
          </div>

          <Card className="!p-6 md:!p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {step === 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-6">{t(locale, "setup", "selectIndustry")}</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {INDUSTRIES.map(({ id, icon: Icon, labelEn, labelAr }) => (
                        <button
                          key={id}
                          onClick={() => setForm({ ...form, industry: id })}
                          className={cn(
                            "p-4 rounded-xl border-2 text-center transition-all hover:scale-[1.02]",
                            form.industry === id
                              ? "border-primary bg-primary/10 shadow-glow-green"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <Icon className="w-8 h-8 mx-auto mb-2 text-primary" />
                          <p className="text-sm font-medium">{isAr ? labelAr : labelEn}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-4 max-w-md mx-auto">
                    <h2 className="text-xl font-semibold mb-2">{t(locale, "setup", "businessDetails")}</h2>
                    <Input
                      label={isAr ? "اسم المنشأة (EN)" : "Business Name (EN)"}
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                    <Input
                      label={isAr ? "اسم المنشأة (AR)" : "Business Name (AR)"}
                      value={form.nameAr}
                      onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                    />
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-muted-foreground">
                        {isAr ? "الوصف" : "Description"}
                      </label>
                      <textarea
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        rows={3}
                        className="w-full rounded-xl border border-border bg-white/50 dark:bg-gray-900/50 p-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isAr
                        ? "واتساب والبوت بعد میں Settings سے شامل کر سکتے ہیں"
                        : "WhatsApp and bot can be added later in Settings"}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleSkip}
                      disabled={loading || !form.name.trim()}
                      loading={loading}
                    >
                      {isAr ? "اکاؤنٹ بنائیں (باقی skip)" : "Create account (skip rest)"}
                    </Button>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4 max-w-md mx-auto">
                    <h2 className="text-xl font-semibold mb-2">{t(locale, "setup", "connectWhatsApp")}</h2>
                    <p className="text-sm text-muted-foreground mb-4">
                      {isAr
                        ? "اختياري — يمكنك تخطي هذه الخطوة وإضافة واتساب لاحقاً من الإعدادات"
                        : "Optional — skip and add WhatsApp later in Settings"}
                    </p>
                    <Input
                      label={isAr ? "رقم واتساب" : "WhatsApp Number"}
                      value={form.whatsappNumber}
                      onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
                      placeholder="+966..."
                      dir="ltr"
                    />
                    <Input
                      label="Phone ID"
                      value={form.phoneId}
                      onChange={(e) => setForm({ ...form, phoneId: e.target.value })}
                      dir="ltr"
                    />
                    <Input
                      label="Access Token"
                      type="password"
                      value={form.whatsappToken}
                      onChange={(e) => setForm({ ...form, whatsappToken: e.target.value })}
                      dir="ltr"
                    />
                    <p className="text-xs text-muted-foreground">
                      {isAr
                        ? "احصل على هذه البيانات من Meta Business Suite"
                        : "Get these credentials from Meta Business Suite"}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full text-muted-foreground"
                      onClick={handleSkip}
                      disabled={loading}
                    >
                      {isAr ? "Skip — بعد میں Settings" : "Skip — add in Settings later"}
                    </Button>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-4 max-w-md mx-auto">
                    <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                      <Bot className="w-5 h-5" />
                      {t(locale, "setup", "configureBot")}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {isAr
                        ? "اختياري — Default greeting استعمال ہوگی اگر خالی چھوڑیں"
                        : "Optional — default greeting used if left empty"}
                    </p>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-muted-foreground">
                        {isAr ? "رسالة الترحيب" : "Greeting Message"}
                      </label>
                      <textarea
                        value={form.botGreeting}
                        onChange={(e) => setForm({ ...form, botGreeting: e.target.value })}
                        rows={4}
                        placeholder={
                          isAr
                            ? "مرحباً! كيف أقدر أساعدك اليوم؟"
                            : "Hello! How can I help you today?"
                        }
                        className="w-full rounded-xl border border-border bg-white/50 dark:bg-gray-900/50 p-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-muted-foreground">
                        {isAr ? "لغة البوت" : "Bot Language"}
                      </label>
                      <select
                        value={form.botLanguage}
                        onChange={(e) => setForm({ ...form, botLanguage: e.target.value })}
                        className="w-full h-11 rounded-xl border border-border bg-white/50 dark:bg-gray-900/50 px-4 text-sm"
                      >
                        <option value="both">{isAr ? "عربي + إنجليزي" : "Arabic + English"}</option>
                        <option value="ar">{isAr ? "عربي فقط" : "Arabic Only"}</option>
                        <option value="en">{isAr ? "إنجليزي فقط" : "English Only"}</option>
                      </select>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full text-muted-foreground"
                      onClick={handleSkip}
                      disabled={loading}
                    >
                      {isAr ? "Skip — بعد میں Settings" : "Skip — configure in Settings later"}
                    </Button>
                  </div>
                )}

                {step === 4 && (
                  <div className="text-center py-8">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", damping: 10 }}
                      className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center mx-auto mb-6"
                    >
                      <Sparkles className="w-10 h-10 text-white" />
                    </motion.div>
                    <h2 className="text-2xl font-bold mb-2">{t(locale, "setup", "confirmation")}</h2>
                    <p className="text-muted-foreground mb-6">
                      {isAr
                        ? "اکاؤنٹ تیار ہے — واتساب اور بوت Settings میں شامل کریں"
                        : "Account ready — add WhatsApp & bot in Settings anytime"}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
                      <Button variant="outline" onClick={() => goToSettings("whatsapp")}>
                        {isAr ? "Settings → WhatsApp" : "Settings → WhatsApp"}
                      </Button>
                      <Button variant="outline" onClick={() => goToSettings("aiBot")}>
                        {isAr ? "Settings → AI Bot" : "Settings → AI Bot"}
                      </Button>
                    </div>
                    <Button size="lg" onClick={goToDashboard}>
                      {t(locale, "setup", "goToDashboard")}
                      <NextIcon className="w-5 h-5" />
                    </Button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {step < 4 && (
              <div className="flex justify-between items-center mt-8 pt-6 border-t border-border/50 gap-3">
                <Button variant="outline" onClick={handleBack} disabled={step === 0 || loading}>
                  <BackIcon className="w-4 h-4" />
                  {isAr ? "السابق" : "Back"}
                </Button>
                <div className="flex gap-2">
                  {(step === 2 || step === 3) && (
                    <Button variant="ghost" onClick={handleSkip} disabled={loading}>
                      {isAr ? "Skip" : "Skip"}
                    </Button>
                  )}
                  <Button onClick={handleNext} disabled={!canNext() || loading} loading={loading}>
                    {loading && loadingMessage
                      ? loadingMessage
                      : step === 3
                        ? isAr
                          ? "اکاؤنٹ بنائیں"
                          : "Create Account"
                        : isAr
                          ? "التالي"
                          : "Next"}
                    {!loading && <NextIcon className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
}
