import type { JSX } from 'react';
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { dashboardApi } from '../services/api';
import { subscribeToOrders, subscribeToInventory } from '../services/socket';
import { StatsGrid } from './dashboard/StatsGrid';
import { RecentOrders } from './dashboard/RecentOrders';
import { LowStockAlerts } from './dashboard/LowStockAlerts';
import { QuickActions } from './dashboard/QuickActions';
import type { Order, InventoryItem } from '../types';

export function DashboardPage(): JSX.Element {
  const queryClient = useQueryClient();

  const statsQuery = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => dashboardApi.getStats(),
    refetchInterval: 30_000,
    select: (res) => res.data,
  });

  const recentOrdersQuery = useQuery({
    queryKey: ['dashboard', 'recent-orders'],
    queryFn: () => dashboardApi.getRecentOrders(),
    refetchInterval: 30_000,
    select: (res) => res.data,
  });

  const lowStockQuery = useQuery({
    queryKey: ['dashboard', 'low-stock'],
    queryFn: () => dashboardApi.getLowStockAlerts(),
    refetchInterval: 30_000,
    select: (res) => res.data,
  });

  // Real-time socket subscriptions
  useEffect(() => {
    const unsubOrders = subscribeToOrders({
      onCreated: (_order: Order) => {
        void queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
        void queryClient.invalidateQueries({ queryKey: ['dashboard', 'recent-orders'] });
        toast.success('New order received', { id: 'order-created' });
      },
      onStatusChanged: (_order: Order) => {
        void queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
        void queryClient.invalidateQueries({ queryKey: ['dashboard', 'recent-orders'] });
        toast('Order status updated', { icon: '📋', id: 'order-status' });
      },
    });

    const unsubInventory = subscribeToInventory({
      onLowStock: (_item: InventoryItem) => {
        void queryClient.invalidateQueries({ queryKey: ['dashboard', 'low-stock'] });
        toast('Low stock alert', {
          icon: '⚠️',
          id: 'low-stock',
          style: { background: '#fffbeb', color: '#92400e' },
        });
      },
      onAdjusted: (_item: InventoryItem) => {
        void queryClient.invalidateQueries({ queryKey: ['dashboard', 'low-stock'] });
      },
    });

    return () => {
      unsubOrders();
      unsubInventory();
    };
  }, [queryClient]);

  const hasError = statsQuery.isError || recentOrdersQuery.isError || lowStockQuery.isError;
  const today = format(new Date(), 'EEEE, MMMM d');

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">{today}</p>
      </div>

      {/* Error banner */}
      {hasError && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <ExclamationCircleIcon className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800 flex-1">
            Some data failed to load.
          </p>
          <button
            onClick={() => {
              void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            }}
            className="text-sm font-semibold text-amber-700 hover:text-amber-900 transition-colors min-h-[44px] px-2"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats grid */}
      <StatsGrid stats={statsQuery.data} loading={statsQuery.isLoading} />

      {/* Two-column middle section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentOrders orders={recentOrdersQuery.data} loading={recentOrdersQuery.isLoading} />
        <LowStockAlerts items={lowStockQuery.data} loading={lowStockQuery.isLoading} />
      </div>

      {/* Quick actions */}
      <QuickActions />
    </div>
  );
}
