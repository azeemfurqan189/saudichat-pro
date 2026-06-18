export type ReminderNotifyRole = "OWNER" | "MANAGER" | "OFFICE_STAFF";

export type ReminderNotifyConfig = {
  enabled: boolean;
  roles: ReminderNotifyRole[];
  memberIds: string[];
};

export const DEFAULT_REMINDER_NOTIFY: ReminderNotifyConfig = {
  enabled: false,
  roles: ["OWNER", "MANAGER"],
  memberIds: [],
};

export const REMINDER_ROLE_OPTIONS: Array<{
  value: ReminderNotifyRole;
  labelEn: string;
  labelAr: string;
}> = [
  { value: "OWNER", labelEn: "Boss / Owner", labelAr: "المالك / Boss" },
  { value: "MANAGER", labelEn: "Manager", labelAr: "مدير / Manager" },
  { value: "OFFICE_STAFF", labelEn: "Admin / Office", labelAr: "مكتب / Admin" },
];

export function reminderItemKey(type: string, id: string) {
  return `${type}:${id}`;
}
