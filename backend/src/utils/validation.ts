import { z } from 'zod';

export const loginSchema = z.object({
  phone: z.string().min(10).max(16).regex(/^\+/, 'Phone must include country code'),
  password: z.string().min(6),
});

export const signupSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(10).max(16).regex(/^\+/, 'Phone must include country code'),
  password: z.string().min(6),
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(10).max(16).regex(/^\+/, 'Phone must include country code'),
  otp: z.string().length(4),
});

export const createBusinessSchema = z.object({
  name: z.string().min(2),
  nameAr: z.string().optional(),
  type: z.enum([
    'RESTAURANT', 'CAFE', 'SALON', 'CLINIC', 'GYM',
    'RETAIL', 'REAL_ESTATE', 'HOTEL', 'LOGISTICS', 'EDUCATION', 'CAR_WORKSHOP', 'MANPOWER', 'CUSTOM',
  ]),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  logo: z.string().optional(),
  whatsappNumber: z.string().optional(),
  whatsappPhoneId: z.string().optional(),
  whatsappToken: z.string().optional(),
  subscriptionPlan: z.enum(['STARTER', 'BUSINESS', 'ENTERPRISE']).optional(),
  settings: z.record(z.unknown()).optional(),
});

export const catalogItemSchema = z.object({
  catalogId: z.string().uuid(),
  nameAr: z.string().min(1),
  nameEn: z.string().min(1),
  descriptionAr: z.string().optional(),
  descriptionEn: z.string().optional(),
  price: z.number().positive(),
  discountPrice: z.number().positive().optional(),
  image: z.string().optional(),
  category: z.string().optional(),
  duration: z.number().int().positive().optional(),
  isAvailable: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const orderSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(z.object({
    id: z.string(),
    name: z.string(),
    quantity: z.number().int().positive(),
    price: z.number().positive(),
  })),
  subtotal: z.number().positive(),
  tax: z.number().min(0).optional(),
  deliveryFee: z.number().min(0).optional(),
  discount: z.number().min(0).optional(),
  total: z.number().positive(),
  paymentMethod: z.string().optional(),
  deliveryAddress: z.record(z.unknown()).optional(),
  specialInstructions: z.string().optional(),
});

export const appointmentSchema = z.object({
  customerId: z.string().uuid(),
  staffId: z.string().uuid().optional(),
  serviceId: z.string().optional(),
  serviceName: z.string().optional(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  notes: z.string().optional(),
});

export const autoReplySchema = z.object({
  triggerKeywords: z.array(z.string()).min(1),
  triggerType: z.enum(['CONTAINS', 'EXACT', 'STARTS_WITH']),
  responseAr: z.string().min(1),
  responseEn: z.string().min(1),
  priority: z.number().int().optional(),
  isActive: z.boolean().optional(),
  conditions: z.record(z.unknown()).optional(),
});

export const campaignSchema = z.object({
  name: z.string().min(2),
  type: z.string(),
  message: z.string().min(1),
  target: z.record(z.unknown()).optional(),
  scheduledAt: z.string().optional(),
});

export const promoCodeSchema = z.object({
  code: z.string().min(3).max(20),
  discountType: z.enum(['PERCENTAGE', 'FIXED']),
  discountValue: z.number().positive(),
  maxUses: z.number().int().positive().optional(),
  expiresAt: z.string().optional(),
});

const projectStatusEnum = z.enum(['DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED']);

export const createAgencyProjectSchema = z.object({
  clientCompanyId: z.string().min(1),
  name: z.string().min(2).max(200),
  code: z.string().max(50).optional(),
  siteName: z.string().max(200).optional(),
  siteAddress: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  industryTag: z.string().max(50).optional(),
  contractRef: z.string().max(100).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  headcount: z.coerce.number().int().positive().optional(),
  managerMemberId: z.string().optional(),
  status: projectStatusEnum.optional(),
  notes: z.string().max(2000).optional(),
});

export const updateAgencyProjectSchema = createAgencyProjectSchema.partial();

export const updateTimesheetStatusSchema = z.object({
  status: z.enum(['PENDING', 'PENDING_ADMIN', 'PENDING_PAYROLL', 'APPROVED', 'REJECTED', 'BILLED']).optional(),
  action: z.enum(['approve', 'reject', 'bill']).optional(),
  rejectReason: z.string().max(500).optional(),
});

export const bulkTimesheetActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'bill']),
  ids: z.array(z.string().min(1)).min(1).max(200),
  rejectReason: z.string().max(500).optional(),
});

export const manpowerPolicySchema = z.object({
  regularHoursPerDay: z.coerce.number().min(1).max(24).optional(),
  overtimeMultiplier: z.coerce.number().min(1).max(3).optional(),
  autoCalculateOvertime: z.boolean().optional(),
  approvalLevels: z.array(z.enum(['SITE_MANAGER', 'ADMIN', 'PAYROLL'])).optional(),
  autoReminderHours: z.coerce.number().min(1).max(168).optional(),
  shiftStart: z.string().max(10).optional(),
  shiftEnd: z.string().max(10).optional(),
  equalizeOvertime: z.boolean().optional(),
  fatigueOtThresholdWeekly: z.coerce.number().min(1).max(80).optional(),
});

export const createWorkerProfileSchema = z.object({
  name: z.string().min(2).max(200),
  phone: z.string().max(30).optional(),
  nationality: z.string().max(100).optional(),
  iqamaNumber: z.string().max(50).optional(),
  iqamaExpiry: z.string().optional(),
  category: z.string().max(100).optional(),
  password: z.string().min(4).max(100).optional(),
  defaultHours: z.coerce.number().min(1).max(24).optional(),
  hourlyRate: z.coerce.number().positive().optional(),
  contractType: z.string().max(50).optional(),
  skills: z.array(z.string()).optional(),
  notes: z.string().max(2000).optional(),
});

export const createTimesheetSchema = z.object({
  workerProfileId: z.string().min(1),
  projectId: z.string().optional(),
  placementId: z.string().optional(),
  clientCompanyId: z.string().optional(),
  workDate: z.string().min(1),
  regularHours: z.coerce.number().min(0).max(24).optional(),
  overtimeHours: z.coerce.number().min(0).max(24).optional(),
  hoursWorked: z.coerce.number().min(0).max(48).optional(),
  notes: z.string().max(2000).optional(),
});

export const assignProjectWorkerSchema = createWorkerProfileSchema.extend({
  startDate: z.string().optional(),
});

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: string[] };

export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): ValidationResult<T> {
  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      success: false as const,
      errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
    };
  }
  return { success: true as const, data: result.data };
}
