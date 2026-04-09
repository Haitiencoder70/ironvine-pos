import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { customerApi } from '../services/api';
import type { Customer, ApiResponse, PaginatedResult } from '../types';

// ─── Query Key Factories ──────────────────────────────────────────────────────

export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (params: CustomerListParams) => [...customerKeys.lists(), params] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
  orders: (id: string) => [...customerKeys.detail(id), 'orders'] as const,
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CustomerListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface CreateCustomerPayload {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
}

// ─── useCustomers — paginated search list ─────────────────────────────────────

export function useCustomers(
  params: CustomerListParams
): UseQueryResult<ApiResponse<PaginatedResult<Customer>>> {
  return useQuery({
    queryKey: customerKeys.list(params),
    queryFn: () => customerApi.getAll(params),
    staleTime: 60_000,
    enabled: true,
    placeholderData: (prev) => prev,
  });
}

// ─── useCustomer — single customer ───────────────────────────────────────────

export function useCustomer(id: string): UseQueryResult<ApiResponse<Customer>> {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: () => customerApi.getById(id),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

// ─── useCreateCustomer ────────────────────────────────────────────────────────

export function useCreateCustomer(): UseMutationResult<
  ApiResponse<Customer>,
  Error,
  CreateCustomerPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCustomerPayload) => customerApi.create(data),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      toast.success(`Customer ${res.data.firstName} ${res.data.lastName} created`);
    },
    onError: () => {
      toast.error('Failed to create customer. Please try again.');
    },
  });
}

// ─── useUpdateCustomer ────────────────────────────────────────────────────────

export function useUpdateCustomer(): UseMutationResult<
  ApiResponse<Customer>,
  Error,
  { id: string; data: Partial<CreateCustomerPayload> & Record<string, unknown> }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => customerApi.update(id, data),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: customerKeys.detail(res.data.id) });
      toast.success('Customer updated successfully');
    },
    onError: () => {
      toast.error('Failed to update customer');
    },
  });
}

// ─── useCustomerOrders ────────────────────────────────────────────────────────

export function useCustomerOrders(id: string) {
  return useQuery({
    queryKey: customerKeys.orders(id),
    queryFn: () => customerApi.getOrderHistory(id),
    enabled: Boolean(id),
  });
}

