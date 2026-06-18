const WHAPI_BASE = 'https://gate.whapi.cloud';

export function normalizeWhapiPhone(from: string, chatId?: string): string {
  const raw = (from || chatId || '').trim();
  if (!raw) return '';
  if (raw.includes('@')) return raw.split('@')[0].replace(/\D/g, '');
  return raw.replace(/\D/g, '');
}

function normalizeTo(to: string): string | null {
  const digits = to.replace(/\D/g, '');
  return digits || null;
}

async function whapiPost(
  token: string,
  path: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; detail: string }> {
  const to = body.to as string | undefined;
  const digits = to ? normalizeTo(to) : '0';
  if (!digits || digits === '0') {
    return { ok: false, detail: 'Invalid recipient phone' };
  }

  try {
    const res = await fetch(`${WHAPI_BASE}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ ...body, to: digits }),
      signal: AbortSignal.timeout(15000),
    });

    const text = await res.text();
    if (!res.ok) {
      return { ok: false, detail: `${res.status}: ${text.slice(0, 500)}` };
    }
    return { ok: true, detail: 'Message accepted by Whapi API' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return { ok: false, detail: msg };
  }
}

export async function sendWhapiText(
  token: string,
  to: string,
  body: string
): Promise<{ ok: boolean; detail: string }> {
  return whapiPost(token, '/messages/text', { to, body });
}

export async function sendWhapiImage(
  token: string,
  to: string,
  imageUrl: string,
  caption?: string
): Promise<{ ok: boolean; detail: string }> {
  return whapiPost(token, '/messages/image', {
    to,
    media: imageUrl,
    caption: caption || '',
  });
}

export interface WhapiButton {
  id: string;
  title: string;
}

export async function sendWhapiButtons(
  token: string,
  to: string,
  bodyText: string,
  buttons: WhapiButton[]
): Promise<{ ok: boolean; detail: string }> {
  const limited = buttons.slice(0, 3);
  return whapiPost(token, '/messages/interactive', {
    to,
    type: 'button',
    body: { text: bodyText.slice(0, 1024) },
    action: {
      buttons: limited.map((b) => ({
        type: 'quick_reply',
        title: b.title.slice(0, 20),
        id: b.id.slice(0, 256),
      })),
    },
  });
}

export interface WhapiListRow {
  id: string;
  title: string;
  description?: string;
}

export interface WhapiListSection {
  title: string;
  rows: WhapiListRow[];
}

export async function sendWhapiList(
  token: string,
  to: string,
  bodyText: string,
  buttonLabel: string,
  sections: WhapiListSection[]
): Promise<{ ok: boolean; detail: string }> {
  return whapiPost(token, '/messages/interactive', {
    to,
    type: 'list',
    body: { text: bodyText.slice(0, 1024) },
    action: {
      list: {
        label: buttonLabel.slice(0, 20),
        sections: sections.map((s) => ({
          title: s.title.slice(0, 24),
          rows: s.rows.slice(0, 10).map((r) => ({
            id: r.id.slice(0, 200),
            title: r.title.slice(0, 24),
            description: (r.description || '').slice(0, 72),
          })),
        })),
      },
    },
  });
}

export async function sendWhapiDocument(
  token: string,
  to: string,
  documentUrl: string,
  filename: string,
  caption?: string
): Promise<{ ok: boolean; detail: string }> {
  return whapiPost(token, '/messages/document', {
    to,
    media: documentUrl,
    filename: filename.slice(0, 128),
    caption: caption || '',
  });
}

export async function testWhapiConnection(
  token: string
): Promise<{ ok: boolean; message: string; channelId?: string; status?: string }> {
  try {
    const res = await fetch(`${WHAPI_BASE}/health?wakeup=true`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    const body = (await res.json()) as {
      error?: { message?: string };
      status?: { text?: string; code?: number };
      channel_id?: string;
    };

    if (!res.ok) {
      return {
        ok: false,
        message: body.error?.message || `Whapi API error (${res.status})`,
      };
    }

    const statusText = body.status?.text ?? 'unknown';
    if (statusText !== 'AUTH') {
      return {
        ok: false,
        message: `Channel not connected (status: ${statusText}). Open Whapi panel and scan QR / link WhatsApp.`,
        channelId: body.channel_id,
        status: statusText,
      };
    }

    return {
      ok: true,
      message: 'Whapi connected — channel is authorized',
      channelId: body.channel_id,
      status: statusText,
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Failed to reach Whapi API',
    };
  }
}
