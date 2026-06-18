import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import {
  previewWebsiteImport,
  applyWebsiteImport,
  syncWebsiteForBusiness,
  WebsitePreviewItem,
} from '../services/websiteImportService';

async function assertBusinessAccess(req: AuthRequest): Promise<boolean> {
  const business = await prisma.business.findFirst({
    where: { id: req.params.businessId, userId: req.user!.userId },
    select: { id: true },
  });
  return !!business;
}

export async function previewWebsite(req: AuthRequest, res: Response): Promise<void> {
  if (!(await assertBusinessAccess(req))) {
    res.status(404).json({ success: false, message: 'Business not found' });
    return;
  }

  const url = String(req.body?.url || '').trim();
  if (!url) {
    res.status(400).json({ success: false, message: 'URL is required' });
    return;
  }

  try {
    const preview = await previewWebsiteImport(req.params.businessId, url);
    res.json({ success: true, data: preview });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : 'Import preview failed',
    });
  }
}

export async function importWebsite(req: AuthRequest, res: Response): Promise<void> {
  if (!(await assertBusinessAccess(req))) {
    res.status(404).json({ success: false, message: 'Business not found' });
    return;
  }

  const url = String(req.body?.url || '').trim();
  if (!url) {
    res.status(400).json({ success: false, message: 'URL is required' });
    return;
  }

  const applyProfile = req.body?.applyProfile !== false;
  const applyCatalog = req.body?.applyCatalog !== false;
  const items = Array.isArray(req.body?.items) ? (req.body.items as WebsitePreviewItem[]) : undefined;

  try {
    const result = await applyWebsiteImport(req.params.businessId, url, {
      applyProfile,
      applyCatalog,
      items,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : 'Import failed',
    });
  }
}

export async function syncWebsite(req: AuthRequest, res: Response): Promise<void> {
  if (!(await assertBusinessAccess(req))) {
    res.status(404).json({ success: false, message: 'Business not found' });
    return;
  }

  try {
    const result = await syncWebsiteForBusiness(req.params.businessId);
    if (!result) {
      res.status(400).json({
        success: false,
        message: 'Website sync not enabled or URL missing in settings',
      });
      return;
    }
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : 'Sync failed',
    });
  }
}

export async function getWebsiteImportStatus(req: AuthRequest, res: Response): Promise<void> {
  const business = await prisma.business.findFirst({
    where: { id: req.params.businessId, userId: req.user!.userId },
    select: { settings: true },
  });
  if (!business) {
    res.status(404).json({ success: false, message: 'Business not found' });
    return;
  }

  const settings = (business.settings as Record<string, unknown>) || {};
  res.json({
    success: true,
    data: {
      websiteUrl: String(settings.websiteUrl || ''),
      websiteImportEnabled: settings.websiteImportEnabled === true,
      websiteLastSyncAt: settings.websiteLastSyncAt || null,
      websiteSyncIntervalHours: Number(settings.websiteSyncIntervalHours) || 24,
    },
  });
}
