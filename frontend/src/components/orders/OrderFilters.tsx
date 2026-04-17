import { useState, useCallback } from 'react';
import {
  FunnelIcon,
  XMarkIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { TouchButton } from '../ui/TouchButton';
import { SearchInput } from '../ui/SearchInput';
import { Select } from '../ui/Select';
import type { SelectOption } from '../ui/Select';
import type { OrderStatus, OrderPriority } from '../../types';
import type { OrderListParams } from '../../hooks/useOrders';

// ─── Constants ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: SelectOption[] = [
  { value: '', label: 'All Statuses' },
  { value: 'QUOTE', label: 'Quote' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'MATERIALS_ORDERED', label: 'Materials Ordered' },
  { value: 'MATERIALS_RECEIVED', label: 'Materials Received' },
  { value: 'IN_PRODUCTION', label: 'In Production' },
  { value: 'QUALITY_CHECK', label: 'Quality Check' },
  { value: 'READY_TO_SHIP', label: 'Ready to Ship' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const PRIORITY_OPTIONS: SelectOption[] = [
  { value: '', label: 'All Priorities' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'High' },
  { value: 'RUSH', label: 'Rush' },
];

// ─── Props ─────────────────────────────────────────────────────────────────────

export interface OrderFiltersProps {
  filters: OrderListParams;
  onFiltersChange: (updates: Partial<OrderListParams>) => void;
  onClearAll: () => void;
  isLoading?: boolean;
}

// ─── Active filter count helper ────────────────────────────────────────────────

function countActiveFilters(filters: OrderListParams): number {
  let count = 0;
  if (filters.search) count++;
  if (filters.status) count++;
  if (filters.priority) count++;
  if (filters.dateFrom) count++;
  if (filters.dateTo) count++;
  return count;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function OrderFilters({
  filters,
  onFiltersChange,
  onClearAll,
  isLoading = false,
}: OrderFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const activeCount = countActiveFilters(filters);

  const handleSearch = useCallback(
    (value: string) => onFiltersChange({ search: value, page: 1 }),
    [onFiltersChange]
  );

  const handleStatusChange = useCallback(
    (value: string | number | string[] | number[]) =>
      onFiltersChange({ status: value as OrderStatus | '', page: 1 }),
    [onFiltersChange]
  );

  const handlePriorityChange = useCallback(
    (value: string | number | string[] | number[]) =>
      onFiltersChange({ priority: value as OrderPriority | '', page: 1 }),
    [onFiltersChange]
  );

  const handleDateFromChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      onFiltersChange({ dateFrom: e.target.value, page: 1 }),
    [onFiltersChange]
  );

  const handleDateToChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      onFiltersChange({ dateTo: e.target.value, page: 1 }),
    [onFiltersChange]
  );

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
      {/* ── Top bar: search + expand toggle ── */}
      <div className="flex items-center gap-3 p-4">
        <div className="flex-1 min-w-0">
          <SearchInput
            value={filters.search ?? ''}
            onChange={handleSearch}
            placeholder="Search by order # or customer name…"
            loading={isLoading}
            debounceMs={350}
          />
        </div>

        {/* Active filter badge + expand button */}
        <button
          id="orders-filter-toggle"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
          className={clsx(
            'relative inline-flex items-center gap-2 min-h-[44px] px-4',
            'rounded-xl border font-medium text-sm transition-all duration-200',
            isExpanded || activeCount > 0
              ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
              : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
          )}
        >
          <FunnelIcon className="h-4 w-4 flex-shrink-0" />
          <span className="hidden sm:inline">Filters</span>
          {activeCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
          <ChevronDownIcon
            className={clsx(
              'h-4 w-4 transition-transform duration-200',
              isExpanded && 'rotate-180'
            )}
          />
        </button>

        {/* Clear all — always visible when filters are active */}
        {activeCount > 0 && (
          <TouchButton
            id="orders-clear-filters"
            variant="ghost"
            size="sm"
            icon={<XMarkIcon className="h-4 w-4" />}
            onClick={onClearAll}
            className="text-rose-400 hover:bg-rose-500/10 flex-shrink-0"
          >
            <span className="hidden sm:inline">Clear</span>
          </TouchButton>
        )}
      </div>

      {/* ── Expanded filter panel ── */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="filter-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div className="border-t border-white/10 px-4 pb-4 pt-4">
              {/* Mobile: scrollable row; Desktop: 4-col grid */}
              <div
                className={clsx(
                  'flex gap-3 overflow-x-auto pb-1',
                  'sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0',
                  'lg:grid-cols-4'
                )}
              >
                {/* Status filter */}
                <div className="min-w-[180px] sm:min-w-0">
                  <Select
                    label="Status"
                    options={STATUS_OPTIONS}
                    value={filters.status ?? ''}
                    onChange={handleStatusChange}
                    searchable
                    placeholder="All Statuses"
                  />
                </div>

                {/* Priority filter */}
                <div className="min-w-[160px] sm:min-w-0">
                  <Select
                    label="Priority"
                    options={PRIORITY_OPTIONS}
                    value={filters.priority ?? ''}
                    onChange={handlePriorityChange}
                    placeholder="All Priorities"
                  />
                </div>

                {/* Date From */}
                <div className="min-w-[160px] sm:min-w-0 flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-400">
                    From Date
                  </label>
                  <input
                    id="orders-filter-date-from"
                    type="date"
                    value={filters.dateFrom ?? ''}
                    onChange={handleDateFromChange}
                    max={filters.dateTo ?? undefined}
                    className={clsx(
                      'flex w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-base text-gray-200',
                      'min-h-[44px] transition-colors',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                      'hover:border-white/20'
                    )}
                  />
                </div>

                {/* Date To */}
                <div className="min-w-[160px] sm:min-w-0 flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-400">
                    To Date
                  </label>
                  <input
                    id="orders-filter-date-to"
                    type="date"
                    value={filters.dateTo ?? ''}
                    onChange={handleDateToChange}
                    min={filters.dateFrom ?? undefined}
                    className={clsx(
                      'flex w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-base text-gray-200',
                      'min-h-[44px] transition-colors',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                      'hover:border-white/20'
                    )}
                  />
                </div>
              </div>

              {/* Active filter chips */}
              {activeCount > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {filters.search && (
                    <FilterChip
                      label={`Search: "${filters.search}"`}
                      onRemove={() => onFiltersChange({ search: '', page: 1 })}
                    />
                  )}
                  {filters.status && (
                    <FilterChip
                      label={`Status: ${filters.status.replace(/_/g, ' ')}`}
                      onRemove={() => onFiltersChange({ status: '', page: 1 })}
                    />
                  )}
                  {filters.priority && (
                    <FilterChip
                      label={`Priority: ${filters.priority}`}
                      onRemove={() => onFiltersChange({ priority: '', page: 1 })}
                    />
                  )}
                  {filters.dateFrom && (
                    <FilterChip
                      label={`From: ${filters.dateFrom}`}
                      onRemove={() => onFiltersChange({ dateFrom: '', page: 1 })}
                    />
                  )}
                  {filters.dateTo && (
                    <FilterChip
                      label={`To: ${filters.dateTo}`}
                      onRemove={() => onFiltersChange({ dateTo: '', page: 1 })}
                    />
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── FilterChip ────────────────────────────────────────────────────────────────

interface FilterChipProps {
  label: string;
  onRemove: () => void;
}

function FilterChip({ label, onRemove }: FilterChipProps) {
  return (
    <span className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full bg-blue-500/20 text-blue-300 text-sm font-medium border border-blue-500/30">
      {label}
      <button
        onClick={onRemove}
        className="flex items-center justify-center h-4 w-4 rounded-full hover:bg-blue-500/40 transition-colors"
        aria-label={`Remove filter: ${label}`}
      >
        <XMarkIcon className="h-3 w-3" />
      </button>
    </span>
  );
}
