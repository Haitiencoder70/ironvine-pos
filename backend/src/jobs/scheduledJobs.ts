/**
 * scheduledJobs — node-cron background tasks.
 * Call startScheduledJobs() once from index.ts after the server starts.
 */
import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import {
  notifyTrialEnding,
  notifyPlanLimitWarning,
  notifyUsageReport,
} from '../services/notificationService';
import { resetMonthlyCounters } from '../services/analyticsService';

// ─── Trial ending check (daily at 09:00 UTC) ─────────────────────────────────

async function checkTrialsEnding(): Promise<void> {
  logger.info('[jobs] checkTrialsEnding start');
  const now = new Date();

  for (const daysLeft of [3, 1]) {
    const from = new Date(now);
    from.setDate(from.getDate() + daysLeft);
    from.setHours(0, 0, 0, 0);

    const to = new Date(from);
    to.setHours(23, 59, 59, 999);

    const orgs = await prisma.organization.findMany({
      where: { trialEndsAt: { gte: from, lte: to } },
      select: { id: true, name: true },
    });

    for (const org of orgs) {
      logger.info(`[jobs] trial ending in ${daysLeft}d: ${org.name}`);
      await notifyTrialEnding(org.id, daysLeft);
    }
  }
  logger.info('[jobs] checkTrialsEnding done');
}

// ─── Plan limit check (daily at 10:00 UTC) ───────────────────────────────────

async function checkPlanLimits(): Promise<void> {
  logger.info('[jobs] checkPlanLimits start');

  const orgs = await prisma.organization.findMany({
    where: { plan: { not: 'FREE' } },
    select: {
      id: true,
      maxOrders: true,
      maxCustomers: true,
      maxUsers: true,
      maxInventoryItems: true,
    },
  });

  for (const org of orgs) {
    const [orderCount, customerCount, userCount, inventoryCount] = await Promise.all([
      prisma.order.count({ where: { organizationId: org.id } }),
      prisma.customer.count({ where: { organizationId: org.id } }),
      prisma.user.count({ where: { organizationId: org.id } }),
      prisma.inventoryItem.count({ where: { organizationId: org.id } }),
    ]);

    const checks: { label: string; current: number; max: number | null }[] = [
      { label: 'orders',          current: orderCount,     max: org.maxOrders },
      { label: 'customers',       current: customerCount,  max: org.maxCustomers },
      { label: 'team members',    current: userCount,      max: org.maxUsers },
      { label: 'inventory items', current: inventoryCount, max: org.maxInventoryItems },
    ];

    for (const c of checks) {
      if (!c.max || c.max === -1) continue;
      const pct = Math.round((c.current / c.max) * 100);
      // Only send at the 80% and 90% thresholds (not every day once over)
      if (pct === 80 || pct === 90) {
        await notifyPlanLimitWarning(org.id, {
          limitType: c.label,
          percentage: pct,
          current: c.current,
          max: c.max,
        });
      }
    }
  }
  logger.info('[jobs] checkPlanLimits done');
}

// ─── Weekly usage reports (Mondays at 08:00 UTC) ─────────────────────────────

async function sendWeeklyUsageReports(): Promise<void> {
  logger.info('[jobs] sendWeeklyUsageReports start');

  const orgs = await prisma.organization.findMany({
    where: { plan: { not: 'FREE' } },
    select: { id: true },
  });

  for (const org of orgs) {
    await notifyUsageReport(org.id);
  }

  logger.info(`[jobs] sendWeeklyUsageReports sent to ${orgs.length} orgs`);
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

export function startScheduledJobs(): void {
  // Daily at 09:00 UTC
  cron.schedule('0 9 * * *', () => {
    void checkTrialsEnding();
  });

  // Daily at 10:00 UTC
  cron.schedule('0 10 * * *', () => {
    void checkPlanLimits();
  });

  // Every Monday at 08:00 UTC
  cron.schedule('0 8 * * 1', () => {
    void sendWeeklyUsageReports();
  });

  // 1st of each month at 00:05 UTC — snapshot monthly counters
  cron.schedule('5 0 1 * *', () => {
    void (async () => {
      logger.info('[jobs] snapshotMonthlyCounters start');
      const orgs = await prisma.organization.findMany({ select: { id: true } });
      for (const org of orgs) {
        await resetMonthlyCounters(org.id);
      }
      logger.info(`[jobs] snapshotMonthlyCounters done for ${orgs.length} orgs`);
    })();
  });

  logger.info('[jobs] Scheduled jobs registered (trials, limits, usage reports, monthly snapshots)');
}
