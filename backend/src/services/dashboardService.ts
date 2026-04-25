import { prisma } from '../lib/prisma';
import { OrderStatus } from '@prisma/client';

export async function getDashboardStats(organizationId: string) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    ordersToday,
    inProduction,
    readyToShip,
    revenueResult
  ] = await Promise.all([
    prisma.order.count({
      where: {
        organizationId,
        createdAt: { gte: startOfDay },
      },
    }),
    prisma.order.count({
      where: {
        organizationId,
        status: 'IN_PRODUCTION',
      },
    }),
    prisma.order.count({
      where: {
        organizationId,
        status: 'READY_TO_SHIP',
      },
    }),
    prisma.order.aggregate({
      where: {
        organizationId,
        createdAt: { gte: startOfDay },
        status: { notIn: ['CANCELLED'] }
      },
      _sum: { total: true },
    }),
  ]);

  return {
    ordersToday,
    inProduction,
    readyToShip,
    revenueToday: revenueResult._sum.total ?? 0,
  };
}

export async function getRecentOrders(organizationId: string) {
  return prisma.order.findMany({
    where: { organizationId },
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      customer: { select: { firstName: true, lastName: true } },
    },
  });
}

export async function getOrdersByStatus(organizationId: string) {
  const counts = await prisma.order.groupBy({
    by: ['status'],
    where: { organizationId },
    _count: { status: true },
  });

  return counts.reduce((acc, curr) => {
    acc[curr.status] = curr._count.status;
    return acc;
  }, {} as Record<OrderStatus, number>);
}

export async function getLowStockAlerts(organizationId: string) {
  // Prisma doesn't support field-to-field comparisons in findMany,
  // so we use a raw query to compare quantityOnHand <= reorderPoint
  return prisma.$queryRaw<
    Array<{
      id: string;
      sku: string;
      name: string;
      quantityOnHand: number;
      reorderPoint: number;
    }>
  >`
    SELECT id, sku, name, "quantityOnHand", "reorderPoint"
    FROM inventory_items
    WHERE "organizationId" = ${organizationId}
      AND "isActive" = true
      AND "quantityOnHand" <= "reorderPoint"
    ORDER BY "quantityOnHand" ASC
    LIMIT 50
  `;
}

export async function getProfitStats(
  organizationId: string,
  startDate: Date,
  endDate: Date,
) {
  const prevStart = new Date(startDate);
  const prevEnd = new Date(endDate);
  const rangeMs = endDate.getTime() - startDate.getTime();
  prevStart.setTime(startDate.getTime() - rangeMs);
  prevEnd.setTime(endDate.getTime() - rangeMs);

  async function getStatsForRange(from: Date, to: Date) {
    const [revenueResult, materialCostRows] = await Promise.all([
      prisma.order.aggregate({
        where: {
          organizationId,
          createdAt: { gte: from, lte: to },
          status: { notIn: ['CANCELLED'] as OrderStatus[] },
        },
        _sum: { total: true },
      }),
      prisma.$queryRaw<Array<{ totalCost: string }>>`
        SELECT COALESCE(SUM(mu."quantityUsed" * ii."costPrice"), 0)::text AS "totalCost"
        FROM material_usage mu
        JOIN inventory_items ii ON ii.id = mu."inventoryItemId"
        JOIN orders o ON o.id = mu."orderId"
        WHERE mu."organizationId" = ${organizationId}
          AND o."createdAt" >= ${from}
          AND o."createdAt" <= ${to}
          AND o.status != 'CANCELLED'
      `,
    ]);

    const revenue = Number(revenueResult._sum.total ?? 0);
    const costs = Number(materialCostRows[0]?.totalCost ?? 0);
    const profit = revenue - costs;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    return { revenue, costs, profit, margin };
  }

  const [current, previous] = await Promise.all([
    getStatsForRange(startDate, endDate),
    getStatsForRange(prevStart, prevEnd),
  ]);

  function pctChange(curr: number, prev: number) {
    if (prev === 0) return null;
    return ((curr - prev) / prev) * 100;
  }

  return {
    revenue: current.revenue,
    costs: current.costs,
    profit: current.profit,
    margin: current.margin,
    revenueChange: pctChange(current.revenue, previous.revenue),
    costsChange: pctChange(current.costs, previous.costs),
    profitChange: pctChange(current.profit, previous.profit),
    marginChange: current.margin - previous.margin,
  };
}

export async function getProfitTrend(organizationId: string, months = 6) {
  const now = new Date();

  const results = await Promise.all(
    Array.from({ length: months }, (_, idx) => months - 1 - idx).map(async (i) => {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);

      const [revenueResult, costRows] = await Promise.all([
        prisma.order.aggregate({
          where: {
            organizationId,
            createdAt: { gte: start, lte: end },
            status: { notIn: ['CANCELLED'] as OrderStatus[] },
          },
          _sum: { total: true },
        }),
        prisma.$queryRaw<Array<{ totalCost: string }>>`
          SELECT COALESCE(SUM(mu."quantityUsed" * ii."costPrice"), 0)::text AS "totalCost"
          FROM material_usage mu
          JOIN inventory_items ii ON ii.id = mu."inventoryItemId"
          JOIN orders o ON o.id = mu."orderId"
          WHERE mu."organizationId" = ${organizationId}
            AND o."createdAt" >= ${start}
            AND o."createdAt" <= ${end}
            AND o.status != 'CANCELLED'
        `,
      ]);

      const revenue = Number(revenueResult._sum.total ?? 0);
      const costs = Number(costRows[0]?.totalCost ?? 0);
      return {
        month: start.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
        revenue,
        costs,
        profit: revenue - costs,
      };
    }),
  );

  return results;
}

export async function getTopProducts(
  organizationId: string,
  startDate: Date,
  endDate: Date,
) {
  // Sum revenue and units sold per productType
  const rows = await prisma.$queryRaw<
    Array<{
      productType: string;
      unitsSold: string;
      revenue: string;
    }>
  >`
    SELECT
      oi."productType",
      SUM(oi.quantity)::text        AS "unitsSold",
      SUM(oi."lineTotal")::text     AS "revenue"
    FROM order_items oi
    JOIN orders o ON o.id = oi."orderId"
    WHERE oi."organizationId" = ${organizationId}
      AND o."createdAt" >= ${startDate}
      AND o."createdAt" <= ${endDate}
      AND o.status != 'CANCELLED'
    GROUP BY oi."productType"
    ORDER BY SUM(oi."lineTotal") DESC
    LIMIT 10
  `;

  // Get org-wide cost ratio for the same period to estimate product margins
  const [revenueResult, costRows] = await Promise.all([
    prisma.order.aggregate({
      where: {
        organizationId,
        createdAt: { gte: startDate, lte: endDate },
        status: { notIn: ['CANCELLED'] as OrderStatus[] },
      },
      _sum: { total: true },
    }),
    prisma.$queryRaw<Array<{ totalCost: string }>>`
      SELECT COALESCE(SUM(mu."quantityUsed" * ii."costPrice"), 0)::text AS "totalCost"
      FROM material_usage mu
      JOIN inventory_items ii ON ii.id = mu."inventoryItemId"
      JOIN orders o ON o.id = mu."orderId"
      WHERE mu."organizationId" = ${organizationId}
        AND o."createdAt" >= ${startDate}
        AND o."createdAt" <= ${endDate}
        AND o.status != 'CANCELLED'
    `,
  ]);

  const totalRevenue = Number(revenueResult._sum.total ?? 0);
  const totalCosts = Number(costRows[0]?.totalCost ?? 0);
  const costRatio = totalRevenue > 0 ? totalCosts / totalRevenue : 0.35;

  return rows.map((r, i) => {
    const revenue = Number(r.revenue);
    const estimatedCost = revenue * costRatio;
    const profit = revenue - estimatedCost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    return {
      rank: i + 1,
      productType: r.productType,
      unitsSold: Number(r.unitsSold),
      revenue,
      estimatedCost,
      profit,
      margin,
    };
  });
}

export async function getPendingPOs(organizationId: string) {
  return prisma.purchaseOrder.findMany({
    where: {
      organizationId,
      status: { in: ['SENT', 'PARTIALLY_RECEIVED'] },
    },
    include: {
      vendor: { select: { name: true } },
    },
    orderBy: { expectedDate: 'asc' },
    take: 20,
  });
}
