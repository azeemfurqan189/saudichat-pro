import { Request, Response } from 'express';
import { recordWebhookEvent } from './webhookDebug';
import { verifyMetaWebhookSignature } from '../security/webhookVerify';
import { enqueueMessage, isQueueEnabled } from '../queue/queues';
import { processIncomingMessage } from '../agent/orchestrator';
import { isWhapiPayload } from './whapiMessageParser';
import { handleWhapiWebhook } from './whapiWebhook';

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

    // Whapi payload on wrong URL — ignore when using Whapi (prevents double replies)
    if (isWhapiPayload(body)) {
      const provider = process.env.WHATSAPP_PROVIDER?.trim().toLowerCase();
      if (provider === 'whapi') {
        console.warn(
          '[Webhook] Whapi payload on /webhook/whatsapp — ignored (use /webhook/whapi only). ' +
            'Remove /webhook/whatsapp from Whapi panel to stop duplicate deliveries.'
        );
        recordWebhookEvent({
          lastStatus: 'whapi_duplicate_url_ignored',
          lastError: 'Remove /webhook/whatsapp from Whapi panel — keep only /webhook/whapi',
        });
        res.sendStatus(200);
        return;
      }
      console.warn(
        '[Webhook] Whapi payload on /webhook/whatsapp — processing. Set Whapi panel URL to /webhook/whapi'
      );
      recordWebhookEvent({
        lastStatus: 'whapi_on_meta_url',
        lastError: 'Use /webhook/whapi in Whapi panel (not /webhook/whatsapp)',
      });
      await handleWhapiWebhook(req, res);
      return;
    }

    const rawBody = JSON.stringify(req.body);
    if (!verifyMetaWebhookSignature(req, rawBody)) {
      const { logWebhookEvent } = await import('../security/auditLog');
      await logWebhookEvent({ provider: 'meta', verified: false });
      recordWebhookEvent({ lastStatus: 'signature_invalid', lastError: 'Meta webhook signature verification failed' });
      res.sendStatus(403);
      return;
    }

    recordWebhookEvent({
      lastObject: body?.object ?? null,
      lastStatus: 'received',
    });

    if (body.object !== 'whatsapp_business_account') {
      recordWebhookEvent({
        lastStatus: 'ignored_wrong_object',
        lastError: `Expected whatsapp_business_account, got ${body?.object ?? 'empty'}`,
      });
      res.sendStatus(200);
      return;
    }

    res.sendStatus(200);

    let handled = false;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;
        const phoneNumberId = String(value.metadata?.phone_number_id ?? '').trim();
        const messages: WhatsAppMessage[] = value.messages || [];

        recordWebhookEvent({
          lastField: change.field ?? null,
          lastPhoneNumberId: phoneNumberId || null,
          lastMessageCount: messages.length,
        });

        if (change.field !== 'messages') continue;

        if (!phoneNumberId) {
          recordWebhookEvent({
            lastStatus: 'missing_phone_number_id',
            lastError: 'Webhook messages event had no phone_number_id',
          });
          continue;
        }

        if (messages.length === 0) {
          recordWebhookEvent({ lastStatus: 'messages_field_empty' });
          continue;
        }

        const { default: prisma } = await import('../utils/prisma');
        const business = await prisma.business.findFirst({
          where: { whatsappPhoneId: phoneNumberId },
        });

        if (!business) {
          recordWebhookEvent({
            lastBusinessMatched: false,
            lastStatus: 'no_business_for_phone_id',
            lastError: `Save Phone ID "${phoneNumberId}" in Dashboard → Settings → WhatsApp`,
          });
          continue;
        }

        recordWebhookEvent({ lastBusinessMatched: true, lastBusinessId: business.id });

        for (const message of messages) {
          if (message.type !== 'text') {
            recordWebhookEvent({ lastStatus: 'skipped_non_text', lastError: `Message type was ${message.type}` });
            continue;
          }

          recordWebhookEvent({ lastFrom: message.from ?? null, lastStatus: 'processing_text' });

          const jobData = {
            businessId: business.id,
            message,
            provider: 'meta' as const,
            enqueuedAt: new Date().toISOString(),
          };

          if (isQueueEnabled()) {
            await enqueueMessage(jobData);
            recordWebhookEvent({ lastStatus: 'queued', lastError: null });
          } else {
            await processIncomingMessage(business.id, message);
            recordWebhookEvent({ lastStatus: 'processed_ok', lastError: null });
          }
          handled = true;
        }
      }
    }

    if (!handled) {
      const { getWebhookDebugState } = await import('./webhookDebug');
      const s = getWebhookDebugState();
      if (s.lastStatus === 'received') {
        recordWebhookEvent({ lastStatus: 'no_handler_matched' });
      }
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    recordWebhookEvent({ lastStatus: 'error', lastError: msg });
    console.error('Webhook error:', error);
    if (!res.headersSent) res.sendStatus(500);
  }
}
