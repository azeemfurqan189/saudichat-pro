import prisma from '../utils/prisma';

export async function getHrAdvancedSummary(businessId: string) {
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 86400000);

  const [workers, leaveBalances, leaveRequests, competencies, successions, trainingDue, certificationsDue] =
    await Promise.all([
      prisma.workerProfile.count({ where: { businessId, status: { not: 'INACTIVE' } } }),
      prisma.workerLeaveBalance.findMany({ where: { businessId } }),
      prisma.workerLeaveRequest.findMany({
        where: { businessId },
        include: { workerProfile: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.workerCompetency.findMany({
        where: { businessId },
        include: { workerProfile: { select: { id: true, name: true, category: true } } },
      }),
      prisma.workerSuccession.findMany({
        where: { businessId },
        include: {
          keyWorker: { select: { id: true, name: true, category: true } },
          replacementWorker: { select: { id: true, name: true, category: true } },
        },
      }),
      prisma.workerTraining.findMany({
        where: {
          businessId,
          OR: [{ dueAt: { lte: in30Days } }, { status: 'DUE' }],
        },
        include: { workerProfile: { select: { id: true, name: true } } },
      }),
      prisma.workerCertification.findMany({
        where: { businessId, expiresAt: { lte: in30Days } },
        include: { workerProfile: { select: { id: true, name: true } } },
      }),
    ]);

  const pendingLeave = leaveRequests.filter((r) => r.status === 'PENDING');
  const onLeaveToday = leaveRequests.filter(
    (r) =>
      r.status === 'APPROVED' &&
      r.startDate <= now &&
      r.endDate >= now
  );

  const competencyMatrix = buildCompetencyMatrix(competencies);

  return {
    workers,
    leave: {
      balances: leaveBalances,
      pendingRequests: pendingLeave,
      onLeaveToday,
      recentRequests: leaveRequests,
    },
    training: {
      dueSoon: trainingDue,
      certificationsExpiring: certificationsDue,
    },
    competencyMatrix,
    successions,
    alerts: [
      ...pendingLeave.map((r) => ({
        type: 'LEAVE_PENDING',
        message: `${r.workerProfile.name} — ${r.leaveType} ${r.days}d pending approval`,
      })),
      ...trainingDue.map((t) => ({
        type: 'TRAINING_DUE',
        message: `${t.workerProfile.name} — ${t.title} due ${t.dueAt?.toISOString().slice(0, 10) ?? 'soon'}`,
      })),
      ...certificationsDue.map((c) => ({
        type: 'CERT_EXPIRING',
        message: `${c.workerProfile.name} — ${c.name} expires ${c.expiresAt?.toISOString().slice(0, 10)}`,
      })),
    ],
  };
}

function buildCompetencyMatrix(
  competencies: Array<{
    skill: string;
    grade: string;
    workerProfile: { id: string; name: string; category: string | null };
  }>
) {
  const skills = new Set<string>();
  const workers = new Map<string, { id: string; name: string; category: string | null; grades: Record<string, string> }>();

  for (const c of competencies) {
    skills.add(c.skill);
    const w = workers.get(c.workerProfile.id) ?? {
      id: c.workerProfile.id,
      name: c.workerProfile.name,
      category: c.workerProfile.category,
      grades: {},
    };
    w.grades[c.skill] = c.grade;
    workers.set(c.workerProfile.id, w);
  }

  return {
    skills: Array.from(skills).sort(),
    workers: Array.from(workers.values()),
  };
}

export async function ensureLeaveBalances(businessId: string, workerProfileId: string) {
  const types = ['ANNUAL', 'SICK', 'UNPAID'];
  const defaults: Record<string, number> = { ANNUAL: 30, SICK: 15, UNPAID: 0 };

  for (const leaveType of types) {
    await prisma.workerLeaveBalance.upsert({
      where: { workerProfileId_leaveType: { workerProfileId, leaveType } },
      create: { businessId, workerProfileId, leaveType, balanceDays: defaults[leaveType], usedDays: 0 },
      update: {},
    });
  }
}

export async function createLeaveRequest(
  businessId: string,
  input: {
    workerProfileId: string;
    leaveType?: string;
    startDate: string;
    endDate: string;
    notes?: string;
  }
) {
  await ensureLeaveBalances(businessId, input.workerProfileId);

  const start = new Date(input.startDate);
  const end = new Date(input.endDate);
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);
  const leaveType = input.leaveType ?? 'ANNUAL';

  const balance = await prisma.workerLeaveBalance.findUnique({
    where: { workerProfileId_leaveType: { workerProfileId: input.workerProfileId, leaveType } },
  });

  if (balance && leaveType !== 'UNPAID' && balance.balanceDays - balance.usedDays < days) {
    throw new Error(`Insufficient ${leaveType} balance: need ${days}, have ${balance.balanceDays - balance.usedDays}`);
  }

  return prisma.workerLeaveRequest.create({
    data: {
      businessId,
      workerProfileId: input.workerProfileId,
      leaveType,
      startDate: start,
      endDate: end,
      days,
      notes: input.notes?.trim() || null,
      status: 'PENDING',
    },
    include: { workerProfile: { select: { name: true } } },
  });
}

export async function approveLeaveRequest(businessId: string, requestId: string) {
  const req = await prisma.workerLeaveRequest.findFirst({
    where: { id: requestId, businessId },
  });
  if (!req) throw new Error('Leave request not found');
  if (req.status !== 'PENDING') throw new Error('Request already processed');

  await prisma.workerLeaveRequest.update({
    where: { id: requestId },
    data: { status: 'APPROVED' },
  });

  if (req.leaveType !== 'UNPAID') {
    await prisma.workerLeaveBalance.update({
      where: { workerProfileId_leaveType: { workerProfileId: req.workerProfileId, leaveType: req.leaveType } },
      data: { usedDays: { increment: req.days } },
    });
  }

  return req;
}

export async function markAbsentWithAlert(businessId: string, workerProfileId: string, projectId?: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await prisma.workerDailyAttendance.findFirst({
    where: {
      workerProfileId,
      projectId: projectId ?? null,
      workDate: today,
    },
  });

  const attendance = existing
    ? await prisma.workerDailyAttendance.update({
        where: { id: existing.id },
        data: { status: 'ABSENT', notes: 'Auto-alert: marked absent' },
        include: { workerProfile: { select: { name: true, phone: true } } },
      })
    : await prisma.workerDailyAttendance.create({
        data: {
          businessId,
          workerProfileId,
          projectId: projectId ?? null,
          workDate: today,
          status: 'ABSENT',
          checkInMethod: 'MANUAL',
          notes: 'Auto-alert: marked absent',
        },
        include: { workerProfile: { select: { name: true, phone: true } } },
      });

  return {
    attendance,
    alert: {
      type: 'ABSENCE',
      message: `${attendance.workerProfile.name} marked ABSENT on ${today.toISOString().slice(0, 10)}`,
      workerPhone: attendance.workerProfile.phone,
    },
  };
}

export async function upsertCompetency(
  businessId: string,
  input: { workerProfileId: string; skill: string; grade: string; notes?: string; ratedByMemberId?: string }
) {
  return prisma.workerCompetency.upsert({
    where: {
      workerProfileId_skill: { workerProfileId: input.workerProfileId, skill: input.skill.trim() },
    },
    create: {
      businessId,
      workerProfileId: input.workerProfileId,
      skill: input.skill.trim(),
      grade: input.grade.toUpperCase(),
      notes: input.notes?.trim() || null,
      ratedByMemberId: input.ratedByMemberId || null,
      ratedAt: new Date(),
    },
    update: {
      grade: input.grade.toUpperCase(),
      notes: input.notes?.trim() || null,
      ratedByMemberId: input.ratedByMemberId || null,
      ratedAt: new Date(),
    },
    include: { workerProfile: { select: { name: true } } },
  });
}

export async function createSuccessionPlan(
  businessId: string,
  input: {
    workerProfileId: string;
    replacementWorkerId: string;
    role?: string;
    priority?: number;
  }
) {
  if (input.workerProfileId === input.replacementWorkerId) {
    throw new Error('Key worker and replacement must be different');
  }

  return prisma.workerSuccession.create({
    data: {
      businessId,
      workerProfileId: input.workerProfileId,
      replacementWorkerId: input.replacementWorkerId,
      role: input.role?.trim() || null,
      priority: input.priority ?? 1,
      status: 'APPROVED',
    },
    include: {
      keyWorker: { select: { name: true, category: true } },
      replacementWorker: { select: { name: true, category: true } },
    },
  });
}

export async function createTrainingRecord(
  businessId: string,
  input: {
    workerProfileId: string;
    title: string;
    trainingType?: string;
    provider?: string;
    dueAt?: string;
    hours?: number;
  }
) {
  const dueAt = input.dueAt ? new Date(input.dueAt) : null;
  const status = dueAt && dueAt <= new Date() ? 'DUE' : 'SCHEDULED';

  return prisma.workerTraining.create({
    data: {
      businessId,
      workerProfileId: input.workerProfileId,
      title: input.title.trim(),
      trainingType: input.trainingType ?? 'SAFETY',
      provider: input.provider?.trim() || null,
      dueAt,
      hours: input.hours,
      status,
    },
    include: { workerProfile: { select: { name: true } } },
  });
}

export async function completeTraining(businessId: string, trainingId: string) {
  return prisma.workerTraining.update({
    where: { id: trainingId },
    data: { status: 'COMPLETED', completedAt: new Date() },
  });
}

export async function seedHrAdvancedDemo(businessId: string) {
  const workers = await prisma.workerProfile.findMany({
    where: { businessId, status: { not: 'INACTIVE' } },
    take: 5,
  });
  if (workers.length < 2) return { skipped: true, reason: 'Need at least 2 workers' };

  for (const w of workers) {
    await ensureLeaveBalances(businessId, w.id);
    await upsertCompetency(businessId, {
      workerProfileId: w.id,
      skill: w.category ?? 'GENERAL',
      grade: ['A', 'B', 'C'][Math.floor(Math.random() * 3)],
    });
  }

  const existingTraining = await prisma.workerTraining.count({ where: { businessId, title: 'H2S Refresher' } });
  if (existingTraining === 0) {
    await createTrainingRecord(businessId, {
      workerProfileId: workers[0].id,
      title: 'H2S Refresher',
      trainingType: 'SAFETY',
      dueAt: new Date(Date.now() + 14 * 86400000).toISOString(),
    });
  }

  const existingSucc = await prisma.workerSuccession.count({ where: { businessId } });
  if (existingSucc === 0 && workers.length >= 2) {
    await createSuccessionPlan(businessId, {
      workerProfileId: workers[0].id,
      replacementWorkerId: workers[1].id,
      role: workers[0].category ?? 'Lead',
    });
  }

  return { skipped: false, workers: workers.length };
}
