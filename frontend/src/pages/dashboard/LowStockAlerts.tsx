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
      <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 rounded-lg w-32" style={{ background: 'rgba(255,255,255,0.07)' }} />
        <div className="h-3 rounded-lg w-20" style={{ background: 'rgba(255,255,255,0.05)' }} />
      </div>
      <div className="h-5 rounded-lg w-12" style={{ background: 'rgba(255,255,255,0.07)' }} />
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  background: 'linear-gradient(160deg, rgba(12,12,24,0.85) 0%, rgba(6,6,16,0.90) 100%)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderTopColor: 'rgba(255,255,255,0.12)',
  backdropFilter: 'blur(28px) saturate(1.9)',
  WebkitBackdropFilter: 'blur(28px) saturate(1.9)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 40px rgba(0,0,0,0.55), 0 0 0 0.5px rgba(255,255,255,0.03)',
};

export function LowStockAlerts({ items, loading }: LowStockAlertsProps): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="rounded-2xl overflow-hidden" style={panelStyle}>
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-5 py-4 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.025)' }}
      >
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: 'rgba(251,191,36,0.10)',
            border: '1px solid rgba(251,191,36,0.22)',
            boxShadow: '0 0 10px rgba(251,191,36,0.08)',
          }}
        >
          <ExclamationTriangleIcon className="h-3.5 w-3.5 text-amber-400" />
        </div>
        <h2
          className="text-[13px] font-bold tracking-tight flex-1"
          style={{
            background: 'linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Low Stock Alerts
        </h2>
        {!loading && items && items.length > 0 && (
          <span
            className="text-[11px] font-bold text-amber-400 px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(251,191,36,0.10)',
              border: '1px solid rgba(251,191,36,0.22)',
            }}
          >
            {items.length}
          </span>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
          {[...Array(4)].map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : !items || items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}
          >
            <CheckCircleIcon className="h-6 w-6 text-emerald-500" />
          </div>
          <p className="text-[13px] font-semibold text-gray-400">All stock levels healthy</p>
          <p className="text-[12px] text-gray-600 mt-1">No items below reorder point</p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
          {items.map((item, i) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => void navigate('/inventory')}
              className="w-full flex items-center gap-3 py-3.5 px-5 text-left min-h-[56px] transition-colors duration-100"
              style={{ background: 'transparent' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <div
                className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: 'rgba(251,191,36,0.08)',
                  border: '1px solid rgba(251,191,36,0.2)',
                  boxShadow: '0 0 10px rgba(251,191,36,0.06)',
                }}
              >
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
