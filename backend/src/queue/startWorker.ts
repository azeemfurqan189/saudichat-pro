import dotenv from 'dotenv';
import { createMessageWorker } from './queues';
import { processMessageJob } from './messageWorker';
import { createSendWorker } from './sendWorker';

dotenv.config();

const worker = createMessageWorker(processMessageJob);
const sendWorker = createSendWorker();

if (worker) {
  console.log('[worker] Message worker started');
  worker.on('completed', (job) => console.log(`[worker] completed ${job.id}`));
} else {
  console.error('[worker] REDIS_URL not set — worker cannot start');
  process.exit(1);
}

if (sendWorker) {
  console.log('[worker] Send worker started');
}

process.on('SIGTERM', async () => {
  await worker?.close();
  await sendWorker?.close();
  process.exit(0);
});
