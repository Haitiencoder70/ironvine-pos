import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  ArrowUpTrayIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { useInventory, useLowStock } from '../../hooks/useInventory';
import { useDebounce } from '../../hooks/useDebounce';
import { TouchButton } from '../../components/ui/TouchButton';
import { TouchCard } from '../../components/ui/TouchCard';
import { SkeletonLoader, EmptyState } from '../../components/ui';
import { usePermissions } from '../../hooks/usePermissions';
import type { JSX } from 'react';

import type { InventoryCategory } from '../../types';

// ─── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES: { value: InventoryCategory; label: string }[] = [
  { value: 'BLANK_SHIRTS', label: 'Blank Garments' },
  { value: 'DTF_TRANSFERS', label: 'DTF Transfers' },
  { value: 'VINYL', label: 'HTV Vinyl' },
  { value: 'INK', label: 'Ink' },
  { value: 'PACKAGING', label: 'Packaging' },
  { value: 'EMBROIDERY_THREAD', label: 'Embroidery Thread' },
  { value: 'OTHER', label: 'Other/Supplies' },
];

const CATEGORY_LABELS = CATEGORIES.reduce((acc, curr) => {
  acc[curr.value] = curr.label;
  return acc;
}, {} as Record<string, string>);

// ─── Formatting ───────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function InventoryListPage(): JSX.Element {
  const navigate = useNavigate();
  const { can } = usePermissions();

  // Low stock alerts
  const { data: lowStockData } = useLowStock();
  const lowStockItems = lowStockData?.data ?? [];
  const [dismissBanner, setDismissBanner] = useState(false);

  // Filters & State
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [category, setCategory] = useState<string>('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Sorting
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'lowStock'>('name');

  // Query
  const { data, isLoading, isError } = useInventory({
    page,
    limit,
    search: debouncedSearch || undefined,
    category: category || undefined,
  });

  const rawItems = data?.data?.data ?? [];
  const total = data?.data?.total ?? 0;
  const totalPages = data?.data?.totalPages ?? 1;

  // Local Sort application
  const inventoryItems = useMemo(() => {
    const list = [...rawItems];
    if (sortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'quantity') {
      list.sort((a, b) => a.quantityAvailable - b.quantityAvailable);
    } else if (sortBy === 'lowStock') {
      list.sort((a, b) => {
        const aLow = a.quantityAvailable <= a.reorderPoint ? -1 : 1;
        const bLow = b.quantityAvailable <= b.reorderPoint ? -1 : 1;
        if (aLow !== bLow) return aLow - bLow;
        return a.quantityAvailable - b.quantityAvailable;
      });
    }
    return list;
  }, [rawItems, sortBy]);

  // Handlers
  const handlePageChange = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [totalPages]);

  const toggleSort = () => {
    setSortBy((current) => {
      if (current === 'name') return 'lowStock';
      if (current === 'lowStock') return 'quantity';
      return 'name';
    });
  };

  const getSortLabel = () => {
    if (sortBy === 'name') return 'Name';
    if (sortBy === 'quantity') return 'Quantity (Low-High)';
    if (sortBy === 'lowStock') return 'Low Stock First';
    return '';
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Inventory Management</h1>
          <p className="text-sm text-gray-400 mt-1 font-medium">Track and manage raw materials and product stock.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TouchButton
            variant="secondary"
            size="md"
            icon={<ArrowUpTrayIcon className="h-5 w-5" />}
            onClick={() => alert('Bulk CSV import feature coming soon')}
          >
            Import
          </TouchButton>
          {can('inventory:create') && (
            <TouchButton
              variant="primary"
              size="md"
              icon={<PlusIcon className="h-5 w-5" />}
              onClick={() => navigate('/inventory/new')}
            >
              Add Item
            </TouchButton>
          )}
        </div>
      </div>

      {/* ── Banner ── */}
      <AnimatePresence>
        {!dismissBanner && lowStockItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex gap-3 shadow-lg backdrop-blur-md items-start"
          >
            <ExclamationTriangleIcon className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-rose-300">
                Low Stock Alert
              </h3>
              <p className="text-sm text-rose-200/70 mt-0.5">
                {lowStockItems.length} items have fallen below their reorder points.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSortBy('lowStock');
                  setCategory('');
                  setSearch('');
                  setDismissBanner(true);
                }}
                className="text-sm font-medium text-rose-300 hover:text-white underline min-h-[44px] px-2 transition-colors"
              >
                View Items
              </button>
              <button
                onClick={() => setDismissBanner(true)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-rose-400 hover:bg-white/10 transition-colors"
                aria-label="Dismiss banner"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Filters ── */}
      <div className="glass-panel rounded-2xl p-4 space-y-4 border-white/10">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search by SKU or item name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 min-h-[48px] rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-gray-500 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          </div>

          {/* Category */}
          <div className="relative min-w-[200px]">
             <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 pointer-events-none" />
             <select
               value={category}
               onChange={(e) => {
                 setCategory(e.target.value);
                 setPage(1);
               }}
               className="w-full pl-10 pr-10 min-h-[48px] rounded-xl border border-white/10 bg-white/5 text-white text-base shadow-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
             >
               <option value="" className="bg-charcoal">All Categories</option>
               {CATEGORIES.map((c) => (
                 <option key={c.value} value={c.value} className="bg-charcoal">{c.label}</option>
               ))}
             </select>
          </div>

          {/* Local sort toggle */}
          <TouchButton
            variant="secondary"
            size="md"
            icon={<AdjustmentsHorizontalIcon className="h-5 w-5" />}
            onClick={toggleSort}
            className="md:w-auto w-full justify-center"
          >
            Sort: {getSortLabel()}
          </TouchButton>
        </div>
      </div>

      {/* ── Desktop Table ── */}
      <div className="hidden lg:block glass-panel rounded-2xl overflow-hidden border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white/5 border-b border-white/10 text-gray-400 uppercase tracking-wider text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">Item Details</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 text-right">Avail / On Hand</th>
                <th className="px-6 py-4 text-right">Reserved</th>
                <th className="px-6 py-4 text-right">Cost</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <SkeletonLoader variant="table" rows={5} />
              ) : isError || inventoryItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-0">
                    <div className="flex justify-center p-8">
                      <EmptyState
                        title={isError ? 'Failed to load inventory' : 'No items found'}
                        description={isError ? 'Please check your connection.' : 'No inventory matches your criteria.'}
                        minHeight="min-h-[300px]"
                        className="w-full max-w-lg border-0 shadow-none bg-transparent"
                      />
                    </div>
                  </td>
                </tr>
              ) : (
                inventoryItems.map((item) => {
                  const isLowStock = item.quantityAvailable <= item.reorderPoint;
                  return (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-white">{item.name}</span>
                          <span className="text-xs text-gray-500 font-mono mt-0.5">{item.sku}</span>
                          {(item.brand || item.size || item.color) && (
                            <span className="text-xs text-gray-400 mt-0.5">
                              {[item.brand, item.size, item.color].filter(Boolean).join(' · ')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2 py-1 bg-white/5 text-gray-400 rounded-lg text-xs font-medium border border-white/10">
                          {CATEGORY_LABELS[item.category] ?? item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium">
                        <span className={clsx("text-base", isLowStock ? "text-rose-400" : "text-white")}>
                          {item.quantityAvailable}
                        </span>
                        <span className="text-gray-500 text-xs ml-1">/ {item.quantityOnHand}</span>
                      </td>
                      <td className="px-6 py-4 text-right text-gray-400">
                        {item.quantityReserved}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-400 font-mono">
                        {fmt(item.costPrice)}
                      </td>
                      <td className="px-6 py-4">
                        {isLowStock ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400 bg-rose-500/10 px-2 py-1 rounded-lg border border-rose-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> In Stock
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <TouchButton
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(`/inventory/${item.id}`)}
                        >
                          View Details
                        </TouchButton>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Mobile Cards ── */}
      <div className="lg:hidden space-y-4">
        {isLoading ? (
          <SkeletonLoader variant="card" rows={4} />
        ) : isError || inventoryItems.length === 0 ? (
          <EmptyState
            title={isError ? 'Failed to load inventory' : 'No items found'}
            description={isError ? 'Please check your connection.' : 'No inventory matches your criteria.'}
            minHeight="min-h-[200px]"
          />
        ) : (
          inventoryItems.map((item) => {
            const isLowStock = item.quantityAvailable <= item.reorderPoint;
            return (
              <TouchCard
                key={item.id}
                onClick={() => navigate(`/inventory/${item.id}`)}
                padding="md"
                className="glass-panel border-white/10 active:bg-white/10 transition-colors"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate pr-4 text-base">{item.name}</p>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{item.sku}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {CATEGORY_LABELS[item.category] ?? item.category}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className={clsx("text-xl font-bold", isLowStock ? "text-rose-400" : "text-white")}>
                      {item.quantityAvailable}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Available</p>
                  </div>
                </div>
                {isLowStock && (
                  <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 bg-rose-500/10 pl-2 pr-3 py-1 rounded-lg border border-rose-500/20">
                    <ExclamationTriangleIcon className="h-3.5 w-3.5" /> Reorder Needed
                  </div>
                )}
              </TouchCard>
            );
          })
        )}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-white/10 pt-6 mt-6">
          <p className="text-sm text-gray-500 hidden sm:block">
            Showing <span className="font-medium text-gray-300">{inventoryItems.length}</span> of{' '}
            <span className="font-medium text-gray-300">{total}</span> items
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <TouchButton
              variant="secondary"
              size="md"
              icon={<ChevronLeftIcon className="h-5 w-5" />}
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1 || isLoading}
            >
              Previous
            </TouchButton>
            <span className="text-sm font-medium text-gray-400 mx-2 block sm:hidden">
              Page {page} of {totalPages}
            </span>
            <TouchButton
              variant="secondary"
              size="md"
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages || isLoading}
            >
              Next
              <ChevronRightIcon className="h-5 w-5 ml-1" />
            </TouchButton>
          </div>
        </div>
      )}
    </div>
  );
}
