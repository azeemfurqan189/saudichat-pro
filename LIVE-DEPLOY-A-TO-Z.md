# SaudiChat Pro — A to Z Live Deploy Guide (All 5 Phases)

Yeh poora guide hai — kya karna hai, kahan karna hai, kab karna hai, koi file upload nahi manually (GitHub se auto deploy).

---

## Pehle samjho — kya upload karna hai?

| Cheez | Upload kahan? | Kaise? |
|-------|---------------|--------|
| **Code** (frontend + backend) | GitHub | `git push` — files manually upload NAHI |
| **Secrets** (.env passwords) | Railway + Vercel dashboard | Copy-paste variables mein |
| **Database** | Neon/Supabase (cloud) | Connection string sirf `.env` mein |
| **Images/files** | Abhi zaroori nahi | Baad mein Supabase Storage |

**Aapko koi ZIP upload nahi karni.** Sab GitHub → Railway/Vercel automatic deploy hota hai.

---

## Accounts banao (ek dafa — sab free start)

| # | Website | Email se signup |
|---|---------|-----------------|
| 1 | https://github.com | Code store |
| 2 | https://neon.tech YA https://supabase.com | Database |
| 3 | https://railway.app | Backend hosting |
| 4 | https://vercel.com | Frontend hosting |
| 5 | https://developers.facebook.com | WhatsApp (Phase 3) |
| 6 | https://unifonic.com | SMS OTP (Phase 2) |
| 7 | https://moyasar.com | Payments (Phase 5) |

---

# ═══════════════════════════════════════
# PHASE 0 — Pehle local par sab theek karo
# ═══════════════════════════════════════

**Kab:** Deploy se PEHLE (1 ghanta)

### Step 0.1 — Node.js check
```powershell
node -v
```
→ `v18` ya `v20+` hona chahiye. Nahi hai to https://nodejs.org se install karo.

### Step 0.2 — PowerShell fix (Windows)
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```
Ya hamesha `npm.cmd` use karo instead of `npm`.

### Step 0.3 — Backend setup
```powershell
cd "C:\Users\SAEED COPUTERS\Desktop\cruser rojrct\saudichat-pro\backend"
npm.cmd install
npx prisma generate
npx prisma db push
npm.cmd run db:seed
npm.cmd run dev
```
Browser: http://localhost:4000/health → `{"status":"ok"}`

### Step 0.4 — Frontend setup (dusri terminal)
```powershell
cd "C:\Users\SAEED COPUTERS\Desktop\cruser rojrct\saudichat-pro\frontend"
npm.cmd install
npm.cmd run dev
```
Browser: http://localhost:3000 → Login: `+966501234567` / `password123`

### Step 0.5 — `.env` file check

**File location:** `saudichat-pro/backend/.env` (apne PC par, GitHub par NAHI)

```env
DATABASE_URL="postgresql://..."       ← Neon ya Supabase string
JWT_SECRET="32-char-random-secret"
JWT_EXPIRES_IN=7d
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
OPENAI_API_KEY=
WHATSAPP_VERIFY_TOKEN=saudichat_verify_token
WHATSAPP_API_VERSION=v21.0
```

**File location:** `saudichat-pro/frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

✅ **Phase 0 done** jab local login + dashboard chal jaye.

---

# ═══════════════════════════════════════
# PHASE 1 — Live Deploy (ZAROORI)
# ═══════════════════════════════════════

**Kab:** Phase 0 ke baad (2-3 ghante)
**Result:** Internet par website + API live

---

## STEP 1.1 — Database ready karo (Neon — already hai)

**Kahan:** https://console.neon.tech

1. Login karo
2. Apna project kholo
3. **Dashboard → Connection Details**
4. **Connection string** copy karo (PostgreSQL URI)
   ```
   postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require
   ```
5. Yeh string save karo — Railway par paste karni hai

**Agar Supabase use karna ho:**
1. https://supabase.com → New Project
2. Settings → Database → URI copy
3. Local par `DATABASE_URL` change → `npx prisma db push` + `npm run db:seed`

---

## STEP 1.2 — GitHub par code push karo

**Kahan:** Apne PC terminal + https://github.com

### ⚠️ IMPORTANT — yeh files KABHI commit mat karo:
- `backend/.env` (password hai!)
- `frontend/.env.local`
- `node_modules/` folders

### Terminal commands:

```powershell
cd "C:\Users\SAEED COPUTERS\Desktop\cruser rojrct"

# .env git se hatao agar tracked hai
git rm --cached saudichat-pro/backend/.env 2>$null

# Status dekho
git status

# Sirf code add karo (node_modules nahi)
git add saudichat-pro/
git add .gitignore

# Commit
git commit -m "SaudiChat Pro ready for live deploy"

# Push
git push origin main
```

**GitHub repo:** https://github.com/azeemfurqan189/saudichat-pro

Browser mein check karo — `saudichat-pro/backend` aur `saudichat-pro/frontend` folders dikhne chahiye.

> **Note:** Agar repo root mein directly `backend/` aur `frontend/` hain (bina saudichat-pro folder), to Railway Root Directory sirf `backend` hoga. Apne GitHub repo structure ke mutabiq adjust karo.

---

## STEP 1.3 — Railway par Backend deploy (PEHLE YEH)

**Kahan:** https://railway.app

### 1. Account
- **Login with GitHub** click karo
- GitHub access allow karo

### 2. New Project
- **New Project** → **Deploy from GitHub repo**
- Repo select: `saudichat-pro` (ya jo repo name ho)
- Wait — build shuru hoga

### 3. Root Directory set karo
- Project → Service click karo
- **Settings** tab
- **Root Directory:** 
  - Agar repo mein `saudichat-pro/backend` hai → `saudichat-pro/backend`
  - Agar repo root mein `backend/` hai → `backend`
- **Save**

### 4. Environment Variables add karo
- **Variables** tab → **Raw Editor** ya **New Variable**

Yeh sab paste karo (apni values se replace):

```
DATABASE_URL=postgresql://YOUR_NEON_CONNECTION_STRING
JWT_SECRET=production-secret-minimum-32-characters-random
JWT_EXPIRES_IN=7d
NODE_ENV=production
FRONTEND_URL=https://placeholder.vercel.app
WHATSAPP_VERIFY_TOKEN=saudichat_verify_token
WHATSAPP_API_VERSION=v21.0
OPENAI_API_KEY=
```

**JWT_SECRET generate karo:** koi random 32+ character string, example:
```
SaudiChat2026SecureKey_xK9mP2nQ7rT4wL8vB3jH6
```

### 5. Public URL generate karo
- **Settings** → **Networking** → **Generate Domain**
- URL milega jaise: `https://saudichat-pro-production.up.railway.app`
- **Yeh URL save karo!**

### 6. Test karo
Browser mein kholo:
```
https://YOUR-RAILWAY-URL.up.railway.app/health
```
Response:
```json
{"status":"ok","service":"SaudiChat Pro API"}
```

### 7. Database tables (pehli dafa Railway par)
Railway **Settings → Deploy** ya local se:
```powershell
cd backend
# DATABASE_URL production wali set karke:
npx prisma db push
npm.cmd run db:seed
```

---

## STEP 1.4 — Vercel par Frontend deploy (PHIR YEH)

**Kahan:** https://vercel.com

### 1. Account
- **Sign Up** → **Continue with GitHub**

### 2. Import Project
- **Add New Project**
- GitHub repo select: `saudichat-pro`
- **Import**

### 3. Configure Project
| Setting | Value |
|---------|-------|
| **Framework Preset** | Next.js (auto detect) |
| **Root Directory** | `saudichat-pro/frontend` YA `frontend` (repo structure ke mutabiq) |
| **Build Command** | `npm run build` (default) |
| **Output Directory** | `.next` (default) |

### 4. Environment Variable
**Name:** `NEXT_PUBLIC_API_URL`
**Value:** `https://YOUR-RAILWAY-URL.up.railway.app/api`

⚠️ End mein `/api` zaroor lagao!

### 5. Deploy click karo
- 2-3 minute wait
- URL milega: `https://saudichat-pro.vercel.app` (ya similar)
- **Yeh URL save karo!**

---

## STEP 1.5 — Dono ko link karo (ZAROORI)

**Kahan:** Railway → Variables

1. `FRONTEND_URL` update karo:
   ```
   FRONTEND_URL=https://saudichat-pro.vercel.app
   ```
   (apna exact Vercel URL)

2. **Redeploy** karo (Railway automatically redeploy karega ya manual Deploy click)

---

## STEP 1.6 — Live test karo

| Test | URL | Expected |
|------|-----|----------|
| API health | `https://RAILWAY-URL/health` | status ok |
| Website | `https://VERCEL-URL` | Landing page |
| Login | `/login` | Demo: `+966501234567` / `password123` |
| Signup | `/signup` | Form khule (OTP issue Phase 2 mein fix) |
| Dashboard | After login | Data dikhe |

✅ **Phase 1 DONE** — aapka SaaS internet par live hai!

---

# ═══════════════════════════════════════
# PHASE 2 — SMS OTP Fix (Production Signup)
# ═══════════════════════════════════════

**Kab:** Phase 1 ke baad — real users signup se pehle
**Problem:** Live par OTP SMS nahi jata — sirf dev mode mein screen par dikhta hai

---

## STEP 2.1 — Unifonic account

**Kahan:** https://www.unifonic.com

1. **Sign Up** → Business account
2. **Console** login
3. **Applications** → New App banao
4. Copy karo:
   - `APP_SID`
   - `Sender ID` (approved SMS sender name)

---

## STEP 2.2 — Railway mein variables add

```
UNIFONIC_APP_SID=your-app-sid
UNIFONIC_SENDER_ID=your-sender-id
```

---

## STEP 2.3 — Code change (developer karega)

File: `backend/src/utils/auth.ts` ya naya `backend/src/services/sms.ts`

Logic:
```
signup() → OTP generate → Unifonic API se SMS bhejo → user ke phone par OTP aaye
```

Unifonic API example:
```
POST https://el.cloud.unifonic.com/rest/SMS/messages
Body: AppSid, Recipient (+966...), Body: "Your SaudiChat OTP: 1234"
```

**Agar abhi developer nahi hai:** Temporary workaround:
- Railway par `NODE_ENV=development` mat rakho production mein
- Ya signup page par admin manually OTP de (testing only)

---

## STEP 2.4 — OTP storage fix (production)

Abhi OTP memory mein hai — server restart par khatam.

**Option A — Upstash Redis (free):**
1. https://upstash.com → Redis database banao
2. Railway variable: `REDIS_URL=redis://...`
3. Code: OTP Redis mein store karo

**Option B — Database table:**
- `OtpCode` table Prisma mein — phone + otp + expires

---

## STEP 2.5 — Test live signup

1. `https://VERCEL-URL/signup` kholo
2. Apna real `+966` number daalo
3. OTP phone par aana chahiye (SMS)
4. OTP verify → Setup wizard → Dashboard

✅ **Phase 2 DONE** — naye users khud account bana sakte hain.

---

# ═══════════════════════════════════════
# PHASE 3 — WhatsApp Live
# ═══════════════════════════════════════

**Kab:** Phase 1 ke baad (business WhatsApp chahiye)
**Result:** Customers WhatsApp se message karein → bot reply kare → dashboard par dikhe

---

## STEP 3.1 — Meta Developer account

**Kahan:** https://developers.facebook.com

1. **Get Started** → Facebook login
2. **Create App** → Type: **Business**
3. App name: `SaudiChat Pro` (ya apna business name)
4. **Add Product** → **WhatsApp** → **Set Up**

---

## STEP 3.2 — WhatsApp test number (free)

Meta dashboard mein:
1. **WhatsApp → API Setup**
2. **Temporary access token** copy karo (24h valid — baad mein permanent)
3. **Phone number ID** copy karo
4. **Test number** add karo (apna WhatsApp number verify karo)

Save karo:
```
Phone Number ID: 123456789012345
Access Token: EAAxxxxx...
Test Number: +966XXXXXXXXX
```

---

## STEP 3.3 — Webhook connect karo

**Kahan:** Meta Developer → WhatsApp → Configuration → Webhook

| Field | Value |
|-------|-------|
| **Callback URL** | `https://YOUR-RAILWAY-URL.up.railway.app/webhook/whatsapp` |
| **Verify token** | `saudichat_verify_token` |
| **Subscribe to** | `messages` ✅ |

**Verify and Save** click karo.

⚠️ Railway backend **chalu** hona chahiye webhook verify ke waqt.

---

## STEP 3.4 — Business dashboard mein credentials

**Kahan:** Live website → Login → Setup (ya Settings)

1. Login karo apne account se
2. **Setup wizard** ya **Dashboard → Settings**
3. Fill karo:
   - WhatsApp Number: `+966XXXXXXXXX`
   - Phone Number ID: Meta se copy
   - Access Token: Meta se copy
4. **Save / Test Connection**

---

## STEP 3.5 — Test message bhejo

1. Apne phone se Meta **test number** par WhatsApp message bhejo
   - Example: "مرحبا" ya "menu"
2. Bot reply aana chahiye
3. Dashboard → **Conversations** → message dikhe

---

## STEP 3.6 — Production WhatsApp number (baad mein)

Meta Business verification ke baad:
1. Apna business phone number connect karo
2. **Permanent System User Token** banao (expires nahi hota)
3. Message templates approve karwao (campaigns ke liye)

✅ **Phase 3 DONE** — WhatsApp bot live!

---

# ═══════════════════════════════════════
# PHASE 4 — Realtime Polish (Socket.io)
# ═══════════════════════════════════════

**Kab:** Phase 1-3 ke baad
**Problem:** Dashboard abhi har 5 second refresh karta hai — instant nahi

---

## STEP 4.1 — Kya hoga

```
WhatsApp message aaye
    → Backend save kare
    → io.emit('new-message', data)   ← yeh add karna hai
    → Dashboard instantly update     ← frontend socket connect
```

---

## STEP 4.2 — Vercel env variable add

```
NEXT_PUBLIC_SOCKET_URL=https://YOUR-RAILWAY-URL.up.railway.app
```

(No `/api` at end — Socket.io root par chalta hai)

---

## STEP 4.3 — Code changes (developer)

**Backend** — `whatsappWebhook.ts` ya `router.ts`:
```typescript
import { io } from '../index';
// message save ke baad:
io.to(`business:${businessId}`).emit('new-message', { conversationId, message });
```

**Frontend** — naya file `lib/socket.ts`:
```typescript
import { io } from 'socket.io-client';
const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL);
socket.emit('join-business', businessId);
socket.on('new-message', () => { /* refresh messages */ });
```

**Frontend** — `conversations/page.tsx`:
- `refetchInterval: 5000` hatao
- Socket event par update karo

---

## STEP 4.4 — Test

1. Dashboard Conversations kholo
2. Dusre phone se WhatsApp message bhejo
3. **Bina refresh** message dikhna chahiye

✅ **Phase 4 DONE** — instant realtime!

---

# ═══════════════════════════════════════
# PHASE 5 — Business Features
# ═══════════════════════════════════════

**Kab:** Paid customers se pehle
**Result:** Paisa kamao + bot orders complete kare

---

## PART A — Moyasar Billing (SaaS subscription)

### STEP 5A.1 — Moyasar account
**Kahan:** https://moyasar.com
1. Business account register
2. **Dashboard → API Keys**
3. Copy: `PUBLISHABLE_KEY` + `SECRET_KEY`

### STEP 5A.2 — Railway variables
```
MOYASAR_SECRET_KEY=sk_live_xxxxx
MOYASAR_PUBLISHABLE_KEY=pk_live_xxxxx
```

### STEP 5A.3 — Plans charge karo
| Plan | Price | Moyasar recurring |
|------|-------|-------------------|
| Starter | 299 SAR/month | Payment link |
| Business | 599 SAR/month | Payment link |
| Enterprise | 1499 SAR/month | Custom |

**Flow:**
```
User clicks Upgrade → Moyasar payment page → Success webhook
→ Backend updates subscriptionPlan → Plan limits apply
```

### STEP 5A.4 — Billing page connect
File: `frontend/.../billing/page.tsx`
- `MOCK_INVOICES` hatao
- Real API `/api/billing/invoices` connect karo

---

## PART B — Bot Order Flow Complete

### STEP 5B.1 — Conversation state machine
Har WhatsApp chat ka step track:
```
IDLE → MENU → SELECT_ITEM → QUANTITY → ADDRESS → CONFIRM → ORDER_CREATED
```

### STEP 5B.2 — WhatsApp interactive buttons
Meta API se buttons bhejo (number type ki jagah):
```
[ 🍔 Burger ] [ 🍕 Pizza ] [ 🥤 Drink ]
```

### STEP 5B.3 — Order DB mein save
Confirm hone par:
- `Order` record create
- Dashboard → Orders mein dikhe
- Customer ko WhatsApp confirmation

✅ **Phase 5 DONE** — full business SaaS!

---

# ═══════════════════════════════════════
# COMPLETE TIMELINE — Kab kya karo
# ═══════════════════════════════════════

| Din | Phase | Kahan kaam | Time |
|-----|-------|------------|------|
| 1 | Phase 0 | Apne PC — local test | 1 hr |
| 1 | Phase 1.1-1.2 | Neon + GitHub push | 30 min |
| 1 | Phase 1.3 | Railway backend | 45 min |
| 1 | Phase 1.4-1.5 | Vercel frontend + link | 30 min |
| 1 | Phase 1.6 | Live test | 15 min |
| 2 | Phase 2 | Unifonic SMS OTP | 2-4 hr |
| 2-3 | Phase 3 | Meta WhatsApp webhook | 1-2 hr |
| 3-4 | Phase 4 | Socket.io realtime code | 2-3 hr |
| 5-7 | Phase 5 | Moyasar + bot orders | 1-2 weeks |

---

# ═══════════════════════════════════════
# CHEAT SHEET — URLs aur Files
# ═══════════════════════════════════════

## Live URLs (apne fill karo)

```
Railway Backend:  https://________________.up.railway.app
Vercel Frontend:  https://________________.vercel.app
Health Check:     https://________________.up.railway.app/health
WhatsApp Webhook: https://________________.up.railway.app/webhook/whatsapp
API Base:         https://________________.up.railway.app/api
```

## Files — kahan kya hai

| File | Location | GitHub? | Railway? | Vercel? |
|------|----------|---------|----------|---------|
| Backend code | `backend/src/` | ✅ Push | Auto deploy | — |
| Frontend code | `frontend/src/` | ✅ Push | — | Auto deploy |
| Backend secrets | `backend/.env` | ❌ NEVER | Variables tab | — |
| Frontend config | `frontend/.env.local` | ❌ NEVER | — | Env Variables |
| Database schema | `backend/prisma/schema.prisma` | ✅ Push | — | — |
| Deploy config | `backend/railway.toml` | ✅ Push | Auto | — |
| Deploy config | `frontend/vercel.json` | ✅ Push | — | Auto |

## Demo login (seed data)

```
Phone:    +966501234567
Password: password123
```

---

# ═══════════════════════════════════════
# COMMON ERRORS
# ═══════════════════════════════════════

| Error | Kahan fix | Solution |
|-------|-----------|----------|
| Railway build fail | Railway logs | Root Directory = `backend` check |
| Vercel build fail | Vercel logs | Root Directory = `frontend` check |
| Login network error | Vercel env | `NEXT_PUBLIC_API_URL` = Railway URL + `/api` |
| CORS error | Railway env | `FRONTEND_URL` = exact Vercel URL |
| Webhook verify fail | Meta + Railway | Backend running? Token match? HTTPS? |
| OTP nahi aata live | Phase 2 | Unifonic SMS integrate karo |
| Database error | Neon dashboard | Project paused? Connection string sahi? |
| npm.ps1 error | Windows PC | `npm.cmd` use karo |

---

# ═══════════════════════════════════════
# AGLA STEP — Ab kya karo?
# ═══════════════════════════════════════

**Aaj (Phase 1 shuru):**
1. ✅ Local test (Phase 0)
2. GitHub push
3. Railway backend deploy
4. Vercel frontend deploy
5. Live test

Jab ready ho likho: **"Phase 1 shuru karo"** — main aapke saath step-by-step karunga.
