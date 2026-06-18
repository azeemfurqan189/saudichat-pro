export type ProjectPermissionDef = {
  key: string;
  group: 'project' | 'workers' | 'timesheets' | 'analytics';
  labelEn: string;
  labelAr: string;
};

export const PROJECT_PERMISSION_CATALOG: ProjectPermissionDef[] = [
  { key: 'project.view', group: 'project', labelEn: 'View Project', labelAr: 'عرض المشروع' },
  { key: 'project.edit', group: 'project', labelEn: 'Edit Project', labelAr: 'تعديل المشروع' },
  { key: 'workers.view', group: 'workers', labelEn: 'View Workers', labelAr: 'عرض العمال' },
  { key: 'workers.add', group: 'workers', labelEn: 'Add Workers', labelAr: 'إضافة عمال' },
  { key: 'workers.attendance', group: 'workers', labelEn: 'Mark Attendance', labelAr: 'تسجيل الحضور' },
  { key: 'workers.timesheet', group: 'workers', labelEn: 'Daily Timesheets', labelAr: 'سجل اليوم' },
  { key: 'workers.export', group: 'workers', labelEn: 'Export Excel', labelAr: 'تصدير Excel' },
  { key: 'timesheets.view', group: 'timesheets', labelEn: 'View Timesheets', labelAr: 'عرض الساعات' },
  { key: 'timesheets.approve', group: 'timesheets', labelEn: 'Approve Timesheets', labelAr: 'اعتماد الساعات' },
  { key: 'analytics.view', group: 'analytics', labelEn: 'View Analytics', labelAr: 'عرض التحليلات' },
];

export const ALL_PROJECT_PERMISSION_KEYS = PROJECT_PERMISSION_CATALOG.map((p) => p.key);

export const DEFAULT_MANAGER_PERMISSIONS = [
  'project.view',
  'workers.view',
  'workers.add',
  'workers.attendance',
  'workers.timesheet',
  'workers.export',
  'timesheets.view',
];

export function sanitizePermissionList(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const allowed = new Set(ALL_PROJECT_PERMISSION_KEYS);
  return [...new Set(input.map((x) => String(x)).filter((k) => allowed.has(k)))];
}
