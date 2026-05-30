import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/auth';
import { apiLimiter } from './middleware/rateLimit';
import { handleWhatsAppWebhook } from './services/whatsappWebhook';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api', apiLimiter, routes);

// WhatsApp webhook
app.get('/webhook/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post('/webhook/whatsapp', handleWhatsAppWebhook);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'SaudiChat Pro API', timestamp: new Date().toISOString() });
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

httpServer.listen(PORT, () => {
  console.log(`🚀 SaudiChat Pro API running on port ${PORT}`);
});

export default app;
