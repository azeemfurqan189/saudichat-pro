export type WhatsAppProvider = 'meta' | 'whapi';

export function getWhatsAppProvider(settings: unknown): WhatsAppProvider {
  const env = process.env.WHATSAPP_PROVIDER?.trim().toLowerCase();
  if (env === 'whapi') return 'whapi';
  if (env === 'meta') return 'meta';

  const s = settings as { whatsappProvider?: string } | null;
  if (s?.whatsappProvider === 'whapi') return 'whapi';
  if (s?.whatsappProvider === 'meta') return 'meta';
  return 'meta';
}

export function isWhapiChannelId(id: string): boolean {
  const t = id.trim();
  if (!t) return false;
  if (/^\d{10,20}$/.test(t)) return false;
  return /^[A-Za-z0-9_-]{3,64}$/.test(t);
}

export function isMetaPhoneNumberId(id: string): boolean {
  return /^\d{10,20}$/.test(id.trim());
}
