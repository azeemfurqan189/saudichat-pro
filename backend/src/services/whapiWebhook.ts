import { Request, Response } from 'express';
import { recordWebhookEvent } from './webhookDebug';
import { normalizeWhapiPhone } from './whapiClient';
import { verifyWhapiWebhook } from '../security/webhookVerify';
import { enqueueMessage, isQueueEnabled } from '../queue/queues';
import { processIncomingMessage } from '../agent/orchestrator';
import { sendWhatsAppText } from './whatsappSend';
import {
  describeWhapiMessage,
  extractWhapiChannelId,
  extractWhapiChannelIdFromHeaders,
  extractWhapiMessages,
  extractWhapiTextBody,
  isWhapiProcessableMessage,
  WhapiIncomingMessage,
} from './whapiMessageParser';
import { bilingualFallback, detectLanguage } from '../ai/language/detector';

const ENQUEUE_TIMEOUT_MS = 5000;
const PROCESS_TIMEOUT_MS = 45000;

function shouldQueueWhapiMessages(): boolean {
  return isQueueEnabled() && process.env.WHAPI_USE_QUEUE === 'true';
}

async function enqueueMessageWithTimeout(
  data: Parameters<typeof enqueueMessage>[0],
  timeoutMs = ENQUEUE_TIMEOUT_MS
): Promise<void> {
  await Promise.race([
    enqueueMessage(data),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Redis enqueue timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

async function processWhapiMessage(businessId: string, message: WhapiIncomingMessage, phone: string, textBody: string): Promise<void> {
  const normalizedMessage = {
    from: phone,
    id: message.id || `whapi-${Date.now()}`,
    timestamp: String(Date.now()),
    type: 'text',
    text: { body: textBody },
  };

  if (shouldQueueWhapiMessages()) {
    try {
      await enqueueMessageWithTimeout({
        businessId,
        message: normalizedMessage,
        provider: 'whapi',
        enqueuedAt: new Date().toISOString(),
      });
      recordWebhookEvent({ lastStatus: 'queued', lastError: null });
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Queue enqueue failed';
      console.error('[Whapi] Queue failed, processing sync:', msg);
      recordWebhookEvent({ lastError: `queue_fallback: ${msg}` });
    }
  }

  recordWebhookEvent({ lastStatus: 'orchestrator_start' });
  await processIncomingMessageWithTimeout(businessId, normalizedMessage);
  recordWebhookEvent({ lastStatus: 'processed_ok', lastError: null });
}

async function processIncomingMessageWithTimeout(
  businessId: string,
  message: Parameters<typeof processIncomingMessage>[1]
): Promise<void> {
  await Promise.race([
    processIncomingMessage(businessId, message),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Processing timeout after ${PROCESS_TIMEOUT_MS}ms`)), PROCESS_TIMEOUT_MS)
    ),
  ]);
}

async function resolveWhapiBusiness(channelId: string, hasMessages: boolean) {
  const { default: prisma } = await import('../utils/prisma');

  if (channelId) {
    return prisma.business.findFirst({ where: { whatsappPhoneId: channelId } });
  }

  if (!hasMessages) return null;

  const rows = await prisma.business.findMany({
    where: { whatsappPhoneId: { not: null }, whatsappToken: { not: null } },
  });
  const channelIds = [...new Set(rows.map((r) => r.whatsappPhoneId).filter(Boolean))];
  if (channelIds.length === 1) {
    return rows.find((r) => r.whatsappPhoneId === channelIds[0]) ?? null;
  }

  return null;
}

export async function handleWhapiWebhook(req: Request, res: Response): Promise<void> {
  try {
    if (!verifyWhapiWebhook(req)) {
      const { logWebhookEvent } = await import('../security/auditLog');
      await logWebhookEvent({ provider: 'whapi', verified: false });
      recordWebhookEvent({ lastStatus: 'signature_invalid', lastError: 'Whapi webhook secret verification failed' });
      res.sendStatus(403);
      return;
    }

    const body = req.body;
    const eventType =
      body && typeof body === 'object' && body.event && typeof body.event === 'object'
        ? String((body.event as { type?: string }).type ?? 'messages')
        : 'messages';

    recordWebhookEvent({
      lastObject: 'whapi',
      lastStatus: 'received',
      lastField: eventType,
    });

    const channelId =
      extractWhapiChannelId(body) || extractWhapiChannelIdFromHeaders(req.headers as Record<string, unknown>);
    const messages = extractWhapiMessages(body);

    recordWebhookEvent({
      lastPhoneNumberId: channelId || null,
      lastMessageCount: messages.length,
    });

    if (messages.length === 0) {
      recordWebhookEvent({
        lastStatus: 'ignored_non_message_event',
        lastError: channelId ? null : 'Delivery/status ping — no reply needed',
      });
      res.sendStatus(200);
      return;
    }

    if (!channelId) {
      const fallbackBusiness = await resolveWhapiBusiness('', true);
      if (!fallbackBusiness?.whatsappPhoneId) {
        recordWebhookEvent({
          lastStatus: 'missing_channel_id',
          lastError: 'No channel_id in payload — save Channel ID in Dashboard',
        });
        res.sendStatus(200);
        return;
      }
      recordWebhookEvent({
        lastPhoneNumberId: fallbackBusiness.whatsappPhoneId,
        lastError: 'channel_id missing — used single configured business fallback',
      });
    }

    const business = await resolveWhapiBusiness(channelId || extractWhapiChannelId(body), true);

    if (!business) {
      recordWebhookEvent({
        lastBusinessMatched: false,
        lastStatus: 'no_business_for_phone_id',
        lastError: `Save Channel ID "${channelId}" in Dashboard → Settings`,
      });
      res.sendStatus(200);
      return;
    }

    recordWebhookEvent({ lastBusinessMatched: true, lastBusinessId: business.id });

    for (const message of messages) {
      if (message.from_me) continue;

      const phone = normalizeWhapiPhone(message.from ?? '', message.chat_id);
      const textBody = extractWhapiTextBody(message);

      if (!isWhapiProcessableMessage(message) || !textBody) {
        recordWebhookEvent({
          lastStatus: 'skipped_non_text',
          lastError: `Not processable: ${describeWhapiMessage(message)}`,
        });
        console.log(`[Whapi] Skipped: ${describeWhapiMessage(message)}`);
        continue;
      }

      if (!phone) {
        recordWebhookEvent({
          lastStatus: 'missing_phone',
          lastError: `No phone in message: ${describeWhapiMessage(message)}`,
        });
        continue;
      }

      recordWebhookEvent({ lastFrom: phone, lastStatus: 'processing_text', lastError: null });
      console.log(`[Whapi] Incoming from ${phone}: ${textBody.slice(0, 80)}`);

      try {
        await processWhapiMessage(business.id, message, phone, textBody);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Processing failed';
        recordWebhookEvent({ lastStatus: 'error', lastError: msg });
        console.error('[Whapi] process error:', err);
        try {
          await sendWhatsAppText(business.id, phone, bilingualFallback(detectLanguage(textBody)));
          recordWebhookEvent({ lastStatus: 'processed_ok', lastError: `fallback_after_error: ${msg}` });
        } catch (sendErr) {
          console.error('[Whapi] fallback send failed:', sendErr);
        }
      }
    }

    if (!res.headersSent) res.sendStatus(200);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    recordWebhookEvent({ lastStatus: 'error', lastError: msg });
    console.error('[Whapi] Webhook error:', error);
    if (!res.headersSent) res.sendStatus(500);
  }
}
