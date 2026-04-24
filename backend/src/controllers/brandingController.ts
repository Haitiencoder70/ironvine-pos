import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { saveBrandingSchema } from '../validators/branding';
import {
  getBranding,
  saveBranding,
  uploadBrandingAsset,
} from '../services/brandingService';

// ─── Plan gate helper ─────────────────────────────────────────────────────────

async function requireBrandingPlan(orgId: string): Promise<void> {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: orgId },
    select: { plan: true },
  });
  if (org.plan !== 'PRO' && org.plan !== 'ENTERPRISE') {
    throw new AppError(403, 'Branding features require a PRO or ENTERPRISE plan.', 'PLAN_REQUIRED');
  }
}

// ─── Multer setup ─────────────────────────────────────────────────────────────

export const brandingUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

// ─── Handlers ─────────────────────────────────────────────────────────────────

export const getBrandingHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { organizationDbId } = req as AuthenticatedRequest;
    const data = await getBranding(organizationDbId!);
    res.json({ data });
  } catch (err) { next(err); }
};

export const saveBrandingHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { organizationDbId } = req as AuthenticatedRequest;
    await requireBrandingPlan(organizationDbId!);

    const parsed = saveBrandingSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors[0]?.message ?? 'Validation error', 'VALIDATION_ERROR');
    }

    const data = await saveBranding(organizationDbId!, parsed.data);
    res.json({ data });
  } catch (err) { next(err); }
};

export const uploadLogoHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { organizationDbId } = req as AuthenticatedRequest;

    if (!req.file) throw new AppError(400, 'No file uploaded', 'NO_FILE');
    const url = await uploadBrandingAsset(organizationDbId!, req.file, 'logo');
    res.json({ data: { url } });
  } catch (err) { next(err); }
};

export const uploadFaviconHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { organizationDbId } = req as AuthenticatedRequest;
    await requireBrandingPlan(organizationDbId!);

    if (!req.file) throw new AppError(400, 'No file uploaded', 'NO_FILE');
    const url = await uploadBrandingAsset(organizationDbId!, req.file, 'favicon');
    res.json({ data: { url } });
  } catch (err) { next(err); }
};
