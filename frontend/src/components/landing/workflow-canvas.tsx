"use client";

import { Webhook, Bot, Brain, MessageSquare } from "lucide-react";
import { useApp } from "@/lib/context";

const nodes = [
  { id: "webhook", icon: Webhook, label: "Webhook", sub: "POST /api/inbound", color: "text-blue-400" },
  { id: "ai", icon: Bot, label: "AI Agent", sub: "GPT-4 · Arabic", color: "text-accent", running: true },
  { id: "openai", icon: Brain, label: "OpenAI", sub: "chat/completions", color: "text-emerald-400" },
  { id: "whatsapp", icon: MessageSquare, label: "WhatsApp", sub: "Send message", color: "text-green-400" },
];

export function WorkflowCanvas() {
  const { locale } = useApp();
  const isAr = locale === "ar";

  return (
    <div className="relative mx-auto w-full max-w-4xl">
      <div className="absolute -inset-4 rounded-2xl bg-accent/5 blur-3xl" />
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111111] shadow-2xl">
        {/* Canvas toolbar */}
        <div className="flex items-center justify-between border-b border-white/8 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
          </div>
          <span className="font-mono text-[10px] text-neutral-500">
            {isAr ? "سير عمل · restaurant-orders" : "workflow · restaurant-orders.json"}
          </span>
          <span className="rounded bg-green-500/20 px-2 py-0.5 font-mono text-[10px] text-green-400">
            {isAr ? "● نشط" : "● active"}
          </span>
        </div>

        {/* Canvas area with grid */}
        <div
          className="relative px-4 py-10 sm:px-8 sm:py-14"
          style={{
            backgroundImage: "radial-gradient(circle, #ffffff08 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        >
          {/* Connection lines (desktop horizontal) */}
          <svg
            className="pointer-events-none absolute inset-0 hidden h-full w-full sm:block"
            preserveAspectRatio="none"
          >
            {[0, 1, 2].map((i) => (
              <line
                key={i}
                x1={`${22 + i * 26}%`}
                y1="50%"
                x2={`${26 + i * 26}%`}
                y2="50%"
                stroke="#ff6d3f"
                strokeWidth="2"
                strokeDasharray="6 4"
                opacity="0.6"
                className="animate-flow-line"
              />
            ))}
          </svg>

          <div className="relative grid grid-cols-2 gap-4 sm:flex sm:items-center sm:justify-between sm:gap-0">
            {nodes.map((node) => {
              const Icon = node.icon;
              return (
                <div
                  key={node.id}
                  className={`n8n-node w-full sm:w-[140px] ${node.running ? "n8n-node-active" : ""}`}
                >
                  {node.running && (
                    <span className="n8n-running-badge">
                      <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse-dot" />
                      {isAr ? "يعمل" : "running"}
                    </span>
                  )}
                  <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-md bg-white/5 ${node.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="font-semibold text-white">{node.label}</p>
                  <p className="mt-0.5 text-[10px] text-neutral-500">{node.sub}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Execution log */}
        <div className="border-t border-white/8 bg-black/40 px-4 py-3 font-mono text-[10px] text-neutral-500">
          <span className="text-accent">→</span>{" "}
          {isAr
            ? "تم استلام webhook · AI Agent يعالج · تم إرسال رد واتساب · 1.2s"
            : "Webhook received · AI Agent processing · WhatsApp reply sent · 1.2s"}
        </div>
      </div>
    </div>
  );
}
