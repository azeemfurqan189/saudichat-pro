import { z } from 'zod';
import { ConversationState, STATE_TOOL_ALLOWLIST, TOOL_SCHEMAS } from './tools/schemas';
import { logToolExecution } from '../security/auditLog';
import { checkApiCallQuota } from '../security/rateLimiter';
import { tenantKey, redisGet, redisSet } from '../utils/redis';
import * as handlers from './tools/handlers';
import * as cartTools from './tools/handlers/cartTools';
import prisma from '../utils/prisma';

export interface ToolContext {
  businessId: string;
  conversationId: string;
  customerId: string;
  phone: string;
  state: ConversationState;
  plan?: import('@prisma/client').SubscriptionPlan;
}

const TOOL_HANDLERS: Record<string, (ctx: ToolContext, args: unknown) => Promise<unknown>> = {
  searchCatalog: (ctx, args) => handlers.searchCatalog(ctx, args as { query?: string }),
  searchKnowledge: (ctx, args) => handlers.searchKnowledgeTool(ctx, args as { query: string }),
  createOrder: (ctx, args) => handlers.createOrder(ctx, args as Parameters<typeof handlers.createOrder>[1]),
  createAppointment: (ctx, args) => handlers.createAppointment(ctx, args as Parameters<typeof handlers.createAppointment>[1]),
  escalateToHuman: (ctx, args) => handlers.escalateToHuman(ctx, args as Parameters<typeof handlers.escalateToHuman>[1]),
  addToCart: (ctx, args) => cartTools.addToCart(ctx, args as Parameters<typeof cartTools.addToCart>[1]),
  confirmOrder: (ctx, args) => cartTools.confirmOrder(ctx, args as Parameters<typeof cartTools.confirmOrder>[1]),
  checkAvailability: (ctx, args) => cartTools.checkAvailability(ctx, args as Parameters<typeof cartTools.checkAvailability>[1]),
};

const MAX_TOOL_ROUNDS = 5;

export class ToolExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ToolExecutionError';
  }
}

export async function executeTool(
  ctx: ToolContext,
  toolName: string,
  rawArgs: unknown
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  if (ctx.plan) {
    const apiQuota = await checkApiCallQuota(ctx.businessId, ctx.plan);
    if (!apiQuota.allowed) {
      const error = apiQuota.reason || 'API quota exceeded';
      await logToolExecution({ businessId: ctx.businessId, conversationId: ctx.conversationId, toolName, input: rawArgs, success: false, errorMessage: error });
      return { success: false, error };
    }
  }

  const allowed = STATE_TOOL_ALLOWLIST[ctx.state] || STATE_TOOL_ALLOWLIST.idle;
  if (!allowed.includes(toolName)) {
    const error = `Tool "${toolName}" not allowed in state "${ctx.state}"`;
    await logToolExecution({ businessId: ctx.businessId, conversationId: ctx.conversationId, toolName, input: rawArgs, success: false, errorMessage: error });
    return { success: false, error };
  }

  const schema = TOOL_SCHEMAS[toolName];
  if (!schema) {
    return { success: false, error: `Unknown tool: ${toolName}` };
  }

  let parsed: z.infer<typeof schema>;
  try {
    parsed = schema.parse(rawArgs);
  } catch (err) {
    const error = err instanceof z.ZodError ? err.errors.map((e) => e.message).join('; ') : 'Invalid input';
    await logToolExecution({ businessId: ctx.businessId, conversationId: ctx.conversationId, toolName, input: rawArgs, success: false, errorMessage: error });
    return { success: false, error };
  }

  if (toolName === 'createOrder' || toolName === 'confirmOrder') {
    const idemKey = tenantKey(ctx.businessId, 'idempotency', toolName, ctx.conversationId);
    const existing = await redisGet(idemKey);
    if (existing) {
      return { success: false, error: 'Duplicate order request — already processed' };
    }
  }

  if (toolName === 'createOrder' && parsed && typeof parsed === 'object' && 'items' in parsed) {
    const items = (parsed as { items: Array<{ catalogItemId: string }> }).items;
    for (const line of items) {
      const item = await prisma.catalogItem.findFirst({
        where: { id: line.catalogItemId, businessId: ctx.businessId },
      });
      if (!item) {
        const error = `Invalid catalog item ID: ${line.catalogItemId}`;
        await logToolExecution({ businessId: ctx.businessId, conversationId: ctx.conversationId, toolName, input: parsed, success: false, errorMessage: error });
        return { success: false, error };
      }
    }
  }

  const handler = TOOL_HANDLERS[toolName];
  if (!handler) {
    return { success: false, error: `No handler for tool: ${toolName}` };
  }

  try {
    const result = await handler(ctx, parsed);
    if (toolName === 'createOrder' || toolName === 'confirmOrder') {
      const idemKey = tenantKey(ctx.businessId, 'idempotency', toolName, ctx.conversationId);
      await redisSet(idemKey, JSON.stringify(result), 3600);
    }
    await logToolExecution({ businessId: ctx.businessId, conversationId: ctx.conversationId, toolName, input: parsed, output: result, success: true });
    return { success: true, result };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Tool execution failed';
    await logToolExecution({ businessId: ctx.businessId, conversationId: ctx.conversationId, toolName, input: parsed, success: false, errorMessage: error });
    return { success: false, error };
  }
}

export { MAX_TOOL_ROUNDS };
