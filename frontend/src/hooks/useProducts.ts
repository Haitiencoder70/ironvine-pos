import { useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PriceTier {
  minQty: number;
  maxQty: number | null; // null = unlimited
  unitPrice: number;
}

export interface SizeUpcharge {
  size: string;
  upcharge: number;
}

export interface MaterialCost {
  id: string;
  material: string;
  qtyPerUnit: number;
  estimatedCost: number;
}

export interface AddOn {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
}

export interface Product {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  sku: string;
  category: string;
  garmentType: string;
  printMethod: string;
  printLocations: string[];
  maxPrintLocations: number;
  availableBrands: string[];
  availableSizes: string[];
  basePrice: number;
  priceTiers: PriceTier[];
  sizeUpcharges: SizeUpcharge[];
  materialCosts: MaterialCost[];
  addOns: AddOn[];
  estimatedProductionMinutes: number;
  difficulty: 'EASY' | 'MEDIUM' | 'COMPLEX';
  productionNotes: string;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ProductFormData = Omit<Product, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>;

// ─── Constants ────────────────────────────────────────────────────────────────

export const PRODUCT_CATEGORIES = [
  'T-Shirts', 'Hoodies', 'Long Sleeve', 'Sweatshirts',
  'Polos', 'Tank Tops', 'Youth', 'Ladies', 'Specialty',
];

export const GARMENT_TYPES = [
  'T-Shirt', 'Hoodie', 'Long Sleeve', 'Sweatshirt',
  'Polo', 'Tank Top', 'Crewneck', 'Zip-Up',
];

export const PRINT_METHODS = ['DTF', 'HTV', 'Screen Print', 'Embroidery', 'None'];

export const PRINT_LOCATIONS = [
  'Front', 'Back', 'Left Chest', 'Right Chest',
  'Left Sleeve', 'Right Sleeve', 'Full Front', 'Full Back', 'Hood',
];

export const BRANDS = ['Gildan', 'Bella+Canvas', 'Next Level', 'Comfort Colors', 'Hanes', 'Port & Company', 'AS Colour'];

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];

// ─── Default Catalog ──────────────────────────────────────────────────────────

const DEFAULT_PRODUCTS: Omit<Product, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'DTF T-Shirt - Front Print',
    description: 'Standard short-sleeve t-shirt with DTF transfer on the front.',
    sku: 'DTF-TEE-FRONT',
    category: 'T-Shirts',
    garmentType: 'T-Shirt',
    printMethod: 'DTF',
    printLocations: ['Front'],
    maxPrintLocations: 1,
    availableBrands: ['Gildan', 'Bella+Canvas', 'Next Level'],
    availableSizes: ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'],
    basePrice: 18,
    priceTiers: [
      { minQty: 1,   maxQty: 11,  unitPrice: 18 },
      { minQty: 12,  maxQty: 24,  unitPrice: 16 },
      { minQty: 25,  maxQty: 49,  unitPrice: 15 },
      { minQty: 50,  maxQty: 99,  unitPrice: 13 },
      { minQty: 100, maxQty: null, unitPrice: 11 },
    ],
    sizeUpcharges: [
      { size: '2XL', upcharge: 2 },
      { size: '3XL', upcharge: 3 },
      { size: '4XL', upcharge: 4 },
    ],
    materialCosts: [
      { id: 'mc1', material: 'Blank T-Shirt', qtyPerUnit: 1, estimatedCost: 3.50 },
      { id: 'mc2', material: 'DTF Transfer (front)', qtyPerUnit: 1, estimatedCost: 3.00 },
    ],
    addOns: [
      { id: 'ao1', name: 'Rush Order', price: 10, isActive: true },
      { id: 'ao2', name: 'Individual Names', price: 3, isActive: true },
      { id: 'ao3', name: 'Oversized Print', price: 3, isActive: true },
    ],
    estimatedProductionMinutes: 5,
    difficulty: 'EASY',
    productionNotes: 'Press at 325°F for 15 seconds.',
    isActive: true,
    isFeatured: true,
  },
  {
    name: 'DTF T-Shirt - Front & Back',
    description: 'Short-sleeve t-shirt with DTF transfers on front and back.',
    sku: 'DTF-TEE-FB',
    category: 'T-Shirts',
    garmentType: 'T-Shirt',
    printMethod: 'DTF',
    printLocations: ['Front', 'Back'],
    maxPrintLocations: 2,
    availableBrands: ['Gildan', 'Bella+Canvas', 'Next Level'],
    availableSizes: ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'],
    basePrice: 24,
    priceTiers: [
      { minQty: 1,   maxQty: 11,  unitPrice: 24 },
      { minQty: 12,  maxQty: 24,  unitPrice: 21 },
      { minQty: 25,  maxQty: 49,  unitPrice: 19 },
      { minQty: 50,  maxQty: 99,  unitPrice: 17 },
      { minQty: 100, maxQty: null, unitPrice: 15 },
    ],
    sizeUpcharges: [
      { size: '2XL', upcharge: 2 },
      { size: '3XL', upcharge: 3 },
      { size: '4XL', upcharge: 4 },
    ],
    materialCosts: [
      { id: 'mc1', material: 'Blank T-Shirt', qtyPerUnit: 1, estimatedCost: 3.50 },
      { id: 'mc2', material: 'DTF Transfer (front)', qtyPerUnit: 1, estimatedCost: 3.00 },
      { id: 'mc3', material: 'DTF Transfer (back)', qtyPerUnit: 1, estimatedCost: 3.00 },
    ],
    addOns: [
      { id: 'ao1', name: 'Rush Order', price: 10, isActive: true },
      { id: 'ao2', name: 'Individual Names', price: 3, isActive: true },
    ],
    estimatedProductionMinutes: 8,
    difficulty: 'EASY',
    productionNotes: 'Front first, let cool, then back. 325°F / 15 sec each.',
    isActive: true,
    isFeatured: false,
  },
  {
    name: 'DTF Hoodie - Front Print',
    description: 'Pullover hoodie with DTF transfer on front.',
    sku: 'DTF-HOOD-FRONT',
    category: 'Hoodies',
    garmentType: 'Hoodie',
    printMethod: 'DTF',
    printLocations: ['Front'],
    maxPrintLocations: 1,
    availableBrands: ['Gildan', 'Bella+Canvas'],
    availableSizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    basePrice: 32,
    priceTiers: [
      { minQty: 1,   maxQty: 11,  unitPrice: 32 },
      { minQty: 12,  maxQty: 24,  unitPrice: 28 },
      { minQty: 25,  maxQty: 49,  unitPrice: 25 },
      { minQty: 50,  maxQty: 99,  unitPrice: 22 },
      { minQty: 100, maxQty: null, unitPrice: 19 },
    ],
    sizeUpcharges: [
      { size: '2XL', upcharge: 3 },
      { size: '3XL', upcharge: 4 },
    ],
    materialCosts: [
      { id: 'mc1', material: 'Blank Hoodie', qtyPerUnit: 1, estimatedCost: 10.00 },
      { id: 'mc2', material: 'DTF Transfer (front)', qtyPerUnit: 1, estimatedCost: 4.50 },
    ],
    addOns: [
      { id: 'ao1', name: 'Rush Order', price: 12, isActive: true },
      { id: 'ao2', name: 'Individual Names', price: 3, isActive: true },
    ],
    estimatedProductionMinutes: 7,
    difficulty: 'EASY',
    productionNotes: 'Press at 320°F for 15 seconds. Use cover sheet.',
    isActive: true,
    isFeatured: true,
  },
  {
    name: 'HTV T-Shirt - Single Color',
    description: 'Single color HTV vinyl application on t-shirt.',
    sku: 'HTV-TEE-1C',
    category: 'T-Shirts',
    garmentType: 'T-Shirt',
    printMethod: 'HTV',
    printLocations: ['Front'],
    maxPrintLocations: 1,
    availableBrands: ['Gildan', 'Hanes', 'Port & Company'],
    availableSizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    basePrice: 16,
    priceTiers: [
      { minQty: 1,   maxQty: 11,  unitPrice: 16 },
      { minQty: 12,  maxQty: 24,  unitPrice: 14 },
      { minQty: 25,  maxQty: 49,  unitPrice: 13 },
      { minQty: 50,  maxQty: 99,  unitPrice: 12 },
      { minQty: 100, maxQty: null, unitPrice: 10 },
    ],
    sizeUpcharges: [
      { size: '2XL', upcharge: 2 },
      { size: '3XL', upcharge: 3 },
    ],
    materialCosts: [
      { id: 'mc1', material: 'Blank T-Shirt', qtyPerUnit: 1, estimatedCost: 3.00 },
      { id: 'mc2', material: 'HTV Vinyl (single color)', qtyPerUnit: 1, estimatedCost: 1.50 },
    ],
    addOns: [
      { id: 'ao1', name: 'Rush Order', price: 8, isActive: true },
      { id: 'ao2', name: 'Additional Color Layer', price: 2, isActive: true },
    ],
    estimatedProductionMinutes: 6,
    difficulty: 'EASY',
    productionNotes: 'Press at 305°F for 10-15 seconds. Medium pressure.',
    isActive: true,
    isFeatured: false,
  },
];

// ─── Storage Helpers ──────────────────────────────────────────────────────────

const STORAGE_KEY = 'pos_products';

function loadProducts(): Product[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Product[];
  } catch { /* empty */ }
  return [];
}

function saveProducts(products: Product[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

function generateId(): string {
  return `prod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useProducts() {
  const [products, setProducts] = useState<Product[]>(() => loadProducts());
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(() => {
    setProducts(loadProducts());
  }, []);

  const createProduct = useCallback((data: ProductFormData): Product => {
    setIsLoading(true);
    const now = new Date().toISOString();
    const product: Product = {
      ...data,
      id: generateId(),
      organizationId: 'default',
      createdAt: now,
      updatedAt: now,
    };
    const updated = [...loadProducts(), product];
    saveProducts(updated);
    setProducts(updated);
    setIsLoading(false);
    return product;
  }, []);

  const updateProduct = useCallback((id: string, data: Partial<ProductFormData>): Product => {
    setIsLoading(true);
    const current = loadProducts();
    const idx = current.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Product not found');
    const updated = [...current];
    updated[idx] = { ...updated[idx], ...data, updatedAt: new Date().toISOString() };
    saveProducts(updated);
    setProducts(updated);
    setIsLoading(false);
    return updated[idx];
  }, []);

  const deleteProduct = useCallback((id: string): void => {
    const updated = loadProducts().filter(p => p.id !== id);
    saveProducts(updated);
    setProducts(updated);
  }, []);

  const duplicateProduct = useCallback((id: string): Product => {
    const source = loadProducts().find(p => p.id === id);
    if (!source) throw new Error('Product not found');
    const now = new Date().toISOString();
    const copy: Product = {
      ...source,
      id: generateId(),
      name: `${source.name} (Copy)`,
      sku: source.sku ? `${source.sku}-COPY` : '',
      createdAt: now,
      updatedAt: now,
    };
    const current = loadProducts();
    const updated = [...current, copy];
    saveProducts(updated);
    setProducts(updated);
    return copy;
  }, []);

  const loadDefaultProducts = useCallback((): void => {
    const existing = loadProducts();
    const now = new Date().toISOString();
    const defaults: Product[] = DEFAULT_PRODUCTS.map(d => ({
      ...d,
      id: generateId(),
      organizationId: 'default',
      createdAt: now,
      updatedAt: now,
    }));
    const merged = [...existing, ...defaults];
    saveProducts(merged);
    setProducts(merged);
  }, []);

  // Sync across tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) refresh();
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [refresh]);

  return {
    products,
    isLoading,
    createProduct,
    updateProduct,
    deleteProduct,
    duplicateProduct,
    loadDefaultProducts,
    refresh,
  };
}

export function useProduct(id: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) { setIsLoading(false); return; }
    const all = loadProducts();
    const found = all.find(p => p.id === id) ?? null;
    setProduct(found);
    setIsLoading(false);
  }, [id]);

  return { product, isLoading };
}

// ─── Pricing Utilities ────────────────────────────────────────────────────────

export function getPriceTierForQty(product: Product, qty: number): PriceTier | null {
  for (const tier of product.priceTiers) {
    if (qty >= tier.minQty && (tier.maxQty === null || qty <= tier.maxQty)) {
      return tier;
    }
  }
  return product.priceTiers[0] ?? null;
}

export function getSizeUpcharge(product: Product, size: string): number {
  const uc = product.sizeUpcharges.find(u => u.size === size);
  return uc?.upcharge ?? 0;
}

export function calcTotalMaterialCost(product: Product): number {
  return product.materialCosts.reduce((sum, m) => sum + m.qtyPerUnit * m.estimatedCost, 0);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}
