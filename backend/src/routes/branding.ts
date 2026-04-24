import { Router } from 'express';
import { authorize } from '../middleware/authorize';

import {
  getBrandingHandler,
  saveBrandingHandler,
  uploadLogoHandler,
  uploadFaviconHandler,
  brandingUpload,
} from '../controllers/brandingController';

export const brandingRouter = Router();

brandingRouter.get('/',                authorize('settings:view'), getBrandingHandler);
brandingRouter.put('/',                authorize('settings:edit'), saveBrandingHandler);
brandingRouter.post('/upload-logo',    authorize('settings:edit'), brandingUpload.single('file'), uploadLogoHandler);
brandingRouter.post('/upload-favicon', authorize('settings:edit'), brandingUpload.single('file'), uploadFaviconHandler);
