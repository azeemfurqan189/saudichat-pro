import { Response } from 'express';
import fs from 'fs';
import multer from 'multer';
import { AuthRequest } from '../middleware/auth';
import {
  getOwnerBriefing,
  getCompanyReminders,
  upsertCompanyReminder,
  deleteCompanyReminder,
} from '../services/executiveBriefingService';
import { askCompanyAnything } from '../services/companyAskService';
import { generateManpowerCeoPdf } from '../services/manpowerReportService';
import {
  buildTimesheetImportTemplate,
  importTimesheetsFromWorkbook,
} from '../services/manpowerImportService';
import { ensureWorkerQrToken, processQrCheckIn, resolveWorkerByToken } from '../services/qrAttendanceService';
import prisma from '../utils/prisma';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

export const timesheetUploadMiddleware = upload.single('file');

export async function getCommandCenter(req: AuthRequest, res: Response): Promise<void> {
  const data = await getOwnerBriefing(req.params.businessId);
  res.json({ success: true, data });
}

export async function askCompany(req: AuthRequest, res: Response): Promise<void> {
  const question = String(req.body?.question || req.query.q || '').trim();
  if (!question) {
    res.status(400).json({ success: false, message: 'question required' });
    return;
  }
  const data = await askCompanyAnything(req.params.businessId, question);
  res.json({ success: true, data });
}

export async function listCompanyReminders(req: AuthRequest, res: Response): Promise<void> {
  const data = await getCompanyReminders(req.params.businessId);
  res.json({ success: true, data });
}

export async function saveCompanyReminder(req: AuthRequest, res: Response): Promise<void> {
  const data = await upsertCompanyReminder(req.params.businessId, req.body as Record<string, unknown>);
  res.json({ success: true, data });
}

export async function removeCompanyReminder(req: AuthRequest, res: Response): Promise<void> {
  await deleteCompanyReminder(req.params.businessId, req.params.reminderId);
  res.json({ success: true });
}

export async function downloadManpowerCeoReport(req: AuthRequest, res: Response): Promise<void> {
  const days = Number(req.query.days) || 7;
  const filePath = await generateManpowerCeoPdf(req.params.businessId, days);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="manpower-ceo-report.pdf"`);
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
  stream.on('end', () => fs.unlink(filePath, () => undefined));
}

export async function downloadTimesheetImportTemplate(req: AuthRequest, res: Response): Promise<void> {
  const buffer = await buildTimesheetImportTemplate(req.params.businessId);
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', 'attachment; filename="timesheet-import-template.xlsx"');
  res.send(buffer);
}

export async function uploadTimesheetImport(req: AuthRequest, res: Response): Promise<void> {
  const file = req.file;
  if (!file) {
    res.status(400).json({ success: false, message: 'Excel file required (field: file)' });
    return;
  }
  const result = await importTimesheetsFromWorkbook(
    req.params.businessId,
    file.buffer,
    req.membership?.memberId
  );
  res.json({ success: true, data: result });
}

export async function getWorkerQrCode(req: AuthRequest, res: Response): Promise<void> {
  const workerId = req.params.workerId;
  const businessId = req.params.businessId;
  const exists = await prisma.workerProfile.findFirst({
    where: { id: workerId, businessId },
    select: { id: true },
  });
  if (!exists) {
    res.status(404).json({ success: false, message: 'Worker not found' });
    return;
  }
  const token = await ensureWorkerQrToken(workerId);
  const frontend = process.env.FRONTEND_URL || 'https://saudichat-pro.vercel.app';
  const checkInUrl = `${frontend}/check-in/${token}`;
  res.json({
    success: true,
    data: {
      token,
      checkInUrl,
      qrImageUrl: `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(checkInUrl)}`,
    },
  });
}

export async function publicCheckInInfo(req: AuthRequest, res: Response): Promise<void> {
  const token = req.params.token;
  const worker = await resolveWorkerByToken(token);
  if (!worker) {
    res.status(404).json({ success: false, message: 'Invalid check-in code' });
    return;
  }
  res.json({
    success: true,
    data: {
      workerName: worker.name,
      businessName: worker.business.name,
      projects: worker.placements
        .filter((p) => p.project)
        .map((p) => ({
          id: p.projectId,
          name: p.project?.name,
          clientName: p.clientCompany?.name,
        })),
    },
  });
}

export async function publicCheckInSubmit(req: AuthRequest, res: Response): Promise<void> {
  const token = String(req.body?.token || req.params.token || '');
  const projectId = req.body?.projectId ? String(req.body.projectId) : undefined;
  const lat = req.body?.lat != null ? Number(req.body.lat) : undefined;
  const lng = req.body?.lng != null ? Number(req.body.lng) : undefined;

  const result = await processQrCheckIn({ token, projectId, lat, lng });
  if (!result.ok) {
    res.status(400).json({ success: false, message: result.message });
    return;
  }
  res.json({ success: true, data: result });
}
