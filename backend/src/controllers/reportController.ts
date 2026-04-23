import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../types';
import { getSalesReport, getInventoryReport, getProductionReport } from '../services/reportService';
import { subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from 'date-fns';

const groupBySchema = z.enum(['day', 'week', 'month']).default('day');

function parseDateRange(query: Record<string, unknown>): { startDate: Date; endDate: Date } {
  const { preset, startDate, endDate } = query as Record<string, string | undefined>;
  const now = new Date();

  if (startDate && endDate) {
    return { startDate: new Date(startDate), endDate: new Date(endDate) };
  }

  switch (preset) {
    case 'today':
      return { startDate: now, endDate: now };
    case 'yesterday': {
      const y = subDays(now, 1);
      return { startDate: y, endDate: y };
    }
    case 'this_week':
      return { startDate: startOfWeek(now), endDate: endOfWeek(now) };
    case 'last_week': {
      const lw = subDays(now, 7);
      return { startDate: startOfWeek(lw), endDate: endOfWeek(lw) };
    }
    case 'this_month':
      return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
    case 'last_month': {
      const lm = subMonths(now, 1);
      return { startDate: startOfMonth(lm), endDate: endOfMonth(lm) };
    }
    default:
      return { startDate: subDays(now, 29), endDate: now };
  }
}

export const getSalesReportHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { startDate, endDate } = parseDateRange(req.query as Record<string, unknown>);
    const groupBy = groupBySchema.parse(req.query.groupBy);
    const data = await getSalesReport(authReq.organizationDbId!, startDate, endDate, groupBy);
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

export const getInventoryReportHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const data = await getInventoryReport(authReq.organizationDbId!);
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

export const getProductionReportHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { startDate, endDate } = parseDateRange(req.query as Record<string, unknown>);
    const data = await getProductionReport(authReq.organizationDbId!, startDate, endDate);
    res.json({ data });
  } catch (err) {
    next(err);
  }
};
