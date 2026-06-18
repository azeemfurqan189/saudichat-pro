export type DepType = 'FS' | 'SS' | 'FF' | 'SF';

export const MS_PER_DAY = 86400000;

export function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * MS_PER_DAY);
}

export function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / MS_PER_DAY;
}

function topologicalSort(
  activityIds: string[],
  deps: Array<{ predecessorId: string; successorId: string }>
): string[] {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const id of activityIds) {
    inDegree.set(id, 0);
    adj.set(id, []);
  }
  for (const d of deps) {
    if (!activityIds.includes(d.predecessorId) || !activityIds.includes(d.successorId)) continue;
    adj.get(d.predecessorId)!.push(d.successorId);
    inDegree.set(d.successorId, (inDegree.get(d.successorId) ?? 0) + 1);
  }
  const queue = activityIds.filter((id) => (inDegree.get(id) ?? 0) === 0);
  const sorted: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    sorted.push(id);
    for (const succ of adj.get(id) ?? []) {
      const deg = (inDegree.get(succ) ?? 1) - 1;
      inDegree.set(succ, deg);
      if (deg === 0) queue.push(succ);
    }
  }
  if (sorted.length !== activityIds.length) {
    throw new Error('Circular dependency detected in activity network');
  }
  return sorted;
}

export type CpmResult = {
  es: Map<string, number>;
  ef: Map<string, number>;
  ls: Map<string, number>;
  lf: Map<string, number>;
  float: Map<string, number>;
  critical: Set<string>;
  projectFinish: number;
};

export function runCpm(
  activities: Array<{ id: string; durationDays: number }>,
  deps: Array<{ predecessorId: string; successorId: string; type: string; lagDays: number }>
): CpmResult {
  const ids = activities.map((a) => a.id);
  const dur = new Map(activities.map((a) => [a.id, a.durationDays]));
  const sorted = topologicalSort(ids, deps);

  const es = new Map<string, number>();
  const ef = new Map<string, number>();

  for (const id of sorted) {
    const preds = deps.filter((d) => d.successorId === id);
    let esVal = 0;
    for (const d of preds) {
      if (!es.has(d.predecessorId)) continue;
      const lag = d.lagDays ?? 0;
      const type = (d.type ?? 'FS') as DepType;
      const pEs = es.get(d.predecessorId)!;
      const pEf = ef.get(d.predecessorId)!;
      const duration = dur.get(id)!;
      let candidate = 0;
      if (type === 'FS') candidate = pEf + lag;
      else if (type === 'SS') candidate = pEs + lag;
      else if (type === 'FF') candidate = pEf + lag - duration;
      else if (type === 'SF') candidate = pEs + lag - duration;
      esVal = Math.max(esVal, candidate);
    }
    es.set(id, esVal);
    ef.set(id, esVal + dur.get(id)!);
  }

  const projectFinish = Math.max(0, ...Array.from(ef.values()));
  const revSorted = [...sorted].reverse();
  const ls = new Map<string, number>();
  const lf = new Map<string, number>();

  for (const id of revSorted) {
    const succs = deps.filter((d) => d.predecessorId === id);
    let lfVal = projectFinish;
    if (succs.length === 0) {
      lfVal = ef.get(id)!;
    } else {
      lfVal = Infinity;
      for (const d of succs) {
        if (!ls.has(d.successorId)) continue;
        const lag = d.lagDays ?? 0;
        const type = (d.type ?? 'FS') as DepType;
        const sLs = ls.get(d.successorId)!;
        const sLf = lf.get(d.successorId)!;
        const duration = dur.get(id)!;
        let candidate = Infinity;
        if (type === 'FS') candidate = sLs - lag;
        else if (type === 'SS') candidate = sLs - lag + duration;
        else if (type === 'FF') candidate = sLf - lag;
        else if (type === 'SF') candidate = sLf - lag + duration;
        lfVal = Math.min(lfVal, candidate);
      }
      if (lfVal === Infinity) lfVal = ef.get(id)!;
    }
    lf.set(id, lfVal);
    ls.set(id, lfVal - dur.get(id)!);
  }

  const float = new Map<string, number>();
  const critical = new Set<string>();
  for (const id of ids) {
    const f = (ls.get(id) ?? 0) - (es.get(id) ?? 0);
    float.set(id, Math.round(f * 100) / 100);
    if (f <= 0.001) critical.add(id);
  }

  return { es, ef, ls, lf, float, critical, projectFinish };
}

/** Convert calendar days to working days using project calendar (Saudi default Sun–Thu). */
export function calendarToWorkingDays(
  calendarDays: number,
  calendarConfig?: { workingDays?: number[]; hoursPerDay?: number } | null
): number {
  const workingDays = calendarConfig?.workingDays ?? [0, 1, 2, 3, 4];
  const weekRatio = workingDays.length / 7;
  return calendarDays / Math.max(0.01, weekRatio);
}

export function workingDaysToCalendar(
  workingDays: number,
  calendarConfig?: { workingDays?: number[] } | null
): number {
  const wd = calendarConfig?.workingDays ?? [0, 1, 2, 3, 4];
  const weekRatio = wd.length / 7;
  return workingDays / Math.max(0.01, weekRatio);
}
