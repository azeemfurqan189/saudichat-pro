# Namecheap Deploy Guide — SaudiChat Pro

## Pehle ye samjho (Important)

| Namecheap Plan | Kya chalega? |
|----------------|--------------|
| **Shared Hosting** (Stellar, cPanel) | ❌ **NAHI** — sirf PHP/MySQL, Node.js nahi |
| **VPS** (Virtual Private Server) | ✅ **HAAN** — sab kuch ek server pe |
| **Domain only** | Sirf domain — hosting alag chahiye |

**Is project ke liye Namecheap VPS chahiye** (~$6–10/month)  
Ya domain Namecheap pe, hosting VPS kisi aur se — lekin sab kuch **ek VPS** pe chal sakta hai.

---

## Sab kuch ek jagah (Single VPS Setup)

```
yourdomain.com (Namecheap domain)
        ↓
Namecheap VPS (Ubuntu)
   ├── Nginx (SSL + routing)
   ├── Frontend (Next.js :3000)
   ├── Backend (Express :4000)
   └── Database (Supabase cloud YA PostgreSQL same VPS pe)
```

---

## Step 1 — Namecheap se VPS khareedo

1. https://www.namecheap.com → **VPS Hosting**
2. Plan: **Pulsar** ya upar (min **2GB RAM** recommended)
3. OS: **Ubuntu 22.04**
4. VPS IP note karo (example: `123.45.67.89`)

---

## Step 2 — Domain point karo

Namecheap → Domain List → Manage → **Advanced DNS**

| Type | Host | Value |
|------|------|-------|
| A Record | `@` | VPS IP |
| A Record | `www` | VPS IP |

5–30 minute wait for DNS.

---

## Step 3 — VPS pe connect (SSH)

Windows PowerShell:
```powershell
ssh root@YOUR_VPS_IP
```

Password = VPS panel se jo mila.

---

## Step 4 — Project upload karo

**Option A — Git:**
```bash
apt update && apt install -y git
cd /var/www
git clone https://github.com/APNA-USER/saudichat-pro.git
cd saudichat-pro
```

**Option B — FileZilla:**  
Project folder upload karo `/var/www/saudichat-pro`

---

## Step 5 — Backend `.env` banao

```bash
nano /var/www/saudichat-pro/backend/.env
```

Paste (apni values):
```env
DATABASE_URL="postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres"
JWT_SECRET="very-long-random-secret-min-32-chars"
JWT_EXPIRES_IN=7d
PORT=4000
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
WHATSAPP_VERIFY_TOKEN=saudichat_verify_token
WHATSAPP_API_VERSION=v21.0
```

Save: `Ctrl+X`, `Y`, `Enter`

Database tables (pehli dafa):
```bash
cd /var/www/saudichat-pro/backend
npm install
npx prisma db push
npm run db:seed
```

---

## Step 6 — Server setup + build

```bash
cd /var/www/saudichat-pro
chmod +x deploy/*.sh
bash deploy/install-vps.sh yourdomain.com
bash deploy/build-production.sh https://yourdomain.com
```

---

## Step 7 — Nginx + SSL (HTTPS)

```bash
# Nginx config (domain replace)
sed "s/YOUR_DOMAIN.com/yourdomain.com/g" deploy/nginx-saudichat.conf > /etc/nginx/sites-available/saudichat
ln -sf /etc/nginx/sites-available/saudichat /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Free SSL
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## Step 8 — Test

| URL | Expected |
|-----|----------|
| `https://yourdomain.com` | Landing page |
| `https://yourdomain.com/health` | `{"status":"ok"}` |
| Login | `+966501234567` / `password123` |

---

## WhatsApp webhook (production)

Meta Developer → Webhook URL:
```
https://yourdomain.com/webhook/whatsapp
```
Verify token: `saudichat_verify_token`

---

## Useful commands (VPS pe)

```bash
pm2 status              # check apps running
pm2 logs saudichat-api  # backend logs
pm2 logs saudichat-web  # frontend logs
pm2 restart all         # restart after code update
```

---

## Code update ke baad

```bash
cd /var/www/saudichat-pro
git pull
bash deploy/build-production.sh https://yourdomain.com
```

---

## Shared hosting pe kyun nahi?

| Feature | Chahiye | Shared hosting |
|---------|---------|----------------|
| Node.js Express | ✅ | ❌ |
| Next.js SSR | ✅ | ❌ |
| PostgreSQL | ✅ | ❌ (MySQL only) |
| WhatsApp webhook 24/7 | ✅ | ❌ |
| Socket.io | ✅ | ❌ |

**Conclusion:** Namecheap **VPS = YES**, Shared hosting = NO.

---

## Minimum VPS specs

| Resource | Minimum |
|----------|---------|
| RAM | 2 GB |
| CPU | 1 vCPU |
| Storage | 40 GB |
| OS | Ubuntu 22.04 |

Database Supabase pe rakho to VPS pe sirf app chalegi — aur easy hai.
