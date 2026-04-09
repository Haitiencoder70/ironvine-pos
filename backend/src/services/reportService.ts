import { prisma } from '../lib/prisma';
import { startOfDay, endOfDay, subDays, format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfMonth, endOfMonth } from 'date-fns';

// ─── Sales Report ─────────────────────────────────────────────────────────────

export async function getSalesReport(
  organizationId: string,
  startDate: Date,
  endDate: Date,
  groupBy: 'day' | 'week' | 'month' = 'day',
) {
  const orders = await prisma.order.findMany({
    where: {
      organizationId,
      createdAt: { gte: startOfDay(startDate), lte: endOfDay(endDate) },
      status: { notIn: ['CANCELLED'] },
    },
    include: {
      customer: { select: { id: true, firstName: true, lastName: true, company: true } },
      items: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Revenue over time
  const revenueOverTime = buildRevenueTimeSeries(orders, startDate, endDate, groupBy);

  // Orders by status
  const ordersByStatus = await prisma.order.groupBy({
    by: ['status'],
    where: {
      organizationId,
      createdAt: { gte: startOfDay(startDate), lte: endOfDay(endDate) },
    },
    _count: { id: true },
    _sum: { total: true },
  });

  // Top customers
  const customerMap = new Map<string, { id: string; name: string; orderCount: number; totalSpent: number }>();
  for (const order of orders) {
    if (!order.customer) continue;
    const key = order.customerId;
    const existing = customerMap.get(key) ?? {
      id: order.customer.id,
      name: order.customer.company ?? `${order.customer.firstName} ${order.customer.lastName}`,
      orderCount: 0,
      totalSpent: 0,
    };
    existing.orderCount += 1;
    existing.totalSpent += Number(order.total);
    customerMap.set(key, existing);
  }
  const topCustomers = Array.from(customerMap.values())
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10);

  // Top products (by productType)
  const productMap = new Map<string, { productType: string; quantitySold: number; revenue: number }>();
  for (const order of orders) {
    for (const item of order.items) {
      const key = item.productType;
      const existing = productMap.get(key) ?? { productType: key, quantitySold: 0, revenue: 0 };
      existing.quantitySold += item.quantity;
      existing.revenue += Number(item.lineTotal ?? item.unitPrice) * item.quantity;
      productMap.set(key, existing);
    }
  }
  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Summary metrics
  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
  const completedOrders = orders.filter((o) => o.status === 'COMPLETED').length;
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

  // Previous period for % change
  const periodMs = endDate.getTime() - startDate.getTime();
  const prevStart = new Date(startDate.getTime() - periodMs);
  const prevEnd = new Date(startDate.getTime() - 1);
  const prevOrders = await prisma.order.findMany({
    where: {
      organizationId,
      createdAt: { gte: startOfDay(prevStart), lte: endOfDay(prevEnd) },
      status: { notIn: ['CANCELLED'] },
    },
    select: { total: true, status: true },
  });
  const prevRevenue = prevOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : null;
  const ordersChange = prevOrders.length > 0 ? ((orders.length - prevOrders.length) / prevOrders.length) * 100 : null;

  // Detailed rows for export
  const rows = orders.map((o) => ({
    orderNumber: o.orderNumber,
    createdAt: o.createdAt.toISOString(),
    customerName: o.customer
      ? (o.customer.company ?? `${o.customer.firstName} ${o.customer.lastName}`)
      : '',
    status: o.status,
    subtotal: Number(o.subtotal),
    tax: Number(o.taxAmount),
    discount: Number(o.discount),
    total: Number(o.total),
    itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
  }));

  return {
    summary: {
      totalRevenue,
      totalOrders: orders.length,
      completedOrders,
      avgOrderValue,
      revenueChange,
      ordersChange,
    },
    revenueOverTime,
    ordersByStatus: ordersByStatus.map((s) => ({
      status: s.status,
      count: s._count.id,
      revenue: Number(s._sum.total ?? 0),
    })),
    topCustomers,
    topProducts,
    rows,
  };
}

function buildRevenueTimeSeries(
  orders: { createdAt: Date; total: unknown }[],
  startDate: Date,
  endDate: Date,
  groupBy: 'day' | 'week' | 'month',
) {
  if (groupBy === 'day') {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    return days.map((day: Date) => {
      const label = format(day, 'MMM d');
      const revenue = orders
        .filter((o) => format(o.createdAt, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'))
        .reduce((sum, o) => sum + Number(o.total), 0);
      return { label, revenue };
    });
  }
  if (groupBy === 'week') {
    const weeks = eachWeekOfInterval({ start: startDate, end: endDate });
    return weeks.map((week: Date) => {
      const label = format(week, 'MMM d');
      const weekEnd = new Date(week.getTime() + 6 * 24 * 60 * 60 * 1000);
      const revenue = orders
        .filter((o) => o.createdAt >= week && o.createdAt <= weekEnd)
        .reduce((sum, o) => sum + Number(o.total), 0);
      return { label, revenue };
    });
  }
  // month
  const months = eachMonthOfInterval({ start: startDate, end: endDate });
  return months.map((month: Date) => {
    const label = format(month, 'MMM yyyy');
    const mStart = startOfMonth(month);
    const mEnd = endOfMonth(month);
    const revenue = orders
      .filter((o) => o.createdAt >= mStart && o.createdAt <= mEnd)
      .reduce((sum, o) => sum + Number(o.total), 0);
    return { label, revenue };
  });
}

// ─── Inventory Report ─────────────────────────────────────────────────────────

export async function getInventoryReport(organizationId: string) {
  const items = await prisma.inventoryItem.findMany({
    where: { organizationId, isActive: true },
    include: {
      stockMovements: {
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
    orderBy: { name: 'asc' },
  });

  const lowStock = items.filter((i) => i.quantityOnHand <= i.reorderPoint);

  const reorderRecommendations = lowStock.map((i) => ({
    id: i.id,
    sku: i.sku,
    name: i.name,
    category: i.category,
    quantityOnHand: i.quantityOnHand,
    reorderPoint: i.reorderPoint,
    reorderQuantity: i.reorderQuantity,
    costPrice: Number(i.costPrice),
    estimatedCost: Number(i.costPrice) * i.reorderQuantity,
  }));

  // Most used (sum of OUT movements last 30 days)
  const thirtyDaysAgo = subDays(new Date(), 30);
  const usageMap = new Map<string, { id: string; name: string; sku: string; totalUsed: number }>();
  for (const item of items) {
    const used = item.stockMovements
      .filter((m) => m.type === 'OUT' && m.createdAt >= thirtyDaysAgo)
      .reduce((sum, m) => sum + m.quantity, 0);
    if (used > 0) {
      usageMap.set(item.id, { id: item.id, name: item.name, sku: item.sku, totalUsed: used });
    }
  }
  const mostUsed = Array.from(usageMap.values())
    .sort((a, b) => b.totalUsed - a.totalUsed)
    .slice(0, 10);

  const totalInventoryValue = items.reduce(
    (sum, i) => sum + Number(i.costPrice) * i.quantityOnHand,
    0,
  );

  const byCategory = items.reduce<Record<string, { count: number; value: number }>>((acc, i) => {
    if (!acc[i.category]) acc[i.category] = { count: 0, value: 0 };
    acc[i.category].count += i.quantityOnHand;
    acc[i.category].value += Number(i.costPrice) * i.quantityOnHand;
    return acc;
  }, {});

  const rows = items.map((i) => ({
    sku: i.sku,
    name: i.name,
    category: i.category,
    quantityOnHand: i.quantityOnHand,
    quantityReserved: i.quantityReserved,
    reorderPoint: i.reorderPoint,
    costPrice: Number(i.costPrice),
    totalValue: Number(i.costPrice) * i.quantityOnHand,
    status: i.quantityOnHand <= i.reorderPoint ? 'LOW' : i.quantityOnHand === 0 ? 'OUT' : 'OK',
  }));

  return {
    summary: {
      totalItems: items.length,
      lowStockCount: lowStock.length,
      outOfStockCount: items.filter((i) => i.quantityOnHand === 0).length,
      totalInventoryValue,
    },
    lowStock: lowStock.map((i) => ({
      id: i.id,
      sku: i.sku,
      name: i.name,
      category: i.category,
      quantityOnHand: i.quantityOnHand,
      reorderPoint: i.reorderPoint,
      costPrice: Number(i.costPrice),
    })),
    reorderRecommendations,
    mostUsed,
    byCategory: Object.entries(byCategory).map(([category, data]) => ({ category, ...data })),
    rows,
  };
}

// ─── Production Report ────────────────────────────────────────────────────────

export async function getProductionReport(
  organizationId: string,
  startDate: Date,
  endDate: Date,
) {
  const completedOrders = await prisma.order.findMany({
    where: {
      organizationId,
      status: 'COMPLETED',
      updatedAt: { gte: startOfDay(startDate), lte: endOfDay(endDate) },
    },
    include: { items: true },
  });

  // Average time from APPROVED → COMPLETED (approximated by createdAt → updatedAt)
  const times = completedOrders.map((o) => o.updatedAt.getTime() - o.createdAt.getTime());
  const avgProductionMs = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  const avgProductionDays = avgProductionMs / (1000 * 60 * 60 * 24);

  // Orders by print method
  const printMethodMap = new Map<string, number>();
  for (const order of completedOrders) {
    for (const item of order.items) {
      if (!item.printMethod) continue;
      printMethodMap.set(item.printMethod, (printMethodMap.get(item.printMethod) ?? 0) + item.quantity);
    }
  }
  const ordersByPrintMethod = Array.from(printMethodMap.entries()).map(([method, count]) => ({
    method,
    count,
  }));

  // Orders by priority for all non-cancelled orders in range
  const allOrders = await prisma.order.groupBy({
    by: ['priority'],
    where: {
      organizationId,
      createdAt: { gte: startOfDay(startDate), lte: endOfDay(endDate) },
      status: { notIn: ['CANCELLED'] },
    },
    _count: { id: true },
  });

  return {
    avgProductionDays: Math.round(avgProductionDays * 10) / 10,
    completedCount: completedOrders.length,
    ordersByPrintMethod,
    ordersByPriority: allOrders.map((r) => ({ priority: r.priority, count: r._count.id })),
  };
}
