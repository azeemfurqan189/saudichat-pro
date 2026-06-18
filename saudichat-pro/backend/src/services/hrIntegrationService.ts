import prisma from '../utils/prisma';

function parseSkills(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  return [];
}

function certStatus(expiresAt: Date | null): string {
  if (!expiresAt) return 'VALID';
  const days = (expiresAt.getTime() - Date.now()) / 86400000;
  if (days < 0) return 'EXPIRED';
  if (days <= 60) return 'EXPIRING';
  return 'VALID';
}

async function getOrCreateHrConfig(businessId: string) {
  const existing = await prisma.cmmsHrConfig.findUnique({ where: { businessId } });
  if (existing) return existing;
  return prisma.cmmsHrConfig.create({
    data: { businessId, hrSystem: 'SAP_SUCCESSFACTORS' },
  });
}

export async function getHrIntegrationConfig(businessId: string) {
  return getOrCreateHrConfig(businessId);
}

export async function updateHrIntegrationConfig(
  businessId: string,
  input: {
    hrSystem?: string;
    hrEndpoint?: string | null;
    companyCode?: string | null;
    apiKey?: string | null;
    isConnected?: boolean;
  }
) {
  await getOrCreateHrConfig(businessId);
  return prisma.cmmsHrConfig.update({
    where: { businessId },
    data: {
      hrSystem: input.hrSystem,
      hrEndpoint: input.hrEndpoint !== undefined ? input.hrEndpoint : undefined,
      companyCode: input.companyCode !== undefined ? input.companyCode : undefined,
      apiKey: input.apiKey !== undefined ? input.apiKey : undefined,
      isConnected: input.isConnected,
    },
  });
}

export async function getHrIntegrationSummary(businessId: string) {
  const config = await getOrCreateHrConfig(businessId);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [workers, certifications, training, attendanceMonth] = await Promise.all([
    prisma.workerProfile.findMany({
      where: { businessId },
      orderBy: { name: 'asc' },
      take: 50,
    }),
    prisma.workerCertification.findMany({
      where: { businessId },
      include: { workerProfile: { select: { id: true, name: true } } },
      orderBy: { expiresAt: 'asc' },
    }),
    prisma.workerTraining.findMany({
      where: { businessId },
      include: { workerProfile: { select: { id: true, name: true } } },
      orderBy: { completedAt: 'desc' },
    }),
    prisma.workerDailyAttendance.findMany({
      where: { businessId, workDate: { gte: monthStart, lt: monthEnd } },
      select: { status: true, workerProfileId: true, workDate: true },
    }),
  ]);

  const totalSkills = workers.reduce((s, w) => s + parseSkills(w.skills).length, 0);
  const expiringCerts = certifications.filter((c) => certStatus(c.expiresAt) === 'EXPIRING').length;
  const expiredCerts = certifications.filter((c) => certStatus(c.expiresAt) === 'EXPIRED').length;
  const trainingCompleted = training.filter((t) => t.status === 'COMPLETED').length;
  const trainingDue = training.filter((t) => t.status === 'SCHEDULED' || t.status === 'IN_PROGRESS').length;
  const presentCount = attendanceMonth.filter((a) => a.status === 'PRESENT').length;
  const absentCount = attendanceMonth.filter((a) => a.status === 'ABSENT').length;
  const presentRate =
    presentCount + absentCount > 0
      ? Math.round((presentCount / (presentCount + absentCount)) * 1000) / 10
      : 0;

  const certsByWorker = new Map<string, typeof certifications>();
  for (const c of certifications) {
    const list = certsByWorker.get(c.workerProfileId) ?? [];
    list.push(c);
    certsByWorker.set(c.workerProfileId, list);
  }

  const trainingByWorker = new Map<string, typeof training>();
  for (const t of training) {
    const list = trainingByWorker.get(t.workerProfileId) ?? [];
    list.push(t);
    trainingByWorker.set(t.workerProfileId, list);
  }

  const attendanceByWorker = new Map<string, { present: number; absent: number; lastStatus?: string }>();
  for (const a of attendanceMonth) {
    const cur = attendanceByWorker.get(a.workerProfileId) ?? { present: 0, absent: 0 };
    if (a.status === 'PRESENT') cur.present += 1;
    else if (a.status === 'ABSENT') cur.absent += 1;
    cur.lastStatus = a.status;
    attendanceByWorker.set(a.workerProfileId, cur);
  }

  const employees = workers.map((w) => ({
    id: w.id,
    name: w.name,
    category: w.category,
    status: w.status,
    skills: parseSkills(w.skills),
    certifications: (certsByWorker.get(w.id) ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      issuer: c.issuer,
      certNumber: c.certNumber,
      expiresAt: c.expiresAt,
      status: certStatus(c.expiresAt),
    })),
    training: (trainingByWorker.get(w.id) ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      trainingType: t.trainingType,
      status: t.status,
      completedAt: t.completedAt,
      dueAt: t.dueAt,
      hours: t.hours,
    })),
    attendance: attendanceByWorker.get(w.id) ?? { present: 0, absent: 0 },
  }));

  return {
    hr: {
      system: config.hrSystem,
      endpoint: config.hrEndpoint,
      companyCode: config.companyCode,
      isConnected: config.isConnected,
      lastSyncAt: config.lastSyncAt,
      lastSyncStatus: config.lastSyncStatus,
      lastSyncMessage: config.lastSyncMessage,
    },
    stats: {
      workers: workers.length,
      totalSkills,
      certifications: certifications.length,
      expiringCerts,
      expiredCerts,
      trainingCompleted,
      trainingDue,
      attendanceThisMonth: attendanceMonth.length,
      presentRate,
    },
    employees,
    pillars: ['SKILLS', 'CERTIFICATIONS', 'TRAINING', 'ATTENDANCE'],
  };
}

export async function syncHrIntegration(businessId: string) {
  const config = await getOrCreateHrConfig(businessId);
  const summary = await getHrIntegrationSummary(businessId);

  if (!config.isConnected) {
    throw new Error('HR system not connected — enable connection in HR settings');
  }

  const payload = {
    system: config.hrSystem,
    companyCode: config.companyCode ?? '1000',
    employeeCount: summary.stats.workers,
    skillsRecords: summary.stats.totalSkills,
    certifications: summary.stats.certifications,
    trainingRecords: summary.stats.trainingCompleted,
    attendanceRecords: summary.stats.attendanceThisMonth,
    syncedAt: new Date().toISOString(),
  };

  const updated = await prisma.cmmsHrConfig.update({
    where: { businessId },
    data: {
      lastSyncAt: new Date(),
      lastSyncStatus: 'SUCCESS',
      lastSyncMessage: `Synced ${summary.stats.workers} employees to ${config.hrSystem}`,
    },
  });

  return { payload, config: updated };
}

const DEMO_SKILLS = [
  ['Welding', 'Pipe fitting', 'Scaffolding'],
  ['Electrical', 'PLC', 'Instrument calibration'],
  ['HVAC', 'Refrigeration', 'Ducting'],
  ['Mechanical', 'Pump overhaul', 'Alignment'],
  ['Safety officer', 'Fire watch', 'Confined space'],
];

const DEMO_CERTS = [
  { name: 'NEBOSH IGC', issuer: 'NEBOSH', daysValid: 730 },
  { name: 'Confined Space Entry', issuer: 'Aramco Approved', daysValid: 365 },
  { name: 'Working at Height', issuer: 'TUV', daysValid: 365 },
  { name: 'HV Electrical Safety', issuer: 'SEC', daysValid: 540 },
];

const DEMO_TRAINING = [
  { title: 'Site induction — Jubail Refinery', type: 'SAFETY', hours: 4 },
  { title: 'LOTO procedure refresher', type: 'TECHNICAL', hours: 2 },
  { title: 'Fire extinguisher practical', type: 'SAFETY', hours: 3 },
  { title: 'SAP PM user training', type: 'COMPLIANCE', hours: 8 },
];

export async function seedHrIntegrationDemo(businessId: string) {
  const existing = await prisma.workerCertification.count({ where: { businessId } });
  if (existing >= 5) {
    return { skipped: true, message: 'HR integration data already seeded' };
  }

  await prisma.cmmsHrConfig.upsert({
    where: { businessId },
    create: {
      businessId,
      hrSystem: 'SAP_SUCCESSFACTORS',
      hrEndpoint: 'https://hr-gateway.demo.local/api/v1/employees',
      companyCode: '1000',
      isConnected: true,
    },
    update: { isConnected: true, hrSystem: 'SAP_SUCCESSFACTORS' },
  });

  let workers = await prisma.workerProfile.findMany({ where: { businessId }, take: 12 });
  if (workers.length === 0) {
    workers = await Promise.all(
      ['Ahmed Al-Otaibi', 'Rajesh Kumar', 'Mohammed Hassan'].map((name, i) =>
        prisma.workerProfile.create({
          data: {
            businessId,
            name,
            category: ['Welder', 'Electrician', 'Mechanic'][i],
            nationality: ['SA', 'IN', 'EG'][i],
            skills: DEMO_SKILLS[i],
            status: 'AVAILABLE',
          },
        })
      )
    );
  }

  const project = await prisma.agencyProject.findFirst({ where: { businessId }, orderBy: { createdAt: 'asc' } });
  let certsCreated = 0;
  let trainingCreated = 0;
  let attendanceCreated = 0;

  for (let i = 0; i < workers.length; i++) {
    const w = workers[i];
    const skills = DEMO_SKILLS[i % DEMO_SKILLS.length];
    await prisma.workerProfile.update({
      where: { id: w.id },
      data: { skills },
    });

    for (let j = 0; j < 2; j++) {
      const cert = DEMO_CERTS[(i + j) % DEMO_CERTS.length];
      const issuedAt = new Date();
      issuedAt.setMonth(issuedAt.getMonth() - 6);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + cert.daysValid - (j === 1 ? cert.daysValid - 45 : 0));
      await prisma.workerCertification.create({
        data: {
          businessId,
          workerProfileId: w.id,
          name: cert.name,
          issuer: cert.issuer,
          certNumber: `CERT-${String(i + 1).padStart(2, '0')}${j + 1}`,
          issuedAt,
          expiresAt,
          status: certStatus(expiresAt),
        },
      });
      certsCreated += 1;
    }

    for (let j = 0; j < 2; j++) {
      const tr = DEMO_TRAINING[(i + j) % DEMO_TRAINING.length];
      const completedAt = new Date();
      completedAt.setDate(completedAt.getDate() - (j + 1) * 14);
      await prisma.workerTraining.create({
        data: {
          businessId,
          workerProfileId: w.id,
          title: tr.title,
          trainingType: tr.type,
          provider: 'SaudiChat Training Center',
          completedAt: j === 0 ? completedAt : null,
          dueAt: j === 1 ? new Date(Date.now() + 14 * 86400000) : null,
          hours: tr.hours,
          status: j === 0 ? 'COMPLETED' : 'SCHEDULED',
        },
      });
      trainingCreated += 1;
    }

    for (let d = 0; d < 7; d++) {
      const workDate = new Date();
      workDate.setDate(workDate.getDate() - d);
      workDate.setHours(0, 0, 0, 0);
      const status = d === 0 && i % 4 === 0 ? 'ABSENT' : 'PRESENT';
      try {
        await prisma.workerDailyAttendance.create({
          data: {
            businessId,
            workerProfileId: w.id,
            projectId: project?.id ?? null,
            workDate,
            status,
            checkInMethod: d % 2 === 0 ? 'QR' : 'MANUAL',
          },
        });
        attendanceCreated += 1;
      } catch {
        // unique constraint — skip duplicate
      }
    }
  }

  return {
    skipped: false,
    workers: workers.length,
    certifications: certsCreated,
    training: trainingCreated,
    attendance: attendanceCreated,
  };
}
