"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api } from "@/lib/api";

const schema = z.object({
  phone: z.string().min(9, "Invalid phone"),
  password: z.string().min(6, "Min 6 characters"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { locale } = useApp();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { phone: "+966" },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await api.login(data.phone, data.password);
      if (res.data) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        toast.success(locale === "ar" ? "تم تسجيل الدخول" : "Logged in successfully");
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
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">{t(locale, "auth", "login")}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {locale === "ar" ? "مرحباً بعودتك" : "Welcome back"}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label={t(locale, "auth", "phone")}
            {...register("phone")}
            error={errors.phone?.message}
            dir="ltr"
          />
          <div className="relative">
            <Input
              label={t(locale, "auth", "password")}
              type={showPassword ? "text" : "password"}
              {...register("password")}
              error={errors.password?.message}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute end-3 top-9 text-slate-400"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              {t(locale, "auth", "remember")}
            </label>
            <Link href="/forgot-password" className="text-primary hover:underline">
              {t(locale, "auth", "forgot")}
            </Link>
          </div>

          <Button type="submit" className="w-full" loading={loading}>
            {t(locale, "auth", "login")}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          <span className="text-sm text-slate-500">{t(locale, "auth", "or")}</span>
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" type="button">Google</Button>
          <Button variant="outline" type="button">Apple</Button>
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
