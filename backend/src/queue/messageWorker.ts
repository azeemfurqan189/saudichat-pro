import { Job } from 'bullmq';
import { MessageJobData } from './queues';
import { processIncomingMessage } from '../agent/orchestrator';
import { assertActiveBusiness, validateBusinessIdInPayload } from '../security/tenantScope';

export async function processMessageJob(job: Job<MessageJobData>): Promise<void> {
  const { businessId, message } = job.data;
  validateBusinessIdInPayload(businessId, businessId);
  await assertActiveBusiness(businessId);
  console.log(`[worker] processing message ${message.id} for business ${businessId}`);
  await processIncomingMessage(businessId, message);
}
