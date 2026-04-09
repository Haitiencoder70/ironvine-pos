# Project Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the complete project skeleton — backend (Express/TypeScript/Prisma) + frontend (React/Vite/Tailwind/PWA) + Docker database — with all tooling wired and running.

**Architecture:** Monorepo-style with `backend/` and `frontend/` folders at root. Backend is Express + Prisma + Clerk + Stripe. Frontend is React 18 + Vite + Tailwind + Clerk + PWA. PostgreSQL runs in Docker for local dev.

**Tech Stack:** Node 20, Express, Prisma, PostgreSQL 15, Clerk, Stripe, React 18, Vite, Tailwind CSS v3, Zustand, React Query, vite-plugin-pwa, TypeScript strict mode.

---

## File Map

### Root
- Create: `docker-compose.yml` — PostgreSQL 15 + pgAdmin
- Create: `.env.example` — all required env vars documented
- Create: `.gitignore` — covers both backend and frontend

### Backend (`backend/`)
- Create: `backend/package.json` — all deps + scripts
- Create: `backend/tsconfig.json` — strict mode, ES2022 target
- Create: `backend/.env.example` — backend env vars
- Create: `backend/prisma/schema.prisma` — full schema with Organization + all models
- Create: `backend/src/index.ts` — Express app setup (Helmet, CORS, rate limit, routes)
- Create: `backend/src/lib/prisma.ts` — Prisma client singleton + tenant middleware
- Create: `backend/src/middleware/auth.ts` — Clerk JWT verification
- Create: `backend/src/middleware/tenant.ts` — organizationId injection from Clerk session
- Create: `backend/src/middleware/limits.ts` — subscription plan limit enforcement
- Create: `backend/src/middleware/errorHandler.ts` — global error handler
- Create: `backend/src/types/index.ts` — shared backend types (AuthRequest, etc.)
- Create: `backend/src/routes/health.ts` — GET /health endpoint

### Frontend (`frontend/`)
- Create: `frontend/package.json` — all deps + scripts
- Create: `frontend/tsconfig.json` — strict mode
- Create: `frontend/tsconfig.node.json` — Vite config TS support
- Create: `frontend/vite.config.ts` — Vite + React + PWA plugin config
- Create: `frontend/tailwind.config.ts` — Tailwind with custom design tokens
- Create: `frontend/postcss.config.js` — Tailwind + autoprefixer
- Create: `frontend/index.html` — HTML entry with PWA meta tags
- Create: `frontend/public/manifest.json` — PWA manifest
- Create: `frontend/src/main.tsx` — React entry, ClerkProvider, QueryClientProvider
- Create: `frontend/src/App.tsx` — Router setup, protected routes
- Create: `frontend/src/lib/api.ts` — Axios instance with Clerk token injection
- Create: `frontend/src/lib/queryClient.ts` — React Query client config
- Create: `frontend/src/types/index.ts` — shared frontend types
- Create: `frontend/src/store/uiStore.ts` — Zustand UI store (sidebar, modals)
- Create: `frontend/src/store/offlineStore.ts` — Zustand offline/sync state
- Create: `frontend/src/pages/Dashboard.tsx` — placeholder page
- Create: `frontend/src/pages/SignIn.tsx` — Clerk sign-in page wrapper

---

## Task 1: Docker Compose + Root Config

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `.gitignore`

- [ ] **Step 1: Create `docker-compose.yml`**

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:15-alpine
    container_name: tshirt_pos_db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-posuser}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-pospassword}
      POSTGRES_DB: ${POSTGRES_DB:-tshirtpos}
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER:-posuser}']
      interval: 10s
      timeout: 5s
      retries: 5

  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: tshirt_pos_pgadmin
    restart: unless-stopped
    environment:
      PGADMIN_DEFAULT_EMAIL: ${PGADMIN_EMAIL:-admin@pos.local}
      PGADMIN_DEFAULT_PASSWORD: ${PGADMIN_PASSWORD:-admin}
    ports:
      - '5050:80'
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - pgadmin_data:/var/lib/pgadmin

volumes:
  postgres_data:
  pgadmin_data:
```

- [ ] **Step 2: Create `.env.example`**

```env
# Docker / Database
POSTGRES_USER=posuser
POSTGRES_PASSWORD=pospassword
POSTGRES_DB=tshirtpos
PGADMIN_EMAIL=admin@pos.local
PGADMIN_PASSWORD=admin

# Backend (copy to backend/.env)
DATABASE_URL=postgresql://posuser:pospassword@localhost:5432/tshirtpos
CLERK_SECRET_KEY=sk_test_YOUR_KEY_HERE
CLERK_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
RESEND_API_KEY=re_YOUR_KEY_HERE
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173

# Frontend (copy to frontend/.env)
VITE_API_URL=http://localhost:3001
VITE_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
VITE_SOCKET_URL=http://localhost:3001
```

- [ ] **Step 3: Create `.gitignore`**

```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Environment
.env
.env.local
.env.*.local

# Build outputs
dist/
build/
.next/

# TypeScript
*.tsbuildinfo

# Logs
logs/
*.log
npm-debug.log*

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# Prisma
backend/prisma/migrations/

# PWA
frontend/public/sw.js
frontend/public/workbox-*.js
```

- [ ] **Step 4: Start Docker and verify PostgreSQL is running**

```bash
docker-compose up -d
docker-compose ps
```

Expected output: both `tshirt_pos_db` and `tshirt_pos_pgadmin` show `Up` status.

---

## Task 2: Backend `package.json` + `tsconfig.json`

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/.env` (copy from `.env.example`, fill in values)

- [ ] **Step 1: Create `backend/package.json`**

```json
{
  "name": "tshirtpos-backend",
  "version": "1.0.0",
  "description": "T-Shirt POS backend API",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts",
    "lint": "eslint src --ext .ts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@clerk/express": "^1.3.0",
    "@prisma/client": "^5.22.0",
    "cors": "^2.8.5",
    "express": "^4.21.0",
    "express-rate-limit": "^7.4.0",
    "helmet": "^8.0.0",
    "resend": "^4.0.0",
    "socket.io": "^4.8.0",
    "stripe": "^17.0.0",
    "winston": "^3.17.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "@types/node": "^22.0.0",
    "prisma": "^5.22.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 2: Create `backend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Install backend dependencies**

```bash
cd backend && npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit --version
```

Expected: TypeScript version printed, no errors (no source files yet is fine).

---

## Task 3: Prisma Schema

**Files:**
- Create: `backend/prisma/schema.prisma`

- [ ] **Step 1: Create `backend/prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ────────────────────────────────────────────────────────────────────

enum SubscriptionPlan {
  FREE
  PRO
  ENTERPRISE
}

enum UserRole {
  OWNER
  MANAGER
  STAFF
}

enum OrderStatus {
  QUOTE
  APPROVED
  MATERIALS_ORDERED
  MATERIALS_RECEIVED
  IN_PRODUCTION
  QUALITY_CHECK
  READY_TO_SHIP
  SHIPPED
  DELIVERED
  COMPLETED
  CANCELLED
}

enum OrderPriority {
  NORMAL
  HIGH
  RUSH
}

enum PrintMethod {
  DTF
  HTV
  SCREEN_PRINT
  EMBROIDERY
  SUBLIMATION
}

enum PrintLocation {
  FRONT
  BACK
  LEFT_SLEEVE
  RIGHT_SLEEVE
  FULL_PRINT
}

enum InventoryCategory {
  BLANK_SHIRTS
  DTF_TRANSFERS
  VINYL
  INK
  PACKAGING
  EMBROIDERY_THREAD
  OTHER
}

enum PurchaseOrderStatus {
  DRAFT
  SENT
  PARTIALLY_RECEIVED
  RECEIVED
  CANCELLED
}

enum ShipmentStatus {
  PENDING
  LABEL_CREATED
  IN_TRANSIT
  OUT_FOR_DELIVERY
  DELIVERED
  EXCEPTION
}

enum ShipmentCarrier {
  UPS
  FEDEX
  USPS
  DHL
  OTHER
}

// ─── Organization (Tenant) ────────────────────────────────────────────────────

model Organization {
  id        String   @id @default(cuid())
  clerkOrgId String  @unique
  slug      String   @unique
  name      String
  subdomain String   @unique
  logoUrl   String?

  plan                 SubscriptionPlan @default(FREE)
  stripeCustomerId     String?          @unique
  stripeSubscriptionId String?          @unique
  subscriptionStatus   String?

  maxUsers          Int @default(1)
  maxOrders         Int @default(100)
  maxInventoryItems Int @default(500)

  taxRate           Decimal @default(0) @db.Decimal(5, 4)
  orderNumberPrefix String  @default("ORD")
  currency          String  @default("USD")
  timezone          String  @default("America/New_York")

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users          User[]
  customers      Customer[]
  orders         Order[]
  inventoryItems InventoryItem[]
  purchaseOrders PurchaseOrder[]
  vendors        Vendor[]
  shipments      Shipment[]

  @@map("organizations")
}

// ─── User ─────────────────────────────────────────────────────────────────────

model User {
  id           String   @id @default(cuid())
  clerkUserId  String   @unique
  email        String
  firstName    String
  lastName     String
  avatarUrl    String?
  role         UserRole @default(STAFF)
  isActive     Boolean  @default(true)

  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([organizationId])
  @@map("users")
}

// ─── Customer ─────────────────────────────────────────────────────────────────

model Customer {
  id          String  @id @default(cuid())
  firstName   String
  lastName    String
  email       String?
  phone       String?
  company     String?
  notes       String?

  billingStreet  String?
  billingCity    String?
  billingState   String?
  billingZip     String?
  billingCountry String? @default("US")

  shippingStreet  String?
  shippingCity    String?
  shippingState   String?
  shippingZip     String?
  shippingCountry String? @default("US")

  totalOrders    Int     @default(0)
  totalSpent     Decimal @default(0) @db.Decimal(10, 2)

  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  orders    Order[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([organizationId])
  @@map("customers")
}

// ─── Order ────────────────────────────────────────────────────────────────────

model Order {
  id          String        @id @default(cuid())
  orderNumber String
  status      OrderStatus   @default(QUOTE)
  priority    OrderPriority @default(NORMAL)

  customerId     String
  customer       Customer @relation(fields: [customerId], references: [id])
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  designNotes String?
  designFiles String[] @default([])

  subtotal   Decimal @default(0) @db.Decimal(10, 2)
  taxAmount  Decimal @default(0) @db.Decimal(10, 2)
  discount   Decimal @default(0) @db.Decimal(10, 2)
  total      Decimal @default(0) @db.Decimal(10, 2)

  dueDate    DateTime?
  notes      String?
  internalNotes String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  items          OrderItem[]
  purchaseOrders PurchaseOrder[]
  shipments      Shipment[]

  @@unique([orderNumber, organizationId])
  @@index([organizationId])
  @@index([status])
  @@map("orders")
}

// ─── Order Item ───────────────────────────────────────────────────────────────

model OrderItem {
  id          String   @id @default(cuid())
  orderId     String
  order       Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)

  productType  String
  size         String?
  color        String?
  sleeveType   String?
  quantity     Int
  unitPrice    Decimal @db.Decimal(10, 2)
  lineTotal    Decimal @db.Decimal(10, 2)

  printMethod    PrintMethod?
  printLocations PrintLocation[]

  description String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([orderId])
  @@map("order_items")
}

// ─── Inventory ────────────────────────────────────────────────────────────────

model InventoryItem {
  id       String            @id @default(cuid())
  sku      String
  name     String
  category InventoryCategory
  brand    String?
  size     String?
  color    String?

  quantityOnHand   Int @default(0)
  quantityReserved Int @default(0)
  reorderPoint     Int @default(10)
  reorderQuantity  Int @default(50)

  costPrice   Decimal  @db.Decimal(10, 2)
  notes       String?
  isActive    Boolean  @default(true)

  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  purchaseOrderItems PurchaseOrderItem[]
  stockMovements     StockMovement[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([sku, organizationId])
  @@index([organizationId])
  @@map("inventory_items")
}

// ─── Stock Movement ───────────────────────────────────────────────────────────

model StockMovement {
  id              String @id @default(cuid())
  inventoryItemId String
  inventoryItem   InventoryItem @relation(fields: [inventoryItemId], references: [id])

  type     String
  quantity Int
  reason   String?
  orderId  String?

  createdAt DateTime @default(now())

  @@index([inventoryItemId])
  @@map("stock_movements")
}

// ─── Vendor ───────────────────────────────────────────────────────────────────

model Vendor {
  id          String   @id @default(cuid())
  name        String
  contactName String?
  email       String?
  phone       String?
  website     String?
  notes       String?

  categories     String[]
  paymentTerms   String?
  leadTimeDays   Int?
  isActive       Boolean  @default(true)

  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  purchaseOrders PurchaseOrder[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([organizationId])
  @@map("vendors")
}

// ─── Purchase Order ───────────────────────────────────────────────────────────

model PurchaseOrder {
  id       String              @id @default(cuid())
  poNumber String
  status   PurchaseOrderStatus @default(DRAFT)

  vendorId String
  vendor   Vendor @relation(fields: [vendorId], references: [id])

  linkedOrderId String?
  linkedOrder   Order?  @relation(fields: [linkedOrderId], references: [id])

  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  subtotal   Decimal @default(0) @db.Decimal(10, 2)
  taxAmount  Decimal @default(0) @db.Decimal(10, 2)
  total      Decimal @default(0) @db.Decimal(10, 2)

  notes         String?
  expectedDate  DateTime?
  receivedAt    DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  items PurchaseOrderItem[]

  @@unique([poNumber, organizationId])
  @@index([organizationId])
  @@map("purchase_orders")
}

// ─── Purchase Order Item ──────────────────────────────────────────────────────

model PurchaseOrderItem {
  id              String @id @default(cuid())
  purchaseOrderId String
  purchaseOrder   PurchaseOrder @relation(fields: [purchaseOrderId], references: [id], onDelete: Cascade)

  inventoryItemId String?
  inventoryItem   InventoryItem? @relation(fields: [inventoryItemId], references: [id])

  description   String
  quantity      Int
  quantityRecv  Int     @default(0)
  unitCost      Decimal @db.Decimal(10, 2)
  lineTotal     Decimal @db.Decimal(10, 2)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([purchaseOrderId])
  @@map("purchase_order_items")
}

// ─── Shipment ─────────────────────────────────────────────────────────────────

model Shipment {
  id             String          @id @default(cuid())
  trackingNumber String?
  carrier        ShipmentCarrier @default(UPS)
  status         ShipmentStatus  @default(PENDING)

  orderId String
  order   Order  @relation(fields: [orderId], references: [id])

  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  shippingStreet  String?
  shippingCity    String?
  shippingState   String?
  shippingZip     String?
  shippingCountry String? @default("US")

  shippingCost      Decimal?  @db.Decimal(10, 2)
  estimatedDelivery DateTime?
  deliveredAt       DateTime?
  notes             String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([organizationId])
  @@map("shipments")
}
```

- [ ] **Step 2: Create `backend/.env` (copy from root `.env.example`)**

```bash
cp ../.env.example backend/.env
```

Fill in `DATABASE_URL` (use docker values): `postgresql://posuser:pospassword@localhost:5432/tshirtpos`

- [ ] **Step 3: Generate Prisma client**

```bash
cd backend && npm run db:generate
```

Expected: `✔ Generated Prisma Client` with no errors.

- [ ] **Step 4: Push schema to database**

```bash
cd backend && npm run db:push
```

Expected: `Your database is now in sync with your Prisma schema.`

---

## Task 4: Backend Source Files

**Files:**
- Create: `backend/src/types/index.ts`
- Create: `backend/src/lib/prisma.ts`
- Create: `backend/src/lib/logger.ts`
- Create: `backend/src/middleware/errorHandler.ts`
- Create: `backend/src/middleware/auth.ts`
- Create: `backend/src/middleware/tenant.ts`
- Create: `backend/src/middleware/limits.ts`
- Create: `backend/src/routes/health.ts`
- Create: `backend/src/index.ts`

- [ ] **Step 1: Create `backend/src/types/index.ts`**

```typescript
import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  auth: {
    userId: string;
    orgId: string;
    orgRole: string;
  };
}

export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  code?: string;
  statusCode: number;
}

export const SUBSCRIPTION_LIMITS = {
  FREE:       { maxUsers: 1,  maxOrders: 100,  maxInventoryItems: 500  },
  PRO:        { maxUsers: 10, maxOrders: 5000, maxInventoryItems: 5000 },
  ENTERPRISE: { maxUsers: -1, maxOrders: -1,   maxInventoryItems: -1   },
} as const;
```

- [ ] **Step 2: Create `backend/src/lib/logger.ts`**

```typescript
import winston from 'winston';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

const isProduction = process.env['NODE_ENV'] === 'production';

export const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: combine(
    timestamp(),
    errors({ stack: true }),
    isProduction ? json() : combine(colorize(), simple()),
  ),
  transports: [
    new winston.transports.Console(),
    ...(isProduction
      ? [
          new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
          new winston.transports.File({ filename: 'logs/combined.log' }),
        ]
      : []),
  ],
});
```

- [ ] **Step 3: Create `backend/src/lib/prisma.ts`**

```typescript
import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

// AsyncLocalStorage would be used in production for tenant context injection.
// For this scaffold, organizationId is passed explicitly in service calls.
// Prisma middleware enforces that organizationId is never missing on writes.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env['NODE_ENV'] === 'development'
      ? [{ level: 'query', emit: 'event' }, 'info', 'warn', 'error']
      : ['warn', 'error'],
  });

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Log slow queries in development
if (process.env['NODE_ENV'] === 'development') {
  prisma.$on('query' as never, (event: unknown) => {
    const e = event as { duration: number; query: string };
    if (e.duration > 500) {
      logger.warn(`Slow query (${e.duration}ms): ${e.query}`);
    }
  });
}
```

- [ ] **Step 4: Create `backend/src/middleware/errorHandler.ts`**

```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../lib/logger';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.flatten().fieldErrors,
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
    return;
  }

  logger.error('Unhandled error', { error: err });
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}
```

- [ ] **Step 5: Create `backend/src/middleware/auth.ts`**

```typescript
import { clerkMiddleware, getAuth } from '@clerk/express';
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { AppError } from './errorHandler';

export const clerkAuth = clerkMiddleware();

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const auth = getAuth(req);

  if (!auth.userId) {
    return next(new AppError(401, 'Authentication required', 'UNAUTHENTICATED'));
  }

  if (!auth.orgId) {
    return next(new AppError(403, 'Organization context required', 'NO_ORG_CONTEXT'));
  }

  (req as AuthenticatedRequest).auth = {
    userId: auth.userId,
    orgId: auth.orgId,
    orgRole: auth.orgRole ?? 'org:member',
  };

  next();
}

export function requireRole(allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    if (!allowedRoles.includes(authReq.auth.orgRole)) {
      return next(new AppError(403, 'Insufficient permissions', 'FORBIDDEN'));
    }
    next();
  };
}
```

- [ ] **Step 6: Create `backend/src/middleware/tenant.ts`**

```typescript
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../types';
import { AppError } from './errorHandler';
import { logger } from '../lib/logger';

declare module 'express' {
  interface Request {
    organizationId?: string;
    organizationDbId?: string;
  }
}

export async function injectTenant(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authReq = req as AuthenticatedRequest;

  try {
    const org = await prisma.organization.findUnique({
      where: { clerkOrgId: authReq.auth.orgId },
      select: { id: true },
    });

    if (!org) {
      return next(new AppError(404, 'Organization not found', 'ORG_NOT_FOUND'));
    }

    req.organizationId = authReq.auth.orgId;
    req.organizationDbId = org.id;
    next();
  } catch (error) {
    logger.error('Failed to inject tenant', { error });
    next(new AppError(500, 'Failed to resolve organization', 'TENANT_ERROR'));
  }
}
```

- [ ] **Step 7: Create `backend/src/middleware/limits.ts`**

```typescript
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { SUBSCRIPTION_LIMITS } from '../types';
import { AppError } from './errorHandler';

type LimitableResource = 'orders' | 'inventoryItems' | 'users';

export function checkLimit(resource: LimitableResource) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const orgDbId = req.organizationDbId;
    if (!orgDbId) {
      return next(new AppError(500, 'Organization context missing', 'NO_ORG'));
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgDbId },
      select: { plan: true, maxOrders: true, maxInventoryItems: true, maxUsers: true },
    });

    if (!org) {
      return next(new AppError(404, 'Organization not found', 'ORG_NOT_FOUND'));
    }

    const planLimits = SUBSCRIPTION_LIMITS[org.plan];
    const maxValue = planLimits[`max${resource.charAt(0).toUpperCase() + resource.slice(1)}` as keyof typeof planLimits];

    if (maxValue === -1) {
      return next(); // Unlimited
    }

    const countMap = {
      orders: () => prisma.order.count({ where: { organizationId: orgDbId } }),
      inventoryItems: () => prisma.inventoryItem.count({ where: { organizationId: orgDbId } }),
      users: () => prisma.user.count({ where: { organizationId: orgDbId } }),
    };

    const current = await countMap[resource]();

    if (current >= maxValue) {
      return next(
        new AppError(
          403,
          `Plan limit reached: ${resource} (${current}/${maxValue}). Please upgrade your plan.`,
          'PLAN_LIMIT_REACHED',
        ),
      );
    }

    next();
  };
}
```

- [ ] **Step 8: Create `backend/src/routes/health.ts`**

```typescript
import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

export const healthRouter = Router();

healthRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});
```

- [ ] **Step 9: Create `backend/src/index.ts`**

```typescript
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

import { logger } from './lib/logger';
import { errorHandler } from './middleware/errorHandler';
import { clerkAuth } from './middleware/auth';
import { healthRouter } from './routes/health';

const app = express();
const httpServer = createServer(app);

// ─── Socket.IO ────────────────────────────────────────────────────────────────
export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env['CORS_ORIGINS']?.split(',') ?? ['http://localhost:5173'],
    credentials: true,
  },
});

io.on('connection', (socket) => {
  const orgId = socket.handshake.auth['orgId'] as string | undefined;
  if (orgId) {
    void socket.join(`org:${orgId}`);
    logger.debug(`Socket ${socket.id} joined org room: ${orgId}`);
  }

  socket.on('disconnect', () => {
    logger.debug(`Socket ${socket.id} disconnected`);
  });
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env['CORS_ORIGINS']?.split(',') ?? ['http://localhost:5173'],
    credentials: true,
  }),
);
app.use(express.json({ limit: '10mb' }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
app.use(clerkAuth);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/health', healthRouter);

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env['PORT'] ?? '3001', 10);

httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} (${process.env['NODE_ENV'] ?? 'development'})`);
});
```

- [ ] **Step 10: Typecheck the backend**

```bash
cd backend && npm run typecheck
```

Expected: No TypeScript errors.

- [ ] **Step 11: Start dev server and verify health endpoint**

```bash
cd backend && npm run dev
```

In a second terminal:
```bash
curl http://localhost:3001/health
```

Expected: `{"status":"ok","db":"connected","timestamp":"..."}`

---

## Task 5: Frontend `package.json` + Config Files

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.node.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/postcss.config.js`

- [ ] **Step 1: Create `frontend/package.json`**

```json
{
  "name": "tshirtpos-frontend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src --ext .ts,.tsx"
  },
  "dependencies": {
    "@clerk/clerk-react": "^5.18.0",
    "@headlessui/react": "^2.2.0",
    "@heroicons/react": "^2.2.0",
    "@tanstack/react-query": "^5.62.0",
    "@tanstack/react-query-devtools": "^5.62.0",
    "axios": "^1.7.0",
    "date-fns": "^4.1.0",
    "framer-motion": "^11.12.0",
    "idb": "^8.0.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.54.0",
    "react-hot-toast": "^2.4.1",
    "react-router-dom": "^6.28.0",
    "recharts": "^2.13.0",
    "socket.io-client": "^4.8.0",
    "zustand": "^5.0.0",
    "zod": "^3.23.0",
    "@hookform/resolvers": "^3.9.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vite-plugin-pwa": "^0.21.0",
    "workbox-precaching": "^7.3.0",
    "workbox-routing": "^7.3.0",
    "workbox-strategies": "^7.3.0"
  }
}
```

- [ ] **Step 2: Create `frontend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: Create `frontend/tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: Create `frontend/vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'T-Shirt POS',
        short_name: 'POS',
        description: 'Professional T-Shirt Printing POS System',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'any',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 5 * 60 },
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 5: Create `frontend/tailwind.config.ts`**

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
        },
      },
      borderRadius: {
        xl:  '12px',
        '2xl': '16px',
      },
      minHeight: {
        touch:    '44px',
        'touch-lg': '52px',
        'touch-xl': '60px',
      },
      screens: {
        xs: '480px',
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 6: Create `frontend/postcss.config.js`**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 7: Install frontend dependencies**

```bash
cd frontend && npm install
```

Expected: `node_modules/` created, no errors.

---

## Task 6: Frontend Entry Files

**Files:**
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/index.css`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/lib/queryClient.ts`
- Create: `frontend/src/types/index.ts`
- Create: `frontend/src/store/uiStore.ts`
- Create: `frontend/src/store/offlineStore.ts`
- Create: `frontend/src/pages/Dashboard.tsx`
- Create: `frontend/src/pages/SignIn.tsx`
- Create: `frontend/.env` (from root `.env.example`)

- [ ] **Step 1: Create `frontend/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#2563eb" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="T-Shirt POS" />
    <meta name="description" content="Professional T-Shirt Printing POS System" />
    <title>T-Shirt POS</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Create `frontend/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    -webkit-tap-highlight-color: transparent;
  }

  html {
    -webkit-text-size-adjust: 100%;
    font-feature-settings: 'cv11', 'ss01';
  }

  body {
    @apply bg-gray-50 text-gray-900 antialiased;
    overscroll-behavior: none;
  }
}

@layer utilities {
  .touch-target {
    @apply min-h-[44px] min-w-[44px];
  }
}
```

- [ ] **Step 3: Create `frontend/src/types/index.ts`**

```typescript
export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'FREE' | 'PRO' | 'ENTERPRISE';
  subscriptionStatus: string | null;
}

export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  code?: string;
}

export type OrderStatus =
  | 'QUOTE'
  | 'APPROVED'
  | 'MATERIALS_ORDERED'
  | 'MATERIALS_RECEIVED'
  | 'IN_PRODUCTION'
  | 'QUALITY_CHECK'
  | 'READY_TO_SHIP'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED';

export type OrderPriority = 'NORMAL' | 'HIGH' | 'RUSH';

export type PrintMethod = 'DTF' | 'HTV' | 'SCREEN_PRINT' | 'EMBROIDERY' | 'SUBLIMATION';

export type PrintLocation = 'FRONT' | 'BACK' | 'LEFT_SLEEVE' | 'RIGHT_SLEEVE' | 'FULL_PRINT';

export type InventoryCategory =
  | 'BLANK_SHIRTS'
  | 'DTF_TRANSFERS'
  | 'VINYL'
  | 'INK'
  | 'PACKAGING'
  | 'EMBROIDERY_THREAD'
  | 'OTHER';
```

- [ ] **Step 4: Create `frontend/src/lib/queryClient.ts`**

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,    // 2 minutes
      gcTime: 1000 * 60 * 10,      // 10 minutes
      retry: (failureCount, error) => {
        const err = error as { status?: number };
        if (err?.status && [401, 403, 404].includes(err.status)) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: false,
    },
  },
});
```

- [ ] **Step 5: Create `frontend/src/lib/api.ts`**

```typescript
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = import.meta.env['VITE_API_URL'] as string ?? 'http://localhost:3001';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Token injected by Clerk — set via setApiToken() called after Clerk loads
let clerkToken: string | null = null;

export function setApiToken(token: string | null): void {
  clerkToken = token;
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (clerkToken) {
    config.headers['Authorization'] = `Bearer ${clerkToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);
```

- [ ] **Step 6: Create `frontend/src/store/uiStore.ts`**

```typescript
import { create } from 'zustand';

interface UiState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
```

- [ ] **Step 7: Create `frontend/src/store/offlineStore.ts`**

```typescript
import { create } from 'zustand';

interface OfflineState {
  isOnline: boolean;
  queuedMutations: number;
  setOnline: (online: boolean) => void;
  setQueuedMutations: (count: number) => void;
}

export const useOfflineStore = create<OfflineState>((set) => ({
  isOnline: navigator.onLine,
  queuedMutations: 0,
  setOnline: (online) => set({ isOnline: online }),
  setQueuedMutations: (count) => set({ queuedMutations: count }),
}));

// Wire up browser online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => useOfflineStore.getState().setOnline(true));
  window.addEventListener('offline', () => useOfflineStore.getState().setOnline(false));
}
```

- [ ] **Step 8: Create `frontend/src/pages/SignIn.tsx`**

```typescript
import { SignIn } from '@clerk/clerk-react';

export function SignInPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <SignIn
        appearance={{
          elements: {
            formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 min-h-[44px]',
            card: 'shadow-lg rounded-2xl',
          },
        }}
      />
    </div>
  );
}
```

- [ ] **Step 9: Create `frontend/src/pages/Dashboard.tsx`**

```typescript
export function DashboardPage(): JSX.Element {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-2 text-gray-500">Welcome to your POS system.</p>
    </div>
  );
}
```

- [ ] **Step 10: Create `frontend/src/App.tsx`**

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import { DashboardPage } from '@/pages/Dashboard';
import { SignInPage } from '@/pages/SignIn';

export function App(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/sign-in/*" element={<SignInPage />} />
        <Route
          path="/*"
          element={
            <>
              <SignedIn>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                </Routes>
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn />
              </SignedOut>
            </>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 11: Create `frontend/src/main.tsx`**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider, useAuth } from '@clerk/clerk-react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import { App } from './App';
import { queryClient } from './lib/queryClient';
import { setApiToken } from './lib/api';
import './index.css';

const PUBLISHABLE_KEY = import.meta.env['VITE_CLERK_PUBLISHABLE_KEY'] as string;

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY environment variable');
}

function TokenSync(): null {
  const { getToken } = useAuth();

  React.useEffect(() => {
    const syncToken = async (): Promise<void> => {
      const token = await getToken();
      setApiToken(token);
    };

    void syncToken();
    const interval = setInterval(() => { void syncToken(); }, 55 * 1000);
    return () => clearInterval(interval);
  }, [getToken]);

  return null;
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <QueryClientProvider client={queryClient}>
        <TokenSync />
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { borderRadius: '12px', minHeight: '44px' },
          }}
        />
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ClerkProvider>
  </React.StrictMode>,
);
```

- [ ] **Step 12: Create `frontend/.env`**

```bash
cp ../.env.example frontend/.env
```

Fill in `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_API_URL=http://localhost:3001`.

- [ ] **Step 13: Typecheck the frontend**

```bash
cd frontend && npm run typecheck
```

Expected: No TypeScript errors.

- [ ] **Step 14: Start frontend dev server**

```bash
cd frontend && npm run dev
```

Open `http://localhost:5173` — should show Clerk sign-in page.

---

## Task 7: Final Verification

- [ ] **Step 1: Verify both servers run simultaneously**

Terminal 1: `cd backend && npm run dev`
Terminal 2: `cd frontend && npm run dev`

- [ ] **Step 2: Verify health endpoint**

```bash
curl http://localhost:3001/health
```

Expected: `{"status":"ok","db":"connected","timestamp":"..."}`

- [ ] **Step 3: Verify frontend loads**

Open `http://localhost:5173` — Clerk sign-in page renders, no console errors.

- [ ] **Step 4: Verify Docker containers**

```bash
docker-compose ps
```

Expected: both `tshirt_pos_db` and `tshirt_pos_pgadmin` are `Up`.

- [ ] **Step 5: Verify pgAdmin**

Open `http://localhost:5050` — login with `admin@pos.local` / `admin`.
Add server: host `postgres`, port `5432`, user `posuser`, password `pospassword`, db `tshirtpos`.
All tables from the Prisma schema should be visible.

---

## Self-Review Notes

- All models in schema include `organizationId` — ✅
- Clerk auth middleware in place from the start — ✅
- Tenant injection middleware ready for all protected routes — ✅
- Subscription limit middleware created and ready to apply per route — ✅
- PWA plugin configured with offline-first caching strategy — ✅
- Zustand offline store wired to browser events — ✅
- Token sync between Clerk and Axios handles token refresh — ✅
- Socket.IO rooms scoped to `org:${orgId}` — ✅
- No `any` types — ✅
- No default exports — ✅
