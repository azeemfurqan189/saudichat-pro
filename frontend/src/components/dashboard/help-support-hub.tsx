"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bot,
  ChevronDown,
  Headphones,
  HelpCircle,
  Mail,
  MessageCircle,
  Phone,
  Send,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  HELP_FAQS,
  SUPPORT_PHONE,
  buildSupportEmailUrl,
  buildWhatsAppSupportUrl,
  getHelpBotReply,
} from "@/lib/help-config";
import { siteConfig } from "@/lib/site-config";
import { ManpowerGlassCard, ManpowerHeroHeader, ManpowerPageShell } from "@/components/dashboard/manpower-shell";
import { TestingQuickStart } from "@/components/dashboard/testing-quick-start";

type ChatMsg = { id: string; role: "user" | "bot" | "agent"; text: string; at: Date };

type Tab = "bot" | "live" | "faq";

function ChatBubble({ msg, isAr }: { msg: ChatMsg; isAr: boolean }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
          isUser && "bg-primary text-primary-foreground rounded-br-md",
          msg.role === "bot" && "bg-muted rounded-bl-md",
          msg.role === "agent" && "bg-emerald-500/10 border border-emerald-500/20 rounded-bl-md"
        )}
      >
        {!isUser && (
          <p className="text-[10px] font-semibold mb-0.5 opacity-70">
            {msg.role === "bot"
              ? isAr
                ? "بوت المساعدة"
                : "Help Bot"
              : isAr
                ? "فريق الدعم"
                : "CS Team"}
          </p>
        )}
        {msg.text}
      </div>
    </div>
  );
}

function ChatPanel({
  isAr,
  mode,
  businessId,
  userName,
}: {
  isAr: boolean;
  mode: "bot" | "live";
  businessId: string;
  userName?: string;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const greeting: ChatMsg = {
      id: "greeting",
      role: mode === "bot" ? "bot" : "agent",
      text:
        mode === "bot"
          ? isAr
            ? "مرحباً! أنا بوت المساعدة. اسأل عن الساعات، المعدات، CMMS، الصلاحيات، أو واتساب."
            : "Hi! I'm the Help Bot. Ask about timesheets, equipment, CMMS, permissions, or WhatsApp."
          : isAr
            ? "مرحباً! أنت تتحدث مع الدعم المباشر. اكتب مشكلتك وسنرد خلال ساعات العمل — أو تابع فوراً على واتساب."
            : "Hello! You're in Live CS chat. Describe your issue — we reply during business hours, or continue instantly on WhatsApp.",
      at: new Date(),
    };
    setMessages([greeting]);
  }, [mode, isAr]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: "user", text, at: new Date() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setTyping(true);

    setTimeout(() => {
      if (mode === "bot") {
        setMessages((m) => [
          ...m,
          {
            id: `b-${Date.now()}`,
            role: "bot",
            text: getHelpBotReply(text, isAr),
            at: new Date(),
          },
        ]);
      } else {
        setMessages((m) => [
          ...m,
          {
            id: `a-${Date.now()}`,
            role: "agent",
            text: isAr
              ? "شكراً — تم استلام رسالتك. للرد السريع اضغط «متابعة على واتساب» أدناه. فريق الدعم سيتابع أيضاً على البريد."
              : "Thanks — we received your message. For a faster reply tap Continue on WhatsApp below. Our team will also follow up by email.",
            at: new Date(),
          },
        ]);
      }
      setTyping(false);
    }, 600);
  };

  const transcript = messages
    .filter((m) => m.id !== "greeting")
    .map((m) => `${m.role === "user" ? "Me" : m.role === "bot" ? "Bot" : "CS"}: ${m.text}`)
    .join("\n");

  const waText = isAr
    ? `طلب دعم — SaudiChat Pro\nBusiness: ${businessId}\n${userName ? `User: ${userName}\n` : ""}\n${transcript || input}`
    : `Support request — SaudiChat Pro\nBusiness: ${businessId}\n${userName ? `User: ${userName}\n` : ""}\n${transcript || input}`;

  return (
    <div className="flex flex-col h-[420px] rounded-xl border bg-card overflow-hidden">
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((m) => (
          <ChatBubble key={m.id} msg={m} isAr={isAr} />
        ))}
        {typing && (
          <p className="text-xs text-muted-foreground animate-pulse ps-1">
            {mode === "bot" ? (isAr ? "يكتب..." : "Typing...") : isAr ? "الدعم يقرأ..." : "CS is reading..."}
          </p>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="border-t p-2 space-y-2 bg-muted/30">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={isAr ? "اكتب رسالتك..." : "Type your message..."}
            className="h-9 text-sm"
          />
          <Button size="sm" className="h-9 shrink-0" onClick={send} disabled={!input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
        {mode === "live" && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
              <a href={buildWhatsAppSupportUrl(waText)} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-3.5 h-3.5 me-1 text-green-600" />
                {isAr ? "متابعة على واتساب" : "Continue on WhatsApp"}
              </a>
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
              <a
                href={buildSupportEmailUrl(
                  isAr ? "طلب دعم SaudiChat Pro" : "SaudiChat Pro support request",
                  waText
                )}
              >
                <Mail className="w-3.5 h-3.5 me-1" />
                {isAr ? "إرسال بريد" : "Email CS"}
              </a>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function HelpSupportHub({
  businessId,
  isAr,
  userName,
}: {
  businessId: string;
  isAr: boolean;
  userName?: string;
}) {
  const [tab, setTab] = useState<Tab>("bot");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const tabs: { id: Tab; label: string; icon: typeof Bot }[] = [
    { id: "bot", label: isAr ? "بوت المساعدة" : "Help Bot", icon: Bot },
    { id: "live", label: isAr ? "دردشة مباشرة" : "Live CS Chat", icon: Headphones },
    { id: "faq", label: isAr ? "أسئلة شائعة" : "FAQ", icon: HelpCircle },
  ];

  return (
    <ManpowerPageShell>
      <ManpowerHeroHeader
        icon={Sparkles}
        title={isAr ? "المساعدة والدعم" : "Help & Support"}
        subtitle={
          isAr
            ? "بوت فوري، دردشة مع فريق الدعم، واتساب، وبريد — كل ما تحتاجه في مكان واحد"
            : "Instant bot, live CS chat, WhatsApp & email — everything in one place"
        }
      />

      <TestingQuickStart businessId={businessId} isAr={isAr} />

      <div className="grid sm:grid-cols-3 gap-3">
        <a
          href={buildWhatsAppSupportUrl(
            isAr
              ? `مرحباً، أحتاج مساعدة في SaudiChat Pro (Business: ${businessId})`
              : `Hi, I need help with SaudiChat Pro (Business: ${businessId})`
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 hover:bg-green-500/10 transition"
        >
          <MessageCircle className="w-6 h-6 text-green-600 mb-2" />
          <p className="font-semibold text-sm">{isAr ? "واتساب الدعم" : "WhatsApp Support"}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{isAr ? "رد سريع — متاح الآن" : "Fast reply — available now"}</p>
        </a>
        <a
          href={buildSupportEmailUrl(
            isAr ? "دعم SaudiChat Pro" : "SaudiChat Pro Support",
            isAr ? `Business ID: ${businessId}\n\n` : `Business ID: ${businessId}\n\n`
          )}
          className="rounded-xl border p-4 hover:bg-muted/50 transition"
        >
          <Mail className="w-6 h-6 text-primary mb-2" />
          <p className="font-semibold text-sm">{siteConfig.email}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{isAr ? "بريد الدعم" : "Support email"}</p>
        </a>
        <div className="rounded-xl border p-4 bg-muted/20">
          <Phone className="w-6 h-6 text-primary mb-2" />
          <p className="font-semibold text-sm">{SUPPORT_PHONE}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{isAr ? "أحد–خميس 9–6" : "Sun–Thu 9am–6pm KSA"}</p>
        </div>
      </div>

      <ManpowerGlassCard title={isAr ? "اختر طريقة المساعدة" : "Choose how to get help"} icon={HelpCircle}>
        <div className="flex flex-wrap gap-2 mb-4">
          {tabs.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              size="sm"
              variant={tab === id ? "default" : "outline"}
              onClick={() => setTab(id)}
            >
              <Icon className="w-3.5 h-3.5 me-1" />
              {label}
            </Button>
          ))}
        </div>

        {tab === "bot" && <ChatPanel isAr={isAr} mode="bot" businessId={businessId} userName={userName} />}
        {tab === "live" && <ChatPanel isAr={isAr} mode="live" businessId={businessId} userName={userName} />}
        {tab === "faq" && (
          <div className="space-y-2">
            {HELP_FAQS.map((faq, i) => (
              <div key={i} className="rounded-lg border border-border/60 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-start text-sm font-medium hover:bg-muted/40"
                >
                  <span>{isAr ? faq.q.ar : faq.q.en}</span>
                  <ChevronDown className={cn("w-4 h-4 shrink-0 transition", openFaq === i && "rotate-180")} />
                </button>
                {openFaq === i && (
                  <p className="px-3 pb-3 text-xs text-muted-foreground leading-relaxed">
                    {isAr ? faq.a.ar : faq.a.en}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </ManpowerGlassCard>
    </ManpowerPageShell>
  );
}
