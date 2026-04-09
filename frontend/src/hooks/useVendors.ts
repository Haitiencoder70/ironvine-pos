import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { vendorApi, purchaseOrderApi } from '../services/api';

export const vendorKeys = {
  all: ['vendors'] as const,
  lists: () => [...vendorKeys.all, 'list'] as const,
  list: (params: VendorListParams) => [...vendorKeys.lists(), params] as const,
  details: () => [...vendorKeys.all, 'detail'] as const,
  detail: (id: string) => [...vendorKeys.details(), id] as const,
  purchaseOrders: (id: string) => [...vendorKeys.detail(id), 'purchaseOrders'] as const,
};

export interface VendorListParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
}

export function useVendors(params: VendorListParams = {}) {
  return useQuery({
    queryKey: vendorKeys.list(params),
    queryFn: () => vendorApi.getAll(params),
    staleTime: 60_000, // Vendors don't change often
  });
}

export function useVendor(id: string) {
  return useQuery({
    queryKey: vendorKeys.detail(id),
    queryFn: () => vendorApi.getById(id),
    enabled: Boolean(id),
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: unknown) => vendorApi.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: vendorKeys.lists() });
      toast.success('Vendor created');
    },
    onError: () => {
      toast.error('Failed to create vendor');
    },
  });
}

export function useUpdateVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => vendorApi.update(id, data),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: vendorKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: vendorKeys.detail(res.data.id) });
      toast.success('Vendor updated');
    },
    onError: () => {
      toast.error('Failed to update vendor');
    },
  });
}

// ─── Auxiliary ────────────────────────────────────────────────────────────────

export function useVendorPurchaseOrders(vendorId: string) {
  return useQuery({
    queryKey: vendorKeys.purchaseOrders(vendorId),
    queryFn: () => purchaseOrderApi.getAll({ vendorId, limit: 100 }),
    enabled: Boolean(vendorId),
  });
}
