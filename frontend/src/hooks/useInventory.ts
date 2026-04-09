import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { inventoryApi } from '../services/api';
import type { InventoryItem, ApiResponse, PaginatedResult, StockMovement } from '../types';

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
  return useQuery({
    queryKey: inventoryKeys.list(params),
    queryFn: () => inventoryApi.getAll(params),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
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
  return useQuery({
    queryKey: inventoryKeys.lowStock(),
    queryFn: () => inventoryApi.getLowStock(),
    staleTime: 60_000,
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
