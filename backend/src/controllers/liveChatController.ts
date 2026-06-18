import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
// Public — no auth (website widget)
export async function startLiveChatSession(req: Request, res: Response): Promise<void> {
  const { businessId } = req.params;
  const { visitorId, visitorName, visitorEmail } = req.body as Record<string, string>;

  const business = await prisma.business.findUnique({ where: { id: businessId, isActive: true } });
  if (!business) {
    res.status(404).json({ success: false, message: 'Business not found' });
    return;
  }

  const vid = visitorId || `visitor-${Date.now()}`;
  const session = await prisma.liveChatSession.upsert({
    where: { businessId_visitorId: { businessId, visitorId: vid } },
    create: {
      businessId,
      visitorId: vid,
      visitorName: visitorName || 'Visitor',
      visitorEmail,
      status: 'ACTIVE',
    },
    update: { visitorName: visitorName || undefined, visitorEmail, status: 'ACTIVE', updatedAt: new Date() },
  });

  const welcome = await prisma.liveChatMessage.create({
    data: {
      sessionId: session.id,
      senderType: 'BOT',
      content: `Welcome to ${business.name}! How can we help you?`,
    },
  });

  res.json({ success: true, data: { session, welcome } });
}

export async function sendLiveChatMessage(req: Request, res: Response): Promise<void> {
  const { businessId, sessionId } = req.params;
  const { content, senderType = 'VISITOR' } = req.body as Record<string, string>;

  const session = await prisma.liveChatSession.findFirst({
    where: { id: sessionId, businessId },
  });
  if (!session) {
    res.status(404).json({ success: false, message: 'Session not found' });
    return;
  }

  const message = await prisma.liveChatMessage.create({
    data: { sessionId, senderType, content: String(content || '') },
  });

  await prisma.liveChatSession.update({
    where: { id: sessionId },
    data: { updatedAt: new Date() },
  });

  let botReply: string | null = null;
  if (senderType === 'VISITOR' && content?.trim()) {
    try {
      const { processLiveChatWithAI } = await import('../agent/autonomous/multiChannel');
      botReply = await processLiveChatWithAI(businessId, sessionId, String(content));
    } catch (err) {
      console.warn('[liveChat] AI reply failed:', err instanceof Error ? err.message : err);
    }
  }

  try {
    const { io } = await import('../index');
    io?.to(`business:${businessId}`).emit('live-chat-message', { sessionId, message });
    if (botReply) {
      const botMsg = await prisma.liveChatMessage.findFirst({
        where: { sessionId, senderType: 'BOT' },
        orderBy: { createdAt: 'desc' },
      });
      if (botMsg) io?.to(`business:${businessId}`).emit('live-chat-message', { sessionId, message: botMsg });
    }
  } catch {
    // socket optional
  }

  res.status(201).json({ success: true, data: message, botReply });
}

export async function getLiveChatMessages(req: Request, res: Response): Promise<void> {
  const messages = await prisma.liveChatMessage.findMany({
    where: { sessionId: req.params.sessionId },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ success: true, data: messages });
}

// Dashboard — auth required
export async function getLiveChatSessions(req: AuthRequest, res: Response): Promise<void> {
  const sessions = await prisma.liveChatSession.findMany({
    where: { businessId: req.params.businessId },
    include: { messages: { take: 1, orderBy: { createdAt: 'desc' } } },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });
  res.json({ success: true, data: sessions });
}

export async function replyLiveChat(req: AuthRequest, res: Response): Promise<void> {
  const { content } = req.body as { content: string };
  const session = await prisma.liveChatSession.findFirst({
    where: { id: req.params.sessionId, businessId: req.params.businessId },
  });
  if (!session) {
    res.status(404).json({ success: false, message: 'Session not found' });
    return;
  }

  const message = await prisma.liveChatMessage.create({
    data: { sessionId: session.id, senderType: 'AGENT', content },
  });

  try {
    const { io } = await import('../index');
    io?.to(`business:${req.params.businessId}`).emit('live-chat-message', {
      sessionId: session.id,
      message,
    });
  } catch {
    // optional
  }

  res.status(201).json({ success: true, data: message });
}

export function getWidgetScript(_req: Request, res: Response): void {
  const apiUrl = process.env.PUBLIC_API_URL || 'https://saudichat-pro-production.up.railway.app';
  const script = `(function(){
  var bid=window.SAUDICHAT_BUSINESS_ID;
  if(!bid)return;
  var vId=localStorage.getItem('sc_vid')||('v'+Date.now());
  localStorage.setItem('sc_vid',vId);
  var API='${apiUrl}';
  var btn=document.createElement('div');
  btn.innerHTML='💬';
  btn.style.cssText='position:fixed;bottom:20px;right:20px;width:56px;height:56px;background:#25D366;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.2);z-index:99999';
  var box=document.createElement('div');
  box.style.cssText='display:none;position:fixed;bottom:84px;right:20px;width:320px;height:400px;background:#fff;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.15);z-index:99999;flex-direction:column;font-family:sans-serif';
  box.innerHTML='<div style="padding:12px;background:#25D366;color:#fff;border-radius:12px 12px 0 0;font-weight:bold">Chat with us</div><div id="sc_msgs" style="flex:1;overflow-y:auto;padding:12px;font-size:14px"></div><div style="padding:8px;display:flex;gap:8px"><input id="sc_inp" placeholder="Type a message..." style="flex:1;padding:8px;border:1px solid #ddd;border-radius:8px"/><button id="sc_send" style="padding:8px 12px;background:#25D366;color:#fff;border:none;border-radius:8px;cursor:pointer">Send</button></div>';
  document.body.appendChild(btn);document.body.appendChild(box);
  var sid=null;
  btn.onclick=function(){box.style.display=box.style.display==='none'?'flex':'none';if(!sid)fetch(API+'/public/chat/'+bid+'/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({visitorId:vId})}).then(r=>r.json()).then(d=>{sid=d.data.session.id;addMsg('BOT',d.data.welcome.content)});};
  function addMsg(t,c){var m=document.getElementById('sc_msgs');var d=document.createElement('div');d.style.marginBottom='8px';d.innerHTML='<b>'+t+':</b> '+c;m.appendChild(d);m.scrollTop=m.scrollHeight;}
  document.getElementById('sc_send').onclick=function(){var inp=document.getElementById('sc_inp');var t=inp.value.trim();if(!t||!sid)return;addMsg('You',t);inp.value='';fetch(API+'/public/chat/'+bid+'/sessions/'+sid+'/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:t})});};
})();`;
  res.setHeader('Content-Type', 'application/javascript');
  res.send(script);
}
