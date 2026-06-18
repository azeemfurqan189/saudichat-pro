# Railway Deploy Fix — "saudichat-pro/backend does not exist"

## Problem

GitHub repo root par code directly hai (`backend/`, `frontend/`). Agar Railway **Root Directory** purana path use kare:

```
saudichat-pro/backend   ← galat (folder nahi tha)
```

To yeh error aata hai:

```
directory .../saudichat-pro/backend does not exist
```

---

## Fix A — Code shim (auto, recommended)

Repo mein `saudichat-pro/backend/` entrypoint add ho chuka hai jo asli `backend/` build/start karta hai.

Railway settings:
- **Branch:** `main`
- **Root Directory:** `saudichat-pro/backend`

Push ke baad **Redeploy** — build pass hona chahiye.

---

## Fix B — Railway Dashboard (simpler path)

1. https://railway.app → apna project kholo
2. **Backend service** → **Settings**

| Setting | Value |
|---------|-------|
| Branch | `main` |
| Root Directory | `backend` |

3. **Save** → **Redeploy**

---

## Healthcheck failure fix (deploy par 01:32 fail)

**Problem:** `start:prod` pehle **seed + db push** chalata tha, server 2+ minute baad start hota — Railway healthcheck fail.

**Fix (code updated):** Deploy ab sirf `prisma db push` + server start (seed har deploy par nahi).

Railway **Redeploy** karo. Pehli dafa DB khali ho to local ya Railway shell se ek bar:
`npx prisma db push && npm run db:seed`

### Agar phir bhi healthcheck fail

| Check | Fix |
|-------|-----|
| `DATABASE_URL` missing | Railway Variables mein Neon string |
| Root Directory galat | `saudichat-pro/backend` + branch `main` |
| Build fail | Deploy logs dekho |
| DB unreachable | Neon project active? SSL `?sslmode=require` |

---

## Verify deploy success

Browser mein kholo (apna Railway URL):

```
https://YOUR-APP.up.railway.app/health
```

Expected:
```json
{"status":"ok","service":"SaudiChat Pro API"}
```

---

## Alternative (agar master branch use karna ho)

| Setting | Value |
|---------|-------|
| Branch | `master` |
| Root Directory | `backend` |

Note: `master` par Dockerfile nahi hai — **main branch recommended**.

---

## Required Railway Variables

```
DATABASE_URL=postgresql://...
JWT_SECRET=32-char-random-secret
JWT_EXPIRES_IN=7d
NODE_ENV=production
FRONTEND_URL=https://your-app.vercel.app
WHATSAPP_PROVIDER=whapi
OPENAI_API_KEY=sk-...          # AI bot (optional but recommended)
REDIS_URL=redis://...           # Railway Redis plugin (recommended)
EMBED_WORKER=true
```

Whapi webhook URL: `https://YOUR-APP.up.railway.app/webhook/whapi`

Full guide: **WHAPI-RAILWAY-LIVE.md**
