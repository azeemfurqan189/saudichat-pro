"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Building2, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/auth/password-input";
import { PhoneInput } from "@/components/shared/phone-input";
import { useApp } from "@/lib/context";
import { api } from "@/lib/api";
import { getDefaultDashboardPath, MemberRole } from "@/lib/industry-config";
import { buildFullPhone, DEFAULT_COUNTRY, isValidInternationalPhone } from "@/lib/country-codes";

export default function JoinInvitePage() {
  const { token } = useParams() as { token: string };
  const router = useRouter();
  const { locale } = useApp();
  const isAr = locale === "ar";

  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    businessName: string;
    userName: string;
    phone: string;
    role: string;
  } | null>(null);

  const [phone, setPhone] = useState(buildFullPhone(DEFAULT_COUNTRY.code, ""));
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.getMemberInvite(token);
        if (!res.data?.valid) {
          setInvalid(isAr ? "رابط غير صالح أو منتهي" : "Invalid or expired invite link");
          return;
        }
        setPreview({
          businessName: res.data.businessName ?? "",
          userName: res.data.userName ?? "",
          phone: res.data.phone ?? "",
          role: res.data.role ?? "",
        });
        if (res.data.phone) setPhone(res.data.phone);
      } catch (err) {
        setInvalid(err instanceof Error ? err.message : "Invalid invite");
      } finally {
        setLoading(false);
      }
    })();
  }, [token, isAr]);

  const handleJoin = async () => {
    if (!isValidInternationalPhone(phone)) {
      toast.error(isAr ? "رقم الجوال غير صالح" : "Invalid phone number");
      return;
    }
    if (password.length < 6) {
      toast.error(isAr ? "كلمة المرور 6 أحرف على الأقل" : "Password min 6 characters");
      return;
    }
    if (password !== confirm) {
      toast.error(isAr ? "كلمتا المرور غير متطابقتين" : "Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.acceptMemberInvite(token, { phone, password });
      if (res.data) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        toast.success(isAr ? "تم تفعيل الحساب — مرحباً!" : "Account activated — welcome!");
        const business = res.data.businesses[0];
        if (business) {
          const role = (business.memberRole as MemberRole) || "OFFICE_STAFF";
          router.push(getDefaultDashboardPath(role, business.id));
        } else {
          router.push("/login");
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dot-grid-bg flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-soft dark:border-slate-800 dark:bg-slate-950">
        {loading ? (
          <p className="text-center text-sm text-muted-foreground">{isAr ? "جاري التحقق..." : "Verifying invite..."}</p>
        ) : invalid ? (
          <div className="text-center space-y-4">
            <p className="text-destructive text-sm">{invalid}</p>
            <Button asChild variant="outline">
              <Link href="/login">{isAr ? "صفحة الدخول" : "Go to login"}</Link>
            </Button>
          </div>
        ) : preview ? (
          <>
            <div className="mb-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-xl font-bold">{isAr ? "دعوة للانضمام" : "You're invited"}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {preview.businessName} · {preview.role}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {isAr ? `مرحباً ${preview.userName}` : `Hello ${preview.userName}`}
              </p>
            </div>

            <div className="space-y-4">
              <PhoneInput
                label={isAr ? "تأكيد رقم الجوال" : "Confirm your phone"}
                value={phone}
                onChange={setPhone}
                locale={isAr ? "ar" : "en"}
              />
              <PasswordInput
                label={isAr ? "كلمة المرور الجديدة" : "New password"}
                value={password}
                onChange={setPassword}
              />
              <PasswordInput
                label={isAr ? "تأكيد كلمة المرور" : "Confirm password"}
                value={confirm}
                onChange={setConfirm}
              />
              <p className="text-[11px] text-muted-foreground">
                {isAr
                  ? "أدخل نفس رقم الجوال الذي أرسله المالك، ثم اختر كلمة مرور — سيتم تسجيل دخولك مباشرة."
                  : "Enter the same phone the owner used, choose a password — you'll be logged in automatically."}
              </p>
              <Button className="w-full rounded-full" loading={submitting} onClick={handleJoin}>
                <LogIn className="w-4 h-4 me-2" />
                {isAr ? "تفعيل والدخول" : "Activate & login"}
              </Button>
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              {isAr ? "لديك حساب؟" : "Already activated?"}{" "}
              <Link href="/login" className="text-primary hover:underline">
                {isAr ? "تسجيل الدخول" : "Login"}
              </Link>
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
