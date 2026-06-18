# SaudiChat Pro — Complete Documentation (All MD Files Combined)

> **Last updated:** June 10, 2026  
> Yeh file sab documentation ko ek jagah rakhti hai. Quick status ke liye pehle **`KYA-READY-HAI.md`** dekho.

---

## Table of Contents

1. [Quick Status — Kya Ready Hai](#1-quick-status--kya-ready-hai)
2. [README — Project Intro](#2-readme--project-intro)
3. [BUILD-STATUS — Build Progress](#3-build-status--build-progress)
4. [BUSINESS-OS-BLUEPRINT — 80 Modules](#4-business-os-blueprint--80-modules)
5. [SETUP-COMPLETE — Local Setup Guide](#5-setup-complete--local-setup-guide)
6. [DEPLOY — Production Deploy (Railway + Vercel)](#6-deploy--production-deploy-railway--vercel)
7. [VERCEL-DEPLOY — Frontend Steps](#7-vercel-deploy--frontend-steps)
8. [LIVE-DEPLOY-A-TO-Z — Full Phases 0–5](#8-live-deploy-a-to-z--full-phases-05)
9. [WHAPI-RAILWAY-LIVE — Whapi Integration](#9-whapi-railway-live--whapi-integration)
10. [RAILWAY-FIX — Common Railway Errors](#10-railway-fix--common-railway-errors)
11. [META-TEST-LIVE-GUIDE — Meta WhatsApp Test](#11-meta-test-live-guide--meta-whatsapp-test)
12. [DEPLOY-NAMECHEAP — VPS Deploy](#12-deploy-namecheap--vps-deploy)
13. [Frontend README](#13-frontend-readme)

---

# 1. Quick Status — Kya Ready Hai

**Overall Business OS: ~85% complete** (80 modules tracked)

| Layer | % |
|-------|---|
| Backend API | ~93% |
| Frontend Dashboard | ~93% |
| WhatsApp Bot | ~90% |
| AI System | ~72% |
| Omnichannel | ~60% |
| Industry Modules | ~85% |

**Live URLs:**
- Backend: `https://saudichat-pro-production.up.railway.app`
- Frontend: `https://saudichat-pro.vercel.app`
- Demo: `+966501234567` / `password123`

**✅ Complete:** WhatsApp bot, AI agents, CRM, leads, pipeline, tasks, workflows, inventory, marketing, loyalty, referrals, reviews, unified inbox, live chat, AI advisor, executive dashboard, PDF reports, API keys, VAT, PDPL API, suppliers, deliveries, industry modules (Real Estate, Hotel, Logistics, Education, Automotive)

**🟡 Partial:** Email (SMTP), SMS (Unifonic), Instagram/Facebook (Meta tokens), Billing (Moyasar), Visual workflow drag-drop

**❌ Not Built:** Mada/STC Pay, Mobile app, White-label, QuickBooks, Phone calls, Attendance, Fraud detection, Enterprise SSO, Travel agency module

→ Full detail: **`KYA-READY-HAI.md`**

---

# 2. README — Project Intro

**SaudiChat Pro** — WhatsApp Business Automation for Saudi SMEs. Multi-tenant SaaS where each business gets its own dashboard and WhatsApp bot.

## Features

- Multi-tenant architecture (restaurants, salons, clinics, retail, etc.)
- AI-powered WhatsApp bot (GPT-4, Arabic NLP, Saudi dialect)
- Industry-specific dashboards
- Orders, appointments, catalog, customers, marketing
- Live conversations with human handoff
- Analytics & reporting
- Dark/Light mode + Arabic/English (RTL/LTR)
- Glassmorphism UI with Framer Motion animations

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Shadcn-style UI, React Query, Framer Motion |
| Backend | Node.js, Express, TypeScript, Prisma ORM |
| Database | PostgreSQL + Redis |
| Real-time | Socket.io |
| WhatsApp | Meta WhatsApp Cloud API |
| AI | OpenAI GPT-4 |

## Project Structure

```
saudichat-pro/
├── frontend/          # Next.js 14 App Router
├── backend/           # Express API + Prisma
└── whatsapp-bot/      # Bot engine (flows, handlers, AI)
```

## Quick Start

### Backend

```bash
cd backend
npm install
cp .env.example .env
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev            # http://localhost:4000
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev            # http://localhost:3000
```

### Demo Credentials

- **Phone:** +966501234567
- **Password:** password123

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/signup` | Register (sends OTP) |
| POST | `/api/auth/verify-otp` | Verify OTP |
| GET | `/api/businesses/:id/dashboard` | Dashboard stats |
| GET | `/api/businesses/:id/orders` | List orders |
| GET | `/api/businesses/:id/conversations` | List chats |
| POST | `/webhook/whatsapp` | WhatsApp webhook |

## Design System

- **Primary:** Saudi Green `#0B5E42`
- **Secondary:** Gold `#C8963E`
- **Fonts:** Inter (EN), Cairo (AR)

---

# 3. BUILD-STATUS — Build Progress

> Last updated: June 9, 2026

## Dashboard Pages (28)

| Page | Path | Status |
|------|------|--------|
| Overview | `/dashboard/[id]` | ✅ |
| Unified Inbox | `/inbox` | ✅ |
| AI Bot | `/ai` | ✅ |
| Orders | `/orders` | ✅ |
| Appointments | `/appointments` | ✅ |
| Catalog | `/catalog` | ✅ |
| Inventory | `/inventory` | ✅ |
| Customers | `/customers` | ✅ |
| Leads | `/leads` | ✅ |
| Sales Pipeline | `/pipeline` | ✅ |
| Tasks | `/tasks` | ✅ |
| Workflows | `/workflows` | ✅ |
| Conversations | `/conversations` | ✅ |
| Marketing | `/marketing` | ✅ |
| Reviews | `/reviews` | ✅ |
| AI Advisor | `/advisor` | ✅ |
| Deliveries | `/deliveries` | ✅ |
| Suppliers | `/suppliers` | ✅ |
| API & Developers | `/developers` | ✅ |
| Properties (Real Estate) | `/properties` | ✅ |
| Hotel | `/hotel` | ✅ |
| Logistics | `/logistics` | ✅ |
| Courses (Education) | `/courses` | ✅ |
| Workshop (Automotive) | `/workshop` | ✅ |
| Staff | `/staff` | ✅ |
| Analytics + Executive | `/analytics` | ✅ |
| Settings (+ Integrations + PDPL) | `/settings` | ✅ |
| Billing | `/billing` | 🟡 UI only |

## Database Models (48)

Core + industry: Property, PropertyViewing, HotelRoom, HotelReservation, Shipment, FleetVehicle, Course, Enrollment, VehicleJob

---

# 4. BUSINESS-OS-BLUEPRINT — 80 Modules

## Completion Summary

| Category | Modules | Built | Partial | Missing |
|----------|---------|-------|---------|---------|
| Platform Core | 12 | 9 | 2 | 1 |
| Omnichannel | 8 | 4 | 3 | 1 |
| CRM & Sales | 8 | 6 | 2 | 0 |
| Operations | 14 | 10 | 3 | 1 |
| AI Layer | 10 | 5 | 4 | 1 |
| Marketing & Growth | 10 | 7 | 2 | 1 |
| Analytics & BI | 12 | 7 | 4 | 1 |
| Enterprise | 8 | 2 | 3 | 3 |
| **TOTAL** | **80** | **50** | **23** | **7** |

## Key Module Status

| Module | Status |
|--------|--------|
| Core Platform / Auth / Multi-Tenant | ✅ |
| Subscription & Billing | 🟡 UI only |
| CRM, Leads, Pipeline, Marketing | ✅ |
| WhatsApp Integration | ✅ |
| Instagram / Facebook / Email / SMS | 🟡 |
| Website Live Chat | ✅ |
| AI Customer/Sales/Support/Advisor | ✅ |
| Workflow Automation | 🟡 templates |
| Orders, Appointments, Inventory, Catalog | ✅ |
| Deliveries, Suppliers, Logistics | ✅ |
| Reviews, Loyalty, Referrals | ✅ |
| PDPL, Audit Logs, Security | ✅ |
| Industry Modules (8 industries) | ✅ |
| API Ecosystem / Developers | ✅ |
| Mobile App, White-label, SSO | ❌ |

## Billion-Dollar Moat (Built)

1. ✅ WhatsApp-first + Roman Urdu AI
2. ✅ Website menu auto-import
3. ✅ Multi-item cart + COD
4. ✅ AI Business Advisor
5. ✅ Unified inbox (WA + live chat)
6. ✅ Saudi VAT 15%
7. 🟡 PDPL compliance framework

---

# 5. SETUP-COMPLETE — Local Setup Guide

## Architecture

```
Customer (WhatsApp) → Meta API → Backend (Railway) → Database (Neon/Supabase)
                                        ↓
Business Owner ← Dashboard (Vercel) ← REST API + Socket.io
```

## Local `.env` Files

**Backend (`backend/.env`):**
```env
DATABASE_URL="postgresql://..."
JWT_SECRET="32-char-random-secret"
JWT_EXPIRES_IN=7d
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
OPENAI_API_KEY=
WHATSAPP_VERIFY_TOKEN=saudichat_verify_token
WHATSAPP_API_VERSION=v21.0
```

**Frontend (`frontend/.env.local`):**
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

## Start Servers

```powershell
cd saudichat-pro
npm.cmd run dev
```

| Check | URL |
|-------|-----|
| Backend health | http://localhost:4000/health |
| Frontend | http://localhost:3000 |
| Login | +966501234567 / password123 |

## Realtime Status

| Feature | Status |
|---------|--------|
| Socket.io server backend par | ✅ |
| Frontend socket connect | ❌ Not wired |
| Conversations auto-refresh | ✅ Every 5 sec poll |

## Common Errors

| Error | Fix |
|-------|-----|
| `npm.ps1 cannot be loaded` | `npm.cmd run dev` |
| `EADDRINUSE :4000` | `taskkill /PID <PID> /F` |
| Login network error | Check `NEXT_PUBLIC_API_URL` |
| CORS error | `FRONTEND_URL` = exact Vercel URL |

---

# 6. DEPLOY — Production Deploy (Railway + Vercel)

## Best Setup

| Service | Platform |
|---------|----------|
| Frontend | **Vercel** |
| Backend + Bot | **Railway** |
| Database | **Supabase / Neon** |

> Backend Vercel par mat rakho — Express + webhook ko always-on server chahiye.

## Order

```
GitHub push → Railway (backend) → Vercel (frontend) → link env vars → test
```

## Railway Variables

```
DATABASE_URL=postgresql://...
JWT_SECRET=long-random-string
JWT_EXPIRES_IN=7d
NODE_ENV=production
FRONTEND_URL=https://YOUR-APP.vercel.app
WHATSAPP_VERIFY_TOKEN=saudichat_verify_token
WHATSAPP_API_VERSION=v21.0
```

## Vercel Variable

```
NEXT_PUBLIC_API_URL=https://YOUR-RAILWAY-URL/api
```

Root Directory: `saudichat-pro/frontend` (ya `frontend` repo structure ke mutabiq)

---

# 7. VERCEL-DEPLOY — Frontend Steps

## Configure

| Setting | Value |
|---------|-------|
| Framework | Next.js |
| Root Directory | `saudichat-pro/frontend` |
| Build Command | `npm run build` |

## Environment Variable

```
NEXT_PUBLIC_API_URL=https://saudichat-pro-production.up.railway.app/api
```

⚠️ End mein `/api` zaroor lagao!

## Link Railway

Railway → Variables:
```
FRONTEND_URL=https://saudichat-pro.vercel.app
```

Bina iske login CORS error aayega!

## Errors

| Error | Fix |
|-------|-----|
| Build fail "can't find package.json" | Root Directory = `saudichat-pro/frontend` |
| Login network error | `NEXT_PUBLIC_API_URL` = Railway URL + `/api` |
| CORS error | Railway `FRONTEND_URL` = exact Vercel URL |

---

# 8. LIVE-DEPLOY-A-TO-Z — Full Phases 0–5

## Phase 0 — Local Test (1 hr)
- Backend + frontend local chalao
- Login test karo

## Phase 1 — Live Deploy (2–3 hr)
1. Neon/Supabase database ready
2. GitHub push (`.env` commit MAT karo!)
3. Railway backend — Root: `saudichat-pro/backend`, branch `main`
4. Vercel frontend — Root: `saudichat-pro/frontend`
5. `FRONTEND_URL` + `NEXT_PUBLIC_API_URL` link karo
6. Live test

## Phase 2 — SMS OTP (Unifonic)
- `UNIFONIC_APP_SID` + `UNIFONIC_SENDER_ID` Railway par
- OTP Redis/database mein store karo

## Phase 3 — WhatsApp Live (Meta)
- Meta Developer app → WhatsApp product
- Webhook: `https://RAILWAY-URL/webhook/whatsapp`
- Verify token: `saudichat_verify_token`
- Dashboard Settings → Phone ID + Token

## Phase 4 — Realtime (Socket.io)
- Frontend `socket.io-client` connect
- Backend `io.emit('new-message')` on new message
- Vercel: `NEXT_PUBLIC_SOCKET_URL=https://RAILWAY-URL`

## Phase 5 — Business Features
- Moyasar billing keys
- Bot order flow complete (state machine + buttons)

## Timeline

| Din | Phase | Time |
|-----|-------|------|
| 1 | Phase 0 + 1 | ~3 hr |
| 2 | Phase 2 SMS | 2–4 hr |
| 2–3 | Phase 3 WhatsApp | 1–2 hr |
| 3–4 | Phase 4 Realtime | 2–3 hr |
| 5–7 | Phase 5 Billing + Bot | 1–2 weeks |

---

# 9. WHAPI-RAILWAY-LIVE — Whapi Integration

## Railway Settings

| Setting | Value |
|---------|-------|
| Branch | `main` |
| Root Directory | `saudichat-pro/backend` |
| Start Command | `npm run start:prod` |

## Required Variables

```env
WHATSAPP_PROVIDER=whapi
DATABASE_URL=postgresql://...
JWT_SECRET=...
FRONTEND_URL=https://your-app.vercel.app
OPENAI_API_KEY=sk-...          # AI replies
REDIS_URL=redis://...          # recommended
EMBED_WORKER=true
```

## Whapi Webhook

```
https://saudichat-pro-production.up.railway.app/webhook/whapi
```

## Dashboard Settings

1. Provider: **Whapi**
2. **Channel ID** — Whapi panel se
3. **API Token** — Bearer token
4. Save → Test Connection

## Health Checks

| URL | Expected |
|-----|----------|
| `/health` | status ok |
| `/health/whapi` | webhook URL + checklist |
| `/health/queue` | redisConfigured: true |
| `/webhook/whapi` (GET) | "Whapi webhook is live" |

## Flow

```
Customer WhatsApp → Whapi cloud → POST /webhook/whapi
→ Match business by channel_id → Queue (Redis) → AI → Reply
```

---

# 10. RAILWAY-FIX — Common Railway Errors

## Error: "saudichat-pro/backend does not exist"

| Branch | Backend path |
|--------|--------------|
| **main** | `saudichat-pro/backend` |
| **master** (old) | `backend` |

**Fix:** Railway → Branch = `main`, Root Directory = `saudichat-pro/backend`

## Healthcheck Failure

Deploy ab sirf `prisma db push` + server start (seed har deploy par nahi).

Pehli dafa DB khali ho to: `npx prisma db push && npm run db:seed`

## Verify

```
https://YOUR-APP.up.railway.app/health
→ {"status":"ok","service":"SaudiChat Pro API"}
```

---

# 11. META-TEST-LIVE-GUIDE — Meta WhatsApp Test

Sirf **Meta test number** (+1 555…) ke liye jab app unpublished ho.

## Meta Webhook

| Field | Value |
|-------|-------|
| Callback URL | `https://saudichat-pro-production.up.railway.app/webhook/whatsapp` |
| Verify token | `saudichat_verify_token` |
| Subscribe | `messages` ✅ |

## Dashboard Settings

1. Phone number ID (digits only)
2. Access Token (EAA...)
3. Save → Test Connection

## Bot Test

1. WhatsApp → chat test number `+1 555 652 3783`
2. Text: `hello`
3. Bot reply + Dashboard Conversations mein dikhe

## Debug

```
https://saudichat-pro-production.up.railway.app/health/webhook-debug
```

`totalEvents: 0` = Meta webhook Railway tak nahi pahuncha

---

# 12. DEPLOY-NAMECHEAP — VPS Deploy

## Important

| Plan | Works? |
|------|--------|
| Shared Hosting (cPanel) | ❌ NO — PHP only |
| **VPS** | ✅ YES |
| Domain only | Hosting alag chahiye |

## Single VPS Setup

```
yourdomain.com → Namecheap VPS (Ubuntu)
   ├── Nginx (SSL)
   ├── Frontend (Next.js :3000)
   ├── Backend (Express :4000)
   └── Database (Supabase cloud recommended)
```

## Deploy Scripts

```bash
cd /var/www/saudichat-pro
chmod +x deploy/*.sh
bash deploy/install-vps.sh yourdomain.com
bash deploy/build-production.sh https://yourdomain.com
```

## WhatsApp Webhook (VPS)

```
https://yourdomain.com/webhook/whatsapp
```

## Minimum VPS

| Resource | Minimum |
|----------|---------|
| RAM | 2 GB |
| CPU | 1 vCPU |
| OS | Ubuntu 22.04 |

---

# 13. Frontend README

Next.js 14 project bootstrapped with `create-next-app`.

```bash
npm run dev
# → http://localhost:3000
```

Edit `app/page.tsx` to customize.

Deploy on Vercel: https://vercel.com/new

---

## Original Files (Reference)

| File | Purpose |
|------|---------|
| `KYA-READY-HAI.md` | Quick status overview |
| `BUILD-STATUS.md` | Build percentages |
| `BUSINESS-OS-BLUEPRINT.md` | Full 80-module table |
| `SETUP-COMPLETE.md` | Detailed local guide |
| `LIVE-DEPLOY-A-TO-Z.md` | Full deploy phases |
| `VERCEL-DEPLOY.md` | Vercel only |
| `DEPLOY.md` | Quick deploy |
| `WHAPI-RAILWAY-LIVE.md` | Whapi guide |
| `RAILWAY-FIX.md` | Railway fixes |
| `META-TEST-LIVE-GUIDE.md` | Meta test guide |
| `DEPLOY-NAMECHEAP.md` | VPS guide |
| `README.md` | Project intro |

---

*SaudiChat Pro — Built for Vision 2030 digital SMEs*
