import type { JSX } from 'react';
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { dashboardApi } from '../services/api';
import { subscribeToOrders, subscribeToInventory } from '../services/socket';
import { StatsGrid } from './dashboard/StatsGrid';
import { RecentOrders } from './dashboard/RecentOrders';
import { LowStockAlerts } from './dashboard/LowStockAlerts';
import { QuickActions } from './dashboard/QuickActions';
import { ProfitOverview } from './dashboard/ProfitOverview';
import { TopProducts } from './dashboard/TopProducts';
import type { Order, InventoryItem } from '../types';

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

const sectionVariant = {
  hidden:  { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};

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

  const profitStatsQuery = useQuery({
    queryKey: ['dashboard', 'profit-stats'],
    queryFn: () => dashboardApi.getProfitStats(),
    refetchInterval: 60_000,
    select: (res) => res.data,
  });

  const topProductsQuery = useQuery({
    queryKey: ['dashboard', 'top-products'],
    queryFn: () => dashboardApi.getTopProducts(),
    refetchInterval: 60_000,
    select: (res) => res.data,
  });

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
        toast('Low stock alert', { icon: '⚠️', id: 'low-stock', style: { background: '#fffbeb', color: '#92400e' } });
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
    <motion.div
      className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Page header ──────────────────────────────────────────────── */}
      <motion.div variants={sectionVariant} className="flex flex-col pt-1">
        <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-gray-600 mb-1.5">
          {today}
        </p>
        <h1
          className="text-[28px] font-extrabold tracking-tight leading-none"
          style={{
            background: 'linear-gradient(145deg, #ffffff 0%, #c8d0e4 60%, #8ea0bf 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Dashboard
        </h1>
      </motion.div>

      {/* ── Error banner ─────────────────────────────────────────────── */}
      {hasError && (
        <motion.div
          variants={sectionVariant}
          className="flex items-center gap-3 p-4 rounded-2xl"
          style={{
            background: 'rgba(245,158,11,0.06)',
            border: '1px solid rgba(245,158,11,0.22)',
            boxShadow: '0 0 24px rgba(245,158,11,0.06)',
          }}
        >
          <ExclamationCircleIcon className="h-5 w-5 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-200/80 flex-1">Some data failed to load.</p>
          <button
            onClick={() => { void queryClient.invalidateQueries({ queryKey: ['dashboard'] }); }}
            className="text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors min-h-[44px] px-4 rounded-xl hover:bg-white/5"
          >
            Retry
          </button>
        </motion.div>
      )}

      {/* ── Stats ────────────────────────────────────────────────────── */}
      <motion.div variants={sectionVariant}>
        <StatsGrid stats={statsQuery.data} loading={statsQuery.isLoading} />
      </motion.div>

      {/* ── Mid section ──────────────────────────────────────────────── */}
      <motion.div variants={sectionVariant} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <RecentOrders orders={recentOrdersQuery.data} loading={recentOrdersQuery.isLoading} />
        <LowStockAlerts items={lowStockQuery.data} loading={lowStockQuery.isLoading} />
      </motion.div>

      {/* ── Profit overview ───────────────────────────────────────────── */}
      <motion.div variants={sectionVariant}>
        <ProfitOverview stats={profitStatsQuery.data} loading={profitStatsQuery.isLoading} />
      </motion.div>

      {/* ── Top products ──────────────────────────────────────────────── */}
      <motion.div variants={sectionVariant}>
        <TopProducts products={topProductsQuery.data} loading={topProductsQuery.isLoading} />
      </motion.div>

      {/* ── Quick actions ─────────────────────────────────────────────── */}
      <motion.div variants={sectionVariant}>
        <QuickActions />
      </motion.div>
    </motion.div>
  );
}
