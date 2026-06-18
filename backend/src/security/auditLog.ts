import prisma from '../utils/prisma';
import { trackEvent } from '../analytics/eventTracker';

export async function logSecurityEvent(params: {
  businessId?: string;
  eventType: string;
  actor?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await trackEvent({
      businessId: params.businessId || 'system',
      eventType: `security_${params.eventType}`,
      metadata: { actor: params.actor, ...params.metadata },
    });
  } catch (err) {
    console.error('[audit] security event failed:', err);
  }
}

export async function logHandoffEvent(params: {
  businessId: string;
  conversationId: string;
  reason: string;
  summary?: string;
  tags?: string[];
}): Promise<void> {
  await logSecurityEvent({
    businessId: params.businessId,
    eventType: 'handoff',
    metadata: {
      conversationId: params.conversationId,
      reason: params.reason,
      summary: params.summary?.slice(0, 300),
      tags: params.tags,
    },
  });
}

export async function logWebhookEvent(params: {
  businessId?: string;
  provider: 'meta' | 'whapi';
  verified: boolean;
  messageId?: string;
}): Promise<void> {
  if (params.verified) return;
  await logSecurityEvent({
    businessId: params.businessId,
    eventType: 'webhook_rejected',
    metadata: { provider: params.provider, messageId: params.messageId },
  });
}

export async function logToolExecution(params: {
  businessId: string;
  conversationId?: string;
  toolName: string;
  input: unknown;
  output?: unknown;
  success: boolean;
  errorMessage?: string;
}): Promise<void> {
  try {
    const inputStr = JSON.stringify(params.input);
    const inputHash = Buffer.from(inputStr).toString('base64url').slice(0, 32);
    await prisma.toolAuditLog.create({
      data: {
        businessId: params.businessId,
        conversationId: params.conversationId,
        toolName: params.toolName,
        inputHash,
        input: params.input as object,
        output: params.output as object | undefined,
        success: params.success,
        errorMessage: params.errorMessage,
      },
    });
  } catch (err) {
    console.error('[audit] failed to log tool execution:', err);
  }
}
