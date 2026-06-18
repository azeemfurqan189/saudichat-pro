import { siteConfig } from "@/lib/site-config";

export const SUPPORT_WHATSAPP = "966110000000";
export const SUPPORT_PHONE = "+966 11 000 0000";

export type HelpFaq = {
  q: { en: string; ar: string };
  a: { en: string; ar: string };
};

export const HELP_FAQS: HelpFaq[] = [
  {
    q: { en: "How do I approve timesheets?", ar: "كيف أعتمد سجلات الساعات؟" },
    a: {
      en: "Go to Timesheets → Pending Queue, or open a Project → Timesheets tab. Site Manager approves first, then Owner/Admin.",
      ar: "اذهب إلى سجلات الساعات → قائمة الانتظار، أو افتح المشروع → تبويب الساعات. مشرف الموقع يعتمد أولاً ثم المالك/الإدارة.",
    },
  },
  {
    q: { en: "How to download worker Excel sheets?", ar: "كيف أحمّل Excel للعامل؟" },
    a: {
      en: "Project → Timesheets: use Download all workers or Download sheet next to each worker.",
      ar: "المشروع → الساعات: استخدم تحميل الكل أو تحميل Excel بجانب كل عامل.",
    },
  },
  {
    q: { en: "Equipment board — how to issue tools?", ar: "لوحة المعدات — كيف أُصدر أدوات؟" },
    a: {
      en: "Equipment → Add equipment with site & assignee, or drag a card from In Stock to Issued On Site.",
      ar: "المعدات → أضف معدة مع الموقع والمسؤول، أو اسحب البطاقة من المخزن إلى مسلّم للموقع.",
    },
  },
  {
    q: { en: "CMMS work order not showing?", ar: "أمر العمل لا يظهر؟" },
    a: {
      en: "Check Work Requests first — convert approved requests to work orders. Use CMMS Hub for overview.",
      ar: "تحقق من طلبات العمل أولاً — حوّل الطلبات المعتمدة إلى أوامر عمل. استخدم مركز CMMS للنظرة العامة.",
    },
  },
  {
    q: { en: "Who can access which project?", ar: "من يصل لأي مشروع؟" },
    a: {
      en: "Owner sets access at Project Access (Manager Access). Site managers see only assigned projects.",
      ar: "المالك يحدد الصلاحيات في صلاحيات المشرف. مشرفو المواقع يرون مشاريعهم فقط.",
    },
  },
  {
    q: { en: "WhatsApp bot not replying?", ar: "بوت واتساب لا يرد؟" },
    a: {
      en: "Settings → WhatsApp: verify Meta connection. Ensure AI Bot is enabled and greeting is set.",
      ar: "الإعدادات → واتساب: تحقق من ربط ميتا. تأكد أن البوت مفعّل ورسالة الترحيب مضبوطة.",
    },
  },
];

export const HELP_BOT_KB: Array<{ keywords: string[]; en: string; ar: string }> = [
  {
    keywords: ["timesheet", "ساعات", "approve", "اعتماد", "excel", "download", "تحميل"],
    en: "Timesheets: enter daily hours on Project → Workers (3-dot menu) or Timesheets page. Approve from Pending Queue. Download Excel from Project → Timesheets (all workers or per worker).",
    ar: "الساعات: أدخل الساعات من المشروع → العمال (قائمة ⋮) أو صفحة الساعات. اعتمد من قائمة الانتظار. حمّل Excel من المشروع → الساعات (الكل أو كل عامل).",
  },
  {
    keywords: ["equipment", "tool", "معدة", "معدات", "issue", "إصدار", "drag"],
    en: "Equipment Board: Add equipment with full details, drag between columns (Stock → Issued → Inspection). Click pencil to edit any item.",
    ar: "لوحة المعدات: أضف بكل التفاصيل، اسحب بين الأعمدة (مخزن → مسلّم → فحص). اضغط القلم للتعديل.",
  },
  {
    keywords: ["work order", "cmms", "maintenance", "صيانة", "work request", "طلب"],
    en: "CMMS: Submit Work Requests → approve → convert to Work Orders. Drag kanban boards to change status. Check CMMS Hub for alerts.",
    ar: "CMMS: قدّم طلبات العمل → اعتمد → حوّل لأوامر عمل. اسحب لوحة Kanban لتغيير الحالة. راجع مركز CMMS للتنبيهات.",
  },
  {
    keywords: ["password", "login", "دخول", "كلمة"],
    en: "Login issues: use Forgot Password on the login page. If still stuck, contact CS via Live Chat or WhatsApp below.",
    ar: "مشاكل الدخول: استخدم نسيت كلمة المرور. إن استمرت المشكلة تواصل مع الدعم عبر المحادثة أو واتساب.",
  },
  {
    keywords: ["permission", "access", "صلاح", "مشرف"],
    en: "Access: Owner manages roles at Project Access and CMMS Security. Managers cannot change billing or owner-only policies.",
    ar: "الصلاحيات: المالك يدير الأدوار من صلاحيات المشرف وأمان CMMS. المدير لا يغيّر الفواتير أو سياسات المالك.",
  },
  {
    keywords: ["whatsapp", "bot", "واتساب", "بوت"],
    en: "WhatsApp: connect in Settings → WhatsApp. Configure AI Bot under AI Bot menu. Test from Conversations inbox.",
    ar: "واتساب: الربط من الإعدادات → واتساب. اضبط البوت من قائمة AI Bot. جرّب من صندوق المحادثات.",
  },
  {
    keywords: ["billing", "plan", "فاتور", "اشتراك"],
    en: "Billing & plans: open Billing in the sidebar (Owner only). For invoice questions, email support or WhatsApp CS.",
    ar: "الفواتير والخطط: افتح الفواتير من القائمة (المالك فقط). لأسئلة الفواتير راسل الدعم أو واتساب.",
  },
];

export function getHelpBotReply(text: string, isAr: boolean): string {
  const lower = text.toLowerCase();
  for (const entry of HELP_BOT_KB) {
    if (entry.keywords.some((k) => lower.includes(k.toLowerCase()))) {
      return isAr ? entry.ar : entry.en;
    }
  }
  return isAr
    ? "شكراً على رسالتك. لم أفهم السؤال بالكامل — جرّب Live Chat للتحدث مع فريق الدعم، أو اسأل عن: ساعات، معدات، CMMS، صلاحيات، واتساب."
    : "Thanks for your message. I didn't fully match your question — try Live Chat to talk to our CS team, or ask about: timesheets, equipment, CMMS, permissions, WhatsApp.";
}

export function buildWhatsAppSupportUrl(message: string) {
  return `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(message)}`;
}

export function buildSupportEmailUrl(subject: string, body: string) {
  return `mailto:${siteConfig.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
