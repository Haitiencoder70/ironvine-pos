import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { injectTenant } from '../middleware/tenant';
import {
  getBrandingHandler,
  saveBrandingHandler,
  uploadLogoHandler,
  uploadFaviconHandler,
  brandingUpload,
} from '../controllers/brandingController';

export const brandingRouter = Router();

brandingRouter.use(requireAuth, injectTenant);

brandingRouter.get('/',                getBrandingHandler);
brandingRouter.put('/',                saveBrandingHandler);
brandingRouter.post('/upload-logo',    brandingUpload.single('file'), uploadLogoHandler);
brandingRouter.post('/upload-favicon', brandingUpload.single('file'), uploadFaviconHandler);
