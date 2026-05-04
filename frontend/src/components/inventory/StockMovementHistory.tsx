import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  AdjustmentsHorizontalIcon,
  LockClosedIcon,
  LockOpenIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { useStockMovements } from '../../hooks/useInventory';
import type { StockMovement } from '../../types';

// ─── Constants ─────────────────────────────────────────────────────────────────

const MOVEMENT_ICONS: Record<StockMovement['type'], React.ReactNode> = {
  IN: <ArrowDownRightIcon className="h-4 w-4 text-green-600" />,
  OUT: <ArrowUpRightIcon className="h-4 w-4 text-red-600" />,
  ADJUSTMENT: <AdjustmentsHorizontalIcon className="h-4 w-4 text-orange-600" />,
  RESERVED: <LockClosedIcon className="h-4 w-4 text-gray-600" />,
  UNRESERVED: <LockOpenIcon className="h-4 w-4 text-blue-600" />,
};

const MOVEMENT_STYLES: Record<StockMovement['type'], string> = {
  IN: 'bg-green-50 text-green-700 border-green-200',
  OUT: 'bg-red-50 text-red-700 border-red-200',
  ADJUSTMENT: 'bg-orange-50 text-orange-700 border-orange-200',
  RESERVED: 'bg-gray-100 text-gray-700 border-gray-200',
  UNRESERVED: 'bg-blue-50 text-blue-700 border-blue-200',
};

// ─── Component ─────────────────────────────────────────────────────────────────

export interface StockMovementHistoryProps {
  inventoryItemId: string;
}

export function StockMovementHistory({ inventoryItemId }: StockMovementHistoryProps) {
  const [filterType, setFilterType] = useState<StockMovement['type'] | 'ALL'>('ALL');

  const { data, isLoading, isError } = useStockMovements(inventoryItemId);
  const movementPayload = data?.data;
  const movements: StockMovement[] = Array.isArray(movementPayload)
    ? movementPayload as StockMovement[]
    : movementPayload?.data ?? [];

  const filteredMovements = useMemo(() => {
    if (filterType === 'ALL') return movements;
    return movements.filter((m) => m.type === filterType);
  }, [movements, filterType]);

  return (
    <div className="space-y-4">
      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-2">
        <label className="sr-only">Filter by type</label>
        <div className="relative inline-flex items-center">
          <FunnelIcon className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as StockMovement['type'] | 'ALL')}
            className="pl-9 pr-10 py-1.5 min-h-[44px] rounded-xl border border-gray-300 bg-white text-sm shadow-sm hover:border-gray-400 focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
          >
            <option value="ALL">All Movements</option>
            <option value="IN">Received (IN)</option>
            <option value="OUT">Used (OUT)</option>
            <option value="ADJUSTMENT">Adjustments</option>
            <option value="RESERVED">Reserved</option>
            <option value="UNRESERVED">Unreserved</option>
          </select>
        </div>
      </div>

      {/* ── Desktop List ── */}
      <div className="hidden md:block rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Type</th>
                <th className="px-5 py-3 font-semibold text-right">Quantity</th>
                <th className="px-5 py-3 font-semibold">Reason</th>
                <th className="px-5 py-3 font-semibold">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse flex-1 h-[44px] bg-gray-50 m-2 rounded-xl" />
                ))
              ) : isError || filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-500">
                    No movement history found.
                  </td>
                </tr>
              ) : (
                filteredMovements.map((mov) => {
                  return (
                    <tr key={mov.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-gray-600">
                        {format(new Date(mov.createdAt), 'MMM d, yyyy h:mm a')}
                      </td>
                      <td className="px-5 py-3">
                        <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border', MOVEMENT_STYLES[mov.type])}>
                          {MOVEMENT_ICONS[mov.type]}
                          {mov.type}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-gray-900">
                        {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity}
                      </td>
                      <td className="px-5 py-3 text-gray-600 truncate max-w-[200px]" title={mov.reason}>
                        {mov.reason}
                      </td>
                      <td className="px-5 py-3">
                        {mov.referenceId ? (
                          <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600">
                            {mov.referenceType}: {mov.referenceId.slice(0, 8)}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Mobile View ── */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <div className="h-[200px] animate-pulse bg-gray-100 rounded-2xl" />
        ) : isError || filteredMovements.length === 0 ? (
          <div className="p-6 text-center bg-gray-50 rounded-2xl border border-gray-100 text-gray-500 text-sm">
            No history found.
          </div>
        ) : (
          filteredMovements.map((mov) => (
            <div key={mov.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border', MOVEMENT_STYLES[mov.type])}>
                  {MOVEMENT_ICONS[mov.type]}
                  {mov.type}
                </span>
                <span className="font-medium text-gray-900 text-lg">
                  {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity}
                </span>
              </div>
              <div className="flex flex-col gap-0.5 mt-1">
                <span className="text-sm font-medium text-gray-800">{mov.reason}</span>
                <span className="text-xs text-gray-500">
                  {format(new Date(mov.createdAt), 'MMM d, yyyy h:mm a')}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
