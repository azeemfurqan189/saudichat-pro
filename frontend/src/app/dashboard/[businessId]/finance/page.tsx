"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleDollarSign, Link2, Loader2, RefreshCw, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";
import { ManpowerHeroHeader, ManpowerPageShell, ManpowerStatCard } from "@/components/dashboard/manpower-shell";
import { CmmsDemoBanner } from "@/components/dashboard/cmms-demo-banner";

const ERP_OPTIONS = [
  { value: "SAP", en: "SAP ERP", ar: "SAP" },
  { value: "ORACLE", en: "Oracle Fusion", ar: "Oracle" },
  { value: "QUICKBOOKS", en: "QuickBooks", ar: "QuickBooks" },
  { value: "DYNAMICS", en: "Microsoft Dynamics", ar: "Dynamics" },
];

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_AR = ["يناير", "فبر", "مار", "أبر", "ماي", "يون", "يول", "أغس", "سبت", "أكت", "نوف", "ديس"];

export default function FinancePage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();
  const [showErp, setShowErp] = useState(false);
  const [finProjectId, setFinProjectId] = useState("");
  const [milestoneForm, setMilestoneForm] = useState({ name: "", triggerPercent: "50", invoiceAmountSar: "", retentionPct: "10" });
  const [invoiceForm, setInvoiceForm] = useState({ amountSar: "", description: "" });
  const [invoiceProgress, setInvoiceProgress] = useState<Record<string, string>>({});

  const { data: agencyProjects = [] } = useQuery({
    queryKey: ["manpower-projects", businessId],
    queryFn: async () => (await api.getManpowerProjects(businessId)).data ?? [],
  });

  const activeFinProject = finProjectId || agencyProjects[0]?.id || "";

  const { data: projectFinancials } = useQuery({
    queryKey: ["project-financials", businessId, activeFinProject],
    queryFn: async () => (await api.getProjectFinancials(businessId, activeFinProject)).data,
    enabled: !!activeFinProject,
  });

  const { data: subcontractors = [] } = useQuery({
    queryKey: ["subcontractors", businessId],
    queryFn: async () => (await api.getSubcontractors(businessId)).data ?? [],
  });

  const { data: clientInvoices = [] } = useQuery({
    queryKey: ["client-invoices", businessId, activeFinProject],
    queryFn: async () => (await api.getClientInvoices(businessId, activeFinProject)).data ?? [],
    enabled: !!activeFinProject,
  });

  const financeSeedMut = useMutation({
    mutationFn: () => api.seedProjectFinance(businessId, activeFinProject),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-financials", businessId] });
      qc.invalidateQueries({ queryKey: ["subcontractors", businessId] });
      toast.success(isAr ? "تم تحميل مالية المشروع" : "Project finance demo loaded");
    },
  });

  const { data: summary, isLoading } = useQuery({
    queryKey: ["cmms-finance", businessId],
    queryFn: async () => (await api.getCmmsFinanceSummary(businessId)).data,
  });

  const { data: config } = useQuery({
    queryKey: ["cmms-finance-config", businessId],
    queryFn: async () => (await api.getCmmsFinanceConfig(businessId)).data,
  });

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: async () => (await api.getMe()).data });
  const isOwner = me?.businesses?.find((b) => b.id === businessId)?.memberRole === "OWNER";

  const [erpForm, setErpForm] = useState({
    erpSystem: "SAP",
    erpEndpoint: "",
    companyCode: "",
    glAccount: "6100-MAINT",
    costCenter: "MAINT-001",
    annualBudget: "600000",
    isConnected: false,
  });

  const syncMut = useMutation({
    mutationFn: () => api.syncCmmsFinanceToErp(businessId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cmms-finance", businessId] });
      qc.invalidateQueries({ queryKey: ["cmms-finance-config", businessId] });
      toast.success(isAr ? "تم النشر إلى ERP" : "Posted to ERP");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const configMut = useMutation({
    mutationFn: () =>
      api.updateCmmsFinanceConfig(businessId, {
        erpSystem: erpForm.erpSystem,
        erpEndpoint: erpForm.erpEndpoint || null,
        companyCode: erpForm.companyCode || null,
        glAccount: erpForm.glAccount,
        costCenter: erpForm.costCenter,
        annualBudget: parseFloat(erpForm.annualBudget) || 600000,
        isConnected: erpForm.isConnected,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cmms-finance", businessId] });
      qc.invalidateQueries({ queryKey: ["cmms-finance-config", businessId] });
      toast.success(isAr ? "تم حفظ إعدادات ERP" : "ERP settings saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const seedMut = useMutation({
    mutationFn: () => api.seedCmmsFinanceDemo(businessId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cmms-finance", businessId] });
      qc.invalidateQueries({ queryKey: ["cmms-finance-config", businessId] });
      toast.success(isAr ? "تم تحميل بيانات المالية" : "Finance demo loaded");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const fmt = (n: number) => formatCurrency(n, isAr ? "ar-SA" : "en-SA");
  const trendMax = Math.max(1, ...(summary?.monthlyTrend.map((m) => Math.max(m.budget, m.actual)) ?? [1]));
  const hasData = (summary?.costs.actual ?? 0) > 0 || summary?.erp.isConnected;

  return (
    <ManpowerPageShell>
      <ManpowerHeroHeader
        icon={CircleDollarSign}
        title={t(locale, "dashboard", "cmmsFinance")}
        subtitle={
          isAr
            ? "ربط ERP — تتبع الميزانية والتكلفة الفعلية والعمالة والمواد"
            : "ERP connect — track Budget, Actual, Labor & Material cost"
        }
      />

      <CmmsDemoBanner businessId={businessId} isAr={isAr} hasData={!!hasData} />

      <div className="flex flex-wrap gap-2 justify-end">
        {isOwner && (
          <Button size="sm" variant="outline" onClick={() => setShowErp(!showErp)}>
            <Link2 className="w-4 h-4 me-1" />
            {isAr ? "ربط ERP" : "ERP Connect"}
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => seedMut.mutate()} disabled={seedMut.isPending}>
          {seedMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : isAr ? "Demo مالية" : "Load finance demo"}
        </Button>
        {isOwner && summary?.erp.isConnected && (
          <Button size="sm" onClick={() => syncMut.mutate()} disabled={syncMut.isPending}>
            {syncMut.isPending ? <Loader2 className="w-4 h-4 animate-spin me-1" /> : <Upload className="w-4 h-4 me-1" />}
            {isAr ? "نشر إلى ERP" : "Post to ERP"}
          </Button>
        )}
      </div>

      {showErp && isOwner && (
        <div className="rounded-[10px] border border-[#E8E8E8] bg-white p-4 space-y-3">
          <p className="text-sm font-semibold">{isAr ? "إعدادات ERP" : "ERP Integration"}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-semibold uppercase text-[#9a9a9a]">{isAr ? "النظام" : "System"}</label>
              <select
                className="w-full mt-1 rounded-lg border border-[#E8E8E8] px-3 py-2 text-sm"
                value={erpForm.erpSystem || config?.erpSystem || "SAP"}
                onChange={(e) => setErpForm({ ...erpForm, erpSystem: e.target.value })}
              >
                {ERP_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{isAr ? o.ar : o.en}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase text-[#9a9a9a]">{isAr ? "Endpoint" : "API Endpoint"}</label>
              <Input
                value={erpForm.erpEndpoint || config?.erpEndpoint || ""}
                onChange={(e) => setErpForm({ ...erpForm, erpEndpoint: e.target.value })}
                placeholder="https://sap-gateway.company.com/api"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase text-[#9a9a9a]">{isAr ? "Company Code" : "Company Code"}</label>
              <Input
                value={erpForm.companyCode || config?.companyCode || ""}
                onChange={(e) => setErpForm({ ...erpForm, companyCode: e.target.value })}
                placeholder="1000"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase text-[#9a9a9a]">GL Account</label>
              <Input
                value={erpForm.glAccount || config?.glAccount || "6100-MAINT"}
                onChange={(e) => setErpForm({ ...erpForm, glAccount: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase text-[#9a9a9a]">{isAr ? "Cost Center" : "Cost Center"}</label>
              <Input
                value={erpForm.costCenter || config?.costCenter || "MAINT-001"}
                onChange={(e) => setErpForm({ ...erpForm, costCenter: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase text-[#9a9a9a]">{isAr ? "الميزانية السنوية" : "Annual Budget"}</label>
              <Input
                type="number"
                value={erpForm.annualBudget || String(config?.annualBudget ?? 600000)}
                onChange={(e) => setErpForm({ ...erpForm, annualBudget: e.target.value })}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={erpForm.isConnected || config?.isConnected || false}
              onChange={(e) => setErpForm({ ...erpForm, isConnected: e.target.checked })}
              className="rounded accent-[#1D9E75]"
            />
            {isAr ? "متصل بـ ERP" : "Connected to ERP"}
          </label>
          <Button size="sm" onClick={() => configMut.mutate()} loading={configMut.isPending}>
            {t(locale, "dashboard", "save")}
          </Button>
        </div>
      )}

      {summary?.erp.isConnected && (
        <div className="rounded-[10px] border border-[#1D9E75]/30 bg-[#EAF3DE]/40 p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 text-[#1D9E75]" />
            {ERP_OPTIONS.find((o) => o.value === summary.erp.system)?.[isAr ? "ar" : "en"] ?? summary.erp.system}
            · {summary.erp.costCenter} · {summary.erp.glAccount}
          </span>
          {summary.erp.lastSyncAt && (
            <span className="text-[#5c5c5c]">
              {isAr ? "آخر مزامنة:" : "Last sync:"} {new Date(summary.erp.lastSyncAt).toLocaleString(isAr ? "ar-SA" : "en-SA")}
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ManpowerStatCard
          label={isAr ? "الميزانية (شهر)" : "Budget (month)"}
          value={isLoading ? "—" : fmt(summary?.budget.monthly ?? 0)}
        />
        <ManpowerStatCard
          label={isAr ? "التكلفة الفعلية" : "Actual Cost"}
          value={isLoading ? "—" : fmt(summary?.costs.actual ?? 0)}
          accent={
            (summary?.budget.utilizationPct ?? 0) > 90 ? "border-red-200 bg-red-50/50" : undefined
          }
        />
        <ManpowerStatCard label={isAr ? "تكلفة العمالة" : "Labor Cost"} value={isLoading ? "—" : fmt(summary?.costs.labor ?? 0)} />
        <ManpowerStatCard label={isAr ? "تكلفة المواد" : "Material Cost"} value={isLoading ? "—" : fmt(summary?.costs.material ?? 0)} />
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="rounded-[10px] border border-[#E8E8E8] bg-white p-4">
          <p className="text-[10px] font-semibold uppercase text-[#9a9a9a]">{isAr ? "الفرق" : "Variance"}</p>
          <p className={cn("text-xl font-bold mt-1", (summary?.budget.variance ?? 0) >= 0 ? "text-[#1D9E75]" : "text-red-600")}>
            {isLoading ? "—" : fmt(summary?.budget.variance ?? 0)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">{isAr ? "الميزانية − الفعلي" : "Budget − Actual"}</p>
        </div>
        <div className="rounded-[10px] border border-[#E8E8E8] bg-white p-4">
          <p className="text-[10px] font-semibold uppercase text-[#9a9a9a]">{isAr ? "الاستخدام" : "Utilization"}</p>
          <p className="text-xl font-bold mt-1">{isLoading ? "—" : `${summary?.budget.utilizationPct ?? 0}%`}</p>
        </div>
        <div className="rounded-[10px] border border-[#E8E8E8] bg-white p-4">
          <p className="text-[10px] font-semibold uppercase text-[#9a9a9a]">{isAr ? "الميزانية السنوية" : "Annual Budget"}</p>
          <p className="text-xl font-bold mt-1">{isLoading ? "—" : fmt(summary?.budget.annual ?? 0)}</p>
        </div>
      </div>

      <div className="rounded-[10px] border border-[#E8E8E8] bg-white p-4">
        <p className="text-sm font-semibold mb-3">{isAr ? "الاتجاه الشهري" : "Monthly trend"} — {summary?.period.year}</p>
        <div className="flex items-end gap-1 h-32">
          {(summary?.monthlyTrend ?? []).map((m) => (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-1 min-w-0">
              <div className="w-full flex gap-0.5 items-end h-24">
                <div
                  className="flex-1 bg-[#E8E8E8] rounded-t"
                  style={{ height: `${Math.round((m.budget / trendMax) * 100)}%` }}
                  title={`Budget ${m.budget}`}
                />
                <div
                  className="flex-1 bg-[#1D9E75] rounded-t"
                  style={{ height: `${Math.round((m.actual / trendMax) * 100)}%` }}
                  title={`Actual ${m.actual}`}
                />
              </div>
              <span className="text-[8px] text-muted-foreground truncate w-full text-center">
                {isAr ? MONTHS_AR[m.month - 1] : MONTHS_EN[m.month - 1]}
              </span>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#E8E8E8] rounded" /> {isAr ? "ميزانية" : "Budget"}</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#1D9E75] rounded" /> {isAr ? "فعلي" : "Actual"}</span>
        </div>
      </div>

      <div className="rounded-[10px] border border-[#E8E8E8] bg-white divide-y">
        <div className="p-3 bg-[#FAFAF8] text-xs font-semibold">{isAr ? "أحدث أوامر العمل — تكلفة" : "Recent work orders — cost breakdown"}</div>
        {isLoading ? (
          <p className="p-6 text-center text-muted-foreground text-sm">{isAr ? "جاري التحميل..." : "Loading..."}</p>
        ) : (summary?.recentJobs.length ?? 0) === 0 ? (
          <p className="p-6 text-center text-muted-foreground text-sm">{isAr ? "لا بيانات — حمّل Demo" : "No data — load demo"}</p>
        ) : (
          summary?.recentJobs.map((job) => (
            <div key={job.id} className="p-3 flex flex-wrap justify-between gap-2">
              <div>
                <span className="font-mono text-[10px] text-muted-foreground">{job.number}</span>
                <p className="text-sm font-medium">{job.title}</p>
                {job.functionalLocation && <p className="text-[10px] text-muted-foreground">{job.functionalLocation.name}</p>}
              </div>
              <div className="text-right text-xs space-y-0.5">
                <p>{isAr ? "عمالة:" : "Labor:"} {fmt(job.laborCost ?? 0)}</p>
                <p>{isAr ? "مواد:" : "Material:"} {fmt(job.partsCost ?? 0)}</p>
                <p className="font-semibold">{fmt((job.laborCost ?? 0) + (job.partsCost ?? 0))}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {activeFinProject && (
        <div className="rounded-[10px] border border-[#E8E8E8] bg-white p-4 space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <p className="text-sm font-semibold">{isAr ? "Budget vs Commitment vs Actual — 3-Way Match" : "Budget vs Commitment vs Actual — 3-Way Match"}</p>
            <div className="flex gap-2">
              <select className="text-xs border rounded px-2 py-1" value={activeFinProject} onChange={(e) => setFinProjectId(e.target.value)}>
                {agencyProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <Button size="sm" variant="outline" onClick={() => financeSeedMut.mutate()} disabled={financeSeedMut.isPending}>
                {isAr ? "Demo مشروع" : "Project demo"}
              </Button>
            </div>
          </div>
          {projectFinancials && (
            <>
              <div className="grid sm:grid-cols-4 gap-3">
                <ManpowerStatCard label="Budget (BAC)" value={fmt(projectFinancials.budget)} />
                <ManpowerStatCard label={isAr ? "التزام (PO)" : "Commitment"} value={fmt(projectFinancials.commitment)} />
                <ManpowerStatCard label={isAr ? "فعلي" : "Actual"} value={fmt(projectFinancials.actual)} />
                <ManpowerStatCard label={isAr ? "إيراد" : "Revenue"} value={fmt(projectFinancials.revenue)} accent={projectFinancials.threeWayMatch.status === "GREEN" ? "border-green-200 bg-green-50/30" : projectFinancials.threeWayMatch.status === "RED" ? "border-red-200 bg-red-50/30" : "border-amber-200 bg-amber-50/30"} />
              </div>
              <p className="text-xs">{isAr ? "Retention محجوز:" : "Retention held:"} {fmt(projectFinancials.retentionHeld)} · Status: <strong>{projectFinancials.threeWayMatch.status}</strong></p>
              {projectFinancials.milestones.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold">{isAr ? "Milestone Billing + Retention" : "Milestone Billing + Retention"}</p>
                  {projectFinancials.milestones.map((m) => (
                    <div key={m.id} className="flex flex-wrap justify-between gap-2 text-xs border rounded p-2 items-center">
                      <span>{m.name} ({m.triggerPercent}%)</span>
                      <span>{fmt(m.invoiceAmountSar)} · {m.retentionPct}% ret · <strong>{m.status}</strong></span>
                      <div className="flex gap-1 flex-wrap">
                        {m.status === "PENDING" && (
                          <>
                            <Input type="number" className="h-7 w-16 text-xs" placeholder="%" value={invoiceProgress[m.id] ?? String(m.triggerPercent)} onChange={(e) => setInvoiceProgress({ ...invoiceProgress, [m.id]: e.target.value })} />
                            <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={async () => {
                              await api.postMilestoneInvoice(businessId, m.id, parseFloat(invoiceProgress[m.id] ?? String(m.triggerPercent)) || m.triggerPercent);
                              qc.invalidateQueries({ queryKey: ["project-financials", businessId] });
                              toast.success(isAr ? "تم إصدار الفاتورة" : "Milestone invoiced");
                            }}>{isAr ? "فوترة" : "Invoice"}</Button>
                          </>
                        )}
                        {m.status === "INVOICED" && (
                          <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={async () => {
                            await api.postReleaseRetention(businessId, m.id);
                            qc.invalidateQueries({ queryKey: ["project-financials", businessId] });
                            toast.success(isAr ? "تم إطلاق Retention" : "Retention released");
                          }}>{isAr ? "إطلاق Retention" : "Release retention"}</Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="border rounded p-3 space-y-2">
                <p className="text-xs font-semibold">{isAr ? "إضافة Milestone" : "Add milestone"}</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  <Input className="h-8 text-xs" placeholder={isAr ? "الاسم" : "Name"} value={milestoneForm.name} onChange={(e) => setMilestoneForm({ ...milestoneForm, name: e.target.value })} />
                  <Input className="h-8 text-xs" type="number" placeholder="SAR" value={milestoneForm.invoiceAmountSar} onChange={(e) => setMilestoneForm({ ...milestoneForm, invoiceAmountSar: e.target.value })} />
                  <Input className="h-8 text-xs" type="number" placeholder="Trigger %" value={milestoneForm.triggerPercent} onChange={(e) => setMilestoneForm({ ...milestoneForm, triggerPercent: e.target.value })} />
                  <Input className="h-8 text-xs" type="number" placeholder="Retention %" value={milestoneForm.retentionPct} onChange={(e) => setMilestoneForm({ ...milestoneForm, retentionPct: e.target.value })} />
                </div>
                <Button size="sm" variant="outline" className="h-8" disabled={!milestoneForm.name || !milestoneForm.invoiceAmountSar} onClick={async () => {
                  await api.postMilestone(businessId, activeFinProject, {
                    name: milestoneForm.name,
                    triggerPercent: parseFloat(milestoneForm.triggerPercent) || 50,
                    invoiceAmountSar: parseFloat(milestoneForm.invoiceAmountSar),
                    retentionPct: parseFloat(milestoneForm.retentionPct) || 10,
                  });
                  setMilestoneForm({ name: "", triggerPercent: "50", invoiceAmountSar: "", retentionPct: "10" });
                  qc.invalidateQueries({ queryKey: ["project-financials", businessId] });
                  toast.success(isAr ? "تمت الإضافة" : "Milestone added");
                }}>{isAr ? "إضافة" : "Add"}</Button>
              </div>
              <div className="border rounded p-3 space-y-2">
                <p className="text-xs font-semibold">{isAr ? "فواتير العميل / إيراد" : "Client invoicing / revenue"}</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  <Input className="h-8 text-xs" type="number" placeholder="SAR" value={invoiceForm.amountSar} onChange={(e) => setInvoiceForm({ ...invoiceForm, amountSar: e.target.value })} />
                  <Input className="h-8 text-xs" placeholder={isAr ? "الوصف" : "Description"} value={invoiceForm.description} onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })} />
                </div>
                <Button size="sm" className="h-8" disabled={!invoiceForm.amountSar} onClick={async () => {
                  await api.postClientInvoice(businessId, {
                    agencyProjectId: activeFinProject,
                    amountSar: parseFloat(invoiceForm.amountSar),
                    description: invoiceForm.description || undefined,
                  });
                  setInvoiceForm({ amountSar: "", description: "" });
                  qc.invalidateQueries({ queryKey: ["client-invoices", businessId] });
                  qc.invalidateQueries({ queryKey: ["project-financials", businessId] });
                  toast.success(isAr ? "تم إصدار فاتورة العميل" : "Client invoice issued");
                }}>{isAr ? "إصدار فاتورة" : "Issue invoice"}</Button>
                {clientInvoices.length > 0 && (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {clientInvoices.map((inv) => (
                      <div key={inv.id} className="flex justify-between text-[11px] border-b pb-1">
                        <span className="font-mono">{inv.number}</span>
                        <span>{fmt(inv.amountSar)} · {inv.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
          {subcontractors.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-2">{isAr ? "مقاولين فرعيين" : "Subcontractors"} ({subcontractors.length})</p>
              {subcontractors.map((s) => (
                <p key={s.id} className="text-xs">{s.name} · {s.trade} · PO:{s._count?.pos ?? 0}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </ManpowerPageShell>
  );
}
