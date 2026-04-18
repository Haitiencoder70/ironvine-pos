import { Request, Response, NextFunction } from 'express';
import { GarmentType, PrintMethod, AddOnType } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import {
  getProductCategories,
  createProductCategory,
  updateProductCategory,
  deleteProductCategory,
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  softDeleteProduct,
  duplicateProduct,
  calculatePrice,
  getProductAddOns,
  createProductAddOn,
  updateProductAddOn,
  deleteProductAddOn,
} from '../services/productService';

const paramId = (req: Request): string => String(req.params['id']);

// ─── Categories ───────────────────────────────────────────────────────────────

export const getAllCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { organizationDbId } = req as AuthenticatedRequest;
    const categories = await getProductCategories(organizationDbId!);
    res.json({ data: categories });
  } catch (err) {
    next(err);
  }
};

export const createCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { organizationDbId } = req as AuthenticatedRequest;
    const category = await createProductCategory(organizationDbId!, req.body as {
      name: string;
      description?: string;
      icon?: string;
      displayOrder?: number;
    });
    res.status(201).json({ data: category });
  } catch (err) {
    next(err);
  }
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { organizationDbId } = req as AuthenticatedRequest;
    const category = await updateProductCategory(organizationDbId!, paramId(req), req.body);
    res.json({ data: category });
  } catch (err) {
    next(err);
  }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { organizationDbId } = req as AuthenticatedRequest;
    await deleteProductCategory(organizationDbId!, paramId(req));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// ─── Products ─────────────────────────────────────────────────────────────────

export const getAllProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { organizationDbId } = req as AuthenticatedRequest;
    const q = req.query as Record<string, string | undefined>;
    const products = await getProducts(organizationDbId!, {
      categoryId: q['categoryId'],
      garmentType: q['garmentType'] as GarmentType | undefined,
      printMethod: q['printMethod'] as PrintMethod | undefined,
      isActive: q['isActive'] !== undefined ? q['isActive'] === 'true' : undefined,
      isFeatured: q['isFeatured'] !== undefined ? q['isFeatured'] === 'true' : undefined,
      search: q['search'],
    });
    res.json({ data: products });
  } catch (err) {
    next(err);
  }
};

export const getProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { organizationDbId } = req as AuthenticatedRequest;
    const product = await getProductById(organizationDbId!, paramId(req));
    res.json({ data: product });
  } catch (err) {
    next(err);
  }
};

export const createProductHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { organizationDbId } = req as AuthenticatedRequest;
    const product = await createProduct(organizationDbId!, req.body);
    res.status(201).json({ data: product });
  } catch (err) {
    next(err);
  }
};

export const updateProductHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { organizationDbId } = req as AuthenticatedRequest;
    const product = await updateProduct(organizationDbId!, paramId(req), req.body);
    res.json({ data: product });
  } catch (err) {
    next(err);
  }
};

export const deleteProductHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { organizationDbId } = req as AuthenticatedRequest;
    await softDeleteProduct(organizationDbId!, paramId(req));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const duplicateProductHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { organizationDbId } = req as AuthenticatedRequest;
    const product = await duplicateProduct(organizationDbId!, paramId(req));
    res.status(201).json({ data: product });
  } catch (err) {
    next(err);
  }
};

export const calculatePriceHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { organizationDbId } = req as AuthenticatedRequest;
    const result = await calculatePrice(organizationDbId!, req.body as {
      productId: string;
      quantity: number;
      size?: string;
      selectedAddOnIds?: string[];
    });
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
};

// ─── Add-Ons ──────────────────────────────────────────────────────────────────

export const getAllAddOns = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { organizationDbId } = req as AuthenticatedRequest;
    const q = req.query as Record<string, string | undefined>;
    const addOns = await getProductAddOns(organizationDbId!, q['productId']);
    res.json({ data: addOns });
  } catch (err) {
    next(err);
  }
};

export const createAddOnHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { organizationDbId } = req as AuthenticatedRequest;
    const addOn = await createProductAddOn(organizationDbId!, req.body as {
      productId?: string;
      name: string;
      description?: string;
      type: AddOnType;
      price: number;
      printLocation?: string;
      isActive?: boolean;
    });
    res.status(201).json({ data: addOn });
  } catch (err) {
    next(err);
  }
};

export const updateAddOnHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { organizationDbId } = req as AuthenticatedRequest;
    const addOn = await updateProductAddOn(organizationDbId!, paramId(req), req.body);
    res.json({ data: addOn });
  } catch (err) {
    next(err);
  }
};

export const deleteAddOnHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { organizationDbId } = req as AuthenticatedRequest;
    await deleteProductAddOn(organizationDbId!, paramId(req));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
