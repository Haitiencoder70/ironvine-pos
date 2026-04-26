import { useEffect } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { orderApi } from '../services/api';
import { subscribeToOrders } from '../services/socket';
import { useIsReady } from './useIsReady';
import type {
  Order,
  OrderStatus,
  PaginatedResult,
  ApiResponse,
} from '../types';

// ─── Query Key Factories ──────────────────────────────────────────────────────

export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (params: OrderListParams) => [...orderKeys.lists(), params] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
  workflow: (id: string) => [...orderKeys.all, 'workflow', id] as const,
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrderListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: OrderStatus | '';
  excludeCancelled?: boolean;
  priority?: string;
  dateFrom?: string;
  dateTo?: string;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
}

// ─── useOrders — paginated list ────────────────────────────────────────────────

export function useOrders(
  params: OrderListParams,
  options?: { realtime?: boolean }
): UseQueryResult<ApiResponse<PaginatedResult<Order>>> {
  const queryClient = useQueryClient();
  const enableRealtime = options?.realtime ?? true;
  const isReady = useIsReady();

  // Real-time socket subscription
  useEffect(() => {
    if (!enableRealtime) return;

    const unsub = subscribeToOrders({
      onCreated: (order) => {
        void queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
        toast.success(`New order ${order.orderNumber} created`, {
          id: `order-created-${order.id}`,
        });
      },
      onStatusChanged: (order) => {
        void queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
        void queryClient.setQueryData<ApiResponse<Order>>(
          orderKeys.detail(order.id),
          (old) => (old ? { ...old, data: order } : old)
        );
        toast(`Order ${order.orderNumber} → ${order.status.replace(/_/g, ' ')}`, {
          icon: '📋',
          id: `order-status-${order.id}`,
        });
      },
      onUpdated: (order) => {
        void queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
        void queryClient.setQueryData<ApiResponse<Order>>(
          orderKeys.detail(order.id),
          (old) => (old ? { ...old, data: order } : old)
        );
      },
    });

    return unsub;
  }, [queryClient, enableRealtime]);

  // Map frontend sort keys to backend-accepted values
  const apiParams = {
    ...params,
    sortKey: params.sortKey === 'customer.lastName' ? 'customerName' : params.sortKey,
  };

  return useQuery({
    queryKey: orderKeys.list(params),
    queryFn: () => orderApi.getAll(apiParams),
    staleTime: 30_000,
    enabled: isReady,
    placeholderData: (prev) => prev,
  });
}

// ─── useOrder — single order ──────────────────────────────────────────────────

export function useOrder(id: string): UseQueryResult<ApiResponse<Order>> {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => orderApi.getById(id),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

// ─── useCreateOrder ───────────────────────────────────────────────────────────

export function useCreateOrder(): UseMutationResult<ApiResponse<Order>, Error, unknown> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: unknown) => orderApi.create(data),
    onSuccess: () => {
      // Invalidate list so new order appears immediately.
      // Success toast is shown by the calling page (NewOrder.tsx) with the order number.
      void queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
    // onError: intentionally omitted — the API interceptor in lib/api.ts already
    // shows the appropriate error toast (validation, auth, network, etc.).
  });
}

// ─── useUpdateOrderStatus ─────────────────────────────────────────────────────

export function useUpdateOrderStatus(): UseMutationResult<
  ApiResponse<Order>,
  Error,
  { id: string; newStatus: OrderStatus; notes?: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, newStatus, notes }) =>
      orderApi.updateStatus(id, { newStatus, notes }),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.detail(res.data.id) });
      void queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
    onError: () => {
      toast.error('Failed to update order status. Please try again.');
    },
  });
}

// ─── useOrderStatusCounts ─────────────────────────────────────────────────────

export interface StatusCount {
  status: string;
  count: number;
}

export function useOrderStatusCounts(): UseQueryResult<ApiResponse<StatusCount[]>> {
  return useQuery({
    queryKey: [...orderKeys.all, 'status-counts'],
    queryFn: () =>
      orderApi.getAll({ limit: 1, page: 1 }).then((res) => {
        // Return a shaped response the tab counts can consume
        // Actual count data comes from the list totals per status
        return res;
      }) as Promise<ApiResponse<StatusCount[]>>,
    staleTime: 60_000,
    // Disabled — replaced by per-tab queries below
    enabled: false,
  });
}
