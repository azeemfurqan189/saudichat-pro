"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/shared/phone-input";
import { PasswordInput } from "@/components/auth/password-input";
import { OtpInput } from "@/components/auth/otp-input";
import { AuthStepIndicator } from "@/components/auth/auth-step-indicator";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api } from "@/lib/api";
import { DEFAULT_COUNTRY, buildFullPhone, isValidInternationalPhone } from "@/lib/country-codes";
import { warmupApi } from "@/lib/api-config";

export default function SignupPage() {
  const { locale } = useApp();
  const router = useRouter();
  const isAr = locale === "ar";
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: buildFullPhone(DEFAULT_COUNTRY.code, ""),
    password: "",
    confirmPassword: "",
  });
  const [displayOtp, setDisplayOtp] = useState("");

  const handleSignup = async () => {
    if (!form.name.trim() || form.name.length < 2) {
      toast.error(isAr ? "الاسم مطلوب (حرفين على الأقل)" : "Name required (min 2 characters)");
      return;
    }
    if (!form.email.includes("@")) {
      toast.error(isAr ? "البريد الإلكتروني غير صالح" : "Invalid email");
      return;
    }
    if (!isValidInternationalPhone(form.phone)) {
      toast.error(isAr ? "رقم الجوال غير صالح" : "Invalid phone number");
      return;
    }
    if (form.password.length < 6) {
      toast.error(isAr ? "كلمة المرور 6 أحرف على الأقل" : "Password min 6 characters");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error(isAr ? "كلمتا المرور غير متطابقتين" : "Passwords do not match");
      return;
    }

    setLoading(true);
    toast.info(isAr ? "سرور سے رابطہ ہو رہا ہے..." : "Connecting to server...");
    const ready = await warmupApi();
    if (!ready) {
      toast.error(isAr ? "سرور سست ہے — 1 منٹ بعد دوبارہ کوشش کریں" : "Server waking up — wait 1 min and retry");
      setLoading(false);
      return;
    }
    try {
      const res = await api.signup({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      const otpCode = (res as { otp?: string }).otp;
      if (otpCode) {
        setDisplayOtp(otpCode);
        setOtp(otpCode.split(""));
      }
      toast.success(isAr ? "تم إرسال الرمز" : "OTP sent — enter code below");
      setStep(2);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length !== 4) {
      toast.error(isAr ? "أدخل الرمز 4 أرقام" : "Enter 4-digit OTP");
      return;
    }

    setLoading(true);
    try {
      const res = await api.verifyOtp({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        otp: code,
      });
      if (res.data) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        setStep(3);
        setTimeout(() => router.push("/setup"), 2000);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dot-grid-bg flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-soft dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">{t(locale, "auth", "signup")}</h1>
          <AuthStepIndicator step={step} />
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <Input
              label={t(locale, "common", "name")}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoComplete="name"
            />
            <Input
              label={t(locale, "common", "email")}
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoComplete="email"
            />
            <PhoneInput
              label={t(locale, "auth", "phone")}
              value={form.phone}
              onChange={(phone) => setForm({ ...form, phone })}
              locale={isAr ? "ar" : "en"}
            />
            <PasswordInput
              label={t(locale, "auth", "password")}
              value={form.password}
              onChange={(password) => setForm({ ...form, password })}
            />
            <Input
              label={isAr ? "تأكيد كلمة المرور" : "Confirm password"}
              type="password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              autoComplete="new-password"
            />
            <Button className="w-full" loading={loading} onClick={handleSignup}>
              {t(locale, "auth", "signup")}
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <p className="text-center text-sm text-slate-500">{t(locale, "auth", "enterOtp")}</p>
            {displayOtp && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-center">
                <p className="text-xs text-slate-500">
                  {isAr ? "رمز التحقق (SMS قريباً)" : "Your OTP (SMS coming soon)"}
                </p>
                <p className="mt-1 text-2xl font-bold tracking-widest text-primary" dir="ltr">
                  {displayOtp}
                </p>
              </div>
            )}
            <OtpInput value={otp} onChange={setOtp} />
            <Button className="w-full" loading={loading} onClick={handleVerify}>
              {t(locale, "auth", "verifyOtp")}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setStep(1)}>
              {isAr ? "رجوع" : "Back"}
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="py-6 text-center">
            <CheckCircle className="mx-auto mb-4 h-14 w-14 text-primary" />
            <h2 className="text-xl font-bold">{t(locale, "auth", "success")}</h2>
            <p className="mt-2 text-sm text-slate-500">
              {isAr ? "جاري التحويل لإعداد المنشأة..." : "Redirecting to business setup..."}
            </p>
          </div>
        )}

        {step === 1 && (
          <p className="mt-6 text-center text-sm text-slate-500">
            {t(locale, "auth", "hasAccount")}{" "}
            <Link href="/login" className="font-medium text-primary">
              {t(locale, "auth", "login")}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
