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
  return prisma.inventoryItem.findMany({
    where: {
      organizationId,
      isActive: true,
      quantityOnHand: {
        lte: prisma.inventoryItem.fields.reorderPoint,
      },
    },
    select: {
      id: true,
      sku: true,
      name: true,
      quantityOnHand: true,
      reorderPoint: true,
    },
    take: 50,
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
