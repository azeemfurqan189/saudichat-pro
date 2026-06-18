# SaudiChat Pro — Complete Setup Guide (Local + Realtime + Live)

Yeh poora guide hai: local run, realtime kaise kaam karta hai, aur live deploy.

---

## 1. Project kya hai?

**SaudiChat Pro** = WhatsApp Business automation SaaS for Saudi SMEs.

```
Customer (WhatsApp) → Meta API → Backend (Railway) → Database (Neon/Supabase)
                                        ↓
Business Owner ← Dashboard (Vercel) ← REST API + Socket.io
```

**Parts:**
| Folder | Kaam |
|--------|------|
| `frontend/` | Next.js dashboard (Arabic/English) |
| `backend/` | Express API + WhatsApp bot + Socket.io |
| `backend/prisma/` | Database schema (14 tables) |

---

## 2. Zaroori cheezein (accounts + tools)

### Apne PC par
- **Node.js 18+** — https://nodejs.org
- **Git** — https://git.github.com
- **VS Code / Cursor**

### Free accounts (live ke liye)
| # | Service | Kaam | Link |
|---|---------|------|------|
| 1 | **Neon** ya **Supabase** | PostgreSQL database | neon.tech / supabase.com |
| 2 | **GitHub** | Code hosting | github.com |
| 3 | **Railway** | Backend 24/7 + Socket.io + WhatsApp webhook | railway.app |
| 4 | **Vercel** | Frontend hosting | vercel.com |

### Baad mein (WhatsApp + AI)
| Service | Kaam |
|---------|------|
| **Meta Developer** | WhatsApp Business API |
| **OpenAI** | Smart bot replies (optional) |

### Monthly cost
- Local: **$0**
- Live MVP: **~$5/month** (Railway) — baaki free tier

---

## 3. Local setup — step by step

### Step 3.1 — PowerShell fix (Windows)

Agar error aaye: `npm.ps1 cannot be loaded`

**Option A — `npm.cmd` use karo:**
```powershell
npm.cmd run dev
```

**Option B — permanent fix:**
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

**Option C — CMD use karo** (Command Prompt) — wahan `npm run dev` seedha chalega.

---

### Step 3.2 — Backend `.env` file

File: `backend/.env` (`.env.example` se copy karo)

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
JWT_SECRET="apna-32-char-random-secret-yahan-likho"
JWT_EXPIRES_IN=7d
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
OPENAI_API_KEY=
WHATSAPP_VERIFY_TOKEN=saudichat_verify_token
WHATSAPP_API_VERSION=v21.0
```

**DATABASE_URL options:**
- **Neon** (abhi project mein hai): neon.tech → project → connection string
- **Supabase**: supabase.com → Settings → Database → URI

---

### Step 3.3 — Frontend `.env.local`

File: `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

---

### Step 3.4 — Install + database

**Terminal 1 — Backend setup (sirf pehli dafa):**
```powershell
cd "C:\Users\SAEED COPUTERS\Desktop\cruser rojrct\saudichat-pro\backend"
npm.cmd install
npx prisma generate
npx prisma db push
npm.cmd run db:seed
```

**Root folder (optional — dono ek saath chalane ke liye):**
```powershell
cd "C:\Users\SAEED COPUTERS\Desktop\cruser rojrct\saudichat-pro"
npm.cmd install
```

---

### Step 3.5 — Servers start karo

**Option A — Dono ek saath (recommended):**
```powershell
cd "C:\Users\SAEED COPUTERS\Desktop\cruser rojrct\saudichat-pro"
npm.cmd run dev
```

**Option B — Alag terminals:**

Terminal 1 — Backend:
```powershell
cd backend
npm.cmd run dev
```
→ http://localhost:4000

Terminal 2 — Frontend:
```powershell
cd frontend
npm.cmd run dev
```
→ http://localhost:3000

---

### Step 3.6 — Test karo

| Check | URL | Expected |
|-------|-----|----------|
| Backend health | http://localhost:4000/health | `{"status":"ok"}` |
| Frontend | http://localhost:3000 | Landing page |
| Login | http://localhost:3000/login | Phone: `+966501234567` / Password: `password123` |
| Dashboard | After login | 3 demo businesses |

**Agar port busy ho (`EADDRINUSE`):**
```powershell
netstat -ano | findstr :4000
taskkill /PID <PID_NUMBER> /F
```

---

## 4. Realtime — kaise kaam karta hai?

### Architecture

```
Backend (port 4000)
├── Express REST API     → /api/*  (orders, login, messages)
├── Socket.io Server     → same port, WebSocket connection
└── WhatsApp Webhook     → /webhook/whatsapp
```

Socket.io backend par **automatic start** hota hai jab `npm run dev` chalao — alag command nahi chahiye.

### Abhi project mein kya hai?

| Feature | Status |
|---------|--------|
| Socket.io server backend par | ✅ Chal raha hai |
| Frontend socket connect | ❌ Abhi wired nahi |
| Backend `io.emit()` on new message | ❌ Abhi nahi |
| Conversations auto-refresh | ✅ Har **5 second** poll (`refetchInterval: 5000`) |

**Matlab:** Conversations page **semi-realtime** hai — har 5 sec refresh. Poora instant realtime ke liye code update chahiye (neeche Phase 2).

### Realtime abhi kaise "run" karein?

1. Backend start karo (Socket.io auto on)
2. Frontend start karo
3. Login → Dashboard → **Conversations** page kholo
4. Messages har 5 second refresh honge

### True realtime (future — code change)

1. Frontend: `socket.io-client` connect to `http://localhost:4000`
2. Dashboard par: `socket.emit('join-business', businessId)`
3. Backend: naya message aaye → `io.to('business:'+id).emit('new-message', data)`
4. Frontend: event suno → messages list update

Live par same — Socket.io Railway backend se connect hoga:
```env
NEXT_PUBLIC_SOCKET_URL=https://YOUR-RAILWAY-URL.up.railway.app
```

---

## 5. WhatsApp realtime flow (live)

Jab WhatsApp connect ho:

```
1. Customer WhatsApp message bhejta hai
2. Meta → POST https://YOUR-RAILWAY-URL/webhook/whatsapp
3. Backend message save karta hai + bot reply bhejta hai
4. Dashboard Conversations mein dikhta hai (poll ya socket se)
```

**Meta setup (live ke baad):**
1. https://developers.facebook.com → App banao
2. WhatsApp → API Setup
3. Webhook URL: `https://YOUR-RAILWAY-URL/webhook/whatsapp`
4. Verify token: `saudichat_verify_token`
5. Dashboard → Settings → WhatsApp Phone ID + Token daalo

---

## 6. Live deploy — poora order

```
Database ready → GitHub push → Railway (backend) → Vercel (frontend) → env link → WhatsApp
```

### Phase A — Database (Neon ya Supabase)

Pehle se Neon connected hai. Supabase switch karna ho:
1. supabase.com → New Project
2. Connection string copy
3. `backend/.env` mein `DATABASE_URL` update
4. `npx prisma db push` + `npm run db:seed`

### Phase B — GitHub

```powershell
cd "C:\Users\SAEED COPUTERS\Desktop\cruser rojrct"
git add saudichat-pro
git commit -m "SaudiChat Pro ready for deploy"
git push origin main
```

⚠️ **`.env` commit MAT karo** — secrets leak honge.

### Phase C — Railway (Backend FIRST)

1. https://railway.app → GitHub login
2. New Project → Deploy from GitHub → `saudichat-pro`
3. Settings → **Root Directory:** `backend`
4. Variables:

```
DATABASE_URL=postgresql://...
JWT_SECRET=production-random-secret-32-chars-min
JWT_EXPIRES_IN=7d
NODE_ENV=production
FRONTEND_URL=https://placeholder.vercel.app
WHATSAPP_VERIFY_TOKEN=saudichat_verify_token
WHATSAPP_API_VERSION=v21.0
OPENAI_API_KEY=sk-... (optional)
```

5. Networking → Generate Domain
6. Test: `https://YOUR-URL.up.railway.app/health`

### Phase D — Vercel (Frontend SECOND)

1. https://vercel.com → GitHub login
2. Import `saudichat-pro` → Root Directory: **`frontend`**
3. Environment Variable:
```
NEXT_PUBLIC_API_URL=https://YOUR-RAILWAY-URL.up.railway.app/api
```
4. Deploy → copy Vercel URL

### Phase E — Link dono

Railway Variables update:
```
FRONTEND_URL=https://your-app.vercel.app
```
Railway **Redeploy** karo.

### Phase F — Live test

- Vercel URL → login `+966501234567` / `password123`
- Dashboard data load hona chahiye

---

## 7. Environment variables — poori list

### Backend (`backend/.env`)

| Variable | Local | Production | Required |
|----------|-------|------------|----------|
| `DATABASE_URL` | Neon/Supabase URI | Same | ✅ |
| `JWT_SECRET` | any 32+ chars | strong random | ✅ |
| `JWT_EXPIRES_IN` | `7d` | `7d` | ✅ |
| `PORT` | `4000` | Railway auto | ✅ |
| `NODE_ENV` | `development` | `production` | ✅ |
| `FRONTEND_URL` | `http://localhost:3000` | Vercel URL | ✅ |
| `OPENAI_API_KEY` | empty OK | sk-... | Optional |
| `WHATSAPP_VERIFY_TOKEN` | `saudichat_verify_token` | same | ✅ |
| `WHATSAPP_API_VERSION` | `v21.0` | `v21.0` | ✅ |

### Frontend (`frontend/.env.local`)

| Variable | Local | Production |
|----------|-------|------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000/api` | `https://RAILWAY-URL/api` |

---

## 8. Common errors + fix

| Error | Fix |
|-------|-----|
| `npm.ps1 cannot be loaded` | `npm.cmd run dev` ya ExecutionPolicy fix |
| `EADDRINUSE :4000` | Purana process band karo (`taskkill`) |
| Login network error | `NEXT_PUBLIC_API_URL` check karo |
| CORS error | `FRONTEND_URL` exact Vercel URL honi chahiye |
| Database error | Supabase paused? Connection string sahi? |
| WhatsApp webhook fail | HTTPS URL + verify token match |
| Empty dashboard | `npm run db:seed` chalao |

---

## 9. Daily commands (yaad rakho)

```powershell
# Local start
cd saudichat-pro
npm.cmd run dev

# Database reset + demo data
cd backend
npx prisma db push
npm.cmd run db:seed

# Database GUI
npx prisma studio
```

---

## 10. Agla kaam (priority)

| # | Kaam | Kyun |
|---|------|------|
| 1 | Live deploy (Railway + Vercel) | Internet par chalao |
| 2 | WhatsApp Meta connect | Real messages |
| 3 | Socket.io frontend wire | Instant realtime |
| 4 | Moyasar billing | Paisa kamao |
| 5 | Bot order flow complete | End-to-end orders |

---

## Quick reference

```
LOCAL:
  Frontend → http://localhost:3000
  Backend  → http://localhost:4000
  Health   → http://localhost:4000/health
  Login    → +966501234567 / password123

LIVE:
  Frontend → https://YOUR-APP.vercel.app
  Backend  → https://YOUR-APP.up.railway.app
  Webhook  → https://YOUR-APP.up.railway.app/webhook/whatsapp
```
