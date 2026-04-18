import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

interface EndpointMetric {
  count: number;
  totalMs: number;
  slowCount: number; // requests > 500ms
  errorCount: number;
  lastSlowMs: number;
}

const metrics = new Map<string, EndpointMetric>();
const SLOW_THRESHOLD_MS = 500;

function getKey(req: Request): string {
  return `${req.method} ${req.route?.path ?? req.path}`;
}

function ensureMetric(key: string): EndpointMetric {
  if (!metrics.has(key)) {
    metrics.set(key, { count: 0, totalMs: 0, slowCount: 0, errorCount: 0, lastSlowMs: 0 });
  }
  return metrics.get(key)!;
}

/**
 * Express middleware that measures request duration and logs slow endpoints.
 * Attach after auth/tenant middleware so `req.route` is populated.
 */
export function requestTimer(req: Request, res: Response, next: NextFunction): void {
  const start = performance.now();

  res.on('finish', () => {
    const durationMs = performance.now() - start;
    const key = getKey(req);
    const metric = ensureMetric(key);

    metric.count += 1;
    metric.totalMs += durationMs;

    if (res.statusCode >= 500) metric.errorCount += 1;

    if (durationMs > SLOW_THRESHOLD_MS) {
      metric.slowCount += 1;
      metric.lastSlowMs = durationMs;
      logger.warn('Slow endpoint', {
        method: req.method,
        path: key,
        durationMs: Math.round(durationMs),
        status: res.statusCode,
        organizationId: (req as unknown as Record<string, unknown>)['organizationDbId'],
      });
    }
  });

  next();
}

/**
 * Returns a snapshot of all collected endpoint metrics, sorted by avg duration desc.
 */
export function getPerformanceReport(): Array<{
  endpoint: string;
  requestCount: number;
  avgMs: number;
  slowCount: number;
  errorCount: number;
  lastSlowMs: number;
}> {
  return Array.from(metrics.entries())
    .map(([endpoint, m]) => ({
      endpoint,
      requestCount: m.count,
      avgMs: m.count > 0 ? Math.round(m.totalMs / m.count) : 0,
      slowCount: m.slowCount,
      errorCount: m.errorCount,
      lastSlowMs: Math.round(m.lastSlowMs),
    }))
    .sort((a, b) => b.avgMs - a.avgMs);
}

/**
 * Resets all collected metrics (useful in tests).
 */
export function resetMetrics(): void {
  metrics.clear();
}
