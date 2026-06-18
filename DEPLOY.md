# Production Deploy — Best Way (No Errors)

## Best setup for this project

| Service | Platform | Why |
|---------|----------|-----|
| **Frontend** | **Vercel** | Next.js — perfect match |
| **Backend API + Bot** | **Railway** | Express needs always-on server |
| **Database** | **Supabase** | PostgreSQL — already configured |

> Do NOT put backend on Vercel — it will fail (Express + WhatsApp webhook need Railway).

---

## Before deploy (one time)

1. **Never commit** `.env`, `.env.local`, or `node_modules/` (`.gitignore` handles this)
2. Push code to **GitHub**
3. Run on Supabase (local terminal once):

```bash
cd backend
npx prisma db push
npm run db:seed
```

---

## Step 1 — Railway (Backend) — Do this FIRST

1. https://railway.app → Login with GitHub
2. **New Project** → Deploy from GitHub → select `saudichat-pro`
3. **Settings → Root Directory:** `backend`
4. **Variables** (copy from your local `.env`, change secrets for production):

```
DATABASE_URL=postgresql://...supabase...
JWT_SECRET=use-a-long-random-string-here
JWT_EXPIRES_IN=7d
NODE_ENV=production
FRONTEND_URL=https://YOUR-APP.vercel.app
WHATSAPP_VERIFY_TOKEN=saudichat_verify_token
WHATSAPP_API_VERSION=v21.0
```

5. **Settings → Networking → Generate Domain**
6. Test: `https://YOUR-RAILWAY-URL/health` → must show `"status":"ok"`

**Save this URL:** `https://YOUR-RAILWAY-URL/api`

---

## Step 2 — Vercel (Frontend) — Do this SECOND

1. https://vercel.com → Login with GitHub
2. **Add New Project** → import `saudichat-pro`
3. **Root Directory:** `frontend` ← important!
4. **Environment Variable:**

```
NEXT_PUBLIC_API_URL=https://YOUR-RAILWAY-URL/api
```

5. Click **Deploy**
6. Copy your live URL: `https://saudichat-pro.vercel.app`

---

## Step 3 — Connect both (important!)

1. Go back to **Railway → Variables**
2. Update: `FRONTEND_URL=https://saudichat-pro.vercel.app` (your exact Vercel URL)
3. **Redeploy** Railway

---

## Step 4 — Test live site

1. Open Vercel URL in browser
2. Login: `+966501234567` / `password123`
3. Dashboard should load with data

---

## WhatsApp (when ready)

Meta webhook URL:
```
https://YOUR-RAILWAY-URL/webhook/whatsapp
```
Verify token: same as `WHATSAPP_VERIFY_TOKEN` in Railway.

---

## If deploy fails

| Error | Fix |
|-------|-----|
| `tsc not found` | Already fixed — `typescript` in dependencies |
| Build fails Railway | Root Directory = `backend` |
| Build fails Vercel | Root Directory = `frontend` |
| Login network error | Check `NEXT_PUBLIC_API_URL` on Vercel |
| CORS error | Set `FRONTEND_URL` on Railway = exact Vercel URL |
| Database error | `DATABASE_URL` = Supabase URI, project not paused |

---

## Order summary

```
GitHub push → Railway (backend) → Vercel (frontend) → link env vars → test
```
