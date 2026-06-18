import prisma from '../../utils/prisma';
import {
  applyRefundPolicy,
  filterBlockedContent,
  filterPolicyAdvice,
  redactPii,
} from './contentFilter';
import { validatePricesInResponse } from './priceGuard';

export interface ValidationResult {
  valid: boolean;
  sanitized: string;
  blocked?: boolean;
  reason?: string;
}

export async function validateBotResponse(
  response: string,
  businessId: string
): Promise<ValidationResult> {
  let sanitized = response.trim();
  if (!sanitized) {
    return {
      valid: false,
      sanitized: 'كيف يمكنني مساعدتك؟\nHow can I help you?',
      blocked: true,
      reason: 'empty_response',
    };
  }

  const contentCheck = filterBlockedContent(sanitized);
  if (contentCheck.blocked) {
    return {
      valid: false,
      sanitized: contentCheck.sanitized,
      blocked: true,
      reason: contentCheck.reason,
    };
  }
  sanitized = contentCheck.sanitized;

  const business = await prisma.business.findFirst({
    where: { id: businessId },
    select: { settings: true },
  });
  const settings = (business?.settings as Record<string, unknown>) || {};
  const refundPolicy = String(settings.refundPolicy || 'no_auto_refund');

  sanitized = applyRefundPolicy(sanitized, refundPolicy);
  sanitized = filterPolicyAdvice(sanitized);
  sanitized = await validatePricesInResponse(sanitized, businessId);
  sanitized = redactPii(sanitized);

  return { valid: true, sanitized };
}
