import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { useIsReady } from './useIsReady';

export interface BillingUsage {
  plan: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  usage: {
    orders:         { current: number; max: number };
    customers:      { current: number; max: number };
    users:          { current: number; max: number };
    inventoryItems: { current: number; max: number };
  };
}

export function useBillingUsage() {
  const isReady = useIsReady();
  return useQuery<BillingUsage>({
    queryKey: ['billing', 'usage'],
    queryFn: async () => {
      const res = await api.get<BillingUsage>('/billing/usage');
      return res.data;
    },
    enabled: isReady,
  });
}

export function useCreateCheckout() {
  return useMutation({
    mutationFn: async (plan: 'STARTER' | 'PRO' | 'ENTERPRISE') => {
      const res = await api.post<{ url: string }>('/billing/checkout', { plan });
      return res.data.url;
    },
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: () => {
      toast.error('Failed to start checkout. Please try again.');
    },
  });
}

export function useOpenPortal() {
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<{ url: string }>('/billing/portal');
      return res.data.url;
    },
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: () => {
      toast.error('Failed to open billing portal. Please try again.');
    },
  });
}
