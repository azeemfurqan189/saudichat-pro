import { z } from 'zod';

export const searchKnowledgeSchema = z.object({
  query: z.string().min(1).max(500),
});

export const searchCatalogSchema = z.object({
  query: z.string().max(200).optional(),
});

export const createOrderSchema = z.object({
  items: z.array(
    z.object({
      catalogItemId: z.string().uuid(),
      quantity: z.number().int().min(1).max(20),
    })
  ).min(1).max(10),
  specialInstructions: z.string().max(500).optional(),
  paymentMethod: z.string().max(100).optional(),
  deliveryAddress: z.union([z.string().max(500), z.record(z.unknown())]).optional(),
});

export const createAppointmentSchema = z.object({
  serviceId: z.string().uuid().optional(),
  serviceName: z.string().max(200).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().max(500).optional(),
});

export const escalateSchema = z.object({
  reason: z.string().max(300),
  tags: z.array(z.string()).max(5).optional(),
});

export const addToCartSchema = z.object({
  catalogItemId: z.string().uuid(),
  quantity: z.number().int().min(1).max(20),
});

export const confirmOrderSchema = z.object({
  paymentMethod: z.string().max(100).optional(),
  deliveryAddress: z.string().max(500).optional(),
  specialInstructions: z.string().max(500).optional(),
});

export const checkAvailabilitySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  serviceId: z.string().uuid().optional(),
});

export type ConversationState =
  | 'idle'
  | 'ordering'
  | 'booking'
  | 'confirming_order'
  | 'confirming_booking'
  | 'collecting_address'
  | 'selecting_payment'
  | 'confirming_item'
  | 'selecting_quantity'
  | 'viewing_cart';

export const STATE_TOOL_ALLOWLIST: Record<ConversationState, string[]> = {
  idle: ['searchCatalog', 'searchKnowledge', 'escalateToHuman'],
  ordering: ['searchCatalog', 'searchKnowledge', 'addToCart', 'confirmOrder', 'escalateToHuman'],
  booking: ['searchKnowledge', 'checkAvailability', 'createAppointment', 'escalateToHuman'],
  confirming_order: ['confirmOrder', 'escalateToHuman'],
  confirming_booking: ['createAppointment', 'escalateToHuman'],
  collecting_address: ['confirmOrder', 'escalateToHuman'],
  selecting_payment: ['confirmOrder', 'escalateToHuman'],
  confirming_item: ['confirmOrder', 'escalateToHuman'],
  selecting_quantity: ['confirmOrder', 'escalateToHuman'],
  viewing_cart: ['confirmOrder', 'escalateToHuman'],
};

export const TOOL_SCHEMAS: Record<string, z.ZodType> = {
  searchCatalog: searchCatalogSchema,
  searchKnowledge: searchKnowledgeSchema,
  createOrder: createOrderSchema,
  createAppointment: createAppointmentSchema,
  escalateToHuman: escalateSchema,
  addToCart: addToCartSchema,
  confirmOrder: confirmOrderSchema,
  checkAvailability: checkAvailabilitySchema,
};
