import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import prisma from '../utils/prisma';
import { getOwnerBriefing } from './executiveBriefingService';
import { getLiveManpowerDashboard } from './manpowerDashboardService';

export async function generateManpowerCeoPdf(businessId: string, days = 7): Promise<string> {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) throw new Error('Business not found');

  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  const [briefing, live, timesheets, attendance] = await Promise.all([
    getOwnerBriefing(businessId),
    getLiveManpowerDashboard(businessId),
    prisma.timesheet.groupBy({
      by: ['status'],
      where: { businessId, workDate: { gte: start } },
      _count: true,
      _sum: { hoursWorked: true, overtimeHours: true },
    }),
    prisma.workerDailyAttendance.groupBy({
      by: ['status'],
      where: { businessId, workDate: { gte: start } },
      _count: true,
    }),
  ]);

  const dir = path.join(process.cwd(), 'uploads', 'reports');
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `manpower-ceo-${businessId}-${Date.now()}.pdf`);

  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(18).text('SaudiChat Pro — Manpower CEO Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).text(business.name);
    doc.fontSize(10).text(`Period: Last ${days} days | Generated: ${new Date().toISOString().slice(0, 10)}`);
    doc.moveDown();

    doc.fontSize(12).text('Executive Summary', { underline: true });
    doc.fontSize(10).text(`Risk Score: ${briefing.riskScore}/100 (${briefing.riskLevel})`);
    doc.text(`Pending site approvals: ${briefing.summary.pendingTimesheets}`);
    doc.text(`Pending admin/payroll: ${briefing.summary.pendingAdmin}`);
    doc.text(`Iqama expiring (30d): ${briefing.summary.iqamaExpiringCount}`);
    doc.text(`Fatigue flags: ${briefing.summary.fatigueRiskCount}`);
    doc.moveDown();

    doc.fontSize(12).text('Morning Brief', { underline: true });
    doc.fontSize(10).text(briefing.morningBrief.replace(/\n/g, '\n'));
    doc.moveDown();

    doc.fontSize(12).text('Live Operations', { underline: true });
    doc.fontSize(10);
    doc.text(`Present today: ${live.realtime.presentToday} | Absent: ${live.realtime.absentToday}`);
    doc.text(`Month OT hours: ${live.totalOvertimeHoursMonth}`);
    doc.moveDown();

    doc.fontSize(12).text('Timesheets (period)', { underline: true });
    timesheets.forEach((t) => {
      doc.fontSize(10).text(
        `${t.status}: ${t._count} entries, ${(t._sum.hoursWorked || 0).toFixed(1)}h total, ${(t._sum.overtimeHours || 0).toFixed(1)}h OT`
      );
    });
    doc.moveDown();

    doc.fontSize(12).text('Attendance (period)', { underline: true });
    attendance.forEach((a) => {
      doc.fontSize(10).text(`${a.status}: ${a._count}`);
    });

    if (briefing.attentionItems.length) {
      doc.moveDown();
      doc.fontSize(12).text('Priority Actions', { underline: true });
      briefing.attentionItems.slice(0, 8).forEach((item) => {
        doc.fontSize(10).text(`[${item.severity}] ${item.title}${item.detail ? ` — ${item.detail}` : ''}`);
      });
    }

    doc.moveDown();
    doc.fontSize(9).fillColor('#666').text('Powered by SaudiChat Pro', { align: 'center' });
    doc.end();
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });

  return filePath;
}
