import { z } from 'zod';

export const loginSchema = z.object({
  phone: z.string().min(9).max(15),
  password: z.string().min(6),
});

export const signupSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(9).max(15),
  password: z.string().min(6),
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(9).max(15),
  otp: z.string().length(4),
});

export const createBusinessSchema = z.object({
  name: z.string().min(2),
  nameAr: z.string().optional(),
  type: z.enum([
    'RESTAURANT', 'CAFE', 'SALON', 'CLINIC', 'GYM',
    'RETAIL', 'REAL_ESTATE', 'CAR_WORKSHOP', 'CUSTOM',
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

export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      success: false,
      errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
    };
  }
  return { success: true, data: result.data };
}
