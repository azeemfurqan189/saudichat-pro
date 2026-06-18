import { Queue, Worker, Job } from 'bullmq';
import { getConnection } from './connection';
import { WhatsAppOutbound } from '../services/whatsappSend';

export const SEND_QUEUE = 'whatsapp-send';
export const SEND_DLQ = 'whatsapp-send-dlq';

export interface SendJobData {
  businessId: string;
  customerPhone: string;
  message: WhatsAppOutbound;
  enqueuedAt: string;
  attempt?: number;
}

let sendQueue: Queue<SendJobData> | null = null;

export function getSendQueue(): Queue<SendJobData> | null {
  const connection = getConnection();
  if (!connection) return null;
  if (!sendQueue) {
    sendQueue = new Queue(SEND_QUEUE, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 200,
        removeOnFail: false,
      },
    });
  }
  return sendQueue;
}

export async function enqueueWhatsAppSend(
  businessId: string,
  customerPhone: string,
  message: WhatsAppOutbound
): Promise<boolean> {
  const queue = getSendQueue();
  if (!queue) return false;
  await queue.add(
    'send',
    { businessId, customerPhone, message, enqueuedAt: new Date().toISOString() },
    { jobId: `send:${businessId}:${customerPhone}:${Date.now()}` }
  );
  return true;
}

async function processSendJob(job: Job<SendJobData>): Promise<void> {
  const { sendWhatsAppMessageDirect } = await import('../services/whatsappSend');
  const result = await sendWhatsAppMessageDirect(job.data.businessId, job.data.customerPhone, job.data.message);
  if (!result.ok) {
    throw new Error(result.detail || 'Send failed');
  }
}

export function createSendWorker(): Worker<SendJobData> | null {
  const connection = getConnection();
  if (!connection) return null;

  const worker = new Worker<SendJobData>(SEND_QUEUE, processSendJob, {
    connection,
    concurrency: Number(process.env.SEND_WORKER_CONCURRENCY || 10),
  });

  worker.on('failed', async (job, err) => {
    console.error(`[send-worker] job ${job?.id} failed:`, err.message);
    if (job && job.attemptsMade >= (job.opts.attempts ?? 3)) {
      const dlq = new Queue(SEND_DLQ, { connection });
      await dlq.add('dead', {
        ...job.data,
        error: err.message,
        failedAt: new Date().toISOString(),
      });
    }
  });

  return worker;
}
