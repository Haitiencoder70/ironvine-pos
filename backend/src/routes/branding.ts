import { Router } from 'express';

import {
  getBrandingHandler,
  saveBrandingHandler,
  uploadLogoHandler,
  uploadFaviconHandler,
  brandingUpload,
} from '../controllers/brandingController';

export const brandingRouter = Router();

// removed redundant middleware

brandingRouter.get('/',                getBrandingHandler);
brandingRouter.put('/',                saveBrandingHandler);
brandingRouter.post('/upload-logo',    brandingUpload.single('file'), uploadLogoHandler);
brandingRouter.post('/upload-favicon', brandingUpload.single('file'), uploadFaviconHandler);
