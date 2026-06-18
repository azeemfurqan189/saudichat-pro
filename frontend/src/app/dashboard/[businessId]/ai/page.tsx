"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bot, Brain, BookOpen, Sparkles, Play, Trash2, CheckCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from "@/lib/context";
import { api } from "@/lib/api";
import { BotSetupChecklist } from "@/components/dashboard/bot-setup-checklist";
import { getKnowledgeSuggestions, normalizeBusinessType } from "@/lib/industry-config";

export default function AiBotPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const { locale } = useApp();
  const isAr = locale === "ar";
  const queryClient = useQueryClient();

  const [testMessage, setTestMessage] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [knowledgeForm, setKnowledgeForm] = useState({ title: "", content: "" });
  const [faqAnswer, setFaqAnswer] = useState<Record<string, string>>({});
  const [customInstructions, setCustomInstructions] = useState("");
  const [refundPolicy, setRefundPolicy] = useState("");

  const { data: business } = useQuery({
    queryKey: ["business", businessId],
    queryFn: async () => (await api.getBusiness(businessId)).data,
  });
  const businessType = normalizeBusinessType(business?.type);

  const { data: settings } = useQuery({
    queryKey: ["ai-settings", businessId],
    queryFn: async () => (await api.getAiSettings(businessId)).data,
  });

  const { data: knowledge = [] } = useQuery({
    queryKey: ["knowledge", businessId],
    queryFn: async () => (await api.getKnowledgeDocuments(businessId)).data ?? [],
  });

  const { data: faqCandidates = [] } = useQuery({
    queryKey: ["faq-candidates", businessId],
    queryFn: async () => (await api.getFaqCandidates(businessId)).data ?? [],
  });

  const { data: botAnalytics } = useQuery({
    queryKey: ["bot-analytics", businessId],
    queryFn: async () => (await api.getBotAnalytics(businessId)).data,
  });

  const clearCache = useMutation({
    mutationFn: () => api.clearBotCache(businessId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["bot-setup", businessId] });
      toast.success(res.message || (isAr ? "تم تحديث البوت" : "Bot synced with latest data"));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateSettings = useMutation({
    mutationFn: (data: Parameters<typeof api.updateAiSettings>[1]) => api.updateAiSettings(businessId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-settings", businessId] });
      queryClient.invalidateQueries({ queryKey: ["bot-setup", businessId] });
      toast.success(isAr ? "تم الحفظ" : "Saved");
    },
  });

  useEffect(() => {
    if (settings) {
      setCustomInstructions(settings.aiPersona?.instructions || "");
      setRefundPolicy(
        typeof settings.refundPolicy === "string" && settings.refundPolicy !== "no_auto_refund"
          ? settings.refundPolicy
          : ""
      );
    }
  }, [settings]);

  const addKnowledge = useMutation({
    mutationFn: () => api.createKnowledgeDocument(businessId, knowledgeForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge", businessId] });
      setKnowledgeForm({ title: "", content: "" });
      toast.success(isAr ? "تمت الإضافة" : "Knowledge added");
    },
  });

  const approveFaq = useMutation({
    mutationFn: ({ id, answer }: { id: string; answer: string }) => api.approveFaqCandidate(businessId, id, answer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faq-candidates", businessId] });
      toast.success(isAr ? "تمت الموافقة" : "FAQ approved");
    },
  });

  const runTest = async () => {
    if (!testMessage.trim()) return;
    const res = await api.testBot(businessId, testMessage);
    setTestResult(JSON.stringify(res.data, null, 2));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bot className="w-7 h-7 text-primary" />
          {isAr ? "مساعد الذكاء الاصطناعي" : "AI Bot"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isAr ? "إعدادات البوت، المعرفة، والتحليلات" : "Bot settings, knowledge base, and analytics"}
        </p>
      </div>

      <BotSetupChecklist businessId={businessId} businessType={businessType} locale={isAr ? "ar" : "en"} />

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => clearCache.mutate()}
          loading={clearCache.isPending}
        >
          <RefreshCw className="w-4 h-4" />
          {isAr ? "مزامنة البوت (القائمة + الإعدادات)" : "Sync bot (catalog + settings)"}
        </Button>
        <p className="text-xs text-muted-foreground self-center">
          {isAr
            ? "اضغط بعد تحديث القائمة إذا كان البوت يرد ببيانات قديمة"
            : "Click after catalog changes if bot still shows old menu/data"}
        </p>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        {[
          { label: isAr ? "معدل التحويل" : "Conversion", value: `${botAnalytics?.conversionRate ?? 0}%` },
          { label: isAr ? "عملاء محتملون" : "Hot Leads", value: botAnalytics?.intelligence?.hotLeads ?? 0 },
          { label: isAr ? "معدل التحويل للموظف" : "Handoff Rate", value: `${botAnalytics?.handoffRate ?? 0}%` },
          { label: isAr ? "Tokens المستخدمة" : "Tokens Used", value: settings?.usage?.tokensThisMonth ?? 0 },
        ].map((kpi) => (
          <Card key={kpi.label} className="!p-4">
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="text-2xl font-bold mt-1">{kpi.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="w-4 h-4" /> {isAr ? "شخصية البوت" : "Bot Persona"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <select
              className="w-full rounded-lg border px-3 py-2 text-sm bg-background"
              value={settings?.aiPersona?.tone || "friendly"}
              onChange={(e) => updateSettings.mutate({ aiPersona: { ...settings?.aiPersona, tone: e.target.value } })}
            >
              <option value="friendly">{isAr ? "ودود" : "Friendly"}</option>
              <option value="formal">{isAr ? "رسمي" : "Formal"}</option>
              <option value="casual">{isAr ? "ع casual" : "Casual"}</option>
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings?.aiPaused === true}
                onChange={(e) => updateSettings.mutate({ aiPaused: e.target.checked })}
              />
              {isAr ? "إيقاف AI (ردود تلقائية فقط)" : "Pause AI (auto-replies only)"}
            </label>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                {isAr ? "تعليمات مخصصة للبوت" : "Custom bot instructions"}
              </label>
              <textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                rows={3}
                placeholder={
                  isAr
                    ? "مثال: دائماً اذكر أن الطعام حلال. لا تعطِ خصومات."
                    : "e.g. Always mention halal food. Never offer discounts without approval."
                }
                className="w-full rounded-xl border border-border bg-background p-3 text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  updateSettings.mutate({
                    aiPersona: { ...settings?.aiPersona, instructions: customInstructions },
                  })
                }
              >
                {isAr ? "حفظ التعليمات" : "Save instructions"}
              </Button>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                {isAr ? "سياسة الإلغاء/الاسترداد" : "Refund / cancellation policy"}
              </label>
              <textarea
                value={refundPolicy}
                onChange={(e) => setRefundPolicy(e.target.value)}
                rows={2}
                placeholder={isAr ? "إلغاء قبل 30 دقيقة..." : "Cancel 30 min before order..."}
                className="w-full rounded-xl border border-border bg-background p-3 text-sm"
              />
              <Button size="sm" variant="outline" onClick={() => updateSettings.mutate({ refundPolicy })}>
                {isAr ? "حفظ السياسة" : "Save policy"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Play className="w-4 h-4" /> {isAr ? "اختبار البوت" : "Test Bot"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder={isAr ? "اكتب رسالة تجريبية..." : "Type a test message..."}
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
            />
            <Button onClick={runTest} size="sm">{isAr ? "اختبار" : "Test"}</Button>
            {testResult && (
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-40">{testResult}</pre>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="w-4 h-4" /> {isAr ? "قاعدة المعرفة" : "Knowledge Base"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {getKnowledgeSuggestions(businessType, isAr ? "ar" : "en").map((title) => (
              <button
                key={title}
                type="button"
                className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20"
                onClick={() => setKnowledgeForm((f) => ({ ...f, title }))}
              >
                + {title}
              </button>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <Input
              placeholder={isAr ? "العنوان" : "Title"}
              value={knowledgeForm.title}
              onChange={(e) => setKnowledgeForm({ ...knowledgeForm, title: e.target.value })}
            />
            <Input
              placeholder={isAr ? "المحتوى (FAQ، سياسات، قائمة...)" : "Content (FAQ, policies, menu...)"}
              value={knowledgeForm.content}
              onChange={(e) => setKnowledgeForm({ ...knowledgeForm, content: e.target.value })}
            />
          </div>
          <Button size="sm" onClick={() => addKnowledge.mutate()} disabled={!knowledgeForm.title || !knowledgeForm.content}>
            {isAr ? "إضافة" : "Add"}
          </Button>
          <div className="space-y-2">
            {knowledge.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm">
                <span>{doc.title} ({doc._count?.chunks ?? 0} chunks)</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => api.deleteKnowledgeDocument(businessId, doc.id).then(() => queryClient.invalidateQueries({ queryKey: ["knowledge", businessId] }))}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4" /> {isAr ? "أسئلة مقترحة (تعلم تلقائي)" : "Suggested FAQs (Auto-Learning)"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => api.runFaqLearning(businessId).then(() => queryClient.invalidateQueries({ queryKey: ["faq-candidates", businessId] }))}
          >
            {isAr ? "استخراج من المحادثات" : "Extract from chats"}
          </Button>
          {faqCandidates.map((c) => (
            <div key={c.id} className="p-3 rounded-lg border space-y-2">
              <p className="text-sm font-medium">{c.question}</p>
              <p className="text-xs text-muted-foreground">{isAr ? "تكرار" : "Frequency"}: {c.frequency}</p>
              <Input
                placeholder={isAr ? "الإجابة المقترحة..." : "Suggested answer..."}
                value={faqAnswer[c.id] || ""}
                onChange={(e) => setFaqAnswer({ ...faqAnswer, [c.id]: e.target.value })}
              />
              <Button
                size="sm"
                onClick={() => approveFaq.mutate({ id: c.id, answer: faqAnswer[c.id] || "" })}
                disabled={!faqAnswer[c.id]?.trim()}
              >
                <CheckCircle className="w-4 h-4 mr-1" /> {isAr ? "موافقة وإضافة" : "Approve & Add"}
              </Button>
            </div>
          ))}
          {faqCandidates.length === 0 && (
            <p className="text-sm text-muted-foreground">{isAr ? "لا توجد اقتراحات بعد" : "No suggestions yet"}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
