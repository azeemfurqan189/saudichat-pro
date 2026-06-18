import prisma from '../utils/prisma';
import { ConversationState } from './tools/schemas';
export interface CartLine {
  catalogItemId: string;
  quantity: number;
  name: string;
  price: number;
}

export interface ConvStateData {
  state: ConversationState;
  /** @deprecated use cart — kept for scheduler backward compat */
  pendingOrder?: CartLine;
  pendingItem?: { catalogItemId: string; name: string; price: number };
  cart?: CartLine[];
  pendingBooking?: { serviceId: string; serviceName: string };
  selectedCategory?: string;
  categoryItemIds?: string[];
  categoryStartIndex?: number;
  deliveryAddress?: string;
  paymentMethod?: string;
  lastOrderId?: string;
  complaintFlow?: {
    step: 'offered' | 'awaiting_choice' | 'processing';
    issue?: string;
    orderId?: string;
  };
  pendingNlOrder?: {
    items: Array<{ catalogItemId: string; name: string; quantity: number; price: number }>;
    needsAddress?: boolean;
  };
}

export async function getConversationState(businessId: string, conversationId: string): Promise<ConvStateData> {
  const { tenantKey, redisGet } = await import('../utils/redis');  const raw = await redisGet(tenantKey(businessId, 'conv', conversationId, 'state'));
  if (raw) {
    try {
      return JSON.parse(raw) as ConvStateData;
    } catch {
      // fall through
    }
  }
  const conv = await prisma.conversation.findFirst({
    where: { id: conversationId, businessId },
    select: { metadata: true },
  });
  const meta = (conv?.metadata as unknown as ConvStateData) || { state: 'idle' };
  return meta;
}

export async function setConversationState(
  businessId: string,
  conversationId: string,
  data: Partial<ConvStateData>
): Promise<void> {
  const current = await getConversationState(businessId, conversationId);
  const merged = { ...current, ...data };
  const { tenantKey, redisSet } = await import('../utils/redis');  await redisSet(tenantKey(businessId, 'conv', conversationId, 'state'), JSON.stringify(merged), 86400);
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { metadata: merged as object },
  });
}
