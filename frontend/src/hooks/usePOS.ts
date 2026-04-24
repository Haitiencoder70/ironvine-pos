import { useState, useCallback, useMemo } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { posApi, type CompleteSalePayload } from '../services/api';
import { useIsReady } from './useIsReady';
import type { POSProduct, CartItem, ApiResponse, PaginatedResult, Sale } from '../types';

// ─── Query Key Factories ──────────────────────────────────────────────────────

export const posKeys = {
  all: ['pos'] as const,
  products: (search?: string, category?: string) =>
    [...posKeys.all, 'products', search, category] as const,
  sales: (offset: number) => [...posKeys.all, 'sales', offset] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useProducts(
  search?: string,
  category?: string,
): UseQueryResult<ApiResponse<POSProduct[]>> {
  const isReady = useIsReady();
  return useQuery({
    queryKey: posKeys.products(search, category),
    queryFn: () => posApi.getProducts({ search, category }),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    enabled: isReady,
  });
}

export function useSaleHistory(
  page: number,
): UseQueryResult<ApiResponse<PaginatedResult<Sale>>> {
  const LIMIT = 10;
  const offset = (page - 1) * LIMIT;
  return useQuery({
    queryKey: posKeys.sales(offset),
    queryFn: () => posApi.getSaleHistory({ limit: LIMIT, offset }),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

// ─── Mutation ─────────────────────────────────────────────────────────────────

export function useCompleteSale(): UseMutationResult<
  ApiResponse<Sale>,
  Error,
  CompleteSalePayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CompleteSalePayload) => posApi.completeSale(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: posKeys.all });
      toast.success('Sale completed successfully');
    },
    onError: () => {
      toast.error('Failed to complete sale');
    },
  });
}

// ─── Cart ─────────────────────────────────────────────────────────────────────

interface DiscountConfig {
  type: 'flat' | 'percent';
  value: number;
}

export interface CartState {
  cart: CartItem[];
  addToCart: (product: POSProduct) => void;
  removeFromCart: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: DiscountConfig;
  discountAmount: number;
  total: number;
  setDiscount: (config: DiscountConfig) => void;
}

const DEFAULT_TAX_RATE = 0.085; // 8.5%

export function useCart(): CartState {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<DiscountConfig>({ type: 'flat', value: 0 });

  const addToCart = useCallback((product: POSProduct) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          quantity: 1,
          unitPrice: product.basePrice,
        },
      ];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  }, []);

  const updateQty = useCallback((productId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((item) => item.productId !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity: qty } : item,
      ),
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setDiscount({ type: 'flat', value: 0 });
  }, []);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [cart],
  );

  const discountAmount = useMemo(() => {
    if (discount.value <= 0) return 0;
    if (discount.type === 'percent') return subtotal * (discount.value / 100);
    return Math.min(discount.value, subtotal);
  }, [discount, subtotal]);

  const taxAmount = useMemo(
    () => (subtotal - discountAmount) * DEFAULT_TAX_RATE,
    [subtotal, discountAmount],
  );

  const total = useMemo(
    () => subtotal - discountAmount + taxAmount,
    [subtotal, discountAmount, taxAmount],
  );

  return {
    cart,
    addToCart,
    removeFromCart,
    updateQty,
    clearCart,
    subtotal,
    taxRate: DEFAULT_TAX_RATE,
    taxAmount,
    discount,
    discountAmount,
    total,
    setDiscount,
  };
}
