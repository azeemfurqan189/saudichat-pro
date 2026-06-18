import { randomBytes } from 'crypto';
import prisma from '../utils/prisma';

function todayBounds() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export async function ensureWorkerQrToken(workerProfileId: string): Promise<string> {
  const worker = await prisma.workerProfile.findUnique({
    where: { id: workerProfileId },
    select: { attendanceQrToken: true },
  });
  if (worker?.attendanceQrToken) return worker.attendanceQrToken;

  const token = randomBytes(16).toString('hex');
  await prisma.workerProfile.update({
    where: { id: workerProfileId },
    data: { attendanceQrToken: token },
  });
  return token;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function resolveWorkerByToken(token: string) {
  return prisma.workerProfile.findFirst({
    where: { attendanceQrToken: token },
    include: {
      business: { select: { id: true, name: true } },
      placements: {
        where: { status: 'ACTIVE' },
        include: { project: true, clientCompany: true },
        take: 5,
      },
    },
  });
}

export async function processQrCheckIn(params: {
  token: string;
  projectId?: string;
  lat?: number;
  lng?: number;
  geoFenceKm?: number;
}) {
  const worker = await resolveWorkerByToken(params.token);
  if (!worker) {
    return { ok: false as const, message: 'Invalid QR code' };
  }

  let projectId = params.projectId;
  if (!projectId) {
    const active = worker.placements.find((p) => p.projectId)?.projectId;
    projectId = active || undefined;
  }

  if (projectId) {
    const project = await prisma.agencyProject.findFirst({
      where: { id: projectId, businessId: worker.businessId },
    });
    if (!project) {
      return { ok: false as const, message: 'Project not found' };
    }

    if (
      params.lat != null &&
      params.lng != null &&
      project.latitude != null &&
      project.longitude != null
    ) {
      const dist = haversineKm(params.lat, params.lng, project.latitude, project.longitude);
      const maxKm = params.geoFenceKm ?? 2;
      if (dist > maxKm) {
        return {
          ok: false as const,
          message: `Outside site geo-fence (${dist.toFixed(1)} km away, max ${maxKm} km)`,
        };
      }
    }
  }

  const { start, end } = todayBounds();
  const workDate = start;

  const existing = await prisma.workerDailyAttendance.findFirst({
    where: {
      workerProfileId: worker.id,
      projectId: projectId ?? null,
      workDate: { gte: start, lte: end },
    },
  });

  const attendance = existing
    ? await prisma.workerDailyAttendance.update({
        where: { id: existing.id },
        data: {
          status: 'PRESENT',
          checkInMethod: 'QR',
          checkInLat: params.lat,
          checkInLng: params.lng,
        },
      })
    : await prisma.workerDailyAttendance.create({
        data: {
          businessId: worker.businessId,
          workerProfileId: worker.id,
          projectId,
          workDate,
          status: 'PRESENT',
          checkInMethod: 'QR',
          checkInLat: params.lat,
          checkInLng: params.lng,
        },
      });

  return {
    ok: true as const,
    message: existing ? 'Check-in updated' : 'Checked in successfully',
    workerName: worker.name,
    businessName: worker.business.name,
    attendance,
  };
}
