import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { rateLimit } from 'express-rate-limit';
import { requestTimer } from './services/performanceMonitor';

import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { clerkAuth, requireAuth } from './middleware/auth';
import { injectTenant } from './middleware/tenant';

// Routers
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { dashboardRouter } from './routes/dashboard';
import { ordersRouter } from './routes/orders';
import { inventoryRouter } from './routes/inventory';
import { customersRouter } from './routes/customers';
import { vendorsRouter } from './routes/vendors';
import { purchaseOrdersRouter } from './routes/purchaseOrders';
import { shipmentsRouter } from './routes/shipments';
import { reportsRouter } from './routes/reports';
import { settingsRouter } from './routes/settings';
import { billingRouter } from './routes/billing';
import { searchRouter } from './routes/search';
import { posRouter } from './routes/pos';
import { productsRouter, productCategoriesRouter, productAddOnsRouter } from './routes/products';
import { imagesRouter } from './routes/images';
import { trackingRouter } from './routes/tracking';
import { organizationRouter } from './routes/organizationRoutes';
import { analyticsRouter } from './routes/analytics';
import { brandingRouter } from './routes/branding';
import { auditLogRouter } from './routes/auditLog';

export const app = express();

// ─── Security and utility middleware ──────────────────────────────────────
app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: env.CORS_ORIGINS.split(','),
    credentials: true,
  }),
);
app.use(express.json({ limit: '10mb' }));
// Global rate limiter — coarse guard before auth resolves
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// Per-org rate limiter — applied after tenant/auth middleware below
const orgRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: async (req) => {
    const org = req as unknown as { organization?: { plan?: string } };
    return org.organization?.plan === 'ENTERPRISE' ? 10000 : 1000;
  },
  keyGenerator: (req) => {
    const r = req as unknown as { organizationDbId?: string };
    return r.organizationDbId ?? req.ip ?? 'unknown';
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Health Check ─────────────────────────────────────────────────────────
// Before clerkAuth so load-balancers and uptime monitors can probe freely.
app.use('/health', healthRouter);
app.use('/api/health', healthRouter);

// ─── Public Routes ────────────────────────────────────────────────────────
// Order tracking is unauthenticated (customers use a share link).
app.use('/api/tracking', trackingRouter);

// ─── Billing (before clerkAuth — Stripe webhooks carry no auth token) ─────
app.use('/api/billing', billingRouter);

// ─── Public org invite endpoints (no auth — accept-invite page) ───────────
// Only the two public sub-routes are accessible here; all other /api/organization
// routes are protected by the tenant+auth chain mounted below.
app.use('/api/organization', organizationRouter);

// ─── Clerk auth middleware ────────────────────────────────────────────────
// Parses and verifies the Clerk JWT for all /api routes below.
app.use('/api', clerkAuth);

// ─── Tenant + auth middleware chain ──────────────────────────────────────
// Order matters:
//   1. injectTenant  → resolves org from subdomain or Clerk orgId,
//                       sets req.organizationId / req.organizationDbId,
//                       and pushes a TenantContext into AsyncLocalStorage
//                       so the Prisma isolation middleware can read it.
//   2. requireAuth   → verifies session, checks org membership, attaches auth.
//
// Both are applied together so every authenticated route is tenant-scoped.
//
// We wrap `next` in `runWithTenantContext` inside injectTenant itself, so
// the entire downstream handler chain runs inside the correct ALS store.
app.use('/api', injectTenant);
app.use('/api', requireAuth);
app.use('/api', orgRateLimiter);
app.use('/api', requestTimer);

// ─── API Routes ───────────────────────────────────────────────────────────
app.use('/api/auth',              authRouter);
app.use('/api/dashboard',         dashboardRouter);
app.use('/api/orders',            ordersRouter);
app.use('/api/inventory',         inventoryRouter);
app.use('/api/customers',         customersRouter);
app.use('/api/vendors',           vendorsRouter);
app.use('/api/purchase-orders',   purchaseOrdersRouter);
app.use('/api/shipments',         shipmentsRouter);
app.use('/api/reports',           reportsRouter);
app.use('/api/settings',          settingsRouter);
app.use('/api/search',            searchRouter);
app.use('/api/pos',               posRouter);
app.use('/api/products',          productsRouter);
app.use('/api/product-categories', productCategoriesRouter);
app.use('/api/product-addons',    productAddOnsRouter);
app.use('/api/images',            imagesRouter);
app.use('/api/organization',      organizationRouter);
app.use('/api/analytics',         analyticsRouter);
app.use('/api/branding',          brandingRouter);
app.use('/api/audit-log',         auditLogRouter);

// ─── Global Error Handler ─────────────────────────────────────────────────
app.use(errorHandler);
