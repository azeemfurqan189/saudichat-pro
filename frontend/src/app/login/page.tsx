"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/shared/phone-input";
import { PasswordInput } from "@/components/auth/password-input";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api } from "@/lib/api";
import { DEFAULT_COUNTRY, buildFullPhone, isValidInternationalPhone } from "@/lib/country-codes";
import { getRememberedPhone, setRememberedPhone } from "@/lib/auth-storage";
import { warmupApi } from "@/lib/api-config";

export default function LoginPage() {
  const { locale } = useApp();
  const router = useRouter();
  const isAr = locale === "ar";
  const [phone, setPhone] = useState(buildFullPhone(DEFAULT_COUNTRY.code, ""));
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = getRememberedPhone();
    if (saved) {
      setPhone(saved);
      setRemember(true);
    }
  }, []);

  const handleLogin = async () => {
    if (!isValidInternationalPhone(phone)) {
      toast.error(isAr ? "رقم الجوال غير صالح" : "Invalid phone number");
      return;
    }
    if (password.length < 6) {
      toast.error(isAr ? "كلمة المرور 6 أحرف على الأقل" : "Password min 6 characters");
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
      const res = await api.login(phone, password);
      if (res.data) {
        setRememberedPhone(phone, remember);
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        toast.success(isAr ? "تم تسجيل الدخول" : "Logged in successfully");
        const business = res.data.businesses[0];
        router.push(business ? `/dashboard/${business.id}` : "/setup");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dot-grid-bg flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-soft dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">{t(locale, "auth", "login")}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isAr ? "مرحباً بعودتك" : "Welcome back"}
          </p>
        </div>

        <div className="space-y-4">
          <PhoneInput
            label={t(locale, "auth", "phone")}
            value={phone}
            onChange={setPhone}
            locale={isAr ? "ar" : "en"}
          />
          <PasswordInput
            label={t(locale, "auth", "password")}
            value={password}
            onChange={setPassword}
          />

          <div className="flex items-center justify-between text-sm">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="rounded accent-primary"
              />
              {t(locale, "auth", "remember")}
            </label>
            <Link href="/forgot-password" className="text-primary hover:underline">
              {t(locale, "auth", "forgot")}
            </Link>
          </div>

          <Button className="w-full rounded-full" loading={loading} onClick={handleLogin}>
            {t(locale, "auth", "login")}
          </Button>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          {t(locale, "auth", "noAccount")}{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            {t(locale, "auth", "signup")}
          </Link>
        </p>
      </div>
    </div>
  );
}
