import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeftIcon,
  PencilSquareIcon,
  ExclamationCircleIcon,
  CubeIcon,
  ClockIcon,
  TagIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import type { JSX } from 'react';
import { TouchButton } from '../../components/ui/TouchButton';
import { TouchCard } from '../../components/ui/TouchCard';
import { StockAdjustmentModal } from '../../components/inventory/StockAdjustmentModal';
import { StockMovementHistory } from '../../components/inventory/StockMovementHistory';
import { useInventoryItem } from '../../hooks/useInventory';
import type { InventoryCategory } from '../../types';

// ─── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<InventoryCategory, string> = {
  BLANK_SHIRTS: 'Blank Garments',
  DTF_TRANSFERS: 'DTF Transfers',
  VINYL: 'HTV Vinyl',
  INK: 'Ink',
  PACKAGING: 'Packaging',
  EMBROIDERY_THREAD: 'Embroidery Thread',
  OTHER: 'Other/Supplies',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function InventoryDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [showAdjustModal, setShowAdjustModal] = useState(false);

  const { data, isLoading, isError, refetch } = useInventoryItem(id ?? '');
  const item = data?.data;

  // ── Skeleton ──
  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto animate-pulse space-y-6">
        <div className="h-8 w-48 bg-gray-100 rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="h-64 bg-gray-100 rounded-2xl" />
            <div className="h-48 bg-gray-100 rounded-2xl" />
          </div>
          <div className="lg:col-span-2">
            <div className="h-96 bg-gray-100 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (isError || !item) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center mt-16">
        <ExclamationCircleIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Item not found</h2>
        <p className="text-sm text-gray-500 mb-6">
          This inventory item may have been deleted or you may not have access.
        </p>
        <div className="flex gap-3 justify-center">
          <TouchButton variant="secondary" size="md" onClick={() => void refetch()}>
            Retry
          </TouchButton>
          <TouchButton variant="primary" size="md" onClick={() => navigate('/inventory')}>
            Back to Inventory
          </TouchButton>
        </div>
      </div>
    );
  }

  const isLowStock = item.quantityAvailable <= item.reorderPoint;

  return (
    <>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              onClick={() => navigate('/inventory')}
              className="mt-1 flex-shrink-0 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 min-h-[44px] -ml-2 px-2 rounded-xl transition-colors hover:bg-gray-100"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              Back
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{item.name}</h1>
              <p className="text-sm text-gray-500 font-mono mt-0.5">{item.sku}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <TouchButton
              variant="secondary"
              size="md"
              icon={<PencilSquareIcon className="h-5 w-5" />}
              onClick={() => navigate(`/inventory/${item.id}/edit`)}
            >
              Edit Item
            </TouchButton>
            <TouchButton
              variant="primary"
              size="md"
              onClick={() => setShowAdjustModal(true)}
            >
              Adjust Stock
            </TouchButton>
          </div>
        </div>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Details */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Status Card */}
            <TouchCard padding="md" className="border border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <CubeIcon className="h-4 w-4 text-gray-500" />
                Current Stock
              </h2>
              
              <div className="space-y-4 relative">
                <div className="flex items-end justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Available</span>
                  <span className={clsx('text-4xl font-bold', isLowStock ? 'text-red-600' : 'text-gray-900')}>
                    {item.quantityAvailable}
                  </span>
                </div>

                <div className="border-t border-gray-100 pt-3 flex justify-between items-center text-sm">
                  <span className="text-gray-500">Reserved</span>
                  <span className="font-medium text-gray-900">{item.quantityReserved}</span>
                </div>
                <div className="flex justify-between items-center text-sm bg-gray-50 -mx-4 px-4 py-2 border-y border-gray-100">
                  <span className="text-gray-500">Total On Hand</span>
                  <span className="font-bold text-gray-900">{item.quantityOnHand}</span>
                </div>

                <div className="pt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500 font-medium">Reorder Point</span>
                    <span className="text-gray-900 font-medium">{item.reorderPoint}</span>
                  </div>
                  {/* Visual gauge */}
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden relative">
                    {/* Reorder line marker */}
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-gray-400 z-10" 
                      style={{ left: `${Math.min(100, Math.max(5, (item.reorderPoint / Math.max(item.quantityOnHand, item.reorderPoint * 2)) * 100))}%` }} 
                    />
                    <div 
                      className={clsx('h-full transition-all', isLowStock ? 'bg-red-500' : 'bg-blue-500')}
                      style={{ width: `${Math.min(100, (item.quantityAvailable / Math.max(item.quantityOnHand, item.reorderPoint * 2)) * 100)}%` }}
                    />
                  </div>
                  {isLowStock && (
                    <p className="text-xs text-red-600 font-medium mt-1.5 flex items-center gap-1">
                      <ExclamationCircleIcon className="h-3.5 w-3.5" /> Below reorder point
                    </p>
                  )}
                </div>
              </div>
            </TouchCard>

            {/* Config Card */}
            <TouchCard padding="md" className="border border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <TagIcon className="h-4 w-4 text-gray-500" />
                Item Configuration
              </h2>
              
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Category</dt>
                  <dd className="font-medium text-gray-900">{CATEGORY_LABELS[item.category]}</dd>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-3">
                  <dt className="text-gray-500">Brand</dt>
                  <dd className="font-medium text-gray-900">{item.brand || '—'}</dd>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-3">
                  <dt className="text-gray-500">Size / Color</dt>
                  <dd className="font-medium text-gray-900">
                    {[item.size, item.color].filter(Boolean).join(' · ') || '—'}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-3 items-center">
                  <dt className="text-gray-500 flex flex-col">
                    <span>Reorder Qty</span>
                    <span className="text-[10px]">Amount to buy</span>
                  </dt>
                  <dd className="font-bold text-gray-900">{item.reorderQuantity}</dd>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-3 bg-gray-50 -mx-4 px-4 py-2">
                  <dt className="text-gray-500">Unit Cost</dt>
                  <dd className="font-mono text-gray-900 font-semibold">{fmt(item.costPrice)}</dd>
                </div>
              </dl>
            </TouchCard>

            {item.notes && (
              <TouchCard padding="md" className="border border-gray-200 bg-amber-50">
                <h2 className="text-sm font-semibold text-amber-900 flex items-center gap-2 mb-2">
                  <ClipboardDocumentListIcon className="h-4 w-4 text-amber-700" />
                  Notes
                </h2>
                <p className="text-sm text-amber-800 whitespace-pre-wrap">{item.notes}</p>
              </TouchCard>
            )}

          </div>

          {/* Right Column: History */}
          <div className="lg:col-span-2">
            <TouchCard padding="md" className="border border-gray-200">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <ClockIcon className="h-5 w-5 text-gray-500" />
                Movement History
              </h2>
              
              <StockMovementHistory inventoryItemId={item.id} />
            </TouchCard>
          </div>

        </div>
      </div>

      <StockAdjustmentModal
        open={showAdjustModal}
        onClose={() => setShowAdjustModal(false)}
        item={item}
      />
    </>
  );
}
