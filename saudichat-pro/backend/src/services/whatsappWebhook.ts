import { Request, Response } from 'express';
import { routeMessage } from '../../../whatsapp-bot/flows/router';

interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
}

export async function handleWhatsAppWebhook(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body;

    if (body.object !== 'whatsapp_business_account') {
      res.sendStatus(404);
      return;
    }

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue;

        const value = change.value;
        const phoneNumberId = value.metadata?.phone_number_id;
        const messages: WhatsAppMessage[] = value.messages || [];

        const { default: prisma } = await import('../utils/prisma');
        const business = await prisma.business.findFirst({
          where: { whatsappPhoneId: phoneNumberId },
        });

        if (!business) continue;

        for (const message of messages) {
          await routeMessage(business.id, message);
        }
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(500);
  }
}
