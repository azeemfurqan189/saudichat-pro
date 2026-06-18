import { Queue } from 'bullmq';
import { DLQ_QUEUE, MessageJobData, getMessageQueue } from './queues';
import { getConnection } from './connection';

export interface DlqJobInfo {
  id: string;
  businessId: string;
  messageId: string;
  provider: string;
  error?: string;
  failedAt?: string;
  enqueuedAt: string;
}

export async function listDlqJobs(limit = 50, businessId?: string): Promise<DlqJobInfo[]> {
  const connection = getConnection();
  if (!connection) return [];

  const dlq = new Queue(DLQ_QUEUE, { connection });
  const jobs = await dlq.getJobs(['waiting', 'delayed', 'failed'], 0, limit - 1);

  const result: DlqJobInfo[] = [];
  for (const job of jobs) {
    const data = job.data as MessageJobData & { error?: string; failedAt?: string };
    if (businessId && data.businessId !== businessId) continue;
    result.push({
      id: job.id || '',
      businessId: data.businessId,
      messageId: data.message.id,
      provider: data.provider,
      error: data.error,
      failedAt: data.failedAt,
      enqueuedAt: data.enqueuedAt,
    });
  }
  return result;
}

export async function getDlqStats(businessId?: string): Promise<{ total: number; byBusiness: Record<string, number> }> {
  const jobs = await listDlqJobs(200, businessId);
  const byBusiness: Record<string, number> = {};
  for (const j of jobs) {
    byBusiness[j.businessId] = (byBusiness[j.businessId] || 0) + 1;
  }
  return { total: jobs.length, byBusiness };
}

export async function replayDlqJob(jobId: string): Promise<{ ok: boolean; detail: string }> {
  const connection = getConnection();
  if (!connection) return { ok: false, detail: 'Redis not configured' };

  const dlq = new Queue(DLQ_QUEUE, { connection });
  const job = await dlq.getJob(jobId);
  if (!job) return { ok: false, detail: 'Job not found in DLQ' };

  const data = job.data as MessageJobData;
  const queue = getMessageQueue();
  if (!queue) return { ok: false, detail: 'Message queue unavailable' };

  await queue.add('process', data, {
    jobId: `replay:${data.businessId}:${data.message.id}:${Date.now()}`,
  });
  await job.remove();
  return { ok: true, detail: 'Job re-queued for processing' };
}

export async function replayAllDlqForBusiness(businessId: string): Promise<number> {
  const jobs = await listDlqJobs(100, businessId);
  let replayed = 0;
  for (const j of jobs) {
    const result = await replayDlqJob(j.id);
    if (result.ok) replayed++;
  }
  return replayed;
}
