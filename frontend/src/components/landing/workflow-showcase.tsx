"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Bot,
  Brain,
  Calendar,
  ShoppingCart,
  Megaphone,
  UserPlus,
  Bell,
  GitBranch,
  UtensilsCrossed,
  Stethoscope,
  Store,
  type LucideIcon,
} from "lucide-react";
import { useApp } from "@/lib/context";
import { cn } from "@/lib/utils";

type WorkflowId = "restaurant" | "marketing" | "clinic" | "booking";

type NodeVariant = "trigger" | "ai" | "decision" | "action";

type DiagramNode = {
  id: string;
  step?: number;
  label: { en: string; ar: string };
  sub?: { en: string; ar: string };
  icon: LucideIcon;
  iconColor: string;
  variant: NodeVariant;
};

type WorkflowDef = {
  id: WorkflowId;
  tab: { en: string; ar: string };
  desc: { en: string; ar: string };
  summary: { en: string; ar: string };
  icon: LucideIcon;
  main: DiagramNode[];
  split?: {
    afterId: string;
    top: DiagramNode[];
    bottom: DiagramNode[];
    topLabel?: { en: string; ar: string };
    bottomLabel?: { en: string; ar: string };
  };
};

const WA = "#25D366";
const ORANGE = "#ff6d3f";

const N = {
  wa: (step: number, sub?: { en: string; ar: string }): DiagramNode => ({
    id: "wa",
    step,
    label: { en: "WhatsApp", ar: "واتساب" },
    sub,
    icon: MessageCircle,
    iconColor: WA,
    variant: "trigger",
  }),
  ai: (step: number, sub?: { en: string; ar: string }): DiagramNode => ({
    id: "ai",
    step,
    label: { en: "AI Agent", ar: "بوت ذكي" },
    sub,
    icon: Bot,
    iconColor: ORANGE,
    variant: "ai",
  }),
  branch: (step: number, label: { en: string; ar: string }): DiagramNode => ({
    id: "branch",
    step,
    label,
    icon: GitBranch,
    iconColor: "#fbbf24",
    variant: "decision",
  }),
  order: (step: number): DiagramNode => ({
    id: "order",
    step,
    label: { en: "Create order", ar: "إنشاء طلب" },
    icon: ShoppingCart,
    iconColor: WA,
    variant: "action",
  }),
  menu: (step: number): DiagramNode => ({
    id: "menu",
    step,
    label: { en: "Send menu", ar: "إرسال قائمة" },
    icon: Store,
    iconColor: "#2dd4bf",
    variant: "action",
  }),
  kitchen: (step: number): DiagramNode => ({
    id: "kitchen",
    step,
    label: { en: "Notify kitchen", ar: "إشعار المطبخ" },
    icon: Bell,
    iconColor: WA,
    variant: "action",
  }),
  follow: (step: number): DiagramNode => ({
    id: "follow",
    step,
    label: { en: "Follow up", ar: "متابعة" },
    icon: Bell,
    iconColor: WA,
    variant: "action",
  }),
  crm: (step: number): DiagramNode => ({
    id: "crm",
    step,
    label: { en: "Save to CRM", ar: "حفظ CRM" },
    icon: UserPlus,
    iconColor: "#60a5fa",
    variant: "action",
  }),
  offer: (step: number): DiagramNode => ({
    id: "offer",
    step,
    label: { en: "Send offer", ar: "إرسال عرض" },
    icon: Megaphone,
    iconColor: "#f472b6",
    variant: "action",
  }),
  demo: (step: number): DiagramNode => ({
    id: "demo",
    step,
    label: { en: "Book demo", ar: "حجز عرض" },
    icon: Calendar,
    iconColor: WA,
    variant: "action",
  }),
  campaign: (step: number): DiagramNode => ({
    id: "campaign",
    step,
    label: { en: "Campaign", ar: "حملة" },
    icon: Megaphone,
    iconColor: "#f472b6",
    variant: "action",
  }),
  schedule: (step: number): DiagramNode => ({
    id: "schedule",
    step,
    label: { en: "Schedule", ar: "جدولة" },
    icon: Calendar,
    iconColor: "#60a5fa",
    variant: "action",
  }),
  faq: (step: number): DiagramNode => ({
    id: "faq",
    step,
    label: { en: "Answer FAQ", ar: "رد FAQ" },
    icon: Brain,
    iconColor: "#a78bfa",
    variant: "action",
  }),
  confirm: (step: number): DiagramNode => ({
    id: "confirm",
    step,
    label: { en: "Confirm", ar: "تأكيد" },
    icon: Bell,
    iconColor: WA,
    variant: "action",
  }),
  handoff: (step: number): DiagramNode => ({
    id: "handoff",
    step,
    label: { en: "Staff handoff", ar: "تحويل" },
    icon: UserPlus,
    iconColor: "#60a5fa",
    variant: "action",
  }),
  slots: (step: number): DiagramNode => ({
    id: "slots",
    step,
    label: { en: "Check slots", ar: "فحص المواعيد" },
    icon: Calendar,
    iconColor: "#60a5fa",
    variant: "action",
  }),
  book: (step: number): DiagramNode => ({
    id: "book",
    step,
    label: { en: "Confirm booking", ar: "تأكيد الحجز" },
    icon: Bell,
    iconColor: WA,
    variant: "action",
  }),
  remind: (step: number): DiagramNode => ({
    id: "remind",
    step,
    label: { en: "Send reminder", ar: "إرسال تذكير" },
    sub: { en: "24h before", ar: "قبل 24 ساعة" },
    icon: Bell,
    iconColor: WA,
    variant: "action",
  }),
};

const WORKFLOWS: WorkflowDef[] = [
  {
    id: "restaurant",
    tab: { en: "Restaurant", ar: "مطاعم" },
    desc: { en: "Take orders & delivery via WhatsApp", ar: "استقبل الطلبات والتوصيل عبر واتساب" },
    summary: {
      en: "Customer messages → AI understands → order goes to kitchen or menu is sent",
      ar: "رسالة العميل → AI يفهم → طلب للمطبخ أو إرسال قائمة",
    },
    icon: UtensilsCrossed,
    main: [
      N.wa(1, { en: "Customer message", ar: "رسالة العميل" }),
      N.ai(2, { en: "Understands Arabic", ar: "يفهم العربية" }),
      N.branch(3, { en: "Is it an order?", ar: "هل طلب؟" }),
    ],
    split: {
      afterId: "branch",
      topLabel: { en: "Yes · order", ar: "نعم · طلب" },
      bottomLabel: { en: "No · question", ar: "لا · سؤال" },
      top: [N.order(4), N.kitchen(5)],
      bottom: [N.menu(4), N.follow(5)],
    },
  },
  {
    id: "marketing",
    tab: { en: "Marketing", ar: "تسويق" },
    desc: { en: "Capture leads & run WhatsApp campaigns", ar: "اجمع العملاء وشغّل حملات واتساب" },
    summary: {
      en: "Lead inquires → AI qualifies → hot leads to CRM, others get offers",
      ar: "استفسار → AI يؤهل → عميل مهتم للـ CRM، الباقي يحصل على عروض",
    },
    icon: Megaphone,
    main: [
      N.wa(1, { en: "Lead inquiry", ar: "استفسار عميل" }),
      N.ai(2, { en: "Qualify lead", ar: "تأهيل العميل" }),
      N.branch(3, { en: "Hot lead?", ar: "عميل مهتم؟" }),
    ],
    split: {
      afterId: "branch",
      topLabel: { en: "Yes · hot", ar: "نعم · مهتم" },
      bottomLabel: { en: "No · nurture", ar: "لا · متابعة" },
      top: [N.crm(4), N.demo(5)],
      bottom: [N.offer(4), N.campaign(5)],
    },
  },
  {
    id: "clinic",
    tab: { en: "Clinic", ar: "عيادات" },
    desc: { en: "Book appointments & answer patient FAQs", ar: "حجز مواعيد ورد على أسئلة المرضى" },
    summary: {
      en: "Patient messages → AI answers → books appointment or hands to staff",
      ar: "رسالة مريض → AI يرد → حجز موعد أو تحويل للموظف",
    },
    icon: Stethoscope,
    main: [
      N.wa(1, { en: "Patient message", ar: "رسالة مريض" }),
      N.ai(2, { en: "Arabic FAQ", ar: "أسئلة عربية" }),
      N.branch(3, { en: "Book appt?", ar: "حجز موعد؟" }),
    ],
    split: {
      afterId: "branch",
      topLabel: { en: "Yes · book", ar: "نعم · حجز" },
      bottomLabel: { en: "No · FAQ", ar: "لا · FAQ" },
      top: [N.schedule(4), N.confirm(5)],
      bottom: [N.faq(4), N.handoff(5)],
    },
  },
  {
    id: "booking",
    tab: { en: "Booking", ar: "حجوزات" },
    desc: { en: "Salon, gym & service bookings 24/7", ar: "حجوزات صالون ونادي وخدمات 24/7" },
    summary: {
      en: "Booking request → AI picks slot → confirms → sends reminder",
      ar: "طلب حجز → AI يختار موعد → تأكيد → تذكير تلقائي",
    },
    icon: Calendar,
    main: [
      N.wa(1, { en: "Booking request", ar: "طلب حجز" }),
      N.ai(2, { en: "Pick service & time", ar: "اختيار الخدمة" }),
      N.slots(3),
      N.book(4),
      N.remind(5),
    ],
  },
];

/* ─── Journey Pipeline diagram ─── */

const NODE_STYLE: Record<NodeVariant, { ring: string; glow: string }> = {
  trigger: { ring: "ring-[#25D366]/55", glow: "shadow-[0_0_24px_rgba(37,211,102,0.2)]" },
  ai: { ring: "ring-[#ff6d3f]/50", glow: "shadow-[0_0_24px_rgba(255,109,63,0.18)]" },
  decision: { ring: "ring-[#fbbf24]/45", glow: "shadow-[0_0_20px_rgba(251,191,36,0.12)]" },
  action: { ring: "ring-white/15", glow: "shadow-[0_0_16px_rgba(255,255,255,0.04)]" },
};

function PipelineNode({
  node,
  isAr,
  index,
  size = "md",
}: {
  node: DiagramNode;
  isAr: boolean;
  index: number;
  size?: "md" | "sm";
}) {
  const Icon = node.icon;
  const style = NODE_STYLE[node.variant];
  const md = size === "md";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.35 }}
      className="relative z-10 flex min-w-0 flex-1 flex-col items-center gap-1.5 px-0.5 sm:gap-2"
    >
      <div className="relative">
        {node.step != null && (
          <span className="absolute -start-1 -top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-[#0a0e12] text-[8px] font-bold text-white ring-1 ring-white/20 sm:h-5 sm:w-5 sm:text-[9px]">
            {node.step}
          </span>
        )}
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-[#0c1014] ring-2",
            md ? "h-12 w-12 sm:h-14 sm:w-14" : "h-10 w-10 sm:h-11 sm:w-11",
            style.ring,
            style.glow
          )}
        >
          <Icon
            className={md ? "h-5 w-5 sm:h-6 sm:w-6" : "h-4 w-4 sm:h-[18px] sm:w-[18px]"}
            style={{ color: node.iconColor }}
          />
        </div>
        {node.variant === "ai" && (
          <span className="absolute -bottom-0.5 -end-0.5 h-2.5 w-2.5 rounded-full bg-[#ff6d3f] ring-2 ring-[#0c1014] animate-pulse-dot" />
        )}
      </div>
      <div className="w-full text-center">
        <p className={cn("font-semibold leading-tight text-white", md ? "text-[10px] sm:text-xs" : "text-[9px] sm:text-[10px]")}>
          {isAr ? node.label.ar : node.label.en}
        </p>
        {node.sub && (
          <p className="mt-0.5 line-clamp-1 text-[8px] text-neutral-500 sm:text-[9px]">
            {isAr ? node.sub.ar : node.sub.en}
          </p>
        )}
      </div>
    </motion.div>
  );
}

function PipelineTrack({
  nodes,
  isAr,
  size = "md",
  lineColors,
  startIndex = 0,
}: {
  nodes: DiagramNode[];
  isAr: boolean;
  size?: "md" | "sm";
  lineColors?: string;
  startIndex?: number;
}) {
  const top = size === "md" ? "top-6 sm:top-7" : "top-5 sm:top-5";
  return (
    <div className="relative flex w-full items-start justify-between">
      <div
        className={cn(
          "pointer-events-none absolute h-0.5",
          lineColors ?? "bg-gradient-to-r from-[#25D366]/40 via-white/10 to-white/10",
          top
        )}
        style={{ left: "14%", right: "14%" }}
      />
      {nodes.map((node, i) => (
        <PipelineNode
          key={`${node.id}-${i}`}
          node={node}
          isAr={isAr}
          index={startIndex + i}
          size={size}
        />
      ))}
    </div>
  );
}

function OutcomePanel({
  label,
  variant,
  nodes,
  isAr,
  startIndex,
}: {
  label: string;
  variant: "yes" | "no";
  nodes: DiagramNode[];
  isAr: boolean;
  startIndex: number;
}) {
  return (
    <div
      className={cn(
        "relative flex-1 overflow-hidden rounded-xl px-2 py-3 sm:px-3 sm:py-4",
        variant === "yes"
          ? "bg-gradient-to-b from-[#25D366]/10 to-transparent ring-1 ring-[#25D366]/20"
          : "bg-gradient-to-b from-white/[0.04] to-transparent ring-1 ring-white/[0.07]"
      )}
    >
      <p
        className={cn(
          "mb-3 text-center text-[9px] font-bold uppercase tracking-widest sm:text-[10px]",
          variant === "yes" ? "text-[#25D366]" : "text-neutral-500"
        )}
      >
        {label}
      </p>
      <PipelineTrack nodes={nodes} isAr={isAr} size="sm" startIndex={startIndex} lineColors="bg-white/12" />
    </div>
  );
}

function SplitPipeline({ flow, isAr }: { flow: WorkflowDef; isAr: boolean }) {
  const split = flow.split!;

  return (
    <div className="space-y-5 sm:space-y-6">
      <PipelineTrack nodes={flow.main} isAr={isAr} />

      {/* Fork */}
      <div className="flex flex-col items-center">
        <div className="h-4 w-px bg-gradient-to-b from-[#fbbf24]/40 to-white/10" />
        <GitBranch className="h-4 w-4 text-[#fbbf24]/70" />
        <div className="mt-1 flex w-full max-w-[220px] items-start justify-between sm:max-w-[280px]">
          <div className="h-px w-[42%] origin-right rotate-[25deg] bg-gradient-to-r from-white/20 to-[#25D366]/40" />
          <div className="h-px w-[42%] origin-left -rotate-[25deg] bg-gradient-to-l from-white/15 to-white/10" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <OutcomePanel
          variant="yes"
          label={isAr ? split.topLabel?.ar ?? "نعم" : split.topLabel?.en ?? "Yes"}
          nodes={split.top}
          isAr={isAr}
          startIndex={3}
        />
        <OutcomePanel
          variant="no"
          label={isAr ? split.bottomLabel?.ar ?? "لا" : split.bottomLabel?.en ?? "No"}
          nodes={split.bottom}
          isAr={isAr}
          startIndex={5}
        />
      </div>
    </div>
  );
}

function LinearPipeline({ flow, isAr }: { flow: WorkflowDef; isAr: boolean }) {
  const n = flow.main.length;
  if (n <= 4) {
    return <PipelineTrack nodes={flow.main} isAr={isAr} />;
  }

  /* 5-step booking: 3 + 2 grid, still one screen */
  return (
    <div className="space-y-4">
      <PipelineTrack nodes={flow.main.slice(0, 3)} isAr={isAr} />
      <div className="mx-auto flex w-[55%] justify-center">
        <div className="h-4 w-px bg-white/15" />
      </div>
      <div className="mx-auto w-[66%]">
        <PipelineTrack nodes={flow.main.slice(3)} isAr={isAr} startIndex={3} />
      </div>
    </div>
  );
}

function JourneyDiagram({ flow, isAr }: { flow: WorkflowDef; isAr: boolean }) {
  if (flow.split) return <SplitPipeline flow={flow} isAr={isAr} />;
  return <LinearPipeline flow={flow} isAr={isAr} />;
}

export function WorkflowShowcase() {
  const { locale } = useApp();
  const isAr = locale === "ar";
  const [active, setActive] = useState<WorkflowId>("restaurant");
  const flow = WORKFLOWS.find((w) => w.id === active)!;

  return (
    <section className="workflow-section-dot relative overflow-x-hidden px-4 py-10 sm:py-14 lg:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_40%,rgba(37,211,102,0.04),transparent_55%)]" />

      <div className="relative mx-auto max-w-4xl">
        <div className="mb-6 text-center sm:mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ff6d3f]">
            {isAr ? "حالات الاستخدام" : "Use cases"}
          </p>
          <h2 className="mt-2 font-display text-xl font-bold text-white sm:text-2xl lg:text-3xl">
            {isAr ? "واتساب + AI لكل عمل" : "WhatsApp + AI for every business"}
          </h2>
        </div>

        {/* Tabs + diagram — minimal, no background box */}
        <nav className="mb-5 grid grid-cols-4 gap-1 sm:mb-6 sm:gap-2">
          {WORKFLOWS.map((w) => {
            const Icon = w.icon;
            const selected = active === w.id;
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => setActive(w.id)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg px-1 py-2.5 transition-all sm:flex-row sm:justify-center sm:gap-2 sm:px-3 sm:py-3",
                  selected
                    ? "bg-[#25D366]/10 text-white ring-1 ring-[#25D366]/25"
                    : "text-neutral-500 hover:bg-white/[0.03] hover:text-neutral-300"
                )}
              >
                <Icon
                  className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", selected ? "text-[#25D366]" : "text-neutral-600")}
                />
                <span className={cn("text-[9px] font-semibold sm:text-xs", selected && "text-white")}>
                  {isAr ? w.tab.ar : w.tab.en}
                </span>
              </button>
            );
          })}
        </nav>

        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="rounded-2xl bg-gradient-to-b from-white/[0.03] to-transparent p-4 ring-1 ring-white/[0.06] sm:p-6"
          >
            <p className="mb-5 text-center text-xs leading-relaxed text-neutral-400 sm:mb-6">
              {isAr ? flow.summary.ar : flow.summary.en}
            </p>
            <JourneyDiagram flow={flow} isAr={isAr} />
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
