import prisma from '../utils/prisma';
import { randomBytes } from 'crypto';
import { hashPassword } from '../utils/auth';
import { seedDemoEquipment } from './equipmentService';
import { seedCmmsDemo } from './cmmsService';

const DEMO_TEAM_PASSWORD = 'Welcome123!';

const DEMO_TEAM = [
  {
    name: 'Khalid Al-Mansour (Demo Manager)',
    phone: '+966552000001',
    email: 'demo-manager@member.saudichat.app',
    role: 'MANAGER' as const,
  },
  {
    name: 'Fatima Al-Qahtani (Demo Office)',
    phone: '+966552000002',
    email: 'demo-office@member.saudichat.app',
    role: 'OFFICE_STAFF' as const,
  },
  {
    name: 'Omar Al-Harbi (Demo Field)',
    phone: '+966552000003',
    email: 'demo-field@member.saudichat.app',
    role: 'FIELD_WORKER' as const,
  },
];

const DEMO_CLIENTS = [
  { name: 'SABIC', contactName: 'Eng. Fahad Al-Otaibi', phone: '+96613881111', email: 'contracts@sabic.com', address: 'Jubail Industrial City' },
  { name: 'Saudi Aramco', contactName: 'Mohammed Al-Rashid', phone: '+96613882222', email: 'vendor@aramco.com', address: 'Dhahran, Eastern Province' },
  { name: 'NEOM', contactName: 'Sarah Al-Harbi', phone: '+96613883333', email: 'ops@neom.com', address: 'Tabuk Region' },
  { name: 'Red Sea Global', contactName: 'Khalid Al-Zahrani', phone: '+96613884444', email: 'procurement@redsea.sa', address: 'Umluj, Tabuk' },
  { name: 'Ma\'aden', contactName: 'Omar Al-Dosari', phone: '+96613885555', email: 'hr@maaden.com.sa', address: 'Ras Al-Khair' },
];

const DEMO_WORKERS: Array<{
  name: string;
  phone: string;
  nationality: string;
  iqamaNumber: string;
  hourlyRate: number;
  contractType: string;
  category: string;
  iqamaDaysUntilExpiry?: number;
}> = [
  { name: 'Ahmed Hassan', phone: '+966551000001', nationality: 'Egyptian', iqamaNumber: '2123456789', hourlyRate: 35, contractType: 'Temporary', category: 'Welder' },
  { name: 'Rajesh Kumar', phone: '+966551000002', nationality: 'Indian', iqamaNumber: '2234567890', hourlyRate: 32, contractType: 'Project', category: 'Pipe Fitter' },
  { name: 'Muhammad Ali', phone: '+966551000003', nationality: 'Pakistani', iqamaNumber: '2345678901', hourlyRate: 30, contractType: 'Temporary', category: 'Electrician', iqamaDaysUntilExpiry: 12 },
  { name: 'Youssef Ibrahim', phone: '+966551000004', nationality: 'Sudanese', iqamaNumber: '2456789012', hourlyRate: 28, contractType: 'Temporary', category: 'Rigger' },
  { name: 'Ravi Sharma', phone: '+966551000005', nationality: 'Indian', iqamaNumber: '2567890123', hourlyRate: 33, contractType: 'Project', category: 'NDT Technician' },
  { name: 'Abdul Rahman', phone: '+966551000006', nationality: 'Bangladeshi', iqamaNumber: '2678901234', hourlyRate: 27, contractType: 'Temporary', category: 'Helper' },
  { name: 'Saeed Al-Ghamdi', phone: '+966551000007', nationality: 'Saudi', iqamaNumber: '1087654321', hourlyRate: 45, contractType: 'Permanent', category: 'Supervisor' },
  { name: 'Vikram Singh', phone: '+966551000008', nationality: 'Indian', iqamaNumber: '2789012345', hourlyRate: 34, contractType: 'Project', category: 'Instrument Technician' },
];

const DEMO_PROJECTS = [
  {
    clientName: 'SABIC',
    name: 'Jubail Refinery Maintenance Q2',
    code: 'PRJ-2026-001',
    siteName: 'Jubail Industrial Gate 4',
    siteAddress: 'Jubail Industrial City, Eastern Province',
    city: 'Jubail',
    latitude: 27.0046,
    longitude: 49.6593,
    industryTag: 'OIL_GAS',
    contractRef: 'SABIC-PO-88421',
    headcount: 25,
    status: 'ACTIVE',
    notes: 'Turnaround maintenance — mechanical & welding crew',
    workerIndexes: [0, 1, 2, 6],
  },
  {
    clientName: 'Saudi Aramco',
    name: 'Ras Tanura Pipeline Inspection',
    code: 'PRJ-2026-002',
    siteName: 'Ras Tanura Terminal',
    siteAddress: 'Ras Tanura, Dammam',
    city: 'Dammam',
    latitude: 26.6383,
    longitude: 50.1548,
    industryTag: 'OIL_GAS',
    contractRef: 'ARAMCO-RT-9920',
    headcount: 15,
    status: 'ACTIVE',
    notes: 'NDT inspectors and pipe fitters required',
    workerIndexes: [3, 4, 7],
  },
  {
    clientName: 'NEOM',
    name: 'NEOM Oxagon Camp Services',
    code: 'PRJ-2026-003',
    siteName: 'Oxagon Industrial City',
    siteAddress: 'NEOM Oxagon, Tabuk',
    city: 'Tabuk',
    latitude: 28.078,
    longitude: 35.018,
    industryTag: 'CONSTRUCTION',
    contractRef: 'NEOM-OX-4410',
    headcount: 40,
    status: 'ACTIVE',
    notes: 'Camp catering support and facility workers',
    workerIndexes: [0, 2, 5, 6],
  },
  {
    clientName: 'Red Sea Global',
    name: 'Amaala Landscaping Phase 1',
    code: 'PRJ-2026-004',
    siteName: 'Amaala Coastal Site',
    siteAddress: 'Umluj, Red Sea Coast',
    city: 'Umluj',
    latitude: 25.285,
    longitude: 37.073,
    industryTag: 'FACILITY',
    contractRef: 'RSG-AMA-2201',
    headcount: 12,
    status: 'ON_HOLD',
    notes: 'On hold pending client budget approval',
    workerIndexes: [1, 5],
  },
  {
    clientName: 'Ma\'aden',
    name: 'Bauxite Plant Shutdown 2026',
    code: 'PRJ-2026-005',
    siteName: 'Maaden Alumina Refinery',
    siteAddress: 'Ras Al-Khair Industrial',
    city: 'Ras Al-Khair',
    latitude: 27.478,
    longitude: 49.178,
    industryTag: 'OIL_GAS',
    contractRef: 'MAD-Shutdown-118',
    headcount: 18,
    status: 'COMPLETED',
    notes: 'Completed shutdown — all workers demobilized',
    workerIndexes: [4, 7],
  },
];

export type DemoSeedResult = {
  created: boolean;
  skipped?: boolean;
  message: string;
  clients: number;
  workers: number;
  projects: number;
  placements: number;
  timesheets: number;
  attendance?: number;
  tasks?: number;
  knowledgeDocs?: number;
  equipment?: number;
  demoAccounts?: Array<{ name: string; phone: string; role: string; password: string }>;
};

async function seedDemoStaffMembers(businessId: string) {
  const passwordHash = await hashPassword(DEMO_TEAM_PASSWORD);
  const accounts: Array<{ name: string; phone: string; role: string; password: string }> = [];

  for (const s of DEMO_TEAM) {
    let user = await prisma.user.findFirst({
      where: { OR: [{ phone: s.phone }, { email: s.email }] },
    });
    if (!user) {
      user = await prisma.user.create({
        data: { name: s.name, email: s.email, phone: s.phone, password: passwordHash },
      });
    }

    let member = await prisma.businessMember.findUnique({
      where: { businessId_userId: { businessId, userId: user.id } },
    });
    if (!member) {
      member = await prisma.businessMember.create({
        data: {
          businessId,
          userId: user.id,
          role: s.role,
          joinedAt: new Date(),
        },
      });
    }

    const staff = await prisma.staff.findFirst({
      where: { businessId, userId: user.id },
    });
    if (!staff) {
      await prisma.staff.create({
        data: {
          businessId,
          userId: user.id,
          businessMemberId: member.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: s.role.toLowerCase(),
          isActive: true,
        },
      });
    }

    accounts.push({
      name: s.name,
      phone: s.phone,
      role: s.role,
      password: DEMO_TEAM_PASSWORD,
    });
  }

  return accounts;
}

async function seedManpowerDemoExtras(businessId: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  let attendanceCount = 0;
  let taskCount = 0;
  let knowledgeDocs = 0;

  const activePlacements = await prisma.placement.findMany({
    where: { businessId, status: 'ACTIVE' },
    include: { workerProfile: true, project: true },
    take: 30,
  });

  for (const pl of activePlacements) {
    if (!pl.projectId) continue;
    const exists = await prisma.workerDailyAttendance.findFirst({
      where: {
        workerProfileId: pl.workerProfileId,
        projectId: pl.projectId,
        workDate: { gte: todayStart, lte: todayEnd },
      },
    });
    if (exists) continue;
    await prisma.workerDailyAttendance.create({
      data: {
        businessId,
        workerProfileId: pl.workerProfileId,
        projectId: pl.projectId,
        workDate: todayStart,
        status: Math.random() > 0.15 ? 'PRESENT' : 'ABSENT',
        checkInMethod: 'MANUAL',
      },
    });
    attendanceCount += 1;
  }

  const pendingStatuses = ['PENDING', 'PENDING_ADMIN', 'PENDING_PAYROLL'] as const;
  const pendingCount = await prisma.timesheet.count({
    where: { businessId, status: { in: [...pendingStatuses] } },
  });

  if (pendingCount < 6) {
    const workers = await prisma.workerProfile.findMany({ where: { businessId }, take: 5 });
    const project = await prisma.agencyProject.findFirst({
      where: { businessId, status: 'ACTIVE' },
    });
    for (let i = 0; i < Math.min(3, workers.length); i++) {
      const workDate = new Date();
      workDate.setDate(workDate.getDate() - i);
      workDate.setHours(0, 0, 0, 0);
      const dup = await prisma.timesheet.findFirst({
        where: {
          businessId,
          workerProfileId: workers[i].id,
          workDate: { gte: workDate, lte: todayEnd },
        },
      });
      if (dup) continue;
      await prisma.timesheet.create({
        data: {
          businessId,
          workerProfileId: workers[i].id,
          projectId: project?.id,
          clientCompanyId: project?.clientCompanyId,
          workDate,
          regularHours: 8,
          overtimeHours: i === 0 ? 4 : 2,
          hoursWorked: 8 + (i === 0 ? 4 : 2),
          status: pendingStatuses[i % pendingStatuses.length],
          notes: 'Demo pending approval entry',
        },
      });
    }
  }

  const existingTasks = await prisma.task.count({
    where: { businessId, status: { in: ['TODO', 'IN_PROGRESS'] } },
  });
  if (existingTasks < 3) {
    const overdue = new Date();
    overdue.setDate(overdue.getDate() - 5);
    const demoTasks = [
      { title: 'Renew Aramco vendor certificate', priority: 'HIGH' as const },
      { title: 'Submit SABIC monthly manpower report', priority: 'URGENT' as const },
      { title: 'Follow up iqama renewal — Muhammad Ali', priority: 'MEDIUM' as const },
    ];
    for (const t of demoTasks) {
      const exists = await prisma.task.findFirst({ where: { businessId, title: t.title } });
      if (exists) continue;
      await prisma.task.create({
        data: {
          businessId,
          title: t.title,
          description: 'Demo task for Command Center testing',
          status: 'TODO',
          priority: t.priority,
          dueDate: overdue,
        },
      });
      taskCount += 1;
    }
  }

  const docTitle = 'Aramco Master Service Agreement 2026';
  const hasDoc = await prisma.knowledgeDocument.findFirst({
    where: { businessId, title: docTitle },
  });
  if (!hasDoc) {
    try {
      const { ingestDocument } = await import('../knowledge/rag');
      await ingestDocument(
        businessId,
        docTitle,
        'Contract with Saudi Aramco for Ras Tanura pipeline inspection crew. Rate: 32-45 SAR/hr. OT after 8h at 1.5x. Payment terms: Net 30. Key contact: Mohammed Al-Rashid. Renewal due Q4 2026.',
        'contract'
      );
      knowledgeDocs += 1;
    } catch {
      await prisma.knowledgeDocument.create({
        data: {
          businessId,
          title: docTitle,
          content: 'Aramco MSA demo contract for testing Ask Company Anything.',
          sourceType: 'contract',
        },
      });
      knowledgeDocs += 1;
    }
  }

  const business = await prisma.business.findUnique({ where: { id: businessId } });
  const settings = (business?.settings as Record<string, unknown>) || {};
  const reminders = (settings.companyReminders as unknown[]) || [];
  if (reminders.length === 0) {
    settings.companyReminders = [
      {
        id: randomBytes(8).toString('hex'),
        title: 'Office rent — Khobar',
        type: 'subscription',
        dueDate: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10),
        status: 'OPEN',
      },
      {
        id: randomBytes(8).toString('hex'),
        title: 'Generator maintenance — Jubail site',
        type: 'equipment',
        dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        status: 'OPEN',
      },
    ];
    await prisma.business.update({
      where: { id: businessId },
      data: { settings: settings as object },
    });
  }

  return { attendanceCount, taskCount, knowledgeDocs };
}

export async function seedManpowerDemo(businessId: string, force = false): Promise<DemoSeedResult> {
  const existingProjects = await prisma.agencyProject.count({ where: { businessId } });
  const skipCore = existingProjects >= 5 && !force;

  const manager = await prisma.businessMember.findFirst({
    where: { businessId, isActive: true, role: { in: ['OWNER', 'MANAGER'] } },
  });

  const clientMap = new Map<string, string>();
  for (const c of DEMO_CLIENTS) {
    let row = await prisma.clientCompany.findFirst({
      where: { businessId, name: c.name },
    });
    if (!row) {
      row = await prisma.clientCompany.create({
        data: { businessId, ...c },
      });
    }
    clientMap.set(c.name, row.id);
  }

  const workerIds: string[] = [];
  for (const w of DEMO_WORKERS) {
    let row = await prisma.workerProfile.findFirst({
      where: { businessId, name: w.name },
    });
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + (w.iqamaDaysUntilExpiry ?? 240));
    if (!row) {
      row = await prisma.workerProfile.create({
        data: {
          businessId,
          name: w.name,
          phone: w.phone,
          nationality: w.nationality,
          iqamaNumber: w.iqamaNumber,
          iqamaExpiry: expiry,
          hourlyRate: w.hourlyRate,
          contractType: w.contractType,
          category: w.category,
          status: 'AVAILABLE',
          skills: [w.category],
          attendanceQrToken: randomBytes(16).toString('hex'),
        },
      });
    } else if (force) {
      row = await prisma.workerProfile.update({
        where: { id: row.id },
        data: {
          category: w.category,
          iqamaExpiry: expiry,
          ...(row.attendanceQrToken ? {} : { attendanceQrToken: randomBytes(16).toString('hex') }),
        },
      });
    }
    workerIds.push(row.id);
  }

  const now = new Date();
  let placementCount = 0;
  let timesheetCount = 0;
  let projectCount = 0;

  if (!skipCore) {
    for (const p of DEMO_PROJECTS) {
      const clientCompanyId = clientMap.get(p.clientName);
      if (!clientCompanyId) continue;

      const exists = await prisma.agencyProject.findFirst({
        where: { businessId, code: p.code },
      });
      if (exists) continue;

      const startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 2);
      const endDate = p.status === 'COMPLETED' ? new Date(now) : null;
      if (endDate) endDate.setMonth(endDate.getMonth() - 1);

      const project = await prisma.agencyProject.create({
        data: {
          businessId,
          clientCompanyId,
          managerMemberId: manager?.id,
          name: p.name,
          code: p.code,
          siteName: p.siteName,
          siteAddress: p.siteAddress,
          city: p.city,
          latitude: p.latitude,
          longitude: p.longitude,
          industryTag: p.industryTag,
          contractRef: p.contractRef,
          headcount: p.headcount,
          status: p.status,
          notes: p.notes,
          startDate,
          endDate: endDate ?? undefined,
        },
      });
      projectCount += 1;

      for (const wi of p.workerIndexes) {
        const workerProfileId = workerIds[wi];
        if (!workerProfileId) continue;

        await prisma.workerProfile.update({
          where: { id: workerProfileId },
          data: { status: p.status === 'COMPLETED' ? 'AVAILABLE' : 'ASSIGNED' },
        });

        const placement = await prisma.placement.create({
          data: {
            businessId,
            workerProfileId,
            clientCompanyId,
            projectId: project.id,
            siteName: p.siteName,
            startDate,
            endDate: endDate ?? undefined,
            status: p.status === 'COMPLETED' ? 'COMPLETED' : 'ACTIVE',
          },
        });
        placementCount += 1;

        const hoursList = [8, 10, 9, 8];
        const statuses = ['APPROVED', 'APPROVED', 'PENDING', 'BILLED'] as const;
        for (let d = 0; d < hoursList.length; d++) {
          const workDate = new Date(now);
          workDate.setDate(workDate.getDate() - (d + 1) * 3);
          workDate.setHours(0, 0, 0, 0);
          const ot = d === 1 ? 2 : 0;
          await prisma.timesheet.create({
            data: {
              businessId,
              workerProfileId,
              clientCompanyId,
              projectId: project.id,
              placementId: placement.id,
              workDate,
              regularHours: hoursList[d],
              overtimeHours: ot,
              hoursWorked: hoursList[d] + ot,
              status: statuses[d % statuses.length],
              notes: `Site work — ${p.siteName}`,
            },
          });
          timesheetCount += 1;
        }
      }
    }
  }

  const extras = await seedManpowerDemoExtras(businessId);
  const equipmentCount = await seedDemoEquipment(businessId);
  const cmmsSeed = await seedCmmsDemo(businessId);
  const demoAccounts = await seedDemoStaffMembers(businessId);

  const parts: string[] = [];
  if (projectCount > 0) {
    parts.push(`${projectCount} projects, ${placementCount} placements, ${timesheetCount} timesheets`);
  } else if (skipCore) {
    parts.push('core demo already loaded');
  }
  if (extras.attendanceCount) parts.push(`${extras.attendanceCount} today attendance`);
  if (extras.taskCount) parts.push(`${extras.taskCount} tasks`);
  if (extras.knowledgeDocs) parts.push(`${extras.knowledgeDocs} contract doc`);
  if (equipmentCount) parts.push(`${equipmentCount} equipment items`);
  if (!cmmsSeed.skipped) parts.push('CMMS demo (locations, WR, WO, PM, spares)');
  if (demoAccounts.length) parts.push(`${demoAccounts.length} demo login accounts`);

  return {
    created: projectCount > 0 || extras.attendanceCount > 0 || extras.taskCount > 0,
    skipped: skipCore && projectCount === 0,
    message: parts.length ? `Demo loaded: ${parts.join('; ')}` : 'Demo data is already complete for this business',
    clients: clientMap.size,
    workers: workerIds.length,
    projects: projectCount || existingProjects,
    placements: placementCount,
    timesheets: timesheetCount,
    attendance: extras.attendanceCount,
    tasks: extras.taskCount,
    knowledgeDocs: extras.knowledgeDocs,
    equipment: equipmentCount,
    demoAccounts,
  };
}
