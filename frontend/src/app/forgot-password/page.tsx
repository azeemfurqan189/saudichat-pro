"use client";

import { useState } from "react";
import Link from "next/link";
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

export default function ForgotPasswordPage() {
  const { locale } = useApp();
  const isAr = locale === "ar";
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState(buildFullPhone(DEFAULT_COUNTRY.code, ""));
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayOtp, setDisplayOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const sendOtp = async () => {
    if (!isValidInternationalPhone(phone)) {
      toast.error(isAr ? "رقم الجوال غير صالح" : "Invalid phone number");
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
      const res = await api.forgotPassword(phone);
      const otpCode = (res as { otp?: string }).otp;
      if (otpCode) {
        setDisplayOtp(otpCode);
        setOtp(otpCode.split(""));
      }
      toast.success(isAr ? "تم إرسال الرمز" : "OTP sent");
      setStep(2);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    const code = otp.join("");
    if (code.length !== 4) {
      toast.error(isAr ? "أدخل الرمز 4 أرقام" : "Enter 4-digit OTP");
      return;
    }
    if (password.length < 6) {
      toast.error(isAr ? "كلمة المرور 6 أحرف على الأقل" : "Password min 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error(isAr ? "كلمتا المرور غير متطابقتين" : "Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword({ phone, otp: code, password });
      toast.success(isAr ? "تم تغيير كلمة المرور" : "Password reset successfully");
      setStep(3);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dot-grid-bg flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-soft dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">{t(locale, "auth", "forgot")}</h1>
          <AuthStepIndicator step={step} />
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-center text-sm text-slate-500">
              {isAr ? "أدخل رقم جوالك لإرسال رمز التحقق" : "Enter your phone to receive a verification code"}
            </p>
            <PhoneInput
              label={t(locale, "auth", "phone")}
              value={phone}
              onChange={setPhone}
              locale={isAr ? "ar" : "en"}
            />
            <Button className="w-full" loading={loading} onClick={sendOtp}>
              {isAr ? "إرسال الرمز" : "Send OTP"}
            </Button>
            <Link href="/login" className="block text-center text-sm text-primary hover:underline">
              {isAr ? "العودة لتسجيل الدخول" : "Back to login"}
            </Link>
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
            <PasswordInput
              label={t(locale, "auth", "password")}
              value={password}
              onChange={setPassword}
            />
            <Input
              label={isAr ? "تأكيد كلمة المرور" : "Confirm password"}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <Button className="w-full" loading={loading} onClick={reset}>
              {isAr ? "تغيير كلمة المرور" : "Reset Password"}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setStep(1)}>
              {isAr ? "رجوع" : "Back"}
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 py-4 text-center">
            <CheckCircle className="mx-auto h-14 w-14 text-primary" />
            <p className="font-medium">{isAr ? "تم تغيير كلمة المرور بنجاح!" : "Password changed successfully!"}</p>
            <Link href="/login">
              <Button className="w-full">{t(locale, "auth", "login")}</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
