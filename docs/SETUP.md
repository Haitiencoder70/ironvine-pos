# Development Setup

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | ≥ 22.0.0 | https://nodejs.org |
| Docker Desktop | Latest | https://docker.com |
| Git | Any | https://git-scm.com |

## 1. Clone and install

```bash
git clone <repo-url>
cd touchscreenpos

# Install root (E2E) dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..
```

## 2. Environment variables

### Backend (`backend/.env`)

```env
# Database — get connection string from Neon dashboard (use the pooled URL)
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require&pgbouncer=true

# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173,http://acme.localhost:5173

# Clerk — get from clerk.com → API Keys
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Stripe — get from stripe.com → Developers → API Keys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_ENTERPRISE_PRICE_ID=price_...
```

### Frontend (`frontend/.env`)

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_URL=http://localhost:3001
VITE_APP_DOMAIN=localhost
```

## 3. Database setup

```bash
cd backend

# Push schema to your Neon database
npx prisma db push

# Generate Prisma client
npx prisma generate

# Seed demo data (3 orgs + sample products, customers, orders)
npm run db:seed
```

## 4. Start dev servers

Open two terminals:

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# Running at http://localhost:3001
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# Running at http://localhost:5173
```

## 5. Multi-tenant local routing

Tenant subdomains like `acme.yourapp.com` work in production via DNS wildcards.
Locally, Chrome and Edge resolve `.localhost` subdomains natively — no `/etc/hosts` changes needed.

- Visit `http://acme.localhost:5173` to see the app in tenant mode
- Or set `VITE_DEV_SUBDOMAIN=acme` in `frontend/.env` to force tenant mode on plain `localhost:5173`

Firefox requires adding `127.0.0.1 acme.localhost` to your hosts file manually.

## 6. Running tests

**Backend (requires Docker):**
```bash
cd backend
npm test
```

**Frontend:**
```bash
cd frontend
npm run test:run
```

**E2E (requires both dev servers running):**
```bash
npm run e2e
```

## 7. Common errors

| Error | Cause | Fix |
|---|---|---|
| `Missing VITE_CLERK_PUBLISHABLE_KEY` | `.env` not created | Create `frontend/.env` and fill in the Clerk key |
| `Cannot find module '@prisma/client'` | Client not generated | Run `npx prisma generate` in `/backend` |
| `CORS error in browser` | Frontend URL missing from `CORS_ORIGINS` | Add `http://localhost:5173` to `backend/.env` |
| `Connection refused :3001` | Backend not started | Run `npm run dev` in `/backend` |
| `Invalid Clerk key` | Using live key in dev | Use `pk_test_` / `sk_test_` keys for development |
| `Docker daemon not running` | Docker Desktop not started | Open Docker Desktop and wait for it to be ready |
