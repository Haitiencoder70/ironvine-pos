import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { clerkAuth } from './middleware/auth';

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

export const app = express();

// Security and utility middleware
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGINS.split(','),
    credentials: true,
  }),
);
app.use(express.json({ limit: '10mb' }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// ─── Health Check ─────────────────────────────────────────────────────────────
// Must be before clerkAuth so load balancers can probe without auth
app.use('/health', healthRouter);

// ─── Auth Middleware ──────────────────────────────────────────────────────────
// Requires valid Clerk token for all routes below
app.use('/api', clerkAuth);

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/customers', customersRouter);
app.use('/api/vendors', vendorsRouter);
app.use('/api/purchase-orders', purchaseOrdersRouter);
app.use('/api/shipments', shipmentsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/settings', settingsRouter);

// Global Error Handler
app.use(errorHandler);
