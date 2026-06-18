import crypto from 'crypto';
import { Request } from 'express';

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function verifyMetaWebhookSignature(req: Request, rawBody: Buffer | string): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET?.trim();
  if (!secret) return !isProduction();

  const signature = req.headers['x-hub-signature-256'] as string | undefined;
  if (!signature?.startsWith('sha256=')) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8'))
    .digest('hex');

  const received = signature.slice(7);
  try {
    return crypto.timingSafeEqual(Buffer.from(received, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

export function verifyWhapiWebhook(req: Request): boolean {
  const secret = process.env.WHAPI_WEBHOOK_SECRET?.trim();
  if (!secret) return !isProduction();

  const header = req.headers['x-whapi-secret'] || req.headers['authorization'];
  if (!header) return false;

  const token = String(header).replace(/^Bearer\s+/i, '');
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(secret));
  } catch {
    return token === secret;
  }
}
