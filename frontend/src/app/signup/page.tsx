"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api } from "@/lib/api";

export default function SignupPage() {
  const { locale } = useApp();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [form, setForm] = useState({ name: "", email: "", phone: "+966", password: "" });
  const [devOtp, setDevOtp] = useState("");

  const handleSignup = async () => {
    setLoading(true);
    try {
      const res = await api.signup(form);
      if ((res as { otp?: string }).otp) setDevOtp((res as { otp?: string }).otp || "");
      toast.success(locale === "ar" ? "تم إرسال الرمز" : "OTP sent");
      setStep(2);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    try {
      const res = await api.verifyOtp({ ...form, otp: otp.join("") });
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

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 3) document.getElementById(`otp-${index + 1}`)?.focus();
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">{t(locale, "auth", "signup")}</h1>
          <div className="mt-4 flex justify-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1 w-8 rounded-full ${step >= s ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"}`}
              />
            ))}
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <Input label={t(locale, "common", "name")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label={t(locale, "common", "email")} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label={t(locale, "auth", "phone")} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" />
            <Input label={t(locale, "auth", "password")} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <Button className="w-full" loading={loading} onClick={handleSignup}>{t(locale, "auth", "signup")}</Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <p className="text-center text-sm text-slate-500">{t(locale, "auth", "enterOtp")}</p>
            {devOtp && <p className="text-center text-xs text-secondary">Dev OTP: {devOtp}</p>}
            <div className="flex justify-center gap-3" dir="ltr">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value.replace(/\D/g, ""))}
                  className="h-12 w-12 rounded-md border border-slate-200 text-center text-xl font-bold focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900"
                />
              ))}
            </div>
            <Button className="w-full" loading={loading} onClick={handleVerify}>{t(locale, "auth", "verifyOtp")}</Button>
          </div>
        )}

        {step === 3 && (
          <div className="py-6 text-center">
            <CheckCircle className="mx-auto mb-4 h-14 w-14 text-primary" />
            <h2 className="text-xl font-bold">{t(locale, "auth", "success")}</h2>
          </div>
        )}

        {step === 1 && (
          <p className="mt-6 text-center text-sm text-slate-500">
            {t(locale, "auth", "hasAccount")}{" "}
            <Link href="/login" className="font-medium text-primary">{t(locale, "auth", "login")}</Link>
          </p>
        )}
      </div>
    </div>
  );
}
