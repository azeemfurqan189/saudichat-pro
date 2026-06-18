import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  getNotificationCenterSummary,
  sendTestNotification,
  seedNotificationCenterDemo,
  toggleNotificationChannel,
  updateNotificationCenterConfig,
  NOTIFICATION_CHANNELS,
} from '../services/notificationCenterService';

export async function getNotificationCenter(req: AuthRequest, res: Response) {
  const data = await getNotificationCenterSummary(req.params.businessId);
  res.json({ success: true, data });
}

export async function patchNotificationCenterConfig(req: AuthRequest, res: Response) {
  const data = await updateNotificationCenterConfig(req.params.businessId, req.body ?? {});
  res.json({ success: true, data });
}

export async function patchNotificationChannel(req: AuthRequest, res: Response) {
  const { isEnabled } = req.body ?? {};
  if (typeof isEnabled !== 'boolean') {
    res.status(400).json({ success: false, message: 'isEnabled boolean required' });
    return;
  }
  const channel = req.params.channel?.toUpperCase();
  if (!NOTIFICATION_CHANNELS.includes(channel as (typeof NOTIFICATION_CHANNELS)[number])) {
    res.status(400).json({ success: false, message: 'Invalid channel' });
    return;
  }
  const data = await toggleNotificationChannel(req.params.businessId, channel, isEnabled);
  res.json({ success: true, data });
}

export async function postNotificationTest(req: AuthRequest, res: Response) {
  const { channel, recipient } = req.body ?? {};
  if (!channel || !recipient) {
    res.status(400).json({ success: false, message: 'channel and recipient required' });
    return;
  }
  const ch = String(channel).toUpperCase();
  if (!NOTIFICATION_CHANNELS.includes(ch as (typeof NOTIFICATION_CHANNELS)[number])) {
    res.status(400).json({ success: false, message: 'Invalid channel' });
    return;
  }
  try {
    const data = await sendTestNotification(
      req.params.businessId,
      ch as (typeof NOTIFICATION_CHANNELS)[number],
      String(recipient)
    );
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : 'Send failed',
    });
  }
}

export async function seedNotificationCenter(req: AuthRequest, res: Response) {
  const data = await seedNotificationCenterDemo(req.params.businessId);
  res.json({ success: true, data });
}
