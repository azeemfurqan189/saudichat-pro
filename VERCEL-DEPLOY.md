# Vercel Frontend Deploy — Step by Step

Backend Railway par hai ✅ — ab frontend Vercel par.

---

## Step 1 — Vercel account

1. https://vercel.com
2. **Sign Up** → **Continue with GitHub**
3. GitHub access allow karo

---

## Step 2 — New Project

1. **Add New...** → **Project**
2. Repo select: **`azeemfurqan189/saudichat-pro`**
3. **Import**

---

## Step 3 — Configure (IMPORTANT)

| Setting | Value |
|---------|-------|
| **Framework Preset** | Next.js (auto) |
| **Root Directory** | `saudichat-pro/frontend` ← Edit karo! |
| **Build Command** | `npm run build` (default) |
| **Output Directory** | `.next` (default) |

**Root Directory set karna:**
- "Root Directory" → **Edit**
- Type: `saudichat-pro/frontend`
- Continue

---

## Step 4 — Environment Variable

**Name:**
```
NEXT_PUBLIC_API_URL
```

**Value:** (apna Railway URL + `/api`)
```
https://YOUR-APP.up.railway.app/api
```

Example:
```
https://saudichat-pro-production.up.railway.app/api
```

⚠️ **End mein `/api` zaroor lagao!**

---

## Step 5 — Deploy

Click **Deploy** → wait 2-3 minutes

URL milega jaise:
```
https://saudichat-pro.vercel.app
```

---

## Step 6 — Railway link karo (ZAROORI)

Vercel URL milne ke baad:

1. Railway → Backend service → **Variables**
2. Update:
   ```
   FRONTEND_URL=https://saudichat-pro.vercel.app
   ```
   (apna exact Vercel URL)
3. Save → auto redeploy

Bina iske **login CORS error** aayega!

---

## Step 7 — Test live

| Test | URL |
|------|-----|
| Landing | `https://YOUR-VERCEL-URL` |
| Login | `/login` |
| Demo | `+966501234567` / `password123` |

---

## Errors fix

| Error | Fix |
|-------|-----|
| Build fail "can't find package.json" | Root Directory = `saudichat-pro/frontend` |
| Login network error | `NEXT_PUBLIC_API_URL` = Railway URL + `/api` |
| CORS error | Railway `FRONTEND_URL` = exact Vercel URL |

---

## Summary

```
Vercel: Root = saudichat-pro/frontend
        NEXT_PUBLIC_API_URL = https://RAILWAY-URL/api

Railway: FRONTEND_URL = https://VERCEL-URL
```
