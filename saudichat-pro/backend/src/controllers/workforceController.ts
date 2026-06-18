import { Response } from 'express';
import { MemberRole, Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { hashPassword, normalizePhone } from '../utils/auth';
import { hasMinRole } from '../services/membershipService';
import {
  validateBody,
  createAgencyProjectSchema,
  updateAgencyProjectSchema,
  updateTimesheetStatusSchema,
  bulkTimesheetActionSchema,
  manpowerPolicySchema,
  createWorkerProfileSchema,
  createTimesheetSchema,
  assignProjectWorkerSchema,
} from '../utils/validation';
import { seedManpowerDemo } from '../services/manpowerDemoSeed';
import { buildManpowerTimesheetWorkbook } from '../services/manpowerExportService';
import { OIL_GAS_CATEGORY_GROUPS, ALL_OIL_GAS_CATEGORIES, mergeCategoryLists } from '../constants/manpowerCategories';
import { ensureAgencyProjectTable, isAgencyProjectFullyReady, SCHEMA_NOT_READY_MESSAGE, syncDatabaseSchemaAsync } from '../db/syncSchema';
import { formatPrismaError, isSchemaError } from '../utils/prismaErrors';
import { PROJECT_PERMISSION_CATALOG, sanitizePermissionList, DEFAULT_MANAGER_PERMISSIONS } from '../constants/projectPermissions';
import {
  getAccessibleProjectIds,
  getMemberProjectPermissions,
  hasProjectPermission,
  upsertProjectAccessByPhone,
} from '../services/projectAccessService';
import { createAndSendMemberInvite } from '../services/memberInviteService';
import {
  applyOvertimeRules,
  getManpowerPolicy,
  setManpowerPolicy,
} from '../services/manpowerPolicyService';
import {
  advanceTimesheet,
  bulkAdvanceTimesheets,
  getPendingTimesheetQueue,
  approvalStageLabel,
} from '../services/timesheetApprovalService';
import { notifyTimesheetSubmitted } from '../services/timesheetReminderService';
import { getLiveManpowerDashboard } from '../services/manpowerDashboardService';

function sanitizeWorker<T extends { loginPassword?: string | null }>(row: T) {
  const { loginPassword: _pw, ...rest } = row;
  return rest;
}

function resolveTimesheetHours(input: {
  regularHours?: number;
  overtimeHours?: number;
  hoursWorked?: number;
  defaultRegular?: number;
}) {
  const regular = input.regularHours ?? input.hoursWorked ?? input.defaultRegular ?? 8;
  const overtime = input.overtimeHours ?? 0;
  const hoursWorked = input.hoursWorked ?? regular + overtime;
  return { regularHours: regular, overtimeHours: overtime, hoursWorked };
}

async function requireProjectSchema(res: Response): Promise<boolean> {
  const ready = await ensureAgencyProjectTable();
  if (!ready) {
    res.status(503).json({ success: false, message: SCHEMA_NOT_READY_MESSAGE });
    return false;
  }
  return true;
}

async function ensureProjectPerm(
  req: AuthRequest,
  res: Response,
  projectId: string,
  permission: string
): Promise<boolean> {
  if (!req.membership) return false;
  const ok = await hasProjectPermission(req.membership, projectId, permission);
  if (!ok) {
    res.status(403).json({ success: false, message: `Missing permission: ${permission}` });
    return false;
  }
  return true;
}

function parseRole(value: unknown): MemberRole {
  const r = String(value || 'OFFICE_STAFF').toUpperCase();
  if (['OWNER', 'MANAGER', 'OFFICE_STAFF', 'FIELD_WORKER'].includes(r)) return r as MemberRole;
  return 'OFFICE_STAFF';
}

export async function getMembers(req: AuthRequest, res: Response): Promise<void> {
  const access = req.membership!;
  const where: Prisma.BusinessMemberWhereInput = { businessId: req.params.businessId, isActive: true };

  if (access.role === 'MANAGER') {
    where.OR = [{ id: access.memberId }, { managerId: access.memberId }];
  } else if (access.role === 'OFFICE_STAFF' || access.role === 'FIELD_WORKER') {
    where.id = access.memberId;
  }

  const members = await prisma.businessMember.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
      manager: { select: { id: true, user: { select: { name: true } } } },
      staff: true,
    },
    orderBy: [{ role: 'desc' }, { createdAt: 'asc' }],
  });

  res.json({ success: true, data: members });
}

export async function inviteMember(req: AuthRequest, res: Response): Promise<void> {
  const access = req.membership!;
  if (!hasMinRole(access.role, 'MANAGER')) {
    res.status(403).json({ success: false, message: 'Only owner or manager can invite' });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const phone = normalizePhone(String(body.phone || ''));
  const email = String(body.email || '').trim().toLowerCase();
  const name = String(body.name || 'Team Member').trim();
  const role = parseRole(body.role);
  const department = body.department ? String(body.department) : undefined;
  const tempPassword = String(body.password || 'Welcome123!');

  if (role === 'OWNER' && access.role !== 'OWNER') {
    res.status(403).json({ success: false, message: 'Only owner can assign OWNER role' });
    return;
  }

  if (!phone || !email) {
    res.status(400).json({ success: false, message: 'Phone and email required' });
    return;
  }

  let user = await prisma.user.findFirst({ where: { OR: [{ phone }, { email }] } });
  if (!user) {
    user = await prisma.user.create({
      data: { name, email, phone, password: await hashPassword(tempPassword) },
    });
  }

  const existing = await prisma.businessMember.findUnique({
    where: { businessId_userId: { businessId: req.params.businessId, userId: user.id } },
  });
  if (existing) {
    res.status(409).json({ success: false, message: 'User already a team member' });
    return;
  }

  let managerId: string | undefined;
  if (access.role === 'MANAGER') {
    managerId = access.memberId;
  } else if (body.managerId) {
    managerId = String(body.managerId);
  }

  const member = await prisma.businessMember.create({
    data: {
      businessId: req.params.businessId,
      userId: user.id,
      role,
      managerId,
      department,
      joinedAt: new Date(),
    },
    include: { user: { select: { id: true, name: true, email: true, phone: true } } },
  });

  await prisma.staff.create({
    data: {
      businessId: req.params.businessId,
      userId: user.id,
      businessMemberId: member.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: role.toLowerCase(),
      isActive: true,
    },
  });

  const business = await prisma.business.findUnique({ where: { id: req.params.businessId }, select: { userId: true } });
  if (business) {
    await prisma.notification.create({
      data: {
        businessId: req.params.businessId,
        userId: business.userId,
        type: 'SYSTEM',
        title: 'New team member invited',
        message: `${name} joined as ${role}`,
      },
    });
  }

  let invite: Awaited<ReturnType<typeof createAndSendMemberInvite>> | null = null;
  try {
    invite = await createAndSendMemberInvite({
      businessId: req.params.businessId,
      memberId: member.id,
      userId: user.id,
      tempPassword,
      contextLabel: `${role} team member`,
    });
  } catch (err) {
    console.warn('[invite] send failed:', err instanceof Error ? err.message : err);
  }

  res.status(201).json({
    success: true,
    data: {
      member,
      invite: invite
        ? {
            inviteUrl: invite.inviteUrl,
            phone: invite.phone,
            tempPassword: invite.tempPassword,
            smsAttempted: invite.smsAttempted,
            emailAttempted: invite.emailAttempted,
          }
        : null,
    },
  });
}

export async function updateMemberRole(req: AuthRequest, res: Response): Promise<void> {
  const access = req.membership!;
  if (access.role !== 'OWNER') {
    res.status(403).json({ success: false, message: 'Only owner can change roles' });
    return;
  }

  const { role, department, managerId, isActive } = req.body as Record<string, unknown>;
  const updated = await prisma.businessMember.updateMany({
    where: { id: req.params.memberId, businessId: req.params.businessId },
    data: {
      ...(role && { role: parseRole(role) }),
      ...(department !== undefined && { department: department ? String(department) : null }),
      ...(managerId !== undefined && { managerId: managerId ? String(managerId) : null }),
      ...(isActive !== undefined && { isActive: Boolean(isActive) }),
    },
  });

  if (updated.count === 0) {
    res.status(404).json({ success: false, message: 'Member not found' });
    return;
  }

  const member = await prisma.businessMember.findUnique({ where: { id: req.params.memberId } });
  res.json({ success: true, data: member });
}

export async function getWorkforceStats(req: AuthRequest, res: Response): Promise<void> {
  const businessId = req.params.businessId;
  const access = req.membership!;

  const memberWhere: Prisma.BusinessMemberWhereInput = { businessId, isActive: true };
  if (access.role === 'MANAGER') {
    memberWhere.OR = [{ id: access.memberId }, { managerId: access.memberId }];
  }

  const [totalMembers, managers, staffCount, todayShifts, todayAttendance, openTasks] = await Promise.all([
    prisma.businessMember.count({ where: memberWhere }),
    prisma.businessMember.count({ where: { ...memberWhere, role: 'MANAGER' } }),
    prisma.businessMember.count({
      where: { ...memberWhere, role: { in: ['OFFICE_STAFF', 'FIELD_WORKER'] } },
    }),
    prisma.workShift.count({
      where: {
        businessId,
        date: { gte: new Date(new Date().toISOString().slice(0, 10)) },
        ...(access.role === 'MANAGER' ? { member: { managerId: access.memberId } } : {}),
      },
    }),
    prisma.attendanceRecord.count({
      where: {
        businessId,
        date: { gte: new Date(new Date().toISOString().slice(0, 10)) },
        checkInAt: { not: null },
      },
    }),
    prisma.task.count({
      where: {
        businessId,
        status: { in: ['TODO', 'IN_PROGRESS'] },
        ...(access.role === 'MANAGER'
          ? { assignedStaffId: access.memberId }
          : access.role === 'OFFICE_STAFF' || access.role === 'FIELD_WORKER'
            ? { assignedStaffId: access.memberId }
            : {}),
      },
    }),
  ]);

  res.json({
    success: true,
    data: {
      totalMembers,
      managers,
      staffCount,
      todayShifts,
      todayAttendance,
      openTasks,
      role: access.role,
    },
  });
}

export async function getMyWork(req: AuthRequest, res: Response): Promise<void> {
  const access = req.membership!;
  const businessId = req.params.businessId;
  const today = new Date(new Date().toISOString().slice(0, 10));

  const [shifts, tasks, conversations] = await Promise.all([
    prisma.workShift.findMany({
      where: { businessId, memberId: access.memberId, date: { gte: today } },
      orderBy: { startTime: 'asc' },
      take: 10,
    }),
    prisma.task.findMany({
      where: {
        businessId,
        assignedStaffId: access.memberId,
        status: { in: ['TODO', 'IN_PROGRESS'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.conversation.findMany({
      where: { businessId, staffId: access.memberId, status: { in: ['ACTIVE', 'WAITING', 'BOT'] } },
      include: { customer: { select: { name: true, phone: true } } },
      orderBy: { lastMessageAt: 'desc' },
      take: 10,
    }),
  ]);

  const attendance = await prisma.attendanceRecord.findFirst({
    where: { businessId, memberId: access.memberId, date: { gte: today } },
    orderBy: { createdAt: 'desc' },
  });

  const workerProfile = await prisma.workerProfile.findFirst({
    where: { businessId, memberId: access.memberId },
  });

  let activePlacement = null;
  if (workerProfile) {
    activePlacement = await prisma.placement.findFirst({
      where: {
        businessId,
        workerProfileId: workerProfile.id,
        status: 'ACTIVE',
      },
      include: {
        project: { include: { clientCompany: { select: { id: true, name: true } } } },
        clientCompany: { select: { id: true, name: true } },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  const project = activePlacement?.project
    ? {
        id: activePlacement.project.id,
        name: activePlacement.project.name,
        siteName: activePlacement.project.siteName,
        siteAddress: activePlacement.project.siteAddress,
        city: activePlacement.project.city,
        clientName:
          activePlacement.project.clientCompany?.name || activePlacement.clientCompany?.name,
        status: activePlacement.project.status,
      }
    : null;

  res.json({
    success: true,
    data: {
      shifts,
      tasks,
      conversations,
      attendance,
      memberId: access.memberId,
      role: access.role,
      project,
      siteLocation: project
        ? [project.siteName, project.siteAddress, project.city].filter(Boolean).join(', ')
        : activePlacement?.siteName || null,
    },
  });
}

export async function getTeamPulse(req: AuthRequest, res: Response): Promise<void> {
  const businessId = req.params.businessId;
  const access = req.membership!;
  if (!hasMinRole(access.role, 'MANAGER')) {
    res.status(403).json({ success: false, message: 'Manager access required' });
    return;
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const memberWhere: Prisma.BusinessMemberWhereInput = { businessId, isActive: true };
  if (access.role === 'MANAGER') {
    memberWhere.OR = [{ id: access.memberId }, { managerId: access.memberId }];
  }

  const [
    members,
    todayShifts,
    todayStaffAttendance,
    openTasks,
    pendingTimesheets,
    siteAttendance,
    workerPresent,
    workerAbsent,
  ] = await Promise.all([
    prisma.businessMember.findMany({
      where: memberWhere,
      include: { user: { select: { name: true, phone: true } } },
      orderBy: { role: 'asc' },
    }),
    prisma.workShift.findMany({
      where: { businessId, date: { gte: todayStart, lte: todayEnd } },
      include: { member: { include: { user: { select: { name: true } } } } },
      orderBy: { startTime: 'asc' },
      take: 20,
    }),
    prisma.attendanceRecord.findMany({
      where: { businessId, date: { gte: todayStart, lte: todayEnd } },
      include: { member: { include: { user: { select: { name: true } } } } },
      orderBy: { checkInAt: 'desc' },
      take: 30,
    }),
    prisma.task.findMany({
      where: { businessId, status: { in: ['TODO', 'IN_PROGRESS'] } },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
      take: 15,
    }),
    prisma.timesheet.count({
      where: { businessId, status: { in: ['PENDING', 'PENDING_ADMIN', 'PENDING_PAYROLL'] } },
    }),
    prisma.workerDailyAttendance.groupBy({
      by: ['status'],
      where: { businessId, workDate: { gte: todayStart, lte: todayEnd } },
      _count: true,
    }),
    prisma.workerDailyAttendance.count({
      where: { businessId, workDate: { gte: todayStart, lte: todayEnd }, status: 'PRESENT' },
    }),
    prisma.workerDailyAttendance.count({
      where: { businessId, workDate: { gte: todayStart, lte: todayEnd }, status: 'ABSENT' },
    }),
  ]);

  const staffCheckedIn = todayStaffAttendance.filter((a) => a.checkInAt && !a.checkOutAt).length;
  const staffTotal = members.filter((m) => m.role !== 'OWNER').length;

  res.json({
    success: true,
    data: {
      summary: {
        staffTotal,
        staffCheckedIn,
        todayShifts: todayShifts.length,
        openTasks: openTasks.length,
        pendingTimesheets,
        workersPresent: workerPresent,
        workersAbsent: workerAbsent,
      },
      members: members.map((m) => ({
        id: m.id,
        name: m.user.name,
        role: m.role,
        phone: m.user.phone,
        checkedIn: todayStaffAttendance.some(
          (a) => a.memberId === m.id && a.checkInAt && !a.checkOutAt
        ),
      })),
      shifts: todayShifts.map((s) => ({
        id: s.id,
        memberName: s.member.user.name,
        startTime: s.startTime,
        endTime: s.endTime,
        date: s.date,
      })),
      staffAttendance: todayStaffAttendance.map((a) => ({
        id: a.id,
        memberName: a.member.user.name,
        checkInAt: a.checkInAt,
        checkOutAt: a.checkOutAt,
      })),
      tasks: openTasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
      })),
      siteAttendance: siteAttendance.map((s) => ({ status: s.status, count: s._count })),
    },
  });
}

export async function getShifts(req: AuthRequest, res: Response): Promise<void> {
  const access = req.membership!;
  const businessId = req.params.businessId;
  const where: Prisma.WorkShiftWhereInput = { businessId };

  if (access.role === 'MANAGER') {
    where.member = { OR: [{ id: access.memberId }, { managerId: access.memberId }] };
  } else if (access.role === 'OFFICE_STAFF' || access.role === 'FIELD_WORKER') {
    where.memberId = access.memberId;
  }

  const shifts = await prisma.workShift.findMany({
    where,
    include: { member: { include: { user: { select: { name: true, phone: true } } } } },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    take: 100,
  });

  res.json({ success: true, data: shifts });
}

export async function createShift(req: AuthRequest, res: Response): Promise<void> {
  const access = req.membership!;
  if (!hasMinRole(access.role, 'MANAGER')) {
    res.status(403).json({ success: false, message: 'Manager access required' });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const memberId = String(body.memberId || access.memberId);
  const date = new Date(String(body.date));
  const startTime = String(body.startTime || '09:00');
  const endTime = String(body.endTime || '17:00');

  if (access.role === 'MANAGER') {
    const target = await prisma.businessMember.findFirst({
      where: { id: memberId, businessId: req.params.businessId, OR: [{ id: access.memberId }, { managerId: access.memberId }] },
    });
    if (!target) {
      res.status(403).json({ success: false, message: 'Cannot schedule this member' });
      return;
    }
  }

  const shift = await prisma.workShift.create({
    data: {
      businessId: req.params.businessId,
      memberId,
      date,
      startTime,
      endTime,
      notes: body.notes ? String(body.notes) : undefined,
    },
  });

  res.status(201).json({ success: true, data: shift });
}

export async function getAttendance(req: AuthRequest, res: Response): Promise<void> {
  const access = req.membership!;
  const where: Prisma.AttendanceRecordWhereInput = { businessId: req.params.businessId };

  if (access.role === 'MANAGER') {
    where.member = { OR: [{ id: access.memberId }, { managerId: access.memberId }] };
  } else if (access.role === 'OFFICE_STAFF' || access.role === 'FIELD_WORKER') {
    where.memberId = access.memberId;
  }

  const records = await prisma.attendanceRecord.findMany({
    where,
    include: { member: { include: { user: { select: { name: true } } } } },
    orderBy: { date: 'desc' },
    take: 100,
  });

  res.json({ success: true, data: records });
}

export async function checkIn(req: AuthRequest, res: Response): Promise<void> {
  const access = req.membership!;
  const today = new Date(new Date().toISOString().slice(0, 10));
  const body = req.body as Record<string, unknown>;

  const existing = await prisma.attendanceRecord.findFirst({
    where: { businessId: req.params.businessId, memberId: access.memberId, date: { gte: today }, checkOutAt: null },
  });

  if (existing?.checkInAt) {
    res.status(400).json({ success: false, message: 'Already checked in' });
    return;
  }

  const record = existing
    ? await prisma.attendanceRecord.update({
        where: { id: existing.id },
        data: { checkInAt: new Date(), status: 'PRESENT' },
      })
    : await prisma.attendanceRecord.create({
        data: {
          businessId: req.params.businessId,
          memberId: access.memberId,
          date: today,
          checkInAt: new Date(),
          status: 'PRESENT',
          latitude: body.latitude != null ? Number(body.latitude) : undefined,
          longitude: body.longitude != null ? Number(body.longitude) : undefined,
        },
      });

  res.json({ success: true, data: record });
}

export async function checkOut(req: AuthRequest, res: Response): Promise<void> {
  const access = req.membership!;
  const today = new Date(new Date().toISOString().slice(0, 10));

  const record = await prisma.attendanceRecord.findFirst({
    where: { businessId: req.params.businessId, memberId: access.memberId, date: { gte: today }, checkOutAt: null },
    orderBy: { createdAt: 'desc' },
  });

  if (!record?.checkInAt) {
    res.status(400).json({ success: false, message: 'Check in first' });
    return;
  }

  const updated = await prisma.attendanceRecord.update({
    where: { id: record.id },
    data: { checkOutAt: new Date() },
  });

  res.json({ success: true, data: updated });
}

export async function getMembershipMe(req: AuthRequest, res: Response): Promise<void> {
  res.json({ success: true, data: req.membership });
}

// ─── Phase 2: Manpower Agency ───────────────────────────────────────────────

export async function getClientCompanies(req: AuthRequest, res: Response): Promise<void> {
  const rows = await prisma.clientCompany.findMany({
    where: { businessId: req.params.businessId, isActive: true },
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { projects: true, placements: true } },
    },
  });
  res.json({ success: true, data: rows });
}

export async function getClientCompany(req: AuthRequest, res: Response): Promise<void> {
  if (!(await requireProjectSchema(res))) return;
  const client = await prisma.clientCompany.findFirst({
    where: { id: req.params.clientId, businessId: req.params.businessId, isActive: true },
    include: { _count: { select: { projects: true, placements: true } } },
  });
  if (!client) {
    res.status(404).json({ success: false, message: 'Client not found' });
    return;
  }

  const access = req.membership!;
  const allowedIds = await getAccessibleProjectIds(access);
  const projects = await prisma.agencyProject.findMany({
    where: {
      businessId: req.params.businessId,
      clientCompanyId: client.id,
      ...(allowedIds ? { id: { in: allowedIds } } : {}),
    },
    include: projectInclude,
    orderBy: { createdAt: 'desc' },
  });

  const projectIds = projects.map((p) => p.id);
  const [activePlacements, hoursByProject, pendingTimesheets] = await Promise.all([
    projectIds.length
      ? prisma.placement.groupBy({
          by: ['projectId'],
          where: { businessId: req.params.businessId, projectId: { in: projectIds }, status: 'ACTIVE' },
          _count: true,
        })
      : Promise.resolve([]),
    projectIds.length
      ? prisma.timesheet.groupBy({
          by: ['projectId'],
          where: { businessId: req.params.businessId, projectId: { in: projectIds } },
          _sum: { hoursWorked: true },
        })
      : Promise.resolve([]),
    projectIds.length
      ? prisma.timesheet.count({
          where: { businessId: req.params.businessId, projectId: { in: projectIds }, status: 'PENDING' },
        })
      : Promise.resolve(0),
  ]);

  const activeMap = new Map(activePlacements.map((p) => [p.projectId, p._count]));
  const hoursMap = new Map(hoursByProject.map((h) => [h.projectId, h._sum.hoursWorked || 0]));

  const enrichedProjects = projects.map((row) => ({
    ...row,
    stats: {
      assignedWorkers: row._count.placements,
      activeWorkers: activeMap.get(row.id) || 0,
      totalHours: hoursMap.get(row.id) || 0,
      headcountGap: row.headcount != null ? row.headcount - (activeMap.get(row.id) || 0) : null,
    },
  }));

  const summary = {
    totalProjects: enrichedProjects.length,
    activeProjects: enrichedProjects.filter((p) => p.status === 'ACTIVE').length,
    totalWorkers: enrichedProjects.reduce((s, p) => s + (p.stats.activeWorkers || 0), 0),
    totalHours: enrichedProjects.reduce((s, p) => s + (p.stats.totalHours || 0), 0),
    pendingTimesheets: pendingTimesheets,
  };

  res.json({
    success: true,
    data: { ...client, projects: enrichedProjects, summary },
  });
}

export async function createClientCompany(req: AuthRequest, res: Response): Promise<void> {
  if (!(await requireProjectSchema(res))) return;
  const body = req.body as Record<string, unknown>;
  try {
    const row = await prisma.clientCompany.create({
      data: {
        businessId: req.params.businessId,
        name: String(body.name || 'Client'),
        contactName: body.contactName ? String(body.contactName) : undefined,
        phone: body.phone ? String(body.phone) : undefined,
        email: body.email ? String(body.email) : undefined,
        address: body.address ? String(body.address) : undefined,
      },
    });
    res.status(201).json({ success: true, data: row });
  } catch (error) {
    const formatted = formatPrismaError(error);
    res.status(formatted.status).json({ success: false, message: formatted.message });
  }
}

// ─── Agency Projects ────────────────────────────────────────────────────────

const projectInclude = {
  clientCompany: { select: { id: true, name: true, phone: true, email: true, contactName: true, address: true } },
  manager: {
    include: { user: { select: { id: true, name: true, phone: true, email: true } } },
  },
  _count: { select: { placements: true, timesheets: true } },
} as const;

function buildHoursSummary(
  hoursAgg: Array<{ status: string; _sum: { hoursWorked: number | null } }>
) {
  return {
    total: hoursAgg.reduce((acc, g) => acc + (g._sum.hoursWorked || 0), 0),
    pending: hoursAgg.find((g) => g.status === 'PENDING')?._sum.hoursWorked || 0,
    approved: hoursAgg.find((g) => g.status === 'APPROVED')?._sum.hoursWorked || 0,
    billed: hoursAgg.find((g) => g.status === 'BILLED')?._sum.hoursWorked || 0,
  };
}

export async function getAgencyProjects(req: AuthRequest, res: Response): Promise<void> {
  if (!(await requireProjectSchema(res))) return;
  try {
    const access = req.membership!;
    const allowedIds = await getAccessibleProjectIds(access);
    const rows = await prisma.agencyProject.findMany({
      where: {
        businessId: req.params.businessId,
        ...(allowedIds ? { id: { in: allowedIds } } : {}),
      },
      include: projectInclude,
      orderBy: { createdAt: 'desc' },
    });

    const projectIds = rows.map((r) => r.id);
    const [activePlacements, hoursByProject] = await Promise.all([
      projectIds.length
        ? prisma.placement.groupBy({
            by: ['projectId'],
            where: { businessId: req.params.businessId, projectId: { in: projectIds }, status: 'ACTIVE' },
            _count: true,
          })
        : Promise.resolve([]),
      projectIds.length
        ? prisma.timesheet.groupBy({
            by: ['projectId'],
            where: { businessId: req.params.businessId, projectId: { in: projectIds } },
            _sum: { hoursWorked: true },
          })
        : Promise.resolve([]),
    ]);

    const activeMap = new Map(activePlacements.map((p) => [p.projectId, p._count]));
    const hoursMap = new Map(hoursByProject.map((h) => [h.projectId, h._sum.hoursWorked || 0]));

    const enriched = rows.map((row) => ({
      ...row,
      stats: {
        assignedWorkers: row._count.placements,
        activeWorkers: activeMap.get(row.id) || 0,
        totalHours: hoursMap.get(row.id) || 0,
        headcountGap:
          row.headcount != null ? row.headcount - (activeMap.get(row.id) || 0) : null,
      },
    }));

    res.json({ success: true, data: enriched });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to load projects';
    if (msg.includes('AgencyProject') || msg.includes('does not exist')) {
      res.status(503).json({
        success: false,
        message: 'Projects table missing — redeploy backend or run scripts/sync-schema.sql in Neon',
      });
      return;
    }
    throw error;
  }
}

export async function getAgencyProject(req: AuthRequest, res: Response): Promise<void> {
  if (!(await requireProjectSchema(res))) return;
  const row = await prisma.agencyProject.findFirst({
    where: { id: req.params.projectId, businessId: req.params.businessId },
    include: {
      ...projectInclude,
      placements: {
        include: { workerProfile: true },
        orderBy: { startDate: 'desc' },
      },
      timesheets: {
        include: { workerProfile: true },
        orderBy: { workDate: 'desc' },
        take: 50,
      },
    },
  });
  if (!row) {
    res.status(404).json({ success: false, message: 'Project not found' });
    return;
  }

  const access = req.membership!;
  if (!(await ensureProjectPerm(req, res, row.id, 'project.view'))) return;
  const myPermissions = await getMemberProjectPermissions(
    access.businessId,
    access.memberId,
    row.id,
    access.role
  );

  const hoursAgg = await prisma.timesheet.groupBy({
    by: ['status'],
    where: { businessId: req.params.businessId, projectId: row.id },
    _sum: { hoursWorked: true },
    _count: true,
  });

  const activeWorkers = row.placements.filter((p) => p.status === 'ACTIVE').length;
  const hoursSummary = buildHoursSummary(hoursAgg);

  const teamManagers = await prisma.businessMember.findMany({
    where: {
      businessId: req.params.businessId,
      isActive: true,
      role: { in: ['OWNER', 'MANAGER'] },
    },
    include: { user: { select: { id: true, name: true, phone: true, email: true } } },
    orderBy: { role: 'desc' },
  });

  res.json({
    success: true,
    data: {
      ...row,
      placements: row.placements.map((p) => ({
        ...p,
        workerProfile: p.workerProfile ? sanitizeWorker(p.workerProfile) : p.workerProfile,
      })),
      timesheets: row.timesheets.map((ts) => ({
        ...ts,
        workerProfile: ts.workerProfile ? sanitizeWorker(ts.workerProfile) : ts.workerProfile,
      })),
      hoursSummary,
      projectStats: {
        assignedWorkers: row.placements.length,
        activeWorkers,
        headcountRequired: row.headcount,
        headcountGap: row.headcount != null ? row.headcount - activeWorkers : null,
        totalHours: hoursSummary.total,
        pendingHours: hoursSummary.pending,
      },
      teamManagers,
      myPermissions,
    },
  });
}

export async function createAgencyProject(req: AuthRequest, res: Response): Promise<void> {
  if (!(await requireProjectSchema(res))) return;
  const validation = validateBody(createAgencyProjectSchema, req.body);
  if (validation.success === false) {
    res.status(400).json({ success: false, message: validation.errors.join(', ') });
    return;
  }

  const data = validation.data;
  const client = await prisma.clientCompany.findFirst({
    where: { id: data.clientCompanyId, businessId: req.params.businessId },
  });
  if (!client) {
    res.status(400).json({
      success: false,
      message: 'Client not found — add a client first in Clients page',
    });
    return;
  }

  if (data.managerMemberId) {
    const manager = await prisma.businessMember.findFirst({
      where: { id: data.managerMemberId, businessId: req.params.businessId, isActive: true },
    });
    if (!manager) {
      res.status(400).json({ success: false, message: 'Selected manager not found' });
      return;
    }
  }

  try {
    const row = await prisma.agencyProject.create({
      data: {
        businessId: req.params.businessId,
        clientCompanyId: data.clientCompanyId,
        name: data.name,
        code: data.code,
        siteName: data.siteName,
        siteAddress: data.siteAddress,
        city: data.city,
        latitude: data.latitude,
        longitude: data.longitude,
        industryTag: data.industryTag,
        contractRef: data.contractRef,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        headcount: data.headcount,
        managerMemberId: data.managerMemberId || undefined,
        status: data.status || 'ACTIVE',
        notes: data.notes,
      },
      include: projectInclude,
    });
    res.status(201).json({ success: true, data: row });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Create failed';
    if (isSchemaError(msg)) {
      console.warn('[createAgencyProject] schema error:', msg);
      res.status(503).json({
        success: false,
        message: SCHEMA_NOT_READY_MESSAGE,
      });
      return;
    }
    const formatted = formatPrismaError(error);
    res.status(formatted.status).json({ success: false, message: formatted.message });
  }
}

export async function updateAgencyProject(req: AuthRequest, res: Response): Promise<void> {
  const validation = validateBody(updateAgencyProjectSchema, req.body);
  if (validation.success === false) {
    res.status(400).json({ success: false, message: validation.errors.join(', ') });
    return;
  }

  const data = validation.data;
  if (data.clientCompanyId) {
    const client = await prisma.clientCompany.findFirst({
      where: { id: data.clientCompanyId, businessId: req.params.businessId },
    });
    if (!client) {
      res.status(400).json({ success: false, message: 'Client company not found' });
      return;
    }
  }

  const updated = await prisma.agencyProject.updateMany({
    where: { id: req.params.projectId, businessId: req.params.businessId },
    data: {
      ...(data.clientCompanyId && { clientCompanyId: data.clientCompanyId }),
      ...(data.name && { name: data.name }),
      ...(data.code !== undefined && { code: data.code }),
      ...(data.siteName !== undefined && { siteName: data.siteName }),
      ...(data.siteAddress !== undefined && { siteAddress: data.siteAddress }),
      ...(data.city !== undefined && { city: data.city }),
      ...(data.latitude !== undefined && { latitude: data.latitude }),
      ...(data.longitude !== undefined && { longitude: data.longitude }),
      ...(data.industryTag !== undefined && { industryTag: data.industryTag }),
      ...(data.contractRef !== undefined && { contractRef: data.contractRef }),
      ...(data.startDate !== undefined && { startDate: data.startDate ? new Date(data.startDate) : null }),
      ...(data.endDate !== undefined && { endDate: data.endDate ? new Date(data.endDate) : null }),
      ...(data.headcount !== undefined && { headcount: data.headcount }),
      ...(data.managerMemberId !== undefined && {
        managerMemberId: data.managerMemberId || null,
      }),
      ...(data.status && { status: data.status }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });

  if (updated.count === 0) {
    res.status(404).json({ success: false, message: 'Project not found' });
    return;
  }

  const row = await prisma.agencyProject.findFirst({
    where: { id: req.params.projectId, businessId: req.params.businessId },
    include: projectInclude,
  });
  res.json({ success: true, data: row });
}

export async function deleteAgencyProject(req: AuthRequest, res: Response): Promise<void> {
  const access = req.membership!;
  if (access.role !== 'OWNER') {
    res.status(403).json({ success: false, message: 'Only owner can delete projects' });
    return;
  }

  const deleted = await prisma.agencyProject.deleteMany({
    where: { id: req.params.projectId, businessId: req.params.businessId },
  });
  if (deleted.count === 0) {
    res.status(404).json({ success: false, message: 'Project not found' });
    return;
  }
  res.json({ success: true, message: 'Project deleted' });
}

export async function loadManpowerDemo(req: AuthRequest, res: Response): Promise<void> {
  const access = req.membership!;
  if (access.role !== 'OWNER' && access.role !== 'MANAGER') {
    res.status(403).json({ success: false, message: 'Manager access required' });
    return;
  }
  if (!(await requireProjectSchema(res))) return;

  const force = req.query.force === 'true';
  try {
    const result = await seedManpowerDemo(req.params.businessId, force);
    res.json({ success: true, data: result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Demo seed failed';
    if (msg.includes('AgencyProject') || msg.includes('does not exist')) {
      res.status(503).json({
        success: false,
        message: SCHEMA_NOT_READY_MESSAGE,
      });
      return;
    }
    throw error;
  }
}

export async function syncManpowerSchema(req: AuthRequest, res: Response): Promise<void> {
  const access = req.membership!;
  if (access.role !== 'OWNER' && access.role !== 'MANAGER') {
    res.status(403).json({ success: false, message: 'Manager access required' });
    return;
  }
  await syncDatabaseSchemaAsync({ force: true });
  const ready = await isAgencyProjectFullyReady();
  const payload = {
    success: ready,
    message: ready ? 'Schema synced — projects ready' : SCHEMA_NOT_READY_MESSAGE,
    agencyProjectTable: ready,
    directUrlConfigured: Boolean(process.env.DIRECT_URL || process.env.DIRECT_DATABASE_URL),
  };
  if (!ready) {
    res.status(503).json(payload);
    return;
  }
  res.json(payload);
}

export async function getManpowerAnalytics(req: AuthRequest, res: Response): Promise<void> {
  const businessId = req.params.businessId;
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    activeProjects,
    totalProjects,
    activePlacements,
    totalWorkers,
    availableWorkers,
    pendingHours,
    approvedHours,
    expiringIqamas,
    projectsByClient,
    workersByCategory,
  ] = await Promise.all([
    prisma.agencyProject.count({ where: { businessId, status: 'ACTIVE' } }),
    prisma.agencyProject.count({ where: { businessId } }),
    prisma.placement.count({ where: { businessId, status: 'ACTIVE' } }),
    prisma.workerProfile.count({ where: { businessId } }),
    prisma.workerProfile.count({ where: { businessId, status: 'AVAILABLE' } }),
    prisma.timesheet.aggregate({
      where: { businessId, status: { in: ['PENDING', 'PENDING_ADMIN', 'PENDING_PAYROLL'] } },
      _sum: { hoursWorked: true },
    }),
    prisma.timesheet.aggregate({
      where: { businessId, status: 'APPROVED' },
      _sum: { hoursWorked: true },
    }),
    prisma.workerProfile.findMany({
      where: {
        businessId,
        iqamaExpiry: { lte: in30Days, gte: now },
        placements: { some: { status: 'ACTIVE' } },
      },
      select: { id: true, name: true, iqamaNumber: true, iqamaExpiry: true },
      take: 20,
    }),
    prisma.agencyProject.groupBy({
      by: ['clientCompanyId'],
      where: { businessId, status: 'ACTIVE' },
      _count: true,
    }),
    prisma.workerProfile.groupBy({
      by: ['category'],
      where: { businessId, category: { not: null } },
      _count: true,
    }),
  ]);

  const utilization =
    totalWorkers > 0 ? Math.round(((totalWorkers - availableWorkers) / totalWorkers) * 100) : 0;

  const clientIds = projectsByClient.map((p) => p.clientCompanyId);
  const clients = clientIds.length
    ? await prisma.clientCompany.findMany({
        where: { id: { in: clientIds } },
        select: { id: true, name: true },
      })
    : [];

  res.json({
    success: true,
    data: {
      activeProjects,
      totalProjects,
      activePlacements,
      totalWorkers,
      availableWorkers,
      utilizationPercent: utilization,
      pendingHours: pendingHours._sum.hoursWorked || 0,
      approvedHours: approvedHours._sum.hoursWorked || 0,
      expiringIqamas,
      projectsPerClient: projectsByClient.map((p) => ({
        clientId: p.clientCompanyId,
        clientName: clients.find((c) => c.id === p.clientCompanyId)?.name || 'Unknown',
        projectCount: p._count,
      })),
      workersByCategory: workersByCategory
        .filter((w) => w.category)
        .map((w) => ({ category: w.category as string, count: w._count }))
        .sort((a, b) => b.count - a.count),
    },
  });
}

export async function getWorkerCategories(req: AuthRequest, res: Response): Promise<void> {
  const rows = await prisma.workerProfile.groupBy({
    by: ['category'],
    where: { businessId: req.params.businessId, category: { not: null } },
    _count: true,
  });
  const custom = rows.filter((r) => r.category).map((r) => r.category as string);
  const all = mergeCategoryLists(custom);
  res.json({
    success: true,
    data: {
      groups: OIL_GAS_CATEGORY_GROUPS,
      all,
      custom: custom.sort((a, b) => a.localeCompare(b)),
      presetCount: ALL_OIL_GAS_CATEGORIES.length,
    },
  });
}

export async function getWorkerProfiles(req: AuthRequest, res: Response): Promise<void> {
  const rows = await prisma.workerProfile.findMany({
    where: { businessId: req.params.businessId },
    orderBy: { name: 'asc' },
  });
  res.json({ success: true, data: rows.map(sanitizeWorker) });
}

export async function createWorkerProfile(req: AuthRequest, res: Response): Promise<void> {
  const validation = validateBody(createWorkerProfileSchema, req.body);
  if (validation.success === false) {
    res.status(400).json({ success: false, message: validation.errors.join(', ') });
    return;
  }
  const data = validation.data;
  const row = await prisma.workerProfile.create({
    data: {
      businessId: req.params.businessId,
      name: data.name,
      phone: data.phone ? normalizePhone(data.phone) : undefined,
      nationality: data.nationality,
      iqamaNumber: data.iqamaNumber,
      iqamaExpiry: data.iqamaExpiry ? new Date(data.iqamaExpiry) : undefined,
      category: data.category?.trim() || undefined,
      loginPassword: data.password ? await hashPassword(data.password) : undefined,
      defaultHours: data.defaultHours ?? 8,
      hourlyRate: data.hourlyRate,
      skills: (data.skills as Prisma.InputJsonValue) || [],
      contractType: data.contractType,
      notes: data.notes,
    },
  });
  res.status(201).json({ success: true, data: sanitizeWorker(row) });
}

export async function addProjectWorker(req: AuthRequest, res: Response): Promise<void> {
  if (!(await requireProjectSchema(res))) return;
  const validation = validateBody(assignProjectWorkerSchema, req.body);
  if (validation.success === false) {
    res.status(400).json({ success: false, message: validation.errors.join(', ') });
    return;
  }
  const data = validation.data;
  const project = await prisma.agencyProject.findFirst({
    where: { id: req.params.projectId, businessId: req.params.businessId },
  });
  if (!project) {
    res.status(404).json({ success: false, message: 'Project not found' });
    return;
  }
  if (!(await ensureProjectPerm(req, res, project.id, 'workers.add'))) return;

  const worker = await prisma.workerProfile.create({
    data: {
      businessId: req.params.businessId,
      name: data.name,
      phone: data.phone ? normalizePhone(data.phone) : undefined,
      nationality: data.nationality,
      iqamaNumber: data.iqamaNumber,
      iqamaExpiry: data.iqamaExpiry ? new Date(data.iqamaExpiry) : undefined,
      category: data.category?.trim() || undefined,
      loginPassword: data.password ? await hashPassword(data.password) : undefined,
      defaultHours: data.defaultHours ?? 8,
      hourlyRate: data.hourlyRate,
      contractType: data.contractType,
      status: 'ASSIGNED',
    },
  });

  const placement = await prisma.placement.create({
    data: {
      businessId: req.params.businessId,
      workerProfileId: worker.id,
      clientCompanyId: project.clientCompanyId,
      projectId: project.id,
      siteName: project.siteName || undefined,
      startDate: data.startDate ? new Date(data.startDate) : new Date(),
      status: 'ACTIVE',
    },
    include: { workerProfile: true, clientCompany: true, project: true },
  });

  res.status(201).json({
    success: true,
    data: {
      worker: sanitizeWorker(worker),
      placement,
    },
  });
}

export async function getPlacements(req: AuthRequest, res: Response): Promise<void> {
  const where: Prisma.PlacementWhereInput = { businessId: req.params.businessId };
  if (req.query.projectId) {
    where.projectId = String(req.query.projectId);
  }

  const rows = await prisma.placement.findMany({
    where,
    include: { workerProfile: true, clientCompany: true, project: true },
    orderBy: { startDate: 'desc' },
  });
  res.json({ success: true, data: rows });
}

export async function createPlacement(req: AuthRequest, res: Response): Promise<void> {
  const body = req.body as Record<string, unknown>;
  let clientCompanyId = String(body.clientCompanyId || '');
  let siteName = body.siteName ? String(body.siteName) : undefined;
  const projectId = body.projectId ? String(body.projectId) : undefined;

  if (projectId) {
    const project = await prisma.agencyProject.findFirst({
      where: { id: projectId, businessId: req.params.businessId },
    });
    if (!project) {
      res.status(400).json({ success: false, message: 'Project not found' });
      return;
    }
    clientCompanyId = project.clientCompanyId;
    if (!siteName && project.siteName) siteName = project.siteName;
  }

  const row = await prisma.placement.create({
    data: {
      businessId: req.params.businessId,
      workerProfileId: String(body.workerProfileId),
      clientCompanyId,
      projectId,
      siteName,
      startDate: new Date(String(body.startDate)),
      endDate: body.endDate ? new Date(String(body.endDate)) : undefined,
      notes: body.notes ? String(body.notes) : undefined,
    },
    include: { workerProfile: true, clientCompany: true, project: true },
  });
  res.status(201).json({ success: true, data: row });
}

export async function updatePlacement(req: AuthRequest, res: Response): Promise<void> {
  const body = req.body as Record<string, unknown>;
  const existing = await prisma.placement.findFirst({
    where: { id: req.params.placementId, businessId: req.params.businessId },
  });
  if (!existing) {
    res.status(404).json({ success: false, message: 'Placement not found' });
    return;
  }

  let clientCompanyId = body.clientCompanyId ? String(body.clientCompanyId) : existing.clientCompanyId;
  let siteName = body.siteName !== undefined ? (body.siteName ? String(body.siteName) : null) : existing.siteName;
  let projectId =
    body.projectId !== undefined ? (body.projectId ? String(body.projectId) : null) : existing.projectId;

  if (projectId) {
    const project = await prisma.agencyProject.findFirst({
      where: { id: projectId, businessId: req.params.businessId },
    });
    if (!project) {
      res.status(400).json({ success: false, message: 'Project not found' });
      return;
    }
    clientCompanyId = project.clientCompanyId;
    if (!siteName && project.siteName) siteName = project.siteName;
  }

  const row = await prisma.placement.update({
    where: { id: existing.id },
    data: {
      ...(body.workerProfileId && { workerProfileId: String(body.workerProfileId) }),
      clientCompanyId,
      projectId,
      siteName,
      ...(body.startDate && { startDate: new Date(String(body.startDate)) }),
      ...(body.endDate !== undefined && {
        endDate: body.endDate ? new Date(String(body.endDate)) : null,
      }),
      ...(body.status && { status: String(body.status) }),
      ...(body.notes !== undefined && { notes: body.notes ? String(body.notes) : null }),
    },
    include: { workerProfile: true, clientCompany: true, project: true },
  });
  res.json({ success: true, data: row });
}

export async function deletePlacement(req: AuthRequest, res: Response): Promise<void> {
  const existing = await prisma.placement.findFirst({
    where: { id: req.params.placementId, businessId: req.params.businessId },
  });
  if (!existing) {
    res.status(404).json({ success: false, message: 'Placement not found' });
    return;
  }

  const tsCount = await prisma.timesheet.count({ where: { placementId: existing.id } });
  if (tsCount > 0) {
    const row = await prisma.placement.update({
      where: { id: existing.id },
      data: { status: 'ENDED', endDate: new Date() },
      include: { workerProfile: true, clientCompany: true, project: true },
    });
    res.json({ success: true, data: row, message: 'Placement ended (timesheets linked)' });
    return;
  }

  await prisma.placement.delete({ where: { id: existing.id } });
  res.json({ success: true, data: { id: existing.id } });
}

export async function getTimesheets(req: AuthRequest, res: Response): Promise<void> {
  const where: Prisma.TimesheetWhereInput = { businessId: req.params.businessId };
  if (req.query.projectId) {
    where.projectId = String(req.query.projectId);
  }

  const rows = await prisma.timesheet.findMany({
    where,
    include: { workerProfile: true, clientCompany: true, placement: true, project: true },
    orderBy: { workDate: 'desc' },
    take: 200,
  });
  res.json({ success: true, data: rows });
}

export async function createTimesheet(req: AuthRequest, res: Response): Promise<void> {
  const validation = validateBody(createTimesheetSchema, req.body);
  if (validation.success === false) {
    res.status(400).json({ success: false, message: validation.errors.join(', ') });
    return;
  }
  const data = validation.data;
  let clientCompanyId = data.clientCompanyId;
  let projectId = data.projectId;

  const worker = await prisma.workerProfile.findFirst({
    where: { id: data.workerProfileId, businessId: req.params.businessId },
  });
  if (!worker) {
    res.status(400).json({ success: false, message: 'Worker not found' });
    return;
  }

  if (data.placementId) {
    const placement = await prisma.placement.findFirst({
      where: { id: data.placementId, businessId: req.params.businessId },
    });
    if (placement) {
      clientCompanyId = placement.clientCompanyId;
      projectId = placement.projectId || projectId;
    }
  }

  if (projectId && !clientCompanyId) {
    const project = await prisma.agencyProject.findFirst({
      where: { id: projectId, businessId: req.params.businessId },
    });
    if (project) clientCompanyId = project.clientCompanyId;
  }

  if (projectId && !(await ensureProjectPerm(req, res, projectId, 'workers.timesheet'))) return;

  const policy = await getManpowerPolicy(req.params.businessId);
  const hours = applyOvertimeRules(policy, {
    regularHours: data.regularHours,
    overtimeHours: data.overtimeHours,
    hoursWorked: data.hoursWorked,
    hourlyRate: worker.hourlyRate,
  });

  const access = req.membership!;

  const row = await prisma.timesheet.create({
    data: {
      businessId: req.params.businessId,
      workerProfileId: data.workerProfileId,
      clientCompanyId,
      projectId,
      placementId: data.placementId,
      workDate: new Date(data.workDate),
      regularHours: hours.regularHours,
      overtimeHours: hours.overtimeHours,
      hoursWorked: hours.hoursWorked,
      overtimePay: hours.overtimePay ?? undefined,
      status: 'PENDING',
      notes: data.notes,
      submittedByMemberId: access.memberId,
      submittedAt: new Date(),
    },
    include: { workerProfile: true, clientCompany: true, project: true },
  });

  const project = row.project;
  notifyTimesheetSubmitted(
    req.params.businessId,
    worker.name,
    project?.name
  ).catch(() => undefined);

  res.status(201).json({
    success: true,
    data: {
      ...row,
      workerProfile: row.workerProfile ? sanitizeWorker(row.workerProfile) : row.workerProfile,
    },
  });
}

export async function updateTimesheetStatus(req: AuthRequest, res: Response): Promise<void> {
  const validation = validateBody(updateTimesheetStatusSchema, req.body);
  if (validation.success === false) {
    res.status(400).json({ success: false, message: validation.errors.join(', ') });
    return;
  }

  const access = req.membership!;
  let action = validation.data.action as 'approve' | 'reject' | 'bill' | undefined;

  if (!action && validation.data.status) {
    if (validation.data.status === 'APPROVED') action = 'approve';
    else if (validation.data.status === 'BILLED') action = 'bill';
    else if (validation.data.status === 'REJECTED') action = 'reject';
  }

  if (!action) {
    res.status(400).json({ success: false, message: 'action or status required' });
    return;
  }

  try {
    const row = await advanceTimesheet(
      req.params.businessId,
      req.params.timesheetId,
      access,
      action,
      validation.data.rejectReason
    );
    res.json({
      success: true,
      data: {
        ...row,
        workerProfile: row.workerProfile ? sanitizeWorker(row.workerProfile) : row.workerProfile,
        approvalStageLabel: approvalStageLabel(row.status),
      },
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : 'Action failed',
    });
  }
}

export async function bulkTimesheetAction(req: AuthRequest, res: Response): Promise<void> {
  const validation = validateBody(bulkTimesheetActionSchema, req.body);
  if (validation.success === false) {
    res.status(400).json({ success: false, message: validation.errors.join(', ') });
    return;
  }

  if (validation.data.action === 'reject' && !validation.data.rejectReason?.trim()) {
    res.status(400).json({ success: false, message: 'Reject reason required' });
    return;
  }

  const results = await bulkAdvanceTimesheets(
    req.params.businessId,
    req.membership!,
    validation.data.ids,
    validation.data.action,
    validation.data.rejectReason
  );

  const ok = results.filter((r) => r.ok).length;
  res.json({ success: true, data: { results, approved: ok, failed: results.length - ok } });
}

export async function getTimesheetPendingQueue(req: AuthRequest, res: Response): Promise<void> {
  const rows = await getPendingTimesheetQueue(req.params.businessId, req.membership!);
  res.json({
    success: true,
    data: rows.map((row) => ({
      ...row,
      workerProfile: row.workerProfile ? sanitizeWorker(row.workerProfile) : row.workerProfile,
      approvalStageLabel: approvalStageLabel(row.status),
    })),
  });
}

export async function getManpowerPolicyConfig(req: AuthRequest, res: Response): Promise<void> {
  const policy = await getManpowerPolicy(req.params.businessId);
  res.json({ success: true, data: policy });
}

export async function updateManpowerPolicyConfig(req: AuthRequest, res: Response): Promise<void> {
  if (req.membership!.role !== 'OWNER') {
    res.status(403).json({ success: false, message: 'Owner only' });
    return;
  }
  const validation = validateBody(manpowerPolicySchema, req.body);
  if (validation.success === false) {
    res.status(400).json({ success: false, message: validation.errors.join(', ') });
    return;
  }
  const policy = await setManpowerPolicy(req.params.businessId, validation.data);
  res.json({ success: true, data: policy });
}

export async function getManpowerLiveDashboard(req: AuthRequest, res: Response): Promise<void> {
  const data = await getLiveManpowerDashboard(req.params.businessId);
  res.json({ success: true, data });
}

export async function exportManpowerTimesheets(req: AuthRequest, res: Response): Promise<void> {
  const businessId = req.params.businessId;
  const month = String(req.query.month || new Date().toISOString().slice(0, 7));
  const period = req.query.period === 'weekly' ? 'weekly' : 'monthly';
  const projectId = req.query.projectId ? String(req.query.projectId) : undefined;
  const workerProfileId = req.query.workerProfileId ? String(req.query.workerProfileId) : undefined;

  const [year, mon] = month.split('-').map(Number);
  const start = new Date(year, mon - 1, 1);
  const end = new Date(year, mon, 0, 23, 59, 59);

  const rows = await prisma.timesheet.findMany({
    where: {
      businessId,
      workDate: { gte: start, lte: end },
      ...(projectId ? { projectId } : {}),
      ...(workerProfileId ? { workerProfileId } : {}),
    },
    include: { workerProfile: true, project: true },
    orderBy: [{ workDate: 'asc' }, { workerProfile: { name: 'asc' } }],
  });

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { name: true },
  });

  const exportRows = rows.map((ts) => {
    const regular = ts.regularHours ?? ts.hoursWorked;
    const overtime = ts.overtimeHours ?? 0;
    return {
      workerName: ts.workerProfile.name,
      category: ts.workerProfile.category,
      iqamaNumber: ts.workerProfile.iqamaNumber,
      phone: ts.workerProfile.phone,
      projectName: ts.project?.name,
      workDate: ts.workDate,
      regularHours: regular,
      overtimeHours: overtime,
      totalHours: ts.hoursWorked,
      status: ts.status,
      notes: ts.notes,
    };
  });

  const buffer = await buildManpowerTimesheetWorkbook(exportRows, {
    title: business?.name || 'Manpower Report',
    period,
    monthLabel: month,
  });

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  const workerSlug = workerProfileId
    ? exportRows[0]?.workerName?.replace(/\s+/g, '-').slice(0, 30) || workerProfileId.slice(0, 8)
    : 'all';

  res.setHeader(
    'Content-Disposition',
    `attachment; filename="timesheet-${workerSlug}-${month}.xlsx"`
  );
  res.send(buffer);
}

function parseAttendanceDate(dateStr: string): { start: Date; end: Date } {
  const raw = String(dateStr).slice(0, 10);
  const [y, m, d] = raw.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
  return { start, end };
}

export async function getProjectWorkerAttendance(req: AuthRequest, res: Response): Promise<void> {
  const businessId = req.params.businessId;
  const projectId = req.params.projectId;
  if (!(await ensureProjectPerm(req, res, projectId, 'workers.view'))) return;
  const dateStr = String(req.query.date || new Date().toISOString().slice(0, 10));
  const { start, end } = parseAttendanceDate(dateStr);

  const rows = await prisma.workerDailyAttendance.findMany({
    where: {
      businessId,
      projectId,
      workDate: { gte: start, lte: end },
    },
  });

  res.json({ success: true, data: rows });
}

export async function setProjectWorkerAttendance(req: AuthRequest, res: Response): Promise<void> {
  const businessId = req.params.businessId;
  const projectId = req.params.projectId;
  if (!(await ensureProjectPerm(req, res, projectId, 'workers.attendance'))) return;
  const { workerProfileId, workDate, status } = req.body as {
    workerProfileId?: string;
    workDate?: string;
    status?: string;
  };

  if (!workerProfileId || !workDate) {
    res.status(400).json({ success: false, message: 'workerProfileId and workDate required' });
    return;
  }

  const attendanceStatus = status === 'ABSENT' ? 'ABSENT' : 'PRESENT';
  const { start, end } = parseAttendanceDate(workDate);

  const placement = await prisma.placement.findFirst({
    where: { businessId, projectId, workerProfileId },
  });
  if (!placement) {
    res.status(404).json({ success: false, message: 'Worker not assigned to this project' });
    return;
  }

  const existing = await prisma.workerDailyAttendance.findFirst({
    where: {
      workerProfileId,
      projectId,
      workDate: { gte: start, lte: end },
    },
  });

  const row = existing
    ? await prisma.workerDailyAttendance.update({
        where: { id: existing.id },
        data: { status: attendanceStatus },
      })
    : await prisma.workerDailyAttendance.create({
        data: {
          businessId,
          workerProfileId,
          projectId,
          workDate: start,
          status: attendanceStatus,
        },
      });

  res.json({ success: true, data: row });
}

export async function getProjectPermissionCatalog(_req: AuthRequest, res: Response): Promise<void> {
  res.json({ success: true, data: PROJECT_PERMISSION_CATALOG });
}

export async function getProjectAccessList(req: AuthRequest, res: Response): Promise<void> {
  if (!(await requireProjectSchema(res))) return;
  if (req.membership!.role !== 'OWNER') {
    res.status(403).json({ success: false, message: 'Only owner can manage project access' });
    return;
  }

  const rows = await prisma.projectMemberAccess.findMany({
    where: { businessId: req.params.businessId, projectId: req.params.projectId },
    include: {
      member: { include: { user: { select: { id: true, name: true, phone: true, email: true } } } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  res.json({
    success: true,
    data: rows.map((row) => ({
      id: row.id,
      memberId: row.memberId,
      permissions: sanitizePermissionList(row.permissions),
      isActive: row.isActive,
      member: row.member,
      user: row.member.user,
    })),
  });
}

export async function upsertProjectAccess(req: AuthRequest, res: Response): Promise<void> {
  if (!(await requireProjectSchema(res))) return;
  if (req.membership!.role !== 'OWNER') {
    res.status(403).json({ success: false, message: 'Only owner can manage project access' });
    return;
  }

  const body = req.body as {
    memberId?: string;
    phone?: string;
    name?: string;
    permissions?: unknown;
  };
  const permissions = sanitizePermissionList(body.permissions);

  const project = await prisma.agencyProject.findFirst({
    where: { id: req.params.projectId, businessId: req.params.businessId },
  });
  if (!project) {
    res.status(404).json({ success: false, message: 'Project not found' });
    return;
  }

  try {
    if (body.phone) {
      const row = await upsertProjectAccessByPhone({
        businessId: req.params.businessId,
        projectId: req.params.projectId,
        phone: body.phone,
        name: body.name,
        permissions,
      });

      let invite: Awaited<ReturnType<typeof createAndSendMemberInvite>> | null = null;
      try {
        invite = await createAndSendMemberInvite({
          businessId: req.params.businessId,
          memberId: row.memberId,
          userId: row.member.userId,
          contextLabel: `Project: ${project.name}`,
        });
      } catch (err) {
        console.warn('[invite] project access send failed:', err instanceof Error ? err.message : err);
      }

      res.json({
        success: true,
        data: {
          grant: {
            id: row.id,
            memberId: row.memberId,
            permissions: sanitizePermissionList(row.permissions),
            isActive: row.isActive,
            member: row.member,
            user: row.member.user,
          },
          invite: invite
            ? {
                inviteUrl: invite.inviteUrl,
                phone: invite.phone,
                tempPassword: invite.tempPassword,
                smsAttempted: invite.smsAttempted,
                emailAttempted: invite.emailAttempted,
              }
            : null,
        },
      });
      return;
    }

    if (!body.memberId) {
      res.status(400).json({ success: false, message: 'phone or memberId required' });
      return;
    }

    const row = await prisma.projectMemberAccess.upsert({
      where: {
        projectId_memberId: { projectId: req.params.projectId, memberId: body.memberId },
      },
      create: {
        businessId: req.params.businessId,
        projectId: req.params.projectId,
        memberId: body.memberId,
        permissions,
      },
      update: { permissions, isActive: true },
      include: {
        member: { include: { user: { select: { id: true, name: true, phone: true, email: true } } } },
      },
    });

    res.json({
      success: true,
      data: {
        grant: {
          id: row.id,
          memberId: row.memberId,
          permissions: sanitizePermissionList(row.permissions),
          isActive: row.isActive,
          member: row.member,
          user: row.member.user,
        },
        invite: null,
      },
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : 'Failed to save access',
    });
  }
}

export async function removeProjectAccess(req: AuthRequest, res: Response): Promise<void> {
  if (!(await requireProjectSchema(res))) return;
  if (req.membership!.role !== 'OWNER') {
    res.status(403).json({ success: false, message: 'Only owner can manage project access' });
    return;
  }

  await prisma.projectMemberAccess.deleteMany({
    where: {
      businessId: req.params.businessId,
      projectId: req.params.projectId,
      memberId: req.params.memberId,
    },
  });

  res.json({ success: true, message: 'Access removed' });
}

export async function getMyProjectAccess(req: AuthRequest, res: Response): Promise<void> {
  if (!(await requireProjectSchema(res))) return;
  const access = req.membership!;

  if (access.role === 'OWNER') {
    const projects = await prisma.agencyProject.findMany({
      where: { businessId: req.params.businessId },
      select: { id: true, name: true, status: true },
    });
    res.json({
      success: true,
      data: projects.map((p) => ({
        projectId: p.id,
        projectName: p.name,
        status: p.status,
        permissions: sanitizePermissionList(PROJECT_PERMISSION_CATALOG.map((x) => x.key)),
      })),
    });
    return;
  }

  const rows = await prisma.projectMemberAccess.findMany({
    where: { businessId: req.params.businessId, memberId: access.memberId, isActive: true },
    include: { project: { select: { id: true, name: true, status: true } } },
  });

  const map = new Map<string, { projectId: string; projectName: string; status: string; permissions: string[] }>();

  for (const row of rows) {
    map.set(row.projectId, {
      projectId: row.projectId,
      projectName: row.project?.name || 'Project',
      status: row.project?.status || 'ACTIVE',
      permissions: sanitizePermissionList(row.permissions),
    });
  }

  const managed = await prisma.agencyProject.findMany({
    where: { businessId: req.params.businessId, managerMemberId: access.memberId },
    select: { id: true, name: true, status: true },
  });
  for (const p of managed) {
    if (!map.has(p.id)) {
      map.set(p.id, {
        projectId: p.id,
        projectName: p.name,
        status: p.status,
        permissions: sanitizePermissionList(DEFAULT_MANAGER_PERMISSIONS),
      });
    }
  }

  res.json({ success: true, data: [...map.values()] });
}
