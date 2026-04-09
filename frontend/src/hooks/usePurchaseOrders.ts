import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { purchaseOrderApi } from '../services/api';
import { orderKeys } from './useOrders';
import { inventoryKeys } from './useInventory';
import type { PurchaseOrderStatus } from '../types';

export const poKeys = {
  all: ['purchase-orders'] as const,
  lists: () => [...poKeys.all, 'list'] as const,
  list: (params: POListParams) => [...poKeys.lists(), params] as const,
  details: () => [...poKeys.all, 'detail'] as const,
  detail: (id: string) => [...poKeys.details(), id] as const,
  byOrder: (orderId: string) => [...poKeys.all, 'byOrder', orderId] as const,
};

export interface POListParams {
  page?: number;
  limit?: number;
  status?: PurchaseOrderStatus;
  vendorId?: string;
}

export function usePurchaseOrders(params: POListParams) {
  return useQuery({
    queryKey: poKeys.list(params),
    queryFn: () => purchaseOrderApi.getAll(params),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}

export function usePurchaseOrder(id: string) {
  return useQuery({
    queryKey: poKeys.detail(id),
    queryFn: () => purchaseOrderApi.getById(id),
    enabled: Boolean(id),
  });
}

export function usePurchaseOrdersByOrder(orderId: string) {
  return useQuery({
    queryKey: poKeys.byOrder(orderId),
    queryFn: () => purchaseOrderApi.getByOrder(orderId),
    enabled: Boolean(orderId),
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: unknown) => purchaseOrderApi.create(data),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: poKeys.lists() });
      if (res.data.linkedOrderId) {
        void queryClient.invalidateQueries({ queryKey: poKeys.byOrder(res.data.linkedOrderId) });
        void queryClient.invalidateQueries({ queryKey: orderKeys.detail(res.data.linkedOrderId) });
        void queryClient.invalidateQueries({ queryKey: orderKeys.workflow(res.data.linkedOrderId) });
      }
      toast.success(`Purchase Order created successfully`);
    },
    onError: () => {
      toast.error('Failed to create Purchase Order');
    },
  });
}

export function useUpdatePurchaseOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, newStatus, notes }: { id: string; newStatus: PurchaseOrderStatus; notes?: string }) =>
      purchaseOrderApi.updateStatus(id, { newStatus, notes }),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: poKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: poKeys.detail(res.data.id) });
      toast.success('Status updated');
    },
    onError: () => {
      toast.error('Failed to update status');
    },
  });
}

export function useSendPurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => purchaseOrderApi.send(id),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: poKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: poKeys.detail(res.data.id) });
      toast.success('PO Sent to Vendor');
    },
    onError: () => {
      toast.error('Failed to send PO');
    },
  });
}

export function useReceivePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => purchaseOrderApi.receive(id, data),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: poKeys.details() });
      void queryClient.invalidateQueries({ queryKey: poKeys.lists() });
      
      // Receiving heavily modifies inventory, invalidate inventory
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.lowStock() });

      // May trigger order status cascade
      if (res.data.linkedOrderId) {
        void queryClient.invalidateQueries({ queryKey: orderKeys.detail(res.data.linkedOrderId) });
        void queryClient.invalidateQueries({ queryKey: orderKeys.workflow(res.data.linkedOrderId) });
      }

      toast.success('Items received and inventory updated');
    },
    onError: () => {
      toast.error('Failed to register receipt');
    },
  });
}
