import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import prisma from '../utils/prisma';

export async function generateBusinessReportPdf(businessId: string, days = 30): Promise<string> {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) throw new Error('Business not found');

  const start = new Date();
  start.setDate(start.getDate() - days);

  const [orders, customers, conversations, campaigns, appointments] = await Promise.all([
    prisma.order.findMany({ where: { businessId, createdAt: { gte: start } } }),
    prisma.customer.count({ where: { businessId, createdAt: { gte: start } } }),
    prisma.conversation.count({ where: { businessId, createdAt: { gte: start } } }),
    prisma.campaign.count({ where: { businessId, status: 'COMPLETED', createdAt: { gte: start } } }),
    prisma.appointment.count({ where: { businessId, createdAt: { gte: start } } }),
  ]);

  const revenue = orders.reduce((s, o) => s + o.total, 0);
  const avgOrder = orders.length ? revenue / orders.length : 0;

  const dir = path.join(process.cwd(), 'uploads', 'reports');
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${businessId}-${Date.now()}.pdf`);

  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(20).text('SaudiChat Pro — Business Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(business.name);
    doc.fontSize(10).text(`Period: Last ${days} days | Generated: ${new Date().toISOString().slice(0, 10)}`);
    doc.moveDown();

    doc.fontSize(12).text('Key Metrics', { underline: true });
    doc.fontSize(11);
    doc.text(`Total Orders: ${orders.length}`);
    doc.text(`Revenue: ${revenue.toFixed(2)} SAR`);
    doc.text(`Avg Order Value: ${avgOrder.toFixed(2)} SAR`);
    doc.text(`New Customers: ${customers}`);
    doc.text(`Conversations: ${conversations}`);
    doc.text(`Campaigns Sent: ${campaigns}`);
    doc.text(`Appointments: ${appointments}`);
    doc.moveDown();

    const statusCounts: Record<string, number> = {};
    orders.forEach((o) => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });
    doc.fontSize(12).text('Orders by Status', { underline: true });
    Object.entries(statusCounts).forEach(([st, cnt]) => doc.fontSize(11).text(`${st}: ${cnt}`));

    doc.moveDown();
    doc.fontSize(10).fillColor('#666').text('Powered by SaudiChat Pro — saudichat-pro.vercel.app', { align: 'center' });

    doc.end();
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });

  return filePath;
}

export async function getExecutiveSummary(businessId: string, days = 30) {
  const start = new Date();
  start.setDate(start.getDate() - days);

  const [orders, customers, prevOrders, deals, tasks, lowStock] = await Promise.all([
    prisma.order.findMany({ where: { businessId, createdAt: { gte: start } } }),
    prisma.customer.findMany({ where: { businessId } }),
    prisma.order.findMany({
      where: {
        businessId,
        createdAt: {
          gte: new Date(start.getTime() - days * 24 * 60 * 60 * 1000),
          lt: start,
        },
      },
    }),
    prisma.deal.groupBy({ by: ['stage'], where: { businessId }, _count: true, _sum: { value: true } }),
    prisma.task.count({ where: { businessId, status: { in: ['TODO', 'IN_PROGRESS'] } } }),
    prisma.catalogItem.count({
      where: {
        businessId,
        stockQty: { not: null },
        isAvailable: true,
      },
    }),
  ]);

  const revenue = orders.reduce((s, o) => s + o.total, 0);
  const prevRevenue = prevOrders.reduce((s, o) => s + o.total, 0);
  const revenueGrowth = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;

  const hotLeads = customers.filter((c) => c.leadScore >= 70).length;
  const churnRisk = customers.filter((c) => c.churnRisk === 'HIGH').length;
  const avgClv = customers.length
    ? customers.reduce((s, c) => s + c.totalSpent, 0) / customers.length
    : 0;

  const stockItems = await prisma.catalogItem.findMany({
    where: { businessId, stockQty: { not: null } },
    select: { id: true, nameEn: true, nameAr: true, stockQty: true, lowStockThreshold: true },
  });
  const lowStockItems = stockItems
    .filter((i) => (i.stockQty ?? 0) <= (i.lowStockThreshold ?? 5))
    .slice(0, 10);

  const healthScore = Math.min(
    100,
    Math.round(
      (orders.length > 0 ? 25 : 0) +
        (revenueGrowth >= 0 ? 20 : 10) +
        (hotLeads > 0 ? 15 : 5) +
        (churnRisk < 5 ? 20 : 10) +
        (tasks < 10 ? 20 : 10)
    )
  );

  return {
    periodDays: days,
    revenue,
    revenueGrowth: Math.round(revenueGrowth * 10) / 10,
    orders: orders.length,
    newCustomers: customers.filter((c) => c.createdAt >= start).length,
    avgOrderValue: orders.length ? revenue / orders.length : 0,
    avgClv: Math.round(avgClv),
    hotLeads,
    churnRiskCustomers: churnRisk,
    openTasks: tasks,
    pipeline: deals.map((d) => ({
      stage: d.stage,
      count: d._count,
      value: d._sum.value || 0,
    })),
    lowStockCount: lowStockItems.length,
    lowStockItems,
    businessHealthScore: healthScore,
    aiInsight:
      revenueGrowth > 10
        ? `Revenue up ${revenueGrowth.toFixed(1)}% — consider a broadcast campaign to top customers.`
        : revenueGrowth < -10
          ? `Revenue down ${Math.abs(revenueGrowth).toFixed(1)}% — run a win-back campaign for inactive customers.`
          : 'Stable period — focus on converting hot leads in your pipeline.',
  };
}
