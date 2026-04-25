import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
    <div className="flex items-center gap-3 py-3.5 px-5 animate-pulse">
      <div className="skeleton w-8 h-8 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="skeleton h-3.5 rounded-lg w-32" />
        <div className="skeleton h-3 rounded-lg w-20" />
      </div>
      <div className="skeleton h-5 rounded-lg w-12" />
    </div>
  );
}

export function LowStockAlerts({ items, loading }: LowStockAlertsProps): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="dashboard-panel rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="dashboard-panel-header flex items-center gap-2.5 px-5 py-4">
        <div className="icon-amber w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0">
          <ExclamationTriangleIcon className="h-3.5 w-3.5 text-amber-400" />
        </div>
        <h2 className="heading-gradient text-[13px] font-bold tracking-tight flex-1">
          Low Stock Alerts
        </h2>
        {!loading && items && items.length > 0 && (
          <span className="icon-amber text-[11px] font-bold text-amber-400 px-2 py-0.5 rounded-full">
            {items.length}
          </span>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="divide-y dashboard-divider">
          {[...Array(4)].map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : !items || items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="icon-emerald w-12 h-12 rounded-xl flex items-center justify-center mb-3">
            <CheckCircleIcon className="h-6 w-6 text-emerald-500" />
          </div>
          <p className="text-[13px] font-semibold text-gray-400">All stock levels healthy</p>
          <p className="text-[12px] text-gray-600 mt-1">No items below reorder point</p>
        </div>
      ) : (
        <div className="divide-y dashboard-divider">
          {items.map((item, i) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => void navigate('/inventory')}
              className="dashboard-row-hover w-full flex items-center gap-3 py-3.5 px-5 text-left min-h-[56px]"
            >
              <div className="icon-amber flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center">
                <ExclamationTriangleIcon className="h-3.5 w-3.5 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-gray-300 truncate tracking-tight">{item.name}</p>
                <p className="text-[11.5px] text-gray-600 truncate mt-0.5">{item.sku}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[13px] font-bold text-amber-400">{item.quantityOnHand}</p>
                <p className="text-[11px] text-gray-600">min {item.reorderPoint}</p>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
