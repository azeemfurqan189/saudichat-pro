import prisma from '../utils/prisma';
import { getManpowerPolicy } from './manpowerPolicyService';

export async function computeFatigueAndOvertimeBalance(businessId: string) {
  const policy = await getManpowerPolicy(businessId);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const recent = await prisma.timesheet.findMany({
    where: {
      businessId,
      workDate: { gte: weekAgo },
      status: { not: 'REJECTED' },
    },
    select: {
      workerProfileId: true,
      overtimeHours: true,
      workerProfile: { select: { name: true, category: true } },
    },
  });

  const otByWorker = new Map<string, { name: string; category?: string | null; ot: number }>();
  for (const row of recent) {
    const cur = otByWorker.get(row.workerProfileId) || {
      name: row.workerProfile.name,
      category: row.workerProfile.category,
      ot: 0,
    };
    cur.ot += row.overtimeHours ?? 0;
    otByWorker.set(row.workerProfileId, cur);
  }

  const fatigueRisk = [...otByWorker.entries()]
    .filter(([, v]) => v.ot >= policy.fatigueOtThresholdWeekly)
    .map(([workerProfileId, v]) => ({
      workerProfileId,
      workerName: v.name,
      category: v.category,
      weeklyOvertimeHours: Math.round(v.ot * 10) / 10,
      riskLevel: v.ot >= policy.fatigueOtThresholdWeekly * 1.5 ? 'HIGH' : 'MEDIUM',
    }))
    .sort((a, b) => b.weeklyOvertimeHours - a.weeklyOvertimeHours);

  const workers = [...otByWorker.values()];
  const avgOt = workers.length ? workers.reduce((s, w) => s + w.ot, 0) / workers.length : 0;

  return {
    fatigueRisk,
    overtimeBalance: {
      averageWeeklyOt: Math.round(avgOt * 10) / 10,
      underAllocated: workers
        .filter((w) => w.ot < avgOt * 0.5)
        .slice(0, 10)
        .map((w) => ({ name: w.name, category: w.category, weeklyOvertimeHours: Math.round(w.ot * 10) / 10 })),
      overAllocated: workers
        .filter((w) => w.ot > avgOt * 1.5)
        .slice(0, 10)
        .map((w) => ({ name: w.name, category: w.category, weeklyOvertimeHours: Math.round(w.ot * 10) / 10 })),
      equalizeEnabled: policy.equalizeOvertime,
    },
  };
}

export async function getLiveManpowerDashboard(businessId: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

  const [pendingCount, pendingAdminCount, todayEntries, monthAgg, attendanceToday, siteAttendance, otTrend, fatigue] =
    await Promise.all([
      prisma.timesheet.count({ where: { businessId, status: 'PENDING' } }),
      prisma.timesheet.count({
        where: { businessId, status: { in: ['PENDING_ADMIN', 'PENDING_PAYROLL'] } },
      }),
      prisma.timesheet.count({
        where: { businessId, createdAt: { gte: todayStart, lte: todayEnd } },
      }),
      prisma.timesheet.groupBy({
        by: ['status'],
        where: { businessId, workDate: { gte: monthStart } },
        _sum: { hoursWorked: true, overtimeHours: true, overtimePay: true },
        _count: true,
      }),
      prisma.workerDailyAttendance.groupBy({
        by: ['status'],
        where: { businessId, workDate: { gte: todayStart, lte: todayEnd } },
        _count: true,
      }),
      prisma.workerDailyAttendance.groupBy({
        by: ['projectId', 'status'],
        where: { businessId, workDate: { gte: todayStart, lte: todayEnd } },
        _count: true,
      }),
      prisma.timesheet.groupBy({
        by: ['workDate'],
        where: { businessId, workDate: { gte: monthStart } },
        _sum: { overtimeHours: true, hoursWorked: true },
        orderBy: { workDate: 'asc' },
      }),
      computeFatigueAndOvertimeBalance(businessId),
    ]);

  const presentToday = attendanceToday.find((a) => a.status === 'PRESENT')?._count ?? 0;
  const absentToday = attendanceToday.find((a) => a.status === 'ABSENT')?._count ?? 0;

  const projectIds = siteAttendance.map((s) => s.projectId).filter(Boolean) as string[];
  const projects = projectIds.length
    ? await prisma.agencyProject.findMany({
        where: { id: { in: projectIds } },
        select: { id: true, name: true, siteName: true },
      })
    : [];
  const projectMap = new Map(projects.map((p) => [p.id, p]));

  const siteLive = siteAttendance.reduce<
    Array<{ projectId: string; projectName: string; present: number; absent: number }>
  >((acc, row) => {
    if (!row.projectId) return acc;
    let entry = acc.find((x) => x.projectId === row.projectId);
    if (!entry) {
      const p = projectMap.get(row.projectId);
      entry = {
        projectId: row.projectId,
        projectName: p?.name || p?.siteName || 'Site',
        present: 0,
        absent: 0,
      };
      acc.push(entry);
    }
    if (row.status === 'PRESENT') entry.present += row._count;
    if (row.status === 'ABSENT') entry.absent += row._count;
    return acc;
  }, []);

  let totalLaborCost = 0;
  let totalOtHours = 0;
  for (const g of monthAgg) {
    totalLaborCost += g._sum.overtimePay || 0;
    totalOtHours += g._sum.overtimeHours || 0;
  }

  return {
    realtime: {
      pendingSiteManager: pendingCount,
      pendingAdminPayroll: pendingAdminCount,
      entriesToday: todayEntries,
      presentToday,
      absentToday,
    },
    monthSummary: monthAgg.map((g) => ({
      status: g.status,
      count: g._count,
      hours: g._sum.hoursWorked || 0,
      overtimeHours: g._sum.overtimeHours || 0,
    })),
    totalLaborCostMonth: Math.round(totalLaborCost * 100) / 100,
    totalOvertimeHoursMonth: Math.round(totalOtHours * 10) / 10,
    siteAttendanceLive: siteLive,
    laborCostTrend: otTrend.map((d) => ({
      date: d.workDate,
      totalHours: d._sum.hoursWorked || 0,
      overtimeHours: d._sum.overtimeHours || 0,
    })),
    ...fatigue,
  };
}
