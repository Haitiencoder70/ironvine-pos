import { useState } from 'react';
import { ClockIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { useSaleHistory } from '../../hooks/usePOS';
import { SkeletonLoader, EmptyState } from '../../components/ui';

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  SPLIT: 'Split',
};

const PAYMENT_COLORS: Record<string, string> = {
  CASH: 'bg-green-50 text-green-700',
  CARD: 'bg-blue-50 text-blue-700',
  SPLIT: 'bg-purple-50 text-purple-700',
};

export function SaleHistory(): React.JSX.Element {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useSaleHistory(page);

  const sales = data?.data.data ?? [];
  const total = data?.data.total ?? 0;
  const totalPages = data?.data.totalPages ?? 1;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Sale History</h1>
        <span className="text-sm text-gray-500">{total} sales total</span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonLoader key={i} lines={2} />
          ))}
        </div>
      ) : sales.length === 0 ? (
        <EmptyState
          icon={<ClockIcon className="h-12 w-12 text-gray-300" />}
          title="No sales yet"
          description="Completed POS sales will appear here"
        />
      ) : (
        <div className="space-y-3">
          {sales.map((sale) => (
            <div
              key={sale.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-4 flex items-center gap-4"
            >
              {/* Order info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-bold text-gray-900">
                    {sale.orderNumber}
                  </span>
                  <span
                    className={clsx(
                      'text-xs px-2 py-0.5 rounded-full font-medium',
                      PAYMENT_COLORS[sale.paymentMethod] ?? 'bg-gray-100 text-gray-600',
                    )}
                  >
                    {PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(sale.createdAt).toLocaleString()} &middot;{' '}
                  {sale.orderItems.length} {sale.orderItems.length === 1 ? 'item' : 'items'}
                </p>
              </div>

              {/* Total */}
              <span className="text-lg font-bold text-gray-900 flex-shrink-0">
                ${sale.total.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className={clsx(
              'flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium min-h-[44px] transition-colors',
              page === 1
                ? 'opacity-40 cursor-not-allowed text-gray-400'
                : 'text-gray-700 hover:bg-gray-50',
            )}
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className={clsx(
              'flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium min-h-[44px] transition-colors',
              page === totalPages
                ? 'opacity-40 cursor-not-allowed text-gray-400'
                : 'text-gray-700 hover:bg-gray-50',
            )}
          >
            Next
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
