import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

export type MetricType =
  | 'order_created'
  | 'inventory_added'
  | 'user_invited'
  | 'customer_added';

// ─── Event tracking ───────────────────────────────────────────────────────────

export async function trackEvent(
  organizationId: string,
  metricType: MetricType,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.usageEvent.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { organizationId, metricType, count: 1, metadata: (metadata as any) ?? undefined },
    });
  } catch (err) {
    // Non-critical — log and continue
    logger.warn('[analytics] trackEvent failed', { organizationId, metricType, err });
  }
}

// ─── Period query helpers ─────────────────────────────────────────────────────

export interface DailyCount {
  date: string; // ISO date 'YYYY-MM-DD'
  count: number;
}

export interface PeriodUsage {
  metricType: MetricType;
  total: number;
  daily: DailyCount[];
}

export async function getUsageForPeriod(
  organizationId: string,
  metricType: MetricType,
  from: Date,
  to: Date,
): Promise<PeriodUsage> {
  const events = await prisma.usageEvent.findMany({
    where: {
      organizationId,
      metricType,
      createdAt: { gte: from, lte: to },
    },
    select: { count: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  // Aggregate by day
  const dailyMap = new Map<string, number>();
  let total = 0;
  for (const e of events) {
    const date = e.createdAt.toISOString().slice(0, 10);
    dailyMap.set(date, (dailyMap.get(date) ?? 0) + e.count);
    total += e.count;
  }

  const daily: DailyCount[] = Array.from(dailyMap.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  return { metricType, total, daily };
}

export async function getCurrentPeriodUsage(
  organizationId: string,
): Promise<PeriodUsage[]> {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const types: MetricType[] = [
    'order_created',
    'inventory_added',
    'user_invited',
    'customer_added',
  ];

  return Promise.all(types.map((t) => getUsageForPeriod(organizationId, t, from, to)));
}

// ─── Billing period helpers ───────────────────────────────────────────────────

export async function resetMonthlyCounters(organizationId: string): Promise<void> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const [orderCount, customerCount, inventoryCount, userCount] = await Promise.all([
    prisma.order.count({ where: { organizationId } }),
    prisma.customer.count({ where: { organizationId } }),
    prisma.inventoryItem.count({ where: { organizationId } }),
    prisma.user.count({ where: { organizationId } }),
  ]);

  await prisma.usageMetrics.upsert({
    where: { organizationId_periodStart: { organizationId, periodStart } },
    update: { orderCount, customerCount, inventoryCount, userCount, periodEnd, updatedAt: now },
    create: { organizationId, periodStart, periodEnd, orderCount, customerCount, inventoryCount, userCount },
  });

  logger.info('[analytics] Monthly counters snapshotted', { organizationId, periodStart });
}

// ─── Export ───────────────────────────────────────────────────────────────────

export async function exportUsageData(
  organizationId: string,
  from: Date,
  to: Date,
): Promise<{ events: { metricType: string; count: number; createdAt: Date }[] }> {
  const events = await prisma.usageEvent.findMany({
    where: { organizationId, createdAt: { gte: from, lte: to } },
    select: { metricType: true, count: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  return { events };
}
