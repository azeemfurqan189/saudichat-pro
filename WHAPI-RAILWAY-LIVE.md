# Whapi + Railway — Live Deploy Guide

Aap **Whapi** use karte ho aur backend **Railway** par hai. Ye steps follow karo taake naya AI bot system live chale.

---

## 1. Railway Settings

| Setting | Value |
|---------|--------|
| **Branch** | `main` |
| **Root Directory** | `saudichat-pro/backend` |
| **Start Command** | `npm run start:prod` (auto via `railway.toml`) |

Push karo GitHub par → Railway auto deploy karega.

---

## 2. Railway Variables (Required)

Railway → Backend Service → **Variables**:

```env
DATABASE_URL=postgresql://...          # Neon/Postgres (Railway Postgres plugin)
JWT_SECRET=your-32-char-secret
JWT_EXPIRES_IN=7d
NODE_ENV=production
FRONTEND_URL=https://your-app.vercel.app

# Whapi (aap ka setup)
WHATSAPP_PROVIDER=whapi

# Optional — Meta ke liye; Whapi ke liye zaroori nahi
WHATSAPP_VERIFY_TOKEN=saudichat_verify_token
WHATSAPP_API_VERSION=v25.0
```

### AI Bot ke liye (Recommended)

```env
OPENAI_API_KEY=sk-...                  # AI replies + RAG embeddings
REDIS_URL=redis://...                  # Railway Redis plugin se (queue + cache)
EMBED_WORKER=true                      # Worker same process mein (default)
```

### Optional security

```env
WHAPI_WEBHOOK_SECRET=your-secret       # Sirf tab set karo jab Whapi panel mein bhi same secret ho
                                       # Agar set karo aur Whapi bheje nahi → webhook 403 hoga
```

**WHAPI_WEBHOOK_SECRET khali chhodo** agar Whapi panel mein secret configure nahi kiya.

---

## 3. Redis add karo (Railway)

1. Railway project → **+ New** → **Database** → **Redis**
2. Redis service se **REDIS_URL** copy karo
3. Backend service Variables mein paste: `REDIS_URL=${{Redis.REDIS_URL}}` (Railway reference)

Bina Redis ke bhi bot chalega (sync mode), lekin queue/retry/cache/quotas kaam nahi karenge.

---

## 4. Whapi Webhook URL

**Whapi panel:** https://panel.whapi.cloud → apna Channel → **Settings → Webhooks**

| Field | Value |
|-------|--------|
| **Webhook URL** | `https://saudichat-pro-production.up.railway.app/webhook/whapi` |
| **Method** | POST |
| **Events** | messages |

Apna Railway URL check karo:
```
https://YOUR-APP.up.railway.app/health/whapi
```
Is page par exact webhook URL dikhega.

---

## 5. Dashboard Settings (har business)

1. Login → **Dashboard → Settings → WhatsApp**
2. Provider: **Whapi**
3. **Channel ID** — Whapi panel se (e.g. `MANTIS-XXXXX`) — yeh phone number NAHI hai
4. **API Token** — Whapi panel se Bearer token
5. **Save** → **Test Connection** → "Whapi connected" aana chahiye

---

## 6. Deploy ke baad verify

Browser mein kholo:

| URL | Expected |
|-----|----------|
| `/health` | `{"status":"ok"}` |
| `/health/whapi` | webhook URL + env checklist |
| `/health/queue` | `redisConfigured: true` (agar Redis set hai) |
| `/health/db` | database connected |
| `/webhook/whapi` (GET) | "Whapi webhook is live" |

WhatsApp se test message bhejo → `/health/webhook-debug` dekho:
- `lastStatus`: `queued` ya `processed_ok`
- `lastBusinessMatched`: `true`

---

## 7. Frontend (Vercel)

```env
NEXT_PUBLIC_API_URL=https://saudichat-pro-production.up.railway.app/api
NEXT_PUBLIC_SOCKET_URL=https://saudichat-pro-production.up.railway.app
```

Redeploy Vercel after Railway URL confirm.

---

## Common Issues

| Problem | Fix |
|---------|-----|
| Webhook 403 | `WHAPI_WEBHOOK_SECRET` hatao ya Whapi panel mein same secret set karo |
| No business matched | Dashboard mein Channel ID save karo (Whapi channel_id) |
| Bot reply nahi | `OPENAI_API_KEY` set karo; bina key ke sirf keyword/auto-reply |
| Send failed | Dashboard → WhatsApp → API token refresh karo; Whapi QR scan karo |
| DB error on deploy | `DATABASE_URL` check; deploy logs mein `prisma db push` success |
| AI tables missing | Redeploy — `start:prod` ab auto `db push` karta hai |

---

## Flow (Whapi Live)

```
Customer WhatsApp message
    → Whapi cloud
    → POST https://YOUR-RAILWAY.up.railway.app/webhook/whapi
    → Match business by channel_id
    → Queue (Redis) ya direct process
    → AI Orchestrator → reply
    → Whapi API → customer WhatsApp
```

---

## Quick checklist

- [ ] Railway branch `main`, root `saudichat-pro/backend`
- [ ] `WHATSAPP_PROVIDER=whapi`
- [ ] `DATABASE_URL` + `JWT_SECRET`
- [ ] `OPENAI_API_KEY` (AI ke liye)
- [ ] `REDIS_URL` (recommended)
- [ ] Whapi webhook → `/webhook/whapi`
- [ ] Dashboard Channel ID + Token saved
- [ ] `/health/whapi` green
- [ ] Test message → bot reply
