"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Bot,
  User,
  Send,
  Smile,
  Zap,
  MessageSquare,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api, Conversation, Message } from "@/lib/api";
import { cn, formatDate, getInitials } from "@/lib/utils";

const QUICK_REPLIES = {
  en: ["Hello! How can I help?", "Your order is ready", "Thank you for contacting us"],
  ar: ["مرحباً! كيف أقدر أساعدك؟", "طلبك جاهز", "شكراً لتواصلك معنا"],
};

const EMOJIS = ["😊", "👍", "🙏", "✅", "📦", "🎉", "❤️", "☕"];

export default function ConversationsPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const { locale } = useApp();
  const isAr = locale === "ar";
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showQuick, setShowQuick] = useState(false);

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["conversations", businessId],
    queryFn: async () => {
      const res = await api.getConversations(businessId);
      return res.data ?? [];
    },
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["messages", businessId, selectedId],
    queryFn: async () => {
      const res = await api.getMessages(businessId, selectedId!);
      return res.data ?? [];
    },
    enabled: !!selectedId,
    refetchInterval: selectedId ? 5000 : false,
  });

  const selected = conversations.find((c) => c.id === selectedId);

  const sendMutation = useMutation({
    mutationFn: (content: string) => api.sendMessage(businessId, selectedId!, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", businessId, selectedId] });
      queryClient.invalidateQueries({ queryKey: ["conversations", businessId] });
      setMessage("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const botMutation = useMutation({
    mutationFn: () => api.toggleBot(businessId, selectedId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations", businessId] });
      toast.success(isAr ? "تم تحديث وضع البوت" : "Bot mode updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  useEffect(() => {
    if (!selectedId && conversations.length > 0) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations, selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!message.trim() || !selectedId) return;
    sendMutation.mutate(message.trim());
  };

  const quickReplies = isAr ? QUICK_REPLIES.ar : QUICK_REPLIES.en;

  return (
    <div className="space-y-4 h-[calc(100vh-8rem)]">
      <div>
        <h1 className="text-2xl font-bold">{t(locale, "dashboard", "conversations")}</h1>
      </div>

      <div className="flex h-[calc(100%-3rem)] glass rounded-2xl overflow-hidden border border-border/50">
        {/* Conversation list */}
        <aside className="w-full md:w-80 lg:w-96 border-e border-border/50 flex flex-col shrink-0">
          <div className="p-4 border-b border-border/50">
            <p className="text-sm font-medium text-muted-foreground">
              {conversations.length} {isAr ? "محادثة" : "conversations"}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4">
                <TableSkeleton rows={5} />
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                {t(locale, "dashboard", "noData")}
              </div>
            ) : (
              conversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conv={conv}
                  active={conv.id === selectedId}
                  onClick={() => setSelectedId(conv.id)}
                  isAr={isAr}
                  locale={locale}
                />
              ))
            )}
          </div>
        </aside>

        {/* Chat panel */}
        <div className="hidden md:flex flex-1 flex-col min-w-0">
          {selected ? (
            <>
              <header className="flex items-center justify-between p-4 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white text-sm font-bold">
                    {getInitials(selected.customer?.name || "?")}
                  </div>
                  <div>
                    <p className="font-semibold">{selected.customer?.name || "Customer"}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1" dir="ltr">
                      <Phone className="w-3 h-3" />
                      {selected.customer?.phone}
                    </p>
                  </div>
                </div>
                <Button
                  variant={selected.isBotHandling ? "default" : "outline"}
                  size="sm"
                  onClick={() => botMutation.mutate()}
                  loading={botMutation.isPending}
                >
                  {selected.isBotHandling ? (
                    <>
                      <Bot className="w-4 h-4" />
                      {isAr ? "البوت نشط" : "Bot Active"}
                    </>
                  ) : (
                    <>
                      <User className="w-4 h-4" />
                      {isAr ? "تحكم بشري" : "Human Mode"}
                    </>
                  )}
                </Button>
              </header>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
                {messagesLoading ? (
                  <TableSkeleton rows={6} />
                ) : messages.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    {t(locale, "dashboard", "noData")}
                  </p>
                ) : (
                  messages.map((msg) => (
                    <MessageBubble key={msg.id} msg={msg} isAr={isAr} locale={locale} />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <footer className="p-4 border-t border-border/50 space-y-2">
                {showQuick && (
                  <div className="flex flex-wrap gap-2">
                    {quickReplies.map((qr) => (
                      <button
                        key={qr}
                        onClick={() => {
                          setMessage(qr);
                          setShowQuick(false);
                        }}
                        className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                      >
                        {qr}
                      </button>
                    ))}
                  </div>
                )}
                {showEmoji && (
                  <div className="flex flex-wrap gap-1">
                    {EMOJIS.map((e) => (
                      <button
                        key={e}
                        onClick={() => setMessage((m) => m + e)}
                        className="text-xl p-1 hover:bg-muted rounded"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <Button variant="ghost" size="icon" onClick={() => setShowEmoji(!showEmoji)}>
                    <Smile className="w-5 h-5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setShowQuick(!showQuick)}>
                    <Zap className="w-5 h-5" />
                  </Button>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    rows={1}
                    placeholder={isAr ? "اكتب رسالة..." : "Type a message..."}
                    className="flex-1 min-h-[44px] max-h-32 rounded-xl border border-border bg-white/50 dark:bg-gray-900/50 px-4 py-3 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  />
                  <Button
                    size="icon"
                    onClick={handleSend}
                    loading={sendMutation.isPending}
                    disabled={!message.trim()}
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </footer>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              {isAr ? "اختر محادثة" : "Select a conversation"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ConversationItem({
  conv,
  active,
  onClick,
  isAr,
  locale,
}: {
  conv: Conversation;
  active: boolean;
  onClick: () => void;
  isAr: boolean;
  locale: string;
}) {
  const lastMsg = conv.messages?.[conv.messages.length - 1];

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-3 p-4 text-start border-b border-border/30 transition-colors",
        active ? "bg-primary/10" : "hover:bg-muted/50"
      )}
    >
      <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
        {getInitials(conv.customer?.name || "?")}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium truncate">{conv.customer?.name || "Customer"}</p>
          <span className="text-xs text-muted-foreground shrink-0">
            {formatDate(conv.lastMessageAt, locale).split(",")[0]}
          </span>
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {lastMsg?.content || (isAr ? "لا رسائل" : "No messages")}
        </p>
        {conv.isBotHandling && (
          <span className="inline-flex items-center gap-1 text-xs text-primary mt-1">
            <Bot className="w-3 h-3" />
            {isAr ? "بوت" : "Bot"}
          </span>
        )}
      </div>
    </button>
  );
}

function MessageBubble({
  msg,
  isAr,
  locale,
}: {
  msg: Message;
  isAr: boolean;
  locale: string;
}) {
  const isOutbound = msg.senderType === "staff" || msg.senderType === "bot" || msg.senderType === "business";
  const isBot = msg.senderType === "bot";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex", isOutbound ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
          isOutbound
            ? "bg-primary text-white rounded-ee-sm"
            : "bg-white dark:bg-gray-800 rounded-es-sm shadow-sm"
        )}
      >
        {isBot && (
          <span className="flex items-center gap-1 text-xs opacity-80 mb-1">
            <Bot className="w-3 h-3" />
            {isAr ? "بوت" : "Bot"}
          </span>
        )}
        <p className="whitespace-pre-wrap">{msg.content}</p>
        <p
          className={cn(
            "text-[10px] mt-1",
            isOutbound ? "text-white/70" : "text-muted-foreground"
          )}
        >
          {formatDate(msg.createdAt, locale)}
        </p>
      </div>
    </motion.div>
  );
}
