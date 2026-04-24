import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { getProducts, completeSale, getSaleHistory } from '../services/posService';

// ─── Validators ───────────────────────────────────────────────────────────────

const getProductsQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
});

const completeSaleBodySchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive(),
        unitPrice: z.number().nonnegative(),
      }),
    )
    .min(1, 'At least one item is required'),
  paymentMethod: z.enum(['CASH', 'CARD', 'SPLIT']),
  amountTendered: z.number().nonnegative(),
  discount: z.object({
    type: z.enum(['FLAT', 'PERCENT']),
    value: z.number().nonnegative(),
  }),
});

const getSaleHistoryQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? parseInt(v, 10) : 25))
    .pipe(z.number().int().positive().max(100)),
  offset: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? parseInt(v, 10) : 0))
    .pipe(z.number().int().nonnegative()),
});

// ─── Handlers ─────────────────────────────────────────────────────────────────

export const getProductsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgId = authReq.organizationDbId!;

    const parsed = getProductsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return next(new AppError(400, parsed.error.message, 'VALIDATION_ERROR'));
    }

    const { search, category } = parsed.data;
    const products = await getProducts(orgId, search, category);

    res.json({ data: products });
  } catch (err) {
    next(err);
  }
};

export const completeSaleHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgId = authReq.organizationDbId!;
    const userId = authReq.auth.userId;

    const parsed = completeSaleBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(400, parsed.error.message, 'VALIDATION_ERROR'));
    }

    const result = await completeSale({
      orgId,
      userId,
      items: parsed.data.items,
      paymentMethod: parsed.data.paymentMethod,
      amountTendered: parsed.data.amountTendered,
      discount: parsed.data.discount,
    });

    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
};

export const getSaleHistoryHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgId = authReq.organizationDbId!;

    const parsed = getSaleHistoryQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return next(new AppError(400, parsed.error.message, 'VALIDATION_ERROR'));
    }

    const { limit, offset } = parsed.data;
    const result = await getSaleHistory(orgId, limit, offset);

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
};
