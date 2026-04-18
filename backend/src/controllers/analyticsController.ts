import { Request, Response, NextFunction } from 'express';
import { getCurrentPeriodUsage, getUsageForPeriod, exportUsageData } from '../services/analyticsService';
import { AppError } from '../middleware/errorHandler';

export async function currentPeriodHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgDbId = req.organizationDbId!;
    const data = await getCurrentPeriodUsage(orgDbId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function periodRangeHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgDbId = req.organizationDbId!;
    const { metricType, from, to } = req.query as Record<string, string>;

    if (!metricType || !from || !to) {
      return next(new AppError(400, 'metricType, from, and to are required', 'VALIDATION_ERROR'));
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return next(new AppError(400, 'Invalid date format', 'VALIDATION_ERROR'));
    }

    const data = await getUsageForPeriod(orgDbId, metricType as Parameters<typeof getUsageForPeriod>[1], fromDate, toDate);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function exportHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgDbId = req.organizationDbId!;
    const { from, to } = req.query as Record<string, string>;

    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const toDate = to ? new Date(to) : new Date();

    const data = await exportUsageData(orgDbId, fromDate, toDate);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}
