import { Queue, Worker, Job } from 'bullmq';
import { getConnection } from './connection';

export const MESSAGE_QUEUE = 'whatsapp-messages';
export const DLQ_QUEUE = 'whatsapp-messages-dlq';

export interface MessageJobData {
  businessId: string;
  message: {
    from: string;
    id: string;
    timestamp: string;
    type: string;
    text?: { body: string };
  };
  provider: 'meta' | 'whapi';
  enqueuedAt: string;
}

function getConnectionLocal() {
  return getConnection();
}

let messageQueue: Queue<MessageJobData> | null = null;

export function getMessageQueue(): Queue<MessageJobData> | null {
  const connection = getConnectionLocal();
  if (!connection) return null;
  if (!messageQueue) {
    messageQueue = new Queue<MessageJobData>(MESSAGE_QUEUE, {
      connection,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: false,
      },
    });
  }
  return messageQueue;
}

export async function enqueueMessage(data: MessageJobData): Promise<boolean> {
  const queue = getMessageQueue();
  if (!queue) return false;
  await queue.add('process', data, { jobId: `${data.businessId}:${data.message.id}` });
  return true;
}

export function createMessageWorker(
  processor: (job: Job<MessageJobData>) => Promise<void>
): Worker<MessageJobData> | null {
  const connection = getConnectionLocal();
  if (!connection) return null;

  const worker = new Worker<MessageJobData>(MESSAGE_QUEUE, processor, {
    connection,
    concurrency: Number(process.env.WORKER_CONCURRENCY || 5),
  });

  worker.on('failed', async (job, err) => {
    console.error(`[queue] job ${job?.id} failed:`, err.message);
    if (job && job.attemptsMade >= (job.opts.attempts ?? 5)) {
      const dlq = new Queue(DLQ_QUEUE, { connection });
      await dlq.add('dead', { ...job.data, error: err.message, failedAt: new Date().toISOString() });
    }
  });

  return worker;
}

export async function getDlqCount(): Promise<number> {
  const connection = getConnectionLocal();
  if (!connection) return 0;
  const dlq = new Queue(DLQ_QUEUE, { connection });
  const [waiting, failed] = await Promise.all([dlq.getWaitingCount(), dlq.getFailedCount()]);
  return waiting + failed;
}

export function isQueueEnabled(): boolean {
  return Boolean(getConnectionLocal());
}
