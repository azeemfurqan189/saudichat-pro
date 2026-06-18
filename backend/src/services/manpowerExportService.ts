import ExcelJS from 'exceljs';

type ExportRow = {
  workerName: string;
  category?: string | null;
  iqamaNumber?: string | null;
  phone?: string | null;
  projectName?: string | null;
  workDate: Date;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  status: string;
  notes?: string | null;
};

function weekLabel(date: Date): string {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${start.toISOString().slice(0, 10)} – ${end.toISOString().slice(0, 10)}`;
}

export async function buildManpowerTimesheetWorkbook(
  rows: ExportRow[],
  opts: { title: string; period: 'weekly' | 'monthly'; monthLabel: string }
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SaudiChat Pro';
  workbook.created = new Date();

  const summary = workbook.addWorksheet('Summary');
  summary.columns = [
    { header: 'Worker', key: 'worker', width: 22 },
    { header: 'Category', key: 'category', width: 16 },
    { header: 'Regular Hrs', key: 'regular', width: 14 },
    { header: 'Overtime Hrs', key: 'overtime', width: 14 },
    { header: 'Total Hrs', key: 'total', width: 12 },
    { header: 'Days', key: 'days', width: 10 },
  ];
  summary.addRow([opts.title]);
  summary.addRow([`Period: ${opts.monthLabel} (${opts.period})`]);
  summary.addRow([]);

  const byWorker = new Map<string, ExportRow[]>();
  for (const row of rows) {
    const key = row.workerName;
    if (!byWorker.has(key)) byWorker.set(key, []);
    byWorker.get(key)!.push(row);
  }

  for (const [workerName, workerRows] of byWorker) {
    const regular = workerRows.reduce((s, r) => s + r.regularHours, 0);
    const overtime = workerRows.reduce((s, r) => s + r.overtimeHours, 0);
    summary.addRow({
      worker: workerName,
      category: workerRows[0]?.category || '—',
      regular,
      overtime,
      total: regular + overtime,
      days: workerRows.length,
    });
  }

  summary.getRow(1).font = { bold: true, size: 14 };
  summary.getRow(4).font = { bold: true };

  const detail = workbook.addWorksheet('Daily Entries');
  detail.columns = [
    { header: 'Worker', key: 'worker', width: 22 },
    { header: 'Category', key: 'category', width: 14 },
    { header: 'Iqama', key: 'iqama', width: 16 },
    { header: 'Phone', key: 'phone', width: 14 },
    { header: 'Project', key: 'project', width: 22 },
    { header: 'Week', key: 'week', width: 24 },
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Regular', key: 'regular', width: 10 },
    { header: 'Overtime', key: 'overtime', width: 10 },
    { header: 'Total', key: 'total', width: 10 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Notes', key: 'notes', width: 30 },
  ];
  detail.getRow(1).font = { bold: true };

  for (const row of rows.sort((a, b) => a.workDate.getTime() - b.workDate.getTime())) {
    detail.addRow({
      worker: row.workerName,
      category: row.category || '—',
      iqama: row.iqamaNumber || '—',
      phone: row.phone || '—',
      project: row.projectName || '—',
      week: weekLabel(row.workDate),
      date: row.workDate.toISOString().slice(0, 10),
      regular: row.regularHours,
      overtime: row.overtimeHours,
      total: row.totalHours,
      status: row.status,
      notes: row.notes || '',
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
