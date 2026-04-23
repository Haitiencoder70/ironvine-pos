import { useEffect } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { productApi, type BackendProduct, type BackendProductCategory } from '../services/api';
import { useIsReady } from './useIsReady';

// ─── Re-export backend types under familiar names ─────────────────────────────

export type Product = BackendProduct;
export type ProductCategory = BackendProductCategory;

// ─── Query Key Factories ──────────────────────────────────────────────────────

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (params: ProductListParams) => [...productKeys.lists(), params] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
  categories: () => [...productKeys.all, 'categories'] as const,
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProductListParams {
  search?: string;
  categoryId?: string;
  isActive?: boolean;
  isFeatured?: boolean;
}

export interface PriceTier {
  minQty: number;
  price: number;
}

export interface SizeUpcharges {
  [size: string]: number;
}

// ─── useProducts — list ───────────────────────────────────────────────────────

export function useProducts(
  params: ProductListParams = {},
): UseQueryResult<{ data: Product[] }> {
  const isReady = useIsReady();
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => productApi.getAll(params),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
    enabled: isReady,
  });
}

// ─── useProduct — single ──────────────────────────────────────────────────────

export function useProduct(id: string): UseQueryResult<{ data: Product }> {
  const isReady = useIsReady();
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => productApi.getById(id),
    enabled: isReady && !!id,
    staleTime: 60_000,
  });
}

// ─── useProductCategories ─────────────────────────────────────────────────────

export function useProductCategories(): UseQueryResult<{ data: ProductCategory[] }> {
  const isReady = useIsReady();
  return useQuery({
    queryKey: productKeys.categories(),
    queryFn: () => productApi.getCategories(),
    staleTime: 5 * 60_000,
    enabled: isReady,
  });
}

// ─── useCreateProduct ─────────────────────────────────────────────────────────

export function useCreateProduct(): UseMutationResult<{ data: Product }, Error, unknown> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) => productApi.create(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      toast.success('Product created');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to create product'),
  });
}

// ─── useUpdateProduct ─────────────────────────────────────────────────────────

export function useUpdateProduct(): UseMutationResult<{ data: Product }, Error, { id: string; body: unknown }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => productApi.update(id, body),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: productKeys.detail(id) });
      toast.success('Product updated');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to update product'),
  });
}

// ─── useDeleteProduct ─────────────────────────────────────────────────────────

export function useDeleteProduct(): UseMutationResult<{ data: void }, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      toast.success('Product deleted');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to delete product'),
  });
}

// ─── useDuplicateProduct ──────────────────────────────────────────────────────

export function useDuplicateProduct(): UseMutationResult<{ data: Product }, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productApi.duplicate(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      toast.success('Product duplicated');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to duplicate product'),
  });
}

// ─── useCreateProductCategory ─────────────────────────────────────────────────

export function useCreateProductCategory(): UseMutationResult<
  { data: ProductCategory },
  Error,
  { name: string; description?: string; icon?: string; displayOrder?: number }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => productApi.createCategory(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productKeys.categories() });
      toast.success('Category created');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to create category'),
  });
}

// ─── Pricing Utilities ────────────────────────────────────────────────────────

export function getPriceTierForQty(product: Product, qty: number): PriceTier | null {
  const tiers = (product.priceTiers ?? []) as PriceTier[];
  if (!tiers.length) return null;
  const sorted = [...tiers].sort((a, b) => b.minQty - a.minQty);
  return sorted.find((t) => qty >= t.minQty) ?? sorted[sorted.length - 1] ?? null;
}

export function getSizeUpcharge(product: Product, size: string): number {
  return (product.sizeUpcharges as SizeUpcharges)?.[size] ?? 0;
}

export function calcTotalMaterialCost(product: Product): number {
  return (product.materialTemplates ?? []).reduce(
    (sum, m) => sum + Number(m.quantityPerUnit) * Number(m.estimatedCostPerUnit),
    0,
  );
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

// ─── Constants (kept for compatibility with existing UI components) ────────────

export const PRODUCT_CATEGORIES = [
  'T-Shirts', 'Hoodies', 'Long Sleeve', 'Sweatshirts',
  'Polos', 'Tank Tops', 'Youth', 'Ladies', 'Specialty',
];

// Enum values that match the Prisma GarmentType enum
export const GARMENT_TYPES = [
  'TSHIRT', 'HOODIE', 'LONG_SLEEVE', 'SWEATSHIRT',
  'POLO', 'TANK_TOP', 'JACKET', 'HAT', 'BAG', 'OTHER',
];

export const GARMENT_TYPE_LABELS: Record<string, string> = {
  TSHIRT: 'T-Shirt', HOODIE: 'Hoodie', LONG_SLEEVE: 'Long Sleeve',
  SWEATSHIRT: 'Sweatshirt', POLO: 'Polo', TANK_TOP: 'Tank Top',
  JACKET: 'Jacket', HAT: 'Hat', BAG: 'Bag', OTHER: 'Other',
};

// Enum values that match the Prisma PrintMethod enum
export const PRINT_METHODS = ['DTF', 'HTV', 'SCREEN_PRINT', 'EMBROIDERY', 'SUBLIMATION', 'DTG', 'NONE'];

export const PRINT_METHOD_LABELS: Record<string, string> = {
  DTF: 'DTF', HTV: 'HTV', SCREEN_PRINT: 'Screen Print',
  EMBROIDERY: 'Embroidery', SUBLIMATION: 'Sublimation', DTG: 'DTG', NONE: 'None',
};

export const PRINT_LOCATIONS = [
  'Front', 'Back', 'Left Chest', 'Right Chest',
  'Left Sleeve', 'Right Sleeve', 'Full Front', 'Full Back', 'Hood',
];

export const BRANDS = ['Gildan', 'Bella+Canvas', 'Next Level', 'Comfort Colors', 'Hanes', 'Port & Company', 'AS Colour'];

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];

// ─── Socket subscription for real-time product updates ────────────────────────

export function useProductsRealtime(): void {
  const queryClient = useQueryClient();
  useEffect(() => {
    // When socket emits product changes, invalidate product queries so all
    // devices get fresh data automatically.
    const handler = () => {
      void queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    };
    window.addEventListener('pos:products-changed', handler);
    return () => window.removeEventListener('pos:products-changed', handler);
  }, [queryClient]);
}
