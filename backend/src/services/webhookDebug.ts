export interface WebhookDebugState {
  lastEventAt: string | null;
  lastObject: string | null;
  lastField: string | null;
  lastPhoneNumberId: string | null;
  lastMessageCount: number;
  lastFrom: string | null;
  lastBusinessMatched: boolean;
  lastBusinessId: string | null;
  lastError: string | null;
  lastStatus: string;
  totalEvents: number;
  lastSendTo: string | null;
  lastSendStatus: string | null;
  lastSendError: string | null;
}

const state: WebhookDebugState = {
  lastEventAt: null,
  lastObject: null,
  lastField: null,
  lastPhoneNumberId: null,
  lastMessageCount: 0,
  lastFrom: null,
  lastBusinessMatched: false,
  lastBusinessId: null,
  lastError: null,
  lastStatus: 'none',
  totalEvents: 0,
  lastSendTo: null,
  lastSendStatus: null,
  lastSendError: null,
};

export function recordWhatsAppSendResult(to: string, ok: boolean, detail: string): void {
  state.lastSendTo = to;
  state.lastSendStatus = ok ? 'sent_ok' : 'send_failed';
  state.lastSendError = ok ? null : detail;
}

export function recordWebhookEvent(partial: Partial<WebhookDebugState>): void {
  state.lastEventAt = new Date().toISOString();
  state.totalEvents += 1;
  Object.assign(state, partial);
}

export function getWebhookDebugState(): WebhookDebugState {
  return { ...state };
}
