const BLOCKED_PATTERNS = [
  /\b(kill|murder|bomb|terrorist|illegal drugs)\b/i,
  /\b(كلمة\s*سر|password|credit\s*card\s*number)\b/i,
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,
];

const UNAUTHORIZED_REFUND = [
  /\b(full\s*refund|100%\s*refund|استرداد\s*كامل|ارجاع\s*كامل)\b/i,
  /\b(money\s*back\s*guaranteed|ضمان\s*استرداد)\b/i,
];

const POLICY_ADVICE = [
  /\b(you\s*should\s*(?:sue|file\s*a\s*lawsuit)|استشر\s*محام)/i,
  /\b(take\s*this\s*medication|جرعة\s*دواء)/i,
  /\b(invest\s*in|buy\s*stock|استثمر\s*في)/i,
];

export interface ContentFilterResult {
  blocked: boolean;
  sanitized: string;
  reason?: string;
}

export function filterBlockedContent(text: string): ContentFilterResult {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      return {
        blocked: true,
        sanitized: 'عذراً، لا يمكنني المساعدة في هذا الطلب.\nSorry, I cannot help with that request.',
        reason: 'blocked_content',
      };
    }
  }
  return { blocked: false, sanitized: text };
}

export function applyRefundPolicy(text: string, refundPolicy: string): string {
  if (refundPolicy !== 'no_auto_refund') return text;
  let sanitized = text;
  for (const pattern of UNAUTHORIZED_REFUND) {
    if (pattern.test(sanitized)) {
      sanitized = sanitized.replace(pattern, '[contact support for refund policy]');
    }
  }
  return sanitized;
}

export function filterPolicyAdvice(text: string): string {
  let sanitized = text;
  for (const pattern of POLICY_ADVICE) {
    if (pattern.test(sanitized)) {
      sanitized = sanitized.replace(
        pattern,
        '[please contact the business directly for professional advice]'
      );
    }
  }
  return sanitized;
}

export function redactPii(text: string): string {
  return text
    .replace(/sk-[a-zA-Z0-9]{20,}/g, '[redacted]')
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[email]')
    .replace(/\b\d{10,12}\b/g, '[id]');
}
