import prisma from '../utils/prisma';

export type ReminderNotifyRole = 'OWNER' | 'MANAGER' | 'OFFICE_STAFF';

export type ReminderNotifyConfig = {
  enabled: boolean;
  roles: ReminderNotifyRole[];
  memberIds: string[];
};

export const DEFAULT_REMINDER_NOTIFY: ReminderNotifyConfig = {
  enabled: false,
  roles: ['OWNER', 'MANAGER'],
  memberIds: [],
};

function normalizeConfig(raw: unknown): ReminderNotifyConfig {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_REMINDER_NOTIFY };
  const o = raw as Record<string, unknown>;
  const roles = Array.isArray(o.roles)
    ? (o.roles.filter((r) => r === 'OWNER' || r === 'MANAGER' || r === 'OFFICE_STAFF') as ReminderNotifyRole[])
    : DEFAULT_REMINDER_NOTIFY.roles;
  const memberIds = Array.isArray(o.memberIds)
    ? o.memberIds.filter((id): id is string => typeof id === 'string')
    : [];
  return {
    enabled: Boolean(o.enabled),
    roles: roles.length ? roles : DEFAULT_REMINDER_NOTIFY.roles,
    memberIds,
  };
}

async function readSettingsMap(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { settings: true },
  });
  const settings = (business?.settings as Record<string, unknown>) || {};
  const map = (settings.itemReminderNotify as Record<string, unknown>) || {};
  return { settings, map };
}

export async function getItemReminderNotify(
  businessId: string,
  itemKey: string
): Promise<ReminderNotifyConfig> {
  const { map } = await readSettingsMap(businessId);
  return normalizeConfig(map[itemKey]);
}

export async function saveItemReminderNotify(
  businessId: string,
  itemKey: string,
  config: ReminderNotifyConfig
) {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) throw new Error('Business not found');

  const settings = (business.settings as Record<string, unknown>) || {};
  const map = { ...((settings.itemReminderNotify as Record<string, unknown>) || {}) };
  map[itemKey] = normalizeConfig(config);
  settings.itemReminderNotify = map;

  await prisma.business.update({
    where: { id: businessId },
    data: { settings: settings as object },
  });

  return map[itemKey] as ReminderNotifyConfig;
}

export async function resolveReminderRecipients(
  businessId: string,
  config?: ReminderNotifyConfig | null
) {
  const cfg = config?.enabled ? normalizeConfig(config) : null;
  const roles = cfg?.roles?.length ? cfg.roles : (['OWNER', 'MANAGER'] as ReminderNotifyRole[]);

  const members = await prisma.businessMember.findMany({
    where: {
      businessId,
      isActive: true,
      OR: [
        { role: { in: roles } },
        ...(cfg?.memberIds?.length ? [{ id: { in: cfg.memberIds } }] : []),
      ],
    },
    include: { user: { select: { email: true, phone: true, name: true } } },
  });

  const byId = new Map(members.map((m) => [m.id, m]));
  const ordered = [
    ...members.filter((m) => cfg?.memberIds?.includes(m.id)),
    ...members.filter((m) => !cfg?.memberIds?.includes(m.id)),
  ];

  const emails = [...new Set(ordered.map((m) => m.user.email).filter(Boolean))] as string[];
  const phones = [...new Set(ordered.map((m) => m.user.phone).filter(Boolean))] as string[];

  return { emails, phones, members: [...byId.values()] };
}
