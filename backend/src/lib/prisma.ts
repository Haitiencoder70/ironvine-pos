import { PrismaClient } from '@prisma/client';
import { logger } from './logger';
import { tenantIsolationExtension } from '../middleware/tenantIsolation';

const SLOW_QUERY_THRESHOLD_MS = 100;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const base: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env['NODE_ENV'] === 'development'
      ? [{ level: 'query', emit: 'event' }, 'info', 'warn', 'error']
      : ['warn', 'error'],
  });

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prisma = base;
}

/**
 * Extended Prisma client with two chained query extensions:
 *  1. Tenant isolation — injects organizationId on all reads/writes
 *  2. Slow query logging — warns on queries exceeding 100 ms
 *
 * Each $extends call wraps the previous layer, so isolation runs first,
 * then the query executes, then slow-query logging fires on the way out.
 */
export const prisma = base
  .$extends({ query: tenantIsolationExtension })
  .$extends({
    query: {
      $allModels: {
        async $allOperations({ operation, model, args, query }) {
          const start = performance.now();
          const result = await query(args);
          const durationMs = performance.now() - start;

          if (durationMs > SLOW_QUERY_THRESHOLD_MS) {
            logger.warn('Slow DB query', {
              model,
              operation,
              durationMs: Math.round(durationMs),
            });
          }

          return result;
        },
      },
    },
  });
