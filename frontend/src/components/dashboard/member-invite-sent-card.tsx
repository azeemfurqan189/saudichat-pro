"use client";

import { Copy, MessageCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MemberInvitePayload } from "@/lib/api";

export function MemberInviteSentCard({
  isAr,
  invite,
  memberName,
  onClose,
}: {
  isAr: boolean;
  invite: MemberInvitePayload;
  memberName?: string;
  onClose?: () => void;
}) {
  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(isAr ? `تم نسخ ${label}` : `${label} copied`);
    } catch {
      toast.error(isAr ? "لم ينجح النسخ" : "Copy failed");
    }
  };

  const waText = encodeURIComponent(
    [
      isAr ? `مرحباً ${memberName || ""} — دعوة SaudiChat Pro` : `Hi ${memberName || ""} — SaudiChat Pro invite`,
      `${isAr ? "الرابط" : "Link"}: ${invite.inviteUrl}`,
      `${isAr ? "الجوال" : "Phone"}: ${invite.phone}`,
      `${isAr ? "كلمة المرور" : "Password"}: ${invite.tempPassword}`,
    ].join("\n")
  );

  return (
    <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-sm">
            {isAr ? "تم إرسال دعوة الدخول" : "Login invite sent"}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {invite.smsAttempted || invite.emailAttempted
              ? isAr
                ? "تم إرسال الرابط وكلمة المرور على واتساب/الإيميل (إن كان مفعّلاً)"
                : "Link + password sent via SMS/email when configured"
              : isAr
                ? "انسخ الرابط أدناه وأرسله على واتساب يدوياً"
                : "Copy the link below and share on WhatsApp manually"}
          </p>
        </div>
      </div>

      <div className="rounded-lg bg-background border p-3 space-y-2 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-muted-foreground">{isAr ? "رابط الدخول" : "Login link"}</span>
          <Button type="button" size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => copy(invite.inviteUrl, "Link")}>
            <Copy className="w-3 h-3 me-1" />
            {isAr ? "نسخ" : "Copy"}
          </Button>
        </div>
        <p className="font-mono text-[10px] break-all text-primary">{invite.inviteUrl}</p>
        <p>
          <span className="text-muted-foreground">{isAr ? "الجوال:" : "Phone:"}</span> {invite.phone}
        </p>
        <p>
          <span className="text-muted-foreground">{isAr ? "كلمة المرور:" : "Password:"}</span>{" "}
          <code className="bg-muted px-1 rounded">{invite.tempPassword}</code>
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
          <a
            href={`https://wa.me/${invite.phone.replace(/\D/g, "")}?text=${waText}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="w-3.5 h-3.5 me-1 text-green-600" />
            WhatsApp
          </a>
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => copy(invite.inviteUrl, "Link")}>
          <Copy className="w-3.5 h-3.5 me-1" />
          {isAr ? "نسخ الرابط" : "Copy link"}
        </Button>
        {onClose && (
          <Button size="sm" className="h-8 text-xs ms-auto" onClick={onClose}>
            {isAr ? "تم" : "Done"}
          </Button>
        )}
      </div>
    </div>
  );
}
