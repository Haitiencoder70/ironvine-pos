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

export const productsRouter = Router();
export const productCategoriesRouter = Router();
export const productAddOnsRouter = Router();

// ─── Products ─────────────────────────────────────────────────────────────────
// NOTE: /calculate-price must be registered before /:id to avoid route collision
productsRouter.post('/calculate-price', calculatePriceHandler);
productsRouter.get('/', getAllProducts);
productsRouter.post('/', createProductHandler);
productsRouter.get('/:id', getProduct);
productsRouter.patch('/:id', updateProductHandler);
productsRouter.delete('/:id', deleteProductHandler);
productsRouter.post('/:id/duplicate', duplicateProductHandler);

// ─── Categories ───────────────────────────────────────────────────────────────
productCategoriesRouter.get('/', getAllCategories);
productCategoriesRouter.post('/', createCategory);
productCategoriesRouter.patch('/:id', updateCategory);
productCategoriesRouter.delete('/:id', deleteCategory);

// ─── Add-Ons ──────────────────────────────────────────────────────────────────
productAddOnsRouter.get('/', getAllAddOns);
productAddOnsRouter.post('/', createAddOnHandler);
productAddOnsRouter.patch('/:id', updateAddOnHandler);
productAddOnsRouter.delete('/:id', deleteAddOnHandler);
