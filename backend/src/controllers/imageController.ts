import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { ImageType, GarmentType } from '@prisma/client';
import { z } from 'zod';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import {
  uploadImage,
  deleteImage,
  getImagesForEntity,
  setPrimaryImage,
  reorderImages,
  getGarmentImage,
  getPlaceholderSvg,
} from '../services/imageService';

// ─── Multer Setup ─────────────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(400, `Unsupported file type: ${file.mimetype}`, 'INVALID_FILE_TYPE'));
    }
  },
});

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const UploadBodySchema = z.object({
  imageType: z.nativeEnum(ImageType),
  entityType: z.string().min(1).max(50),
  entityId: z.string().cuid(),
  alt: z.string().max(200).optional(),
  caption: z.string().max(500).optional(),
  designPlacement: z.string().max(50).optional(),
});

const ReorderBodySchema = z.object({
  imageIds: z.array(z.string().cuid()).min(1).max(50),
});

const GarmentQuerySchema = z.object({
  brand: z.string().min(1).max(100),
  styleNumber: z.string().min(1).max(50),
  color: z.string().min(1).max(100),
  garmentType: z.nativeEnum(GarmentType),
});

const PlaceholderQuerySchema = z.object({
  garmentType: z.nativeEnum(GarmentType),
  color: z.string().min(1).max(100),
});

// ─── Controllers ──────────────────────────────────────────────────────────────

export const uploadImageHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;
    const userId = authReq.auth.userId;

    if (!req.file) {
      throw new AppError(400, 'No file provided', 'NO_FILE');
    }

    const parsed = UploadBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors[0]?.message ?? 'Invalid request body', 'VALIDATION_ERROR');
    }

    const { imageType, entityType, entityId, alt, caption, designPlacement } = parsed.data;

    const image = await uploadImage({
      organizationId: orgDbId,
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      imageType,
      entityType,
      entityId,
      alt,
      caption,
      designPlacement,
      createdBy: userId,
    });

    res.status(201).json({ data: image });
  } catch (err) {
    next(err);
  }
};

export const deleteImageHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;
    const { id } = req.params as { id: string };

    await deleteImage(orgDbId, id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const getByEntityHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;
    const { entityType, entityId } = req.params as { entityType: string; entityId: string };

    const images = await getImagesForEntity(orgDbId, entityType, entityId);
    res.json({ data: images });
  } catch (err) {
    next(err);
  }
};

export const setPrimaryHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;
    const { id } = req.params as { id: string };

    const image = await setPrimaryImage(orgDbId, id);
    res.json({ data: image });
  } catch (err) {
    next(err);
  }
};

export const reorderHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;

    const parsed = ReorderBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors[0]?.message ?? 'Invalid image IDs', 'VALIDATION_ERROR');
    }

    await reorderImages(orgDbId, parsed.data.imageIds);
    res.json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
};

export const getGarmentImageHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = GarmentQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors[0]?.message ?? 'Invalid query params', 'VALIDATION_ERROR');
    }

    const { brand, styleNumber, color, garmentType } = parsed.data;
    const result = await getGarmentImage(brand, styleNumber, color, garmentType);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
};

export const getPlaceholderHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = PlaceholderQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors[0]?.message ?? 'Invalid query params', 'VALIDATION_ERROR');
    }

    const { garmentType, color } = parsed.data;
    const svg = getPlaceholderSvg(garmentType as GarmentType, color);

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24-hour browser cache
    res.send(svg);
  } catch (err) {
    next(err);
  }
};
