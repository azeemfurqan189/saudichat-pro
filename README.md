# SaudiChat Pro

**WhatsApp Business Automation for Saudi SMEs** — A multi-tenant SaaS platform where each business gets its own dashboard and WhatsApp bot.

## Features

- Multi-tenant architecture (restaurants, salons, clinics, retail, etc.)
- AI-powered WhatsApp bot (GPT-4, Arabic NLP, Saudi dialect)
- Industry-specific dashboards
- Orders, appointments, catalog, customers, marketing
- Live conversations with human handoff
- Analytics & reporting
- Dark/Light mode + Arabic/English (RTL/LTR)
- Glassmorphism UI with Framer Motion animations

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Shadcn-style UI, React Query, Framer Motion |
| Backend | Node.js, Express, TypeScript, Prisma ORM |
| Database | PostgreSQL + Redis |
| Real-time | Socket.io |
| WhatsApp | Meta WhatsApp Cloud API |
| AI | OpenAI GPT-4 |

## Project Structure

```
saudichat-pro/
├── frontend/          # Next.js 14 App Router
├── backend/           # Express API + Prisma
└── whatsapp-bot/      # Bot engine (flows, handlers, AI)
```

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis (optional, for production)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # Edit DATABASE_URL
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev            # http://localhost:4000
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev            # http://localhost:3000
```

### Demo Credentials

After seeding:
- **Phone:** +966501234567
- **Password:** password123
- **Businesses:** Restaurant, Salon, Clinic (see seed output)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/signup` | Register (sends OTP) |
| POST | `/api/auth/verify-otp` | Verify OTP |
| GET | `/api/businesses/:id/dashboard` | Dashboard stats |
| GET | `/api/businesses/:id/orders` | List orders |
| GET | `/api/businesses/:id/conversations` | List chats |
| POST | `/webhook/whatsapp` | WhatsApp webhook |

## WhatsApp Setup

1. Create a Meta Developer app
2. Add WhatsApp Business product
3. Get Phone Number ID and Access Token
4. Set webhook URL: `https://your-api.com/webhook/whatsapp`
5. Verify token: `saudichat_verify_token` (from `.env`)

## Deployment

- **Frontend:** Vercel (`frontend/`)
- **Backend:** Railway (`backend/`)
- Set `NEXT_PUBLIC_API_URL` to your Railway API URL
- Set `FRONTEND_URL` in backend for CORS

## Design System

- **Primary:** Saudi Green `#0B5E42`
- **Secondary:** Gold `#C8963E`
- **Fonts:** Inter (EN), Cairo (AR)
- **Effects:** Glassmorphism, neumorphism, gradient backgrounds

## License

Proprietary — SaudiChat Pro © 2026
