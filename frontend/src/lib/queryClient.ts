import { QueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,   // 5 minutes — reduces redundant refetches
      gcTime: 10 * 60 * 1000,     // 10 minutes — keep inactive data longer
      refetchOnWindowFocus: false, // avoid burst on tab switch
      refetchOnReconnect: false,   // manual invalidation preferred over auto-refetch
      retry: (failureCount, error) => {
        const status = (error as AxiosError)?.response?.status;
        if (status && [401, 403, 404].includes(status)) return false;
        return failureCount < 1;  // one retry max
      },
    },
    mutations: {
      retry: false,
    },
  },
});
