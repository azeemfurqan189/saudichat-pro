export const CMMS_SECURITY_ROLES = [
  { key: 'OPERATOR', labelEn: 'Operator', labelAr: 'مشغّل', layer: 'SITE' },
  { key: 'TECHNICIAN', labelEn: 'Technician', labelAr: 'فني', layer: 'SITE' },
  { key: 'SUPERVISOR', labelEn: 'Supervisor', labelAr: 'مشرف', layer: 'SITE' },
  { key: 'PLANNER', labelEn: 'Planner', labelAr: 'مخطط', layer: 'OFFICE' },
  { key: 'STOREKEEPER', labelEn: 'Storekeeper', labelAr: 'أمين مخزن', layer: 'OFFICE' },
  { key: 'MANAGER', labelEn: 'Manager', labelAr: 'مدير', layer: 'OFFICE' },
  { key: 'ADMIN', labelEn: 'Admin', labelAr: 'مسؤول', layer: 'OWNER' },
] as const;

export type CmmsSecurityRole = (typeof CMMS_SECURITY_ROLES)[number]['key'];

export const CMMS_PERMISSION_ACTIONS = ['view', 'create', 'edit', 'approve', 'delete'] as const;
export type CmmsPermissionAction = (typeof CMMS_PERMISSION_ACTIONS)[number];

export const CMMS_SECURITY_MODULES = [
  { key: 'assets', labelEn: 'Assets', labelAr: 'الأصول' },
  { key: 'locations', labelEn: 'Locations', labelAr: 'المواقع' },
  { key: 'workRequests', labelEn: 'Work Requests', labelAr: 'طلبات العمل' },
  { key: 'workOrders', labelEn: 'Work Orders', labelAr: 'أوامر العمل' },
  { key: 'planner', labelEn: 'Planner', labelAr: 'الجدولة' },
  { key: 'maintenance', labelEn: 'Preventive PM', labelAr: 'الصيانة الوقائية' },
  { key: 'spares', labelEn: 'Inventory', labelAr: 'المخزون' },
  { key: 'procurement', labelEn: 'Procurement', labelAr: 'المشتريات' },
  { key: 'finance', labelEn: 'Finance', labelAr: 'المالية' },
  { key: 'aiEngine', labelEn: 'AI Engine', labelAr: 'AI' },
  { key: 'notifications', labelEn: 'Notifications', labelAr: 'الإشعارات' },
  { key: 'hr', labelEn: 'HR Integration', labelAr: 'HR' },
] as const;

export type CmmsSecurityModule = (typeof CMMS_SECURITY_MODULES)[number]['key'];

export type ModulePermissions = Partial<Record<CmmsPermissionAction, boolean>>;
export type RolePermissionMatrix = Partial<Record<CmmsSecurityModule, ModulePermissions>>;

const all = (actions: CmmsPermissionAction[]): ModulePermissions =>
  Object.fromEntries(actions.map((a) => [a, true])) as ModulePermissions;

const v = all(['view']);
const vc = all(['view', 'create']);
const vce = all(['view', 'create', 'edit']);
const vcea = all(['view', 'create', 'edit', 'approve']);
const full = all(['view', 'create', 'edit', 'approve', 'delete']);

export const DEFAULT_CMMS_ROLE_MATRIX: Record<CmmsSecurityRole, RolePermissionMatrix> = {
  OPERATOR: {
    workRequests: vce,
    workOrders: v,
    assets: v,
    locations: v,
  },
  TECHNICIAN: {
    workRequests: vce,
    workOrders: all(['view', 'edit']),
    assets: v,
    spares: v,
    locations: v,
  },
  SUPERVISOR: {
    workRequests: all(['view', 'approve']),
    workOrders: all(['view', 'edit', 'approve']),
    assets: all(['view', 'edit']),
    maintenance: v,
    locations: v,
    spares: v,
  },
  PLANNER: {
    workRequests: all(['view', 'approve']),
    workOrders: vcea,
    planner: vcea,
    maintenance: vcea,
    assets: v,
    locations: v,
  },
  STOREKEEPER: {
    spares: vcea,
    procurement: all(['view', 'create', 'edit']),
    workOrders: all(['view', 'edit']),
    assets: v,
  },
  MANAGER: {
    assets: vcea,
    locations: vcea,
    workRequests: vcea,
    workOrders: vcea,
    planner: vcea,
    maintenance: vcea,
    spares: vcea,
    procurement: all(['view', 'create', 'edit', 'approve']),
    finance: all(['view', 'approve']),
    aiEngine: v,
    notifications: all(['view', 'edit']),
    hr: v,
  },
  ADMIN: Object.fromEntries(CMMS_SECURITY_MODULES.map((m) => [m.key, full])) as RolePermissionMatrix,
};

export const DEFAULT_MEMBER_ROLE_MAP: Record<string, CmmsSecurityRole> = {
  OWNER: 'ADMIN',
  MANAGER: 'MANAGER',
  OFFICE_STAFF: 'PLANNER',
  FIELD_WORKER: 'TECHNICIAN',
};

export function resolveCmmsRole(
  memberRole: string,
  memberAssignments: Record<string, string>,
  memberId: string
): CmmsSecurityRole {
  const assigned = memberAssignments[memberId];
  if (assigned && assigned in DEFAULT_CMMS_ROLE_MATRIX) return assigned as CmmsSecurityRole;
  return DEFAULT_MEMBER_ROLE_MAP[memberRole] ?? 'OPERATOR';
}

export function hasCmmsPermission(
  matrix: RolePermissionMatrix,
  module: CmmsSecurityModule,
  action: CmmsPermissionAction
): boolean {
  return matrix[module]?.[action] === true;
}
