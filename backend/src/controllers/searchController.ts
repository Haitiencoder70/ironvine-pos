import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { prisma } from '../lib/prisma';

export const globalSearchHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.organizationDbId!;
    const query = (req.query.q as string) ?? '';

    if (!query || query.length < 2) {
      res.json({ orders: [], inventory: [], customers: [] });
      return;
    }

    // Parallel search across core entities
    const [orders, inventory, customers] = await Promise.all([
      // Orders: match by order number
      prisma.order.findMany({
        where: {
          organizationId,
          OR: [
            { orderNumber: { contains: query, mode: 'insensitive' } },
            { notes: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 10,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          customer: { select: { firstName: true, lastName: true, company: true } },
        },
      }),

      // Inventory: match by SKU or Name
      prisma.inventoryItem.findMany({
        where: {
          organizationId,
          isActive: true, // Only show active items in search
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { sku: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 10,
        select: {
          id: true,
          name: true,
          sku: true,
          category: true,
          quantityOnHand: true,
        },
      }),

      // Customers: Match by First Name, Last Name, Email, or Company
      prisma.customer.findMany({
        where: {
          organizationId,
          OR: [
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { company: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 10,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          company: true,
          email: true,
        },
      }),
    ]);

    res.json({
      data: {
        orders,
        inventory,
        customers,
      },
    });
  } catch (err) {
    next(err);
  }
};
