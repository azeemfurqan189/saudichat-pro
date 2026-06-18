import { recordTokenUsage } from '../security/quotaManager';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 4000, 16000];

export interface AiCompletionResult {
  content: string;
  tokensUsed: number;
}

export type AiProviderName = 'groq' | 'openai';

export interface AiRuntimeConfig {
  provider: AiProviderName;
  apiKey: string;
  model: string;
  baseURL?: string;
}

/** Groq is OpenAI-compatible: https://console.groq.com */
export function getAiRuntimeConfig(): AiRuntimeConfig | null {
  const groqKey = process.env.GROQ_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const preferred = process.env.AI_PROVIDER?.trim().toLowerCase();

  if (preferred === 'groq' && groqKey) {
    return {
      provider: 'groq',
      apiKey: groqKey,
      baseURL: 'https://api.groq.com/openai/v1',
      model: process.env.GROQ_MODEL?.trim() || 'llama-3.3-70b-versatile',
    };
  }

  if (preferred === 'openai' && openaiKey) {
    return {
      provider: 'openai',
      apiKey: openaiKey,
      model: process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini',
    };
  }

  // Auto: Groq first (cheaper/faster), then OpenAI
  if (groqKey) {
    return {
      provider: 'groq',
      apiKey: groqKey,
      baseURL: 'https://api.groq.com/openai/v1',
      model: process.env.GROQ_MODEL?.trim() || 'llama-3.3-70b-versatile',
    };
  }

  if (openaiKey) {
    return {
      provider: 'openai',
      apiKey: openaiKey,
      model: process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini',
    };
  }

  return null;
}

export function isAiConfigured(): boolean {
  return getAiRuntimeConfig() !== null;
}

export function getAiProviderLabel(): string {
  const cfg = getAiRuntimeConfig();
  if (!cfg) return 'none';
  return `${cfg.provider}:${cfg.model}`;
}

export async function createChatCompletion(params: {
  businessId: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  maxTokens?: number;
  tools?: unknown[];
}): Promise<AiCompletionResult | null> {
  const cfg = getAiRuntimeConfig();
  if (!cfg) return null;

  const OpenAI = (await import('openai')).default;
  const client = new OpenAI({
    apiKey: cfg.apiKey,
    baseURL: cfg.baseURL,
    timeout: 25000,
  });

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model: cfg.model,
        messages: params.messages,
        max_tokens: params.maxTokens ?? 300,
        ...(params.tools ? { tools: params.tools as never[], tool_choice: 'auto' as const } : {}),
      });

      const content = response.choices[0]?.message?.content || '';
      const tokensUsed = response.usage?.total_tokens ?? 0;
      await recordTokenUsage(params.businessId, tokensUsed);

      return { content, tokensUsed };
    } catch (err) {
      const isRetryable =
        err instanceof Error &&
        (err.message.includes('429') || err.message.includes('timeout') || err.message.includes('503'));
      if (!isRetryable || attempt === MAX_RETRIES - 1) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`[ai] ${cfg.provider} completion failed (${cfg.model}):`, errMsg);
        return null;
      }
      await sleep(RETRY_DELAYS[attempt] ?? 16000);
    }
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
