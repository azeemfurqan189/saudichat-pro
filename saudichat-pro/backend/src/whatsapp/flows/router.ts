import { processIncomingMessage } from '../../agent/orchestrator';

interface IncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
}

/** @deprecated Use processIncomingMessage from agent/orchestrator directly */
export async function routeMessage(businessId: string, message: IncomingMessage): Promise<void> {
  await processIncomingMessage(businessId, message);
}

export { sendBotMessage } from './router-helpers';
