import { Router } from 'express';
import { authorize } from '../middleware/authorize';
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
  authorize('products:view'),
  getGarmentImageHandler,
);

// GET /api/images/placeholder?garmentType=TSHIRT&color=%23ff0000
// Returns SVG directly — auth required to prevent abuse
imagesRouter.get(
  '/placeholder',
  authorize('products:view'),
  getPlaceholderHandler,
);

// ─── Entity Images ────────────────────────────────────────────────────────────

// GET /api/images/:entityType/:entityId  — e.g. /api/images/order/clxxx
imagesRouter.get(
  '/:entityType/:entityId',
  authorize('products:view'),
  getByEntityHandler,
);

// POST /api/images/upload  — multipart/form-data
imagesRouter.post(
  '/upload',
  authorize('images:upload'),
  upload.single('file'),
  uploadImageHandler,
);

// DELETE /api/images/:id
imagesRouter.delete(
  '/:id',
  authorize('images:delete'),
  deleteImageHandler,
);

// PATCH /api/images/:id/primary
imagesRouter.patch(
  '/:id/primary',
  authorize('images:upload'),
  setPrimaryHandler,
);

// PATCH /api/images/reorder
imagesRouter.patch(
  '/reorder',
  authorize('images:upload'),
  reorderHandler,
);
