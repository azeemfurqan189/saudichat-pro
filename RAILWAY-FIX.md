# Railway Deploy Fix — "saudichat-pro/backend does not exist"

## Problem

GitHub repo mein **2 branches** hain, structure **alag** hai:

| Branch | Backend path |
|--------|----------------|
| **main** (latest code) | `saudichat-pro/backend` |
| **master** (purana) | `backend` (root par) |

Agar Railway **master** branch use kare aur Root Directory **`saudichat-pro/backend`** ho → yeh error aata hai:

```
directory .../saudichat-pro/backend does not exist
```

---

## Fix — Railway Dashboard (2 minute)

1. https://railway.app → apna project kholo
2. **Backend service** click karo
3. **Settings** tab

### Setting 1 — Branch
- **Source → Branch:** `main` (master NAHI)

### Setting 2 — Root Directory
- **Root Directory:** `saudichat-pro/backend`

4. **Save**
5. **Deployments → Redeploy** (ya push se auto deploy)

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
