import { useNavigate } from 'react-router-dom';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import type { InventoryItem } from '../../types';

interface LowStockAlertsProps {
  items: InventoryItem[] | undefined;
  loading: boolean;
}

function SkeletonRow(): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 py-3 px-4 animate-pulse">
      <div className="w-8 h-8 rounded-lg bg-gray-100 flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-4 bg-gray-100 rounded w-32" />
        <div className="h-3 bg-gray-100 rounded w-20" />
      </div>
      <div className="h-5 bg-gray-100 rounded w-16" />
    </div>
  );
}

export function LowStockAlerts({ items, loading }: LowStockAlertsProps): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
        <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0" />
        <h2 className="text-base font-semibold text-gray-900">Low Stock Alerts</h2>
        {!loading && items && items.length > 0 && (
          <span className="ml-auto bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
            {items.length}
          </span>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="divide-y divide-gray-50">
          {[...Array(4)].map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : !items || items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <CheckCircleIcon className="h-10 w-10 text-green-400 mb-3" />
          <p className="text-gray-700 font-medium">All stock levels are healthy</p>
          <p className="text-sm text-gray-400 mt-1">No items below reorder point</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => void navigate('/inventory')}
              className="w-full flex items-center gap-3 py-3 px-4 hover:bg-amber-50 active:bg-amber-100 transition-colors text-left min-h-[56px]"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <ExclamationTriangleIcon className="h-4 w-4 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                <p className="text-xs text-gray-500 truncate">{item.sku}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-amber-600">{item.quantityOnHand}</p>
                <p className="text-xs text-gray-400">min {item.reorderPoint}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
