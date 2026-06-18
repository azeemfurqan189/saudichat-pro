import prisma from '../utils/prisma';
import type { DepType } from './planningCpm';

export type CsvActivityRow = {
  code: string;
  name: string;
  durationDays: number;
  wbsCode?: string;
  predecessor?: string;
  depType?: DepType;
  laborCost?: number;
  materialCost?: number;
  equipmentTag?: string;
};

/** Parse CSV: code,name,duration,wbs,predecessor,type,labor,material,equipmentTag */
export function parsePlanningCsv(text: string): CsvActivityRow[] {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase();
  const hasHeader = header.includes('code') || header.includes('name');
  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines.map((line) => {
    const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    return {
      code: cols[0] ?? '',
      name: cols[1] ?? cols[0] ?? 'Activity',
      durationDays: parseFloat(cols[2]) || 1,
      wbsCode: cols[3] || undefined,
      predecessor: cols[4] || undefined,
      depType: (cols[5]?.toUpperCase() as DepType) || 'FS',
      laborCost: cols[6] ? parseFloat(cols[6]) : undefined,
      materialCost: cols[7] ? parseFloat(cols[7]) : undefined,
      equipmentTag: cols[8] || undefined,
    };
  }).filter((r) => r.code && r.name);
}

/** Parse Primavera P6 XER TASK table (full field support) */
export function parsePlanningXerLite(text: string): CsvActivityRow[] {
  if (!text.includes('TASK') && !text.includes('task')) {
    return parsePlanningCsv(text);
  }

  const lines = text.split(/\r?\n/);
  let inTask = false;
  let headers: string[] = [];
  const rows: CsvActivityRow[] = [];
  const taskIdToCode = new Map<string, string>();

  for (const line of lines) {
    if (line.startsWith('%T') && line.toUpperCase().includes('TASK')) {
      inTask = true;
      headers = [];
      continue;
    }
    if (line.startsWith('%F') && inTask) {
      headers = line.slice(2).split('\t').map((h) => h.trim().toLowerCase());
      continue;
    }
    if (line.startsWith('%T') && inTask && headers.length > 0) break;
    if (!inTask || line.startsWith('%') || !line.trim()) continue;

    const cols = line.split('\t');
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cols[i]?.trim() ?? '';
    });

    const taskId = row.task_id ?? row['task id'] ?? cols[0];
    const code = row.task_code ?? row['task code'] ?? taskId;
    const name = row.task_name ?? row['task name'] ?? code;
    let dur = parseFloat(row.target_drtn_hr_cnt ?? row.remain_drtn_hr_cnt ?? cols[3]) || 8;
    if (dur > 100) dur = dur / 8;

    const wbsId = row.wbs_id ?? '';
    const predTaskId = row.pred_task_id ?? '';
    const labor = row.target_work_qty ? parseFloat(row.target_work_qty) * 85 : undefined;

    if (code && name) {
      taskIdToCode.set(taskId, code.toUpperCase());
      rows.push({
        code,
        name,
        durationDays: Math.max(0.5, dur),
        wbsCode: wbsId || undefined,
        predecessor: predTaskId || undefined,
        depType: 'FS',
        laborCost: labor,
      });
    }
  }

  if (rows.length === 0) return parsePlanningCsv(text);

  for (const row of rows) {
    if (row.predecessor && taskIdToCode.has(row.predecessor)) {
      row.predecessor = taskIdToCode.get(row.predecessor)!;
    } else if (row.predecessor) {
      row.predecessor = undefined;
    }
  }

  return rows;
}

export async function importActivitiesFromRows(
  businessId: string,
  projectId: string,
  rows: CsvActivityRow[],
  options?: { clearExisting?: boolean }
) {
  const project = await prisma.scheduleProject.findFirst({ where: { id: projectId, businessId } });
  if (!project) throw new Error('Project not found');

  if (options?.clearExisting) {
    await prisma.activityDependency.deleteMany({ where: { projectId, businessId } });
    await prisma.scheduleActivity.deleteMany({ where: { projectId, businessId } });
  }

  const wbsNodes = await prisma.wbsNode.findMany({ where: { projectId, businessId } });
  const wbsByCode = new Map(wbsNodes.map((w) => [w.code.toUpperCase(), w.id]));

  const actIds = new Map<string, string>();
  let sortOrder = 0;

  for (const row of rows) {
    let wbsNodeId: string | null = null;
    if (row.wbsCode) {
      const code = row.wbsCode.toUpperCase();
      if (wbsByCode.has(code)) {
        wbsNodeId = wbsByCode.get(code)!;
      } else {
        const node = await prisma.wbsNode.create({
          data: {
            businessId,
            projectId,
            code: row.wbsCode,
            name: row.wbsCode,
            sortOrder: wbsNodes.length + sortOrder,
          },
        });
        wbsByCode.set(code, node.id);
        wbsNodeId = node.id;
      }
    }

    const act = await prisma.scheduleActivity.create({
      data: {
        businessId,
        projectId,
        wbsNodeId,
        code: row.code,
        name: row.name,
        durationDays: row.durationDays,
        laborCost: row.laborCost,
        materialCost: row.materialCost,
        equipmentTag: row.equipmentTag || null,
        sortOrder: sortOrder++,
      },
    });
    actIds.set(row.code.toUpperCase(), act.id);
  }

  for (const row of rows) {
    if (!row.predecessor) continue;
    const predId = actIds.get(row.predecessor.toUpperCase());
    const succId = actIds.get(row.code.toUpperCase());
    if (!predId || !succId || predId === succId) continue;
    await prisma.activityDependency.create({
      data: {
        businessId,
        projectId,
        predecessorId: predId,
        successorId: succId,
        type: row.depType ?? 'FS',
      },
    });
  }

  const { recalculateSchedule } = await import('./planningService');
  await recalculateSchedule(businessId, projectId);

  return { imported: rows.length, activityIds: Array.from(actIds.values()) };
}
