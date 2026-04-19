import { Router } from 'express';
import {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllProducts,
  getProduct,
  createProductHandler,
  updateProductHandler,
  deleteProductHandler,
  duplicateProductHandler,
  calculatePriceHandler,
  getAllAddOns,
  createAddOnHandler,
  updateAddOnHandler,
  deleteAddOnHandler,
} from '../controllers/productController';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import {
  createProductSchema,
  updateProductSchema,
  calculatePriceSchema,
  createProductCategorySchema,
  updateProductCategorySchema,
  createAddOnSchema,
  updateAddOnSchema,
} from '../validators/product';

export const productsRouter = Router();
export const productCategoriesRouter = Router();
export const productAddOnsRouter = Router();

// ─── Products ─────────────────────────────────────────────────────────────────
// NOTE: /calculate-price must be registered before /:id to avoid route collision
productsRouter.post('/calculate-price', authorize('products:view'), validate(calculatePriceSchema), calculatePriceHandler);
productsRouter.get('/', authorize('products:view'), getAllProducts);
productsRouter.post('/', authorize('products:create'), validate(createProductSchema), createProductHandler);
productsRouter.get('/:id', authorize('products:view'), getProduct);
productsRouter.patch('/:id', authorize('products:edit'), validate(updateProductSchema), updateProductHandler);
productsRouter.delete('/:id', authorize('products:delete'), deleteProductHandler);
productsRouter.post('/:id/duplicate', authorize('products:create'), duplicateProductHandler);

// ─── Categories ───────────────────────────────────────────────────────────────
productCategoriesRouter.get('/', authorize('products:view'), getAllCategories);
productCategoriesRouter.post('/', authorize('products:create'), validate(createProductCategorySchema), createCategory);
productCategoriesRouter.patch('/:id', authorize('products:edit'), validate(updateProductCategorySchema), updateCategory);
productCategoriesRouter.delete('/:id', authorize('products:delete'), deleteCategory);

// ─── Add-Ons ──────────────────────────────────────────────────────────────────
productAddOnsRouter.get('/', authorize('products:view'), getAllAddOns);
productAddOnsRouter.post('/', authorize('products:create'), validate(createAddOnSchema), createAddOnHandler);
productAddOnsRouter.patch('/:id', authorize('products:edit'), validate(updateAddOnSchema), updateAddOnHandler);
productAddOnsRouter.delete('/:id', authorize('products:delete'), deleteAddOnHandler);
