# Meta Test API + SaudiChat Pro — Live A to Z (chhote points)

Yeh guide sirf **Meta test number** (+1 555…) ke liye hai jab app **unpublished** ho.

---

## A. Accounts (ek dafa)

1. GitHub — code
2. Neon — database (`DATABASE_URL`)
3. Railway — backend
4. Vercel — frontend
5. Meta — https://developers.facebook.com

---

## B. Railway (backend)

1. Project → Service → **Branch:** `main`
2. **Root Directory:** `saudichat-pro/backend`
3. **Variables:**

```
DATABASE_URL=postgresql://...neon...?sslmode=require
JWT_SECRET=32-char-random-secret
JWT_EXPIRES_IN=7d
NODE_ENV=production
FRONTEND_URL=https://YOUR-APP.vercel.app
WHATSAPP_VERIFY_TOKEN=saudichat_verify_token
WHATSAPP_API_VERSION=v25.0
```

4. **Networking** → domain: `https://saudichat-pro-production.up.railway.app`
5. Deploy **Success** → `/health` = ok

---

## C. Vercel (frontend)

1. Import repo → Root: `saudichat-pro/frontend`
2. Variable:

```
NEXT_PUBLIC_API_URL=https://saudichat-pro-production.up.railway.app/api
```

3. Deploy → URL copy → Railway `FRONTEND_URL` update → redeploy

---

## D. Meta — Test credentials (API Setup)

| Copy karo | Example |
|-----------|---------|
| **Phone number ID** | `1231221340063841` |
| **Access token** | `EAA...` (lamba) |
| **Test From number** | `+1 555 652 3783` |
| **Apna number (To)** | `+966548470348` — recipient list mein add |

**Mat copy:** Business Account ID `977998591816133` — Phone ID nahi hai.

---

## E. Meta — Webhook

1. WhatsApp → **Configuration** → Webhook
2. **Callback URL:** `https://saudichat-pro-production.up.railway.app/webhook/whatsapp`
3. **Verify token:** `saudichat_verify_token` (Railway jaisa, spaces nahi)
4. **Verify and Save**
5. Field **messages** → **Subscribed**
6. **messages** row → **Test** dabao

Check:

```
https://saudichat-pro-production.up.railway.app/health/webhook-debug
```

→ `totalEvents` kam az kam **1**

---

## F. Dashboard — WhatsApp Settings

1. Login Vercel site
2. Apna business → **Settings** → **WhatsApp**
3. **Phone number ID:** `1231221340063841` (digits only)
4. **Access Token:** Meta `EAA...` paste
5. **Save** → **Test Connection** = success
6. Green box = guide hai, error nahi

**Database manually check zaroori nahi** — Save = DB update.

---

## G. Bot test (sahi tareeqa)

1. Phone WhatsApp → chat **`+1 555 652 3783`**
2. Text: `hello` (voice/sticker nahi)
3. Reply: welcome message
4. Dashboard → **Conversations** — message dikhe

**Galat test:** Meta "Send to +966" button = business aapko message bhejta hai, bot inbound test nahi.

---

## H. Agar reply nahi

| Check | URL / Action |
|-------|----------------|
| Backend live | `/health` |
| Webhook aaya? | `/health/webhook-debug` → `totalEvents` |
| Phone ID DB | debug → `savedPhoneIdsInDatabase` = `1231221340063841` |
| Token | Dashboard Test Connection |
| Meta Test | messages → **Test** |
| Galat IDs | SQL/businesses mein `+966` Phone ID hatao |

`totalEvents: 0` = Meta webhook Railway tak **nahi** — pehle Meta Test + webhook verify fix karo.

---

## I. Git push (fixes ke baad)

```powershell
cd "C:\Users\SAEED COPUTERS\Desktop\cruser rojrct"
git add saudichat-pro/
git commit -m "WhatsApp fixes and Meta test guide"
git push
```

Railway + Vercel auto redeploy.

---

## J. Baad mein (production)

1. Meta app **Publish**
2. Permanent token
3. Apna business phone number
4. `OPENAI_API_KEY` Railway (optional smart replies)
