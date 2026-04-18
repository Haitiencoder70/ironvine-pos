import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { injectTenant } from '../middleware/tenant';
import {
  upload,
  uploadImageHandler,
  deleteImageHandler,
  getByEntityHandler,
  setPrimaryHandler,
  reorderHandler,
  getGarmentImageHandler,
  getPlaceholderHandler,
} from '../controllers/imageController';

export const imagesRouter = Router();

// ─── Garment Catalog (no file upload, auth required) ─────────────────────────

imagesRouter.get(
  '/garment',
  requireAuth,
  injectTenant,
  getGarmentImageHandler,
);

// GET /api/images/placeholder?garmentType=TSHIRT&color=%23ff0000
// Returns SVG directly — auth required to prevent abuse
imagesRouter.get(
  '/placeholder',
  requireAuth,
  injectTenant,
  getPlaceholderHandler,
);

// ─── Entity Images ────────────────────────────────────────────────────────────

// GET /api/images/:entityType/:entityId  — e.g. /api/images/order/clxxx
imagesRouter.get(
  '/:entityType/:entityId',
  requireAuth,
  injectTenant,
  getByEntityHandler,
);

// POST /api/images/upload  — multipart/form-data
imagesRouter.post(
  '/upload',
  requireAuth,
  injectTenant,
  upload.single('file'),
  uploadImageHandler,
);

// DELETE /api/images/:id
imagesRouter.delete(
  '/:id',
  requireAuth,
  injectTenant,
  deleteImageHandler,
);

// PATCH /api/images/:id/primary
imagesRouter.patch(
  '/:id/primary',
  requireAuth,
  injectTenant,
  setPrimaryHandler,
);

// PATCH /api/images/reorder
imagesRouter.patch(
  '/reorder',
  requireAuth,
  injectTenant,
  reorderHandler,
);
