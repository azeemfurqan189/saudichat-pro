import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  getItemReminderNotify,
  saveItemReminderNotify,
  ReminderNotifyConfig,
} from '../services/reminderNotifyService';

export async function getReminderNotify(req: AuthRequest, res: Response) {
  const { businessId, itemKey } = req.params;
  const data = await getItemReminderNotify(businessId, decodeURIComponent(itemKey));
  res.json({ success: true, data });
}

export async function putReminderNotify(req: AuthRequest, res: Response) {
  const { businessId, itemKey } = req.params;
  const body = req.body as ReminderNotifyConfig;
  const data = await saveItemReminderNotify(businessId, decodeURIComponent(itemKey), body);
  res.json({ success: true, data });
}
