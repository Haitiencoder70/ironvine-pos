import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export const getOrderTrackingStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new AppError(400, 'Order ID is required', 'MISSING_ORDER_ID');
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          select: {
            id: true,
            productType: true,
            quantity: true,
            color: true,
            size: true,
            printMethod: true,
          }
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          select: {
            fromStatus: true,
            toStatus: true,
            createdAt: true,
            // purposely omitting 'notes' and 'changedBy' to ensure privacy
          }
        },
        organization: {
          select: {
            name: true,
            logoUrl: true,
          }
        },
        customer: {
          select: {
            firstName: true,
            // Last name obscured or completely omitted for privacy, just need greeting
          }
        }
      }
    });

    if (!order || order.status === 'CANCELLED') {
      // If it's cancelled or doesn't exist, generic 404
      throw new AppError(404, 'Order tracking not found', 'NOT_FOUND');
    }

    res.json({
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        dueDate: order.dueDate,
        createdAt: order.createdAt,
        total: order.total,
        items: order.items,
        history: order.statusHistory,
        organization: order.organization,
        customerName: order.customer.firstName,
      }
    });
  } catch (error) {
    next(error);
  }
};
