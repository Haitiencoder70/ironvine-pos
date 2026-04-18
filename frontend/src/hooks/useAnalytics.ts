import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface DailyCount {
  date: string;
  count: number;
}

export interface PeriodUsage {
  metricType: string;
  total: number;
  daily: DailyCount[];
}

async function fetchCurrentPeriod(): Promise<PeriodUsage[]> {
  const res = await api.get<{ data: PeriodUsage[] }>('/api/analytics/current');
  return res.data.data;
}

export function useCurrentPeriodUsage() {
  return useQuery({
    queryKey: ['analytics', 'current'],
    queryFn: fetchCurrentPeriod,
    staleTime: 5 * 60 * 1000,
  });
}
