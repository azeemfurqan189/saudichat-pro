# Railway Deploy Fix

## Correct Railway settings

| Setting | Value |
|---------|-------|
| **Branch** | `main` |
| **Root Directory** | `saudichat-pro/backend` |

Backend code ab isi path par hai — shim / `cd ../../backend` ki zaroorat nahi.

---

## Build fail ho to

1. Railway → Backend service → **Settings** → Root Directory = `saudichat-pro/backend`
2. **Redeploy**
3. Variables check: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`

---

## Verify deploy

```
https://YOUR-APP.up.railway.app/health
```

Expected:

```json
{"status":"ok","service":"SaudiChat Pro API"}
```

---

## Local dev

```bash
cd saudichat-pro/backend
npm install
npm run dev
```

Ya repo root se: `npm run dev:backend`
