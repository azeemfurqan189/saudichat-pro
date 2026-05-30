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
import { cn } from "@/lib/utils";

const INDUSTRIES = [
  { id: "restaurant", icon: UtensilsCrossed, labelEn: "Restaurant", labelAr: "مطاعم" },
  { id: "retail", icon: ShoppingBag, labelEn: "Retail", labelAr: "تجزئة" },
  { id: "salon", icon: Scissors, labelEn: "Beauty & Salon", labelAr: "تجميل وصالون" },
  { id: "healthcare", icon: Stethoscope, labelEn: "Healthcare", labelAr: "رعاية صحية" },
  { id: "realestate", icon: Building2, labelEn: "Real Estate", labelAr: "عقارات" },
  { id: "education", icon: GraduationCap, labelEn: "Education", labelAr: "تعليم" },
  { id: "automotive", icon: Car, labelEn: "Automotive", labelAr: "سيارات" },
  { id: "other", icon: MoreHorizontal, labelEn: "Other", labelAr: "أخرى" },
];

const PLANS = [
  { id: "starter", nameEn: "Starter", nameAr: "المبتدئ", price: 299 },
  { id: "business", nameEn: "Business", nameAr: "الأعمال", price: 599, popular: true },
  { id: "enterprise", nameEn: "Enterprise", nameAr: "المؤسسات", price: 1499 },
];

const STEPS = ["step1", "step2", "step3", "step4", "step5", "step6"] as const;

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
    plan: "business",
  });

  const canNext = () => {
    switch (step) {
      case 0:
        return !!form.industry;
      case 1:
        return !!form.name;
      case 2:
        return !!form.whatsappNumber;
      case 3:
        return !!form.botGreeting;
      case 4:
        return !!form.plan;
      default:
        return true;
    }
  };

  const handleNext = async () => {
    if (step === 4) {
      setLoading(true);
      try {
        const res = await api.createBusiness({
          name: form.name,
          nameAr: form.nameAr || undefined,
          type: form.industry,
          description: form.description || undefined,
          whatsappNumber: form.whatsappNumber,
          whatsappPhoneId: form.phoneId || undefined,
          whatsappToken: form.whatsappToken || undefined,
          subscriptionPlan: form.plan,
          settings: {
            botGreeting: form.botGreeting,
            botLanguage: form.botLanguage,
          },
        });
        if (res.data?.id) {
          setCreatedBusinessId(res.data.id);
          if (form.phoneId && form.whatsappToken) {
            await api.testWhatsApp(res.data.id, form.phoneId, form.whatsappToken);
          }
        }
        setStep(5);
        setShowConfetti(true);
        toast.success(t(locale, "setup", "botLive"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Setup failed");
      } finally {
        setLoading(false);
      }
      return;
    }
    setStep((s) => Math.min(s + 1, 5));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const goToDashboard = () => {
    router.push(createdBusinessId ? `/dashboard/${createdBusinessId}` : "/login");
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
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4 max-w-md mx-auto">
                    <h2 className="text-xl font-semibold mb-2">{t(locale, "setup", "connectWhatsApp")}</h2>
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
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-4 max-w-md mx-auto">
                    <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                      <Bot className="w-5 h-5" />
                      {t(locale, "setup", "configureBot")}
                    </h2>
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
                  </div>
                )}

                {step === 4 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-6">{t(locale, "setup", "choosePlan")}</h2>
                    <div className="grid md:grid-cols-3 gap-4">
                      {PLANS.map((plan) => (
                        <button
                          key={plan.id}
                          onClick={() => setForm({ ...form, plan: plan.id })}
                          className={cn(
                            "p-5 rounded-xl border-2 text-start transition-all hover:scale-[1.02] relative",
                            form.plan === plan.id
                              ? "border-primary bg-primary/10 shadow-glow-green"
                              : "border-border hover:border-primary/50",
                            plan.popular && "ring-1 ring-secondary"
                          )}
                        >
                          {plan.popular && (
                            <span className="absolute -top-2 end-3 text-[10px] bg-secondary text-white px-2 py-0.5 rounded-full">
                              {isAr ? "شائع" : "Popular"}
                            </span>
                          )}
                          <p className="font-bold">{isAr ? plan.nameAr : plan.nameEn}</p>
                          <p className="text-2xl font-bold text-primary mt-2">
                            {plan.price}
                            <span className="text-sm font-normal text-muted-foreground">
                              {isAr ? " ر.س" : " SAR"}
                            </span>
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {step === 5 && (
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
                    <p className="text-muted-foreground mb-8">{t(locale, "setup", "botLive")}</p>
                    <Button size="lg" onClick={goToDashboard}>
                      {t(locale, "setup", "goToDashboard")}
                      <NextIcon className="w-5 h-5" />
                    </Button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {step < 5 && (
              <div className="flex justify-between mt-8 pt-6 border-t border-border/50">
                <Button variant="outline" onClick={handleBack} disabled={step === 0}>
                  <BackIcon className="w-4 h-4" />
                  {isAr ? "السابق" : "Back"}
                </Button>
                <Button onClick={handleNext} disabled={!canNext()} loading={loading}>
                  {step === 4 ? (isAr ? "إنهاء الإعداد" : "Complete Setup") : isAr ? "التالي" : "Next"}
                  <NextIcon className="w-4 h-4" />
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
}
