import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { createServer } from 'http';
import { Server } from 'socket.io';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/auth';
import { apiLimiter } from './middleware/rateLimit';
import { handleWhatsAppWebhook } from './services/whatsappWebhook';
import { handleWhapiWebhook } from './services/whapiWebhook';
import { setSocketIo } from './realtime/io';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      callback(null, !origin || isAllowedOrigin(origin));
    },
    methods: ['GET', 'POST'],
  },
});

setSocketIo(io);

const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || '0.0.0.0';

console.log('[startup] SaudiChat Pro API');
console.log('[startup] NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('[startup] PORT:', PORT);
console.log('[startup] DATABASE_URL set:', Boolean(process.env.DATABASE_URL));
console.log('[startup] WHATSAPP_VERIFY_TOKEN set:', Boolean(process.env.WHATSAPP_VERIFY_TOKEN));
console.log('[startup] WHATSAPP_API_VERSION:', process.env.WHATSAPP_API_VERSION || 'v21.0');
console.log('[startup] WHATSAPP_PROVIDER:', process.env.WHATSAPP_PROVIDER || 'meta (per-business settings override)');

app.set('trust proxy', 1);

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  const allowed = process.env.FRONTEND_URL || 'http://localhost:3000';
  if (origin === allowed) return true;
  if (origin.startsWith('http://localhost:')) return true;
  if (origin.endsWith('.vercel.app')) return true;
  return false;
}

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    callback(null, isAllowedOrigin(origin));
  },
  credentials: true,
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/public/menu/:businessId.pdf', (req, res) => {
  const businessId = req.params.businessId.replace(/\.pdf$/i, '');
  if (!/^[a-f0-9-]{36}$/i.test(businessId)) {
    res.status(400).send('Invalid menu id');
    return;
  }
  const filePath = path.join(process.cwd(), 'uploads', 'menus', `${businessId}.pdf`);
  if (!fs.existsSync(filePath)) {
    res.status(404).send('Menu PDF not generated yet');
    return;
  }
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.sendFile(filePath);
});

// Public live chat widget (no auth)
app.get('/public/widget.js', async (req, res) => {
  const { getWidgetScript } = await import('./controllers/liveChatController');
  getWidgetScript(req, res);
});
app.post('/public/chat/:businessId/start', async (req, res) => {
  const { startLiveChatSession } = await import('./controllers/liveChatController');
  await startLiveChatSession(req, res);
});
app.post('/public/chat/:businessId/sessions/:sessionId/messages', async (req, res) => {
  const { sendLiveChatMessage } = await import('./controllers/liveChatController');
  await sendLiveChatMessage(req, res);
});
app.get('/public/chat/:businessId/sessions/:sessionId/messages', async (req, res) => {
  const { getLiveChatMessages } = await import('./controllers/liveChatController');
  await getLiveChatMessages(req, res);
});

app.get('/public/track/:code', async (req, res) => {
  try {
    const { default: prisma } = await import('./utils/prisma');
    const delivery = await prisma.delivery.findFirst({
      where: { trackingCode: req.params.code },
    });
    if (!delivery) {
      res.status(404).json({ success: false, message: 'Tracking not found' });
      return;
    }
    let orderNumber: string | undefined;
    if (delivery.orderId) {
      const order = await prisma.order.findUnique({
        where: { id: delivery.orderId },
        select: { orderNumber: true, total: true, status: true },
      });
      orderNumber = order?.orderNumber;
    }
    res.json({
      success: true,
      data: {
        trackingCode: delivery.trackingCode,
        status: delivery.status,
        driverName: delivery.driverName,
        driverPhone: delivery.driverPhone,
        address: delivery.address,
        estimatedAt: delivery.estimatedAt,
        deliveredAt: delivery.deliveredAt,
        orderNumber,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Error' });
  }
});

app.use('/api', apiLimiter, routes);

// WhatsApp webhook
app.get('/webhook/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN?.trim();
  if (mode === 'subscribe' && token === expectedToken) {
    res.status(200).send(challenge);
    return;
  }

  if (mode === 'subscribe') {
    res.status(403).json({ success: false, message: 'Verify token mismatch — check WHATSAPP_VERIFY_TOKEN on Railway' });
    return;
  }

  // Browser visit (no Meta query params) — not an error; real messages use POST
  res.status(200).json({
    success: true,
    message: 'WhatsApp webhook is live. Opening this URL in a browser is OK. Customer messages arrive via POST from Meta.',
    metaSetup: {
      callbackUrl: 'https://saudichat-pro-production.up.railway.app/webhook/whatsapp',
      verifyTokenHint: 'Set same value in Meta and Railway WHATSAPP_VERIFY_TOKEN',
      subscribeField: 'messages',
    },
    health: '/health',
    webhookDebug: '/health/webhook-debug',
  });
});

app.post('/webhook/whatsapp', handleWhatsAppWebhook);

app.get('/webhook/whapi', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Whapi webhook is live. Set this HTTPS URL in panel.whapi.cloud → Channel → Settings → Webhooks (messages POST).',
    webhookPost: '/webhook/whapi',
    health: '/health',
    webhookDebug: '/health/webhook-debug',
  });
});

app.post('/webhook/whapi', handleWhapiWebhook);

app.get('/health/queue', async (_req, res) => {
  const { isQueueEnabled, getDlqCount } = await import('./queue/queues');
  const dlqCount = isQueueEnabled() ? await getDlqCount() : 0;
  res.json({
    status: 'ok',
    queueEnabled: isQueueEnabled(),
    redisConfigured: Boolean(process.env.REDIS_URL),
    dlqFailedCount: dlqCount,
  });
});

app.get('/health', (_req, res) => {
  const databaseConfigured = Boolean(process.env.DATABASE_URL);
  res.json({
    status: databaseConfigured ? 'ok' : 'degraded',
    service: 'SaudiChat Pro API',
    databaseConfigured,
    timestamp: new Date().toISOString(),
    ...(databaseConfigured
      ? {}
      : {
          hint: 'Set DATABASE_URL in Railway Variables (Neon/Postgres connection string), then redeploy',
        }),
  });
});

app.get('/health/webhook-debug', async (_req, res) => {
  const { getWebhookDebugState } = await import('./services/webhookDebug');
  const debug = getWebhookDebugState();
  let savedPhoneIds: string[] = [];
  if (process.env.DATABASE_URL) {
    try {
      const { default: prisma } = await import('./utils/prisma');
      const rows = await prisma.business.findMany({
        where: { whatsappPhoneId: { not: null } },
        select: { whatsappPhoneId: true },
      });
      savedPhoneIds = rows.map((r) => r.whatsappPhoneId!).filter(Boolean);
    } catch {
      // ignore
    }
  }
  const processedOk =
    debug.lastStatus === 'processed_ok' ||
    debug.lastStatus === 'queued' ||
    debug.lastStatus === 'orchestrator_start';
  let hint =
    'If lastStatus=ignored_wrong_object but you use Whapi, set webhook URL to /webhook/whapi (not /webhook/whatsapp). If processed_ok but send_failed, fix API Token in Dashboard.';
  if (debug.lastStatus === 'processing_text' || debug.lastStatus === 'orchestrator_start') {
    hint =
      'Processing in progress or stuck — wait 30s and refresh. If still stuck, check Railway deploy logs.';
  } else if (processedOk && debug.lastSendStatus === 'send_failed') {
    hint = 'Message processed but WhatsApp send failed — save a valid Whapi API Token in Dashboard → Settings → WhatsApp.';
  } else if (debug.lastStatus === 'whapi_on_meta_url') {
    hint =
      'Whapi is hitting /webhook/whatsapp — remove that URL in Whapi panel; keep only /webhook/whapi.';
  }
  res.json({
    status: 'ok',
    hint,
    debug,
    savedPhoneIdsInDatabase: savedPhoneIds,
    replyHelp: {
      processedOk,
      sentToWhatsApp: debug.lastSendStatus === 'sent_ok',
      sendFailed: debug.lastSendStatus === 'send_failed',
      sendError: debug.lastSendError,
    },
  });
});

app.get('/health/bot-setup/:businessId', async (req, res) => {
  try {
    const { getBotSetupStatus } = await import('./services/catalogService');
    const setup = await getBotSetupStatus(req.params.businessId);
    if (!setup) {
      res.status(404).json({ status: 'error', message: 'Business not found' });
      return;
    }
    res.json({ status: 'ok', ...setup });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err instanceof Error ? err.message : 'Failed to load bot setup status',
    });
  }
});

app.get('/health/whapi', async (_req, res) => {
  const railwayUrl = process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : 'https://saudichat-pro-production.up.railway.app';

  let businessesWithWhapi = 0;
  let channelIds: string[] = [];
  if (process.env.DATABASE_URL) {
    try {
      const { default: prisma } = await import('./utils/prisma');
      const rows = await prisma.business.findMany({
        where: { whatsappPhoneId: { not: null }, whatsappToken: { not: null } },
        select: { whatsappPhoneId: true },
      });
      businessesWithWhapi = rows.length;
      channelIds = rows.map((r) => r.whatsappPhoneId!).filter(Boolean);
    } catch {
      // ignore
    }
  }

  res.json({
    status: 'ok',
    provider: 'whapi',
    webhookUrl: `${railwayUrl}/webhook/whapi`,
    webhookGet: `${railwayUrl}/webhook/whapi`,
    healthQueue: `${railwayUrl}/health/queue`,
    webhookDebug: `${railwayUrl}/health/webhook-debug`,
    env: {
      WHATSAPP_PROVIDER: process.env.WHATSAPP_PROVIDER || 'not set',
      REDIS_URL: Boolean(process.env.REDIS_URL),
      AI_PROVIDER: process.env.AI_PROVIDER || 'auto',
      GROQ_API_KEY: Boolean(process.env.GROQ_API_KEY),
      GROQ_MODEL: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      OPENAI_API_KEY: Boolean(process.env.OPENAI_API_KEY),
      AI_CONFIGURED: (await import('./ai/provider')).isAiConfigured(),
      AI_ACTIVE: (await import('./ai/provider')).getAiProviderLabel(),
      WHAPI_WEBHOOK_SECRET: Boolean(process.env.WHAPI_WEBHOOK_SECRET),
      WHAPI_USE_QUEUE: process.env.WHAPI_USE_QUEUE === 'true',
    },
    businessesConfigured: businessesWithWhapi,
    channelIdsInDb: channelIds,
    whapiPanelSteps: [
      `1. panel.whapi.cloud → Channel → Settings → Webhooks`,
      `2. URL: ${railwayUrl}/webhook/whapi`,
      `3. Events: messages (POST)`,
      `4. Copy Channel ID → Dashboard → Settings → WhatsApp → Phone/Channel ID`,
      `5. Copy API Token → Dashboard → Settings → WhatsApp → Token → Save → Test`,
    ],
  });
});

app.get('/health/whatsapp', async (_req, res) => {
  const verifyTokenSet = Boolean(process.env.WHATSAPP_VERIFY_TOKEN?.trim());
  let businessesWithWhatsApp = 0;
  if (process.env.DATABASE_URL) {
    try {
      const { default: prisma } = await import('./utils/prisma');
      businessesWithWhatsApp = await prisma.business.count({
        where: {
          whatsappPhoneId: { not: null },
          whatsappToken: { not: null },
        },
      });
    } catch {
      // ignore — reported below
    }
  }
  res.json({
    status: 'ok',
    webhookGet: '/webhook/whatsapp',
    webhookPost: '/webhook/whatsapp',
    verifyTokenConfigured: verifyTokenSet,
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v21.0',
    provider: process.env.WHATSAPP_PROVIDER || 'meta',
    whapiWebhook: '/webhook/whapi',
    databaseConnected: Boolean(process.env.DATABASE_URL),
    businessesWithPhoneIdAndToken: businessesWithWhatsApp,
    hint: verifyTokenSet
      ? 'Meta webhook verify token must match WHATSAPP_VERIFY_TOKEN on Railway'
      : 'Set WHATSAPP_VERIFY_TOKEN on Railway (e.g. saudichat_verify_token)',
    whapiHint: 'For Whapi: set WHATSAPP_PROVIDER=whapi, webhook URL /webhook/whapi, save Channel ID + API token in Dashboard',
  });
});

app.get('/health/db', async (_req, res) => {
  if (!process.env.DATABASE_URL) {
    res.status(503).json({ status: 'error', message: 'DATABASE_URL not set' });
    return;
  }
  try {
    const { default: prisma } = await import('./utils/prisma');
    await prisma.$queryRaw`SELECT 1`;
    let businessMemberReady = false;
    let agencyProjectTable = false;
    try {
      await prisma.$queryRaw`SELECT 1 FROM "BusinessMember" LIMIT 1`;
      businessMemberReady = true;
    } catch {
      businessMemberReady = false;
    }
    try {
      await prisma.$queryRaw`SELECT 1 FROM "AgencyProject" LIMIT 1`;
      agencyProjectTable = true;
    } catch {
      agencyProjectTable = false;
    }
    res.json({
      status: 'ok',
      database: 'connected',
      businessMemberTable: businessMemberReady,
      agencyProjectTable,
      hint: businessMemberReady && agencyProjectTable
        ? 'Schema OK'
        : 'Run backend/scripts/sync-schema.sql in Neon SQL editor, then redeploy Railway',
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      database: 'failed',
      message: error instanceof Error ? error.message : 'Database error',
    });
  }
});

// Socket.io for real-time updates
io.on('connection', (socket) => {
  socket.on('join-business', (businessId: string) => {
    socket.join(`business:${businessId}`);
  });

  socket.on('leave-business', (businessId: string) => {
    socket.leave(`business:${businessId}`);
  });
});

export { io };

app.use(notFoundHandler);
app.use(errorHandler);

async function startServer(): Promise<void> {
  // Listen FIRST so Railway healthcheck passes, then init DB/Redis in background
  httpServer.listen(PORT, HOST, () => {
    console.log(`🚀 SaudiChat Pro API running on http://${HOST}:${PORT}`);
  });

  void initBackgroundServices();
}

async function initBackgroundServices(): Promise<void> {
  if (process.env.DATABASE_URL) {
    try {
      const { default: prisma } = await import('./utils/prisma');
      await prisma.$connect();
      console.log('[startup] Database connected');
    } catch (error) {
      console.error('[startup] Database connection FAILED:', error);
    }

    // Do NOT run schema sync on startup — it OOMs Railway (use Projects → Fix Database Tables)
    console.log('[startup] Schema sync on startup disabled — use POST /manpower/sync-schema when needed');
  } else {
    console.error('[startup] WARNING: DATABASE_URL is not set — login/signup will fail');
  }

  if (process.env.REDIS_URL && process.env.EMBED_WORKER !== 'false') {
    try {
      const { createMessageWorker } = await import('./queue/queues');
      const { processMessageJob } = await import('./queue/messageWorker');
      const worker = createMessageWorker(processMessageJob);
      if (worker) {
        worker.on('error', (err) => console.error('[startup] Message worker error:', err));
        console.log('[startup] Embedded message worker started');
      }

      const { createSendWorker } = await import('./queue/sendWorker');
      const sendWorker = createSendWorker();
      if (sendWorker) {
        sendWorker.on('error', (err) => console.error('[startup] Send worker error:', err));
        console.log('[startup] Embedded send worker started');
      }
    } catch (err) {
      console.warn('[startup] Message worker failed to start:', err);
    }
  }

  if (process.env.REDIS_URL) {
    try {
      const { startScheduledJobsProcessor, startRepeatableJobs } = await import('./jobs/scheduler');
      void startScheduledJobsProcessor();
      void startRepeatableJobs();
      console.log('[startup] Scheduled jobs initializing in background');
    } catch (err) {
      console.warn('[startup] Scheduled jobs failed to start:', err);
    }
  }
}

void startServer();

httpServer.on('error', (error: NodeJS.ErrnoException) => {
  console.error('[startup] Server failed to start:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[runtime] Unhandled rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[runtime] Uncaught exception:', error);
  process.exit(1);
});

export default app;
