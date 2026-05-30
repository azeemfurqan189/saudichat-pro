"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const { locale } = useApp();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("+966");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const sendOtp = async () => {
    setLoading(true);
    try {
      const res = await api.forgotPassword(phone);
      if ((res as { otp?: string }).otp) setDevOtp((res as { otp?: string }).otp || "");
      toast.success("OTP sent");
      setStep(2);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    setLoading(true);
    try {
      await api.resetPassword({ phone, otp, password });
      toast.success(locale === "ar" ? "تم تغيير كلمة المرور" : "Password reset");
      setStep(3);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <h1 className="mb-6 text-center text-2xl font-bold">{t(locale, "auth", "forgot")}</h1>

        {step === 1 && (
          <div className="space-y-4">
            <Input label={t(locale, "auth", "phone")} value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" />
            <Button className="w-full" loading={loading} onClick={sendOtp}>
              {locale === "ar" ? "إرسال الرمز" : "Send OTP"}
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {devOtp && <p className="text-center text-xs text-secondary">Dev OTP: {devOtp}</p>}
            <Input label="OTP" value={otp} onChange={(e) => setOtp(e.target.value)} dir="ltr" />
            <Input label={t(locale, "auth", "password")} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button className="w-full" loading={loading} onClick={reset}>
              {locale === "ar" ? "تغيير كلمة المرور" : "Reset Password"}
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="py-4 text-center">
            <p className="mb-4">{locale === "ar" ? "تم بنجاح!" : "Success!"}</p>
            <Link href="/login">
              <Button>{t(locale, "auth", "login")}</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
