import prisma from '../utils/prisma';
import { recordWhatsAppSendResult } from './webhookDebug';
import { getWhatsAppProvider } from './whatsappProvider';
import {
  sendWhapiText,
  sendWhapiImage,
  sendWhapiButtons,
  sendWhapiList,
  sendWhapiDocument,
  WhapiButton,
  WhapiListSection,
} from './whapiClient';
import { isQueueEnabled } from '../queue/queues';

export type WhatsAppOutbound =
  | { type: 'text'; body: string }
  | { type: 'image'; imageUrl: string; caption?: string }
  | { type: 'document'; documentUrl: string; filename: string; caption?: string }
  | { type: 'buttons'; body: string; buttons: WhapiButton[] }
  | { type: 'list'; body: string; buttonLabel: string; sections: WhapiListSection[] };

async function getBusinessCredentials(businessId: string) {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business?.whatsappToken) return null;
  return {
    business,
    provider: getWhatsAppProvider(business.settings),
    token: business.whatsappToken,
    phoneId: business.whatsappPhoneId,
  };
}

/** Direct send — used by send worker after dequeue */
export async function sendWhatsAppMessageDirect(
  businessId: string,
  customerPhone: string,
  message: WhatsAppOutbound
): Promise<{ ok: boolean; detail: string }> {
  const creds = await getBusinessCredentials(businessId);
  if (!creds) {
    const msg = `Missing API token on business ${businessId}`;
    recordWhatsAppSendResult(customerPhone, false, msg);
    console.error(`[WhatsApp] Cannot send — ${msg}`);
    return { ok: false, detail: msg };
  }

  const { provider, token, phoneId, business } = creds;

  if (provider === 'whapi') {
    let result: { ok: boolean; detail: string };

    switch (message.type) {
      case 'image':
        result = await sendWhapiImage(token, customerPhone, message.imageUrl, message.caption);
        break;
      case 'document':
        result = await sendWhapiDocument(
          token,
          customerPhone,
          message.documentUrl,
          message.filename,
          message.caption
        );
        break;
      case 'buttons':
        result = await sendWhapiButtons(token, customerPhone, message.body, message.buttons);
        if (!result.ok) {
          const fallback = `${message.body}\n\n${message.buttons.map((b, i) => `${i + 1}. ${b.title}`).join('\n')}`;
          result = await sendWhapiText(token, customerPhone, fallback);
        }
        break;
      case 'list':
        result = await sendWhapiList(token, customerPhone, message.body, message.buttonLabel, message.sections);
        {
          const lines = message.sections.flatMap((s) =>
            s.rows.map((r) => `• ${r.title}${r.description ? ` — ${r.description}` : ''}`)
          );
          const textBackup = `${message.body}\n\n${lines.join('\n')}`;
          if (!result.ok) {
            result = await sendWhapiText(token, customerPhone, textBackup);
          }
        }
        break;
      default:
        result = await sendWhapiText(token, customerPhone, message.body);
    }

    recordWhatsAppSendResult(customerPhone, result.ok, result.detail);
    if (!result.ok) console.error(`[Whapi] Send failed:`, result.detail);
    return result;
  }

  if (!phoneId) {
    const msg = `Missing Meta Phone number ID on business ${businessId}`;
    recordWhatsAppSendResult(customerPhone, false, msg);
    return { ok: false, detail: msg };
  }

  try {
    const apiVersion = process.env.WHATSAPP_API_VERSION || 'v25.0';
    const digits = customerPhone.replace(/\D/g, '');

    let payload: Record<string, unknown>;

    if (message.type === 'buttons' && message.buttons.length > 0) {
      payload = {
        messaging_product: 'whatsapp',
        to: digits,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: message.body.slice(0, 1024) },
          action: {
            buttons: message.buttons.slice(0, 3).map((b) => ({
              type: 'reply',
              reply: { id: b.id, title: b.title.slice(0, 20) },
            })),
          },
        },
      };
    } else if (message.type === 'list' && message.sections.length > 0) {
      payload = {
        messaging_product: 'whatsapp',
        to: digits,
        type: 'interactive',
        interactive: {
          type: 'list',
          body: { text: message.body.slice(0, 1024) },
          action: {
            button: message.buttonLabel.slice(0, 20),
            sections: message.sections.map((s) => ({
              title: s.title.slice(0, 24),
              rows: s.rows.slice(0, 10).map((r) => ({
                id: r.id.slice(0, 200),
                title: r.title.slice(0, 24),
                description: (r.description || '').slice(0, 72),
              })),
            })),
          },
        },
      };
    } else if (message.type === 'image') {
      payload = {
        messaging_product: 'whatsapp',
        to: digits,
        type: 'image',
        image: { link: message.imageUrl, caption: message.caption || '' },
      };
    } else if (message.type === 'document') {
      payload = {
        messaging_product: 'whatsapp',
        to: digits,
        type: 'document',
        document: {
          link: message.documentUrl,
          filename: message.filename,
          caption: message.caption || '',
        },
      };
    } else {
      payload = {
        messaging_product: 'whatsapp',
        to: digits,
        type: 'text',
        text: { body: message.type === 'text' ? message.body : '' },
      };
    }

    const res = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errBody = await res.text();
      recordWhatsAppSendResult(customerPhone, false, `${res.status}: ${errBody.slice(0, 500)}`);
      return { ok: false, detail: errBody };
    }

    recordWhatsAppSendResult(customerPhone, true, 'Message accepted by Meta API');
    return { ok: true, detail: 'ok' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error';
    recordWhatsAppSendResult(customerPhone, false, msg);
    return { ok: false, detail: msg };
  }
}

export async function sendWhatsAppMessage(
  businessId: string,
  customerPhone: string,
  message: WhatsAppOutbound
): Promise<{ ok: boolean; detail: string }> {
  if (isQueueEnabled() && process.env.USE_SEND_QUEUE !== 'false') {
    const { enqueueWhatsAppSend } = await import('../queue/sendWorker');
    const queued = await enqueueWhatsAppSend(businessId, customerPhone, message);
    if (queued) return { ok: true, detail: 'queued' };
  }
  return sendWhatsAppMessageDirect(businessId, customerPhone, message);
}

export async function sendWhatsAppText(
  businessId: string,
  customerPhone: string,
  content: string
): Promise<void> {
  await sendWhatsAppMessage(businessId, customerPhone, { type: 'text', body: content });
}
