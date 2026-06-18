/**
 * Normalize Whapi webhook message payloads — types vary (text, link_preview, reply, etc.)
 */

export interface WhapiIncomingMessage {
  id: string;
  from_me?: boolean;
  type: string;
  chat_id?: string;
  from?: string;
  text?: { body?: string };
  link_preview?: { body?: string };
  reply?: {
    type?: string;
    text?: string;
    body?: string;
    buttons_reply?: { id?: string; title?: string };
    list_reply?: { id?: string; title?: string; description?: string };
  };
  button?: { text?: string; payload?: string; id?: string };
  interactive?: {
    body?: string;
    title?: string;
    list_reply?: { id?: string; title?: string; description?: string };
    button_reply?: { id?: string; title?: string };
  };
  body?: string;
}

const TEXT_LIKE_TYPES = new Set([
  'text',
  'link_preview',
  'reply',
  'button',
  'interactive',
  'chat',
  'hsm',
  'unknown',
]);

export function isWhapiPayload(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  if (b.object === 'whatsapp_business_account') return false;
  const channelId = extractWhapiChannelId(body);
  if (!channelId) return false;
  const messages = extractWhapiMessages(body);
  if (messages.length > 0) return true;
  const event = b.event as { type?: string } | undefined;
  return event?.type === 'messages' || Array.isArray(b.messages);
}

export function extractWhapiMessages(body: unknown): WhapiIncomingMessage[] {
  if (!body || typeof body !== 'object') return [];

  const b = body as Record<string, unknown>;

  if (Array.isArray(b.messages)) {
    return b.messages as WhapiIncomingMessage[];
  }

  if (b.messages && typeof b.messages === 'object' && !Array.isArray(b.messages)) {
    return [b.messages as WhapiIncomingMessage];
  }

  if (b.message && typeof b.message === 'object') {
    return [b.message as WhapiIncomingMessage];
  }

  return [];
}

export function extractWhapiChannelId(body: unknown): string {
  if (!body || typeof body !== 'object') return '';
  const b = body as Record<string, unknown>;
  const event = b.event as Record<string, unknown> | undefined;
  const nested =
    b.channel_id ??
    b.channelId ??
    event?.channel_id ??
    event?.channelId ??
    (b.data as Record<string, unknown> | undefined)?.channel_id;
  return String(nested ?? '').trim();
}

export function extractWhapiChannelIdFromHeaders(headers: Record<string, unknown>): string {
  for (const key of ['x-channel-id', 'channel-id', 'whatsapp-channel-id', 'x-whapi-channel-id']) {
    const value = headers[key];
    if (value) return String(value).trim();
  }
  return '';
}

export function extractWhapiTextBody(message: WhapiIncomingMessage): string | null {
  const fromText = message.text?.body?.trim();
  if (fromText) return fromText;

  const fromLink = message.link_preview?.body?.trim();
  if (fromLink) return fromLink;

  const fromReply = message.reply?.text?.trim() || message.reply?.body?.trim();
  if (fromReply) return fromReply;

  const btnReply = message.reply?.buttons_reply?.id?.trim() || message.reply?.buttons_reply?.title?.trim();
  if (btnReply) return btnReply;

  const listFromReply = message.reply?.list_reply?.id?.trim() || message.reply?.list_reply?.title?.trim();
  if (listFromReply) return listFromReply;

  const fromButton = message.button?.payload?.trim() || message.button?.id?.trim() || message.button?.text?.trim();
  if (fromButton) return fromButton;

  const fromList = message.interactive?.list_reply?.id?.trim();
  if (fromList) return fromList;

  const fromBtnReply = message.interactive?.button_reply?.id?.trim();
  if (fromBtnReply) return fromBtnReply;

  const fromInteractive = message.interactive?.body?.trim() || message.interactive?.title?.trim();
  if (fromInteractive) return fromInteractive;

  if (typeof message.body === 'string' && message.body.trim()) {
    return message.body.trim();
  }

  return null;
}

export function isWhapiProcessableMessage(message: WhapiIncomingMessage): boolean {
  if (message.from_me) return false;

  const type = (message.type || '').toLowerCase();
  if (['image', 'video', 'audio', 'voice', 'document', 'sticker', 'location', 'contact', 'call', 'system'].includes(type)) {
    return false;
  }

  if (TEXT_LIKE_TYPES.has(type) || type === '') {
    return extractWhapiTextBody(message) !== null;
  }

  // Accept any type if we can extract text
  return extractWhapiTextBody(message) !== null;
}

export function describeWhapiMessage(message: WhapiIncomingMessage): string {
  return `type=${message.type || 'unknown'} id=${message.id?.slice(0, 12) || '?'} chat=${message.chat_id || '?'}`;
}
