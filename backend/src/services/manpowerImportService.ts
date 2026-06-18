import ExcelJS from 'exceljs';
import prisma from '../utils/prisma';

export type ImportRowResult = {
  row: number;
  ok: boolean;
  message: string;
};

export async function buildTimesheetImportTemplate(businessId: string): Promise<Buffer> {
  const [workers, projects] = await Promise.all([
    prisma.workerProfile.findMany({
      where: { businessId },
      select: { name: true, iqamaNumber: true, category: true },
      orderBy: { name: 'asc' },
      take: 200,
    }),
    prisma.agencyProject.findMany({
      where: { businessId, status: 'ACTIVE' },
      select: { name: true, code: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Import');
  sheet.columns = [
    { header: 'Worker Name*', key: 'worker', width: 22 },
    { header: 'Iqama (optional)', key: 'iqama', width: 16 },
    { header: 'Project Name', key: 'project', width: 22 },
    { header: 'Date (YYYY-MM-DD)*', key: 'date', width: 16 },
    { header: 'Regular Hours', key: 'regular', width: 14 },
    { header: 'Overtime Hours', key: 'overtime', width: 14 },
    { header: 'Notes', key: 'notes', width: 24 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.addRow({
    worker: workers[0]?.name || 'Ahmed Ali',
    iqama: workers[0]?.iqamaNumber || '',
    project: projects[0]?.name || '',
    date: new Date().toISOString().slice(0, 10),
    regular: 8,
    overtime: 2,
    notes: '',
  });

  const ref = wb.addWorksheet('Reference');
  ref.addRow(['Workers']);
  workers.forEach((w) => ref.addRow([w.name, w.iqamaNumber, w.category]));
  ref.addRow([]);
  ref.addRow(['Active Projects']);
  projects.forEach((p) => ref.addRow([p.name, p.code]));

  return Buffer.from(await wb.xlsx.writeBuffer());
}

function parseDate(val: unknown): Date | null {
  if (val instanceof Date) return val;
  const s = String(val || '').trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function importTimesheetsFromWorkbook(
  businessId: string,
  buffer: Buffer,
  submittedByMemberId?: string
): Promise<{ imported: number; skipped: number; results: ImportRowResult[] }> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet = wb.getWorksheet('Import') || wb.worksheets[0];
  if (!sheet) throw new Error('Empty workbook');

  const [workers, projects] = await Promise.all([
    prisma.workerProfile.findMany({ where: { businessId } }),
    prisma.agencyProject.findMany({ where: { businessId } }),
  ]);

  const results: ImportRowResult[] = [];
  let imported = 0;
  let skipped = 0;

  for (let i = 2; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i);
    const workerName = String(row.getCell(1).value || '').trim();
    const iqama = String(row.getCell(2).value || '').trim();
    const projectName = String(row.getCell(3).value || '').trim();
    const dateVal = row.getCell(4).value;
    const regular = Number(row.getCell(5).value) || 8;
    const overtime = Number(row.getCell(6).value) || 0;
    const notes = String(row.getCell(7).value || '').trim() || undefined;

    if (!workerName && !iqama) continue;

    const workDate = parseDate(dateVal);
    if (!workDate) {
      results.push({ row: i, ok: false, message: 'Invalid date' });
      skipped++;
      continue;
    }

    const worker =
      workers.find((w) => w.name.toLowerCase() === workerName.toLowerCase()) ||
      (iqama ? workers.find((w) => w.iqamaNumber === iqama) : undefined);

    if (!worker) {
      results.push({ row: i, ok: false, message: `Worker not found: ${workerName || iqama}` });
      skipped++;
      continue;
    }

    const project = projectName
      ? projects.find((p) => p.name.toLowerCase() === projectName.toLowerCase())
      : undefined;

    const dayStart = new Date(workDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(workDate);
    dayEnd.setHours(23, 59, 59, 999);

    const existing = await prisma.timesheet.findFirst({
      where: {
        businessId,
        workerProfileId: worker.id,
        projectId: project?.id,
        workDate: { gte: dayStart, lte: dayEnd },
      },
    });

    if (existing) {
      results.push({ row: i, ok: false, message: 'Duplicate entry for this date' });
      skipped++;
      continue;
    }

    await prisma.timesheet.create({
      data: {
        businessId,
        workerProfileId: worker.id,
        projectId: project?.id,
        clientCompanyId: project?.clientCompanyId,
        workDate: dayStart,
        regularHours: regular,
        overtimeHours: overtime,
        hoursWorked: regular + overtime,
        status: 'PENDING',
        notes,
        submittedByMemberId,
      },
    });

    results.push({ row: i, ok: true, message: 'Imported' });
    imported++;
  }

  return { imported, skipped, results };
}
