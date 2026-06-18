import { Response } from 'express';
import fs from 'fs';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { ensureDefaultWorkflows, WORKFLOW_TEMPLATES } from '../services/workflowRunner';
import { generateBusinessReportPdf, getExecutiveSummary } from '../services/reportService';

// ─── Sales Pipeline (Deals) ───────────────────────────────────────────────

export async function getDeals(req: AuthRequest, res: Response): Promise<void> {
  const deals = await prisma.deal.findMany({
    where: { businessId: req.params.businessId },
    include: { customer: true },
    orderBy: { updatedAt: 'desc' },
  });
  res.json({ success: true, data: deals });
}

export async function createDeal(req: AuthRequest, res: Response): Promise<void> {
  const body = req.body as Record<string, unknown>;
  const deal = await prisma.deal.create({
    data: {
      businessId: req.params.businessId,
      title: String(body.title || 'New Deal'),
      value: Number(body.value) || 0,
      stage: (body.stage as 'LEAD') || 'LEAD',
      probability: Number(body.probability) || 10,
      customerId: body.customerId ? String(body.customerId) : undefined,
      source: body.source ? String(body.source) : undefined,
      notes: body.notes ? String(body.notes) : undefined,
      assignedStaffId: body.assignedStaffId ? String(body.assignedStaffId) : undefined,
      expectedCloseDate: body.expectedCloseDate ? new Date(String(body.expectedCloseDate)) : undefined,
    },
    include: { customer: true },
  });
  res.status(201).json({ success: true, data: deal });
}

export async function updateDeal(req: AuthRequest, res: Response): Promise<void> {
  const updated = await prisma.deal.updateMany({
    where: { id: req.params.dealId, businessId: req.params.businessId },
    data: req.body,
  });
  if (updated.count === 0) {
    res.status(404).json({ success: false, message: 'Deal not found' });
    return;
  }
  const deal = await prisma.deal.findUnique({
    where: { id: req.params.dealId },
    include: { customer: true },
  });
  res.json({ success: true, data: deal });
}

export async function deleteDeal(req: AuthRequest, res: Response): Promise<void> {
  await prisma.deal.deleteMany({
    where: { id: req.params.dealId, businessId: req.params.businessId },
  });
  res.json({ success: true, message: 'Deal deleted' });
}

// ─── Tasks ────────────────────────────────────────────────────────────────

export async function getTasks(req: AuthRequest, res: Response): Promise<void> {
  const { status } = req.query;
  const where: Record<string, unknown> = { businessId: req.params.businessId };
  if (status && status !== 'all') where.status = status;

  const tasks = await prisma.task.findMany({
    where,
    include: { customer: true, deal: true },
    orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
  });
  res.json({ success: true, data: tasks });
}

export async function createTask(req: AuthRequest, res: Response): Promise<void> {
  const body = req.body as Record<string, unknown>;
  const task = await prisma.task.create({
    data: {
      businessId: req.params.businessId,
      title: String(body.title || 'Task'),
      description: body.description ? String(body.description) : undefined,
      status: (body.status as 'TODO') || 'TODO',
      priority: (body.priority as 'MEDIUM') || 'MEDIUM',
      assignedStaffId: body.assignedStaffId ? String(body.assignedStaffId) : undefined,
      customerId: body.customerId ? String(body.customerId) : undefined,
      dealId: body.dealId ? String(body.dealId) : undefined,
      dueDate: body.dueDate ? new Date(String(body.dueDate)) : undefined,
    },
    include: { customer: true, deal: true },
  });
  res.status(201).json({ success: true, data: task });
}

export async function updateTask(req: AuthRequest, res: Response): Promise<void> {
  const body = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = { ...body };
  if (body.status === 'DONE') data.completedAt = new Date();
  if (body.dueDate) data.dueDate = new Date(String(body.dueDate));

  const updated = await prisma.task.updateMany({
    where: { id: req.params.taskId, businessId: req.params.businessId },
    data,
  });
  if (updated.count === 0) {
    res.status(404).json({ success: false, message: 'Task not found' });
    return;
  }
  const task = await prisma.task.findUnique({
    where: { id: req.params.taskId },
    include: { customer: true, deal: true },
  });
  res.json({ success: true, data: task });
}

export async function deleteTask(req: AuthRequest, res: Response): Promise<void> {
  await prisma.task.deleteMany({
    where: { id: req.params.taskId, businessId: req.params.businessId },
  });
  res.json({ success: true, message: 'Task deleted' });
}

// ─── Inventory ────────────────────────────────────────────────────────────

export async function getInventory(req: AuthRequest, res: Response): Promise<void> {
  const items = await prisma.catalogItem.findMany({
    where: { businessId: req.params.businessId },
    orderBy: { nameEn: 'asc' },
  });
  const tracked = items.filter((i) => i.stockQty != null);
  const lowStock = tracked.filter((i) => (i.stockQty ?? 0) <= (i.lowStockThreshold ?? 5));
  res.json({
    success: true,
    data: { items: tracked, lowStock, totalTracked: tracked.length },
  });
}

export async function updateInventory(req: AuthRequest, res: Response): Promise<void> {
  const { stockQty, lowStockThreshold, sku } = req.body as Record<string, unknown>;
  const updated = await prisma.catalogItem.updateMany({
    where: { id: req.params.itemId, businessId: req.params.businessId },
    data: {
      ...(stockQty != null && { stockQty: Number(stockQty) }),
      ...(lowStockThreshold != null && { lowStockThreshold: Number(lowStockThreshold) }),
      ...(sku != null && { sku: String(sku) }),
    },
  });
  if (updated.count === 0) {
    res.status(404).json({ success: false, message: 'Item not found' });
    return;
  }
  const item = await prisma.catalogItem.findUnique({ where: { id: req.params.itemId } });
  res.json({ success: true, data: item });
}

// ─── Automation Workflows ─────────────────────────────────────────────────

export async function getAutomationWorkflows(req: AuthRequest, res: Response): Promise<void> {
  await ensureDefaultWorkflows(req.params.businessId);
  const workflows = await prisma.automationWorkflow.findMany({
    where: { businessId: req.params.businessId },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ success: true, data: workflows, templates: WORKFLOW_TEMPLATES });
}

export async function createAutomationWorkflow(req: AuthRequest, res: Response): Promise<void> {
  const body = req.body as Record<string, unknown>;
  const wf = await prisma.automationWorkflow.create({
    data: {
      businessId: req.params.businessId,
      name: String(body.name || 'Workflow'),
      description: body.description ? String(body.description) : undefined,
      triggerType: String(body.triggerType || 'manual'),
      triggerConfig: (body.triggerConfig as object) || {},
      steps: (body.steps as object[]) || [],
      isActive: body.isActive !== false,
    },
  });
  res.status(201).json({ success: true, data: wf });
}

export async function updateAutomationWorkflow(req: AuthRequest, res: Response): Promise<void> {
  const updated = await prisma.automationWorkflow.updateMany({
    where: { id: req.params.workflowId, businessId: req.params.businessId },
    data: req.body,
  });
  if (updated.count === 0) {
    res.status(404).json({ success: false, message: 'Workflow not found' });
    return;
  }
  const wf = await prisma.automationWorkflow.findUnique({ where: { id: req.params.workflowId } });
  res.json({ success: true, data: wf });
}

export async function deleteAutomationWorkflow(req: AuthRequest, res: Response): Promise<void> {
  await prisma.automationWorkflow.deleteMany({
    where: { id: req.params.workflowId, businessId: req.params.businessId },
  });
  res.json({ success: true, message: 'Workflow deleted' });
}

// ─── PDPL Compliance ──────────────────────────────────────────────────────

export async function getConsentRecords(req: AuthRequest, res: Response): Promise<void> {
  const records = await prisma.consentRecord.findMany({
    where: { businessId: req.params.businessId },
    include: { customer: true },
    orderBy: { grantedAt: 'desc' },
    take: 100,
  });
  res.json({ success: true, data: records });
}

export async function createConsentRecord(req: AuthRequest, res: Response): Promise<void> {
  const body = req.body as Record<string, unknown>;
  const record = await prisma.consentRecord.create({
    data: {
      businessId: req.params.businessId,
      customerId: body.customerId ? String(body.customerId) : undefined,
      phone: body.phone ? String(body.phone) : undefined,
      channel: String(body.channel || 'whatsapp'),
      purpose: String(body.purpose || 'marketing'),
      granted: body.granted !== false,
      ipAddress: body.ipAddress ? String(body.ipAddress) : undefined,
    },
    include: { customer: true },
  });
  res.status(201).json({ success: true, data: record });
}

export async function getComplianceStatus(req: AuthRequest, res: Response): Promise<void> {
  const businessId = req.params.businessId;
  const [consents, customers] = await Promise.all([
    prisma.consentRecord.count({ where: { businessId } }),
    prisma.customer.count({ where: { businessId } }),
  ]);
  const settings = (await prisma.business.findUnique({ where: { id: businessId }, select: { settings: true } }))
    ?.settings as Record<string, unknown> | undefined;
  const pdpl = (settings?.pdpl as Record<string, unknown>) || {};

  res.json({
    success: true,
    data: {
      consentRecords: consents,
      totalCustomers: customers,
      consentCoverage: customers > 0 ? Math.round((consents / customers) * 100) : 0,
      pdplEnabled: pdpl.enabled === true,
      dataRetentionDays: pdpl.dataRetentionDays || 365,
      checklist: [
        { id: 'consent', label: 'Consent records', done: consents > 0 },
        { id: 'privacy', label: 'Privacy policy published', done: true },
        { id: 'export', label: 'Data export capability', done: true },
        { id: 'delete', label: 'Right to delete', done: false },
        { id: 'retention', label: 'Retention policy set', done: !!pdpl.dataRetentionDays },
      ],
    },
  });
}

export async function updateComplianceSettings(req: AuthRequest, res: Response): Promise<void> {
  const business = await prisma.business.findUnique({ where: { id: req.params.businessId } });
  if (!business) {
    res.status(404).json({ success: false, message: 'Business not found' });
    return;
  }
  const settings = (business.settings as Record<string, unknown>) || {};
  settings.pdpl = { ...(settings.pdpl as object), ...req.body };
  await prisma.business.update({
    where: { id: req.params.businessId },
    data: { settings: settings as object },
  });
  res.json({ success: true, data: settings.pdpl });
}

// ─── Executive Dashboard & Reports ────────────────────────────────────────

export async function getExecutiveDashboard(req: AuthRequest, res: Response): Promise<void> {
  const days = Number(req.query.days) || 30;
  const summary = await getExecutiveSummary(req.params.businessId, days);
  res.json({ success: true, data: summary });
}

export async function downloadReport(req: AuthRequest, res: Response): Promise<void> {
  const days = Number(req.query.days) || 30;
  const filePath = await generateBusinessReportPdf(req.params.businessId, days);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="report-${req.params.businessId}.pdf"`);
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
  stream.on('end', () => fs.unlink(filePath, () => undefined));
}
