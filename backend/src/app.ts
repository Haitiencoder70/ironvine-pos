import * as Sentry from '@sentry/node';
// init immediately so it wraps all subsequent requires
Sentry.init({
  dsn: process.env['SENTRY_DSN'],
  environment: process.env['NODE_ENV'] ?? 'development',
  tracesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.2 : 1.0,
  enabled: !!process.env['SENTRY_DSN'],
});

import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { rateLimit } from 'express-rate-limit';
import { requestTimer } from './services/performanceMonitor';

import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { clerkAuth, requireAuth } from './middleware/auth';
import { injectTenant } from './middleware/tenant';
import { sanitizeInput } from './middleware/sanitize';
import { authLimiter, uploadLimiter } from './middleware/rateLimiter';

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
import { billingRouter, billingWebhookRouter } from './routes/billing';
import { searchRouter } from './routes/search';
import { posRouter } from './routes/pos';
import { productsRouter, productCategoriesRouter, productAddOnsRouter } from './routes/products';
import { imagesRouter } from './routes/images';
import { trackingRouter } from './routes/tracking';
import { organizationRouter, publicInviteRouter } from './routes/organizationRoutes';
import { organizationsRouter } from './routes/organizationsRoutes';
import { analyticsRouter } from './routes/analytics';
import { brandingRouter } from './routes/branding';
import { auditLogRouter } from './routes/auditLog';

export const app = express();

// Trust Railway's reverse proxy / load balancer so that X-Forwarded-For
// is used correctly by express-rate-limit and other IP-aware middleware.
app.set('trust proxy', 1);

// ─── Security and utility middleware ──────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https:", "data:", "https://fonts.gstatic.com"],
      scriptSrc: [
        "'self'",
        "https://js.stripe.com",
        "https://browser.sentry-cdn.com",
        "https://clerk.dev",
        "https://*.clerk.accounts.dev",
        "https://*.clerk.com",
      ],
      frameSrc: ["https://js.stripe.com", "https://clerk.dev", "https://*.clerk.accounts.dev", "https://*.clerk.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: [
        "'self'",
        "https://sentry.io",
        "https://*.sentry.io",
        "https://api.stripe.com",
        "https://clerk.dev",
        "https://*.clerk.accounts.dev",
        "https://*.clerk.com",
        ...env.CORS_ORIGINS.split(',').map(o => o.trim()),
      ],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
app.use(compression());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      const allowed = [
        ...env.CORS_ORIGINS.split(',').map(o => o.trim()),
        env.FRONTEND_URL.trim()
      ];

      const isAllowed = allowed.some(a => {
        if (origin === a) return true;
        const base = a.replace(/^https?:\/\//, '');
        return origin.endsWith(`.${base}`) || new RegExp(`^https?://${base.replace('.', '\\.')}$`).test(origin);
      });

      // For monolithic deployments, also allow the origin if it matches the current server's origin.
      // We do this by not strictly failing if it's not in the list, but returning a generic allowed true
      // since the monolithic deployment shares the exact same origin.
      // If it fails, we will pass true anyway if the host matches the origin, but we don't have req here easily.
      // Actually, passing the error to callback throws 500. Let's just return false instead of Error to avoid 500s.
      // If we return callback(null, false), it just omits the Access-Control-Allow-Origin header instead of throwing 500!
      callback(null, isAllowed);
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '10mb' }));
app.use(sanitizeInput);
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

// ─── Stripe webhook (before clerkAuth — raw body, no Clerk JWT) ──────────
app.use('/api/billing', billingWebhookRouter);

// ─── Public org invite endpoints (no auth — accept-invite page) ───────────
app.use('/api/organization', publicInviteRouter);

// ─── Clerk auth middleware ────────────────────────────────────────────────
// Parses and verifies the Clerk JWT for all /api routes below.
app.use('/api', clerkAuth);

// ─── Signup endpoints (auth but no tenant context yet) ───────────────────
app.use('/api/organizations', organizationsRouter);

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
app.use('/api/auth',              authLimiter, authRouter);
app.use('/api/dashboard',         dashboardRouter);
app.use('/api/orders',            ordersRouter);
app.use('/api/inventory',         inventoryRouter);
app.use('/api/customers',         customersRouter);
app.use('/api/vendors',           vendorsRouter);
app.use('/api/purchase-orders',   purchaseOrdersRouter);
app.use('/api/shipments',         shipmentsRouter);
app.use('/api/reports',           reportsRouter);
app.use('/api/billing',           billingRouter);
app.use('/api/settings',          settingsRouter);
app.use('/api/search',            searchRouter);
app.use('/api/pos',               posRouter);
app.use('/api/products',          productsRouter);
app.use('/api/product-categories', productCategoriesRouter);
app.use('/api/product-addons',    productAddOnsRouter);
app.use('/api/images',            uploadLimiter, imagesRouter);
app.use('/api/organization',      organizationRouter);
app.use('/api/analytics',         analyticsRouter);
app.use('/api/branding',          brandingRouter);
app.use('/api/audit-log',         auditLogRouter);

// ─── Frontend Static Serving (Monolith Deployment) ────────────────────────
const frontendDistPath = process.env.NODE_ENV === 'production'
  ? path.join(process.cwd(), '../frontend/dist')
  : path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDistPath));

app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
    return next();
  }
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// ─── Global Error Handler ─────────────────────────────────────────────────
// Sentry must capture errors before our custom handler transforms them.
Sentry.setupExpressErrorHandler(app);
app.use(errorHandler);
