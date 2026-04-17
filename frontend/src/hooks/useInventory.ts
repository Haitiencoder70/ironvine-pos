import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { inventoryApi } from '../services/api';
import { useIsReady } from './useIsReady';
import type { InventoryItem, InventoryCategory, ApiResponse, PaginatedResult, StockMovement } from '../types';

// ─── Query Key Factories ──────────────────────────────────────────────────────

export const inventoryKeys = {
  all: ['inventory'] as const,
  lists: () => [...inventoryKeys.all, 'list'] as const,
  list: (params: InventoryListParams) => [...inventoryKeys.lists(), params] as const,
  details: () => [...inventoryKeys.all, 'detail'] as const,
  detail: (id: string) => [...inventoryKeys.details(), id] as const,
  lowStock: () => [...inventoryKeys.all, 'lowStock'] as const,
  movements: (id: string) => [...inventoryKeys.detail(id), 'movements'] as const,
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InventoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
}

export interface AdjustStockPayload {
  id: string;
  quantityDelta: number;
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'RESERVED' | 'UNRESERVED';
  reason?: string;
  orderId?: string;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useInventory(
  params: InventoryListParams
): UseQueryResult<ApiResponse<PaginatedResult<InventoryItem>>> {
  const isReady = useIsReady();
  return useQuery({
    queryKey: inventoryKeys.list(params),
    queryFn: () => inventoryApi.getAll(params),
    staleTime: 30_000,
    enabled: isReady,
    placeholderData: (prev) => prev,
  });
}

export function useInventoryCategories(): UseQueryResult<ApiResponse<InventoryCategory[]>> {
  return useQuery({
    queryKey: [...inventoryKeys.all, 'categories'],
    queryFn: async () => {
      // Since we don't have a dedicated categories endpoint, we can use the known enum values
      // or fetch all items and extract unique categories. For now, we'll use the type definition.
      const categories: InventoryCategory[] = [
        'BLANK_SHIRTS',
        'DTF_TRANSFERS',
        'VINYL',
        'INK',
        'PACKAGING',
        'EMBROIDERY_THREAD',
        'OTHER',
      ];
      return { data: categories };
    },
    staleTime: 3600_000, // Categories rarely change
  });
}

export function useInventoryItem(id: string): UseQueryResult<ApiResponse<InventoryItem>> {

  return useQuery({
    queryKey: inventoryKeys.detail(id),
    queryFn: () => inventoryApi.getById(id),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useLowStock(): UseQueryResult<ApiResponse<InventoryItem[]>> {
  const isReady = useIsReady();
  return useQuery({
    queryKey: inventoryKeys.lowStock(),
    queryFn: () => inventoryApi.getLowStock(),
    staleTime: 60_000,
    enabled: isReady,
  });
}

export function useStockMovements(id: string): UseQueryResult<ApiResponse<StockMovement[]>> {
  return useQuery({
    queryKey: inventoryKeys.movements(id),
    queryFn: () => inventoryApi.getStockMovements(id),
    enabled: Boolean(id),
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateInventoryItem(): UseMutationResult<
  ApiResponse<InventoryItem>,
  Error,
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: unknown) => inventoryApi.create(data),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.lowStock() });
      toast.success(`Created item: ${res.data.name}`);
    },
    onError: () => {
      toast.error('Failed to create inventory item');
    },
  });
}

export function useUpdateInventoryItem(): UseMutationResult<
  ApiResponse<InventoryItem>,
  Error,
  { id: string; data: unknown }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => inventoryApi.update(id, data),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.detail(res.data.id) });
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.lowStock() });
      toast.success('Inventory item updated');
    },
    onError: () => {
      toast.error('Failed to update inventory item');
    },
  });
}

export function useAdjustStock(): UseMutationResult<
  ApiResponse<InventoryItem>,
  Error,
  AdjustStockPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }) => inventoryApi.adjustStock(id, data),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.detail(res.data.id) });
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.movements(res.data.id) });
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.lowStock() });
      toast.success('Stock adjusted successfully');
    },
    onError: () => {
      toast.error('Failed to adjust stock');
    },
  });
}

export function useDeleteInventoryItem(): UseMutationResult<
  ApiResponse<null>,
  Error,
  string
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => inventoryApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.lowStock() });
      toast.success('Inventory item deleted');
    },
    onError: () => {
      toast.error('Failed to delete item');
    },
  });
}
