import { useNavigate, Link } from 'react-router-dom';
import { ClipboardDocumentListIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { StatusBadge } from '../../components/ui/StatusBadge';
import type { Order } from '../../types';

interface RecentOrdersProps {
  orders: Order[] | undefined;
  loading: boolean;
}

function SkeletonRow(): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 py-3.5 px-5 animate-pulse">
      <div className="flex-1 space-y-1.5">
        <div className="skeleton h-3.5 rounded-lg w-24" />
        <div className="skeleton h-3 rounded-lg w-32" />
      </div>
      <div className="skeleton h-5 rounded-full w-20" />
      <div className="skeleton h-3 rounded-lg w-14 hidden sm:block" />
    </div>
  );
}

export function RecentOrders({ orders, loading }: RecentOrdersProps): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="dashboard-panel rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="dashboard-panel-header flex items-center justify-between px-5 py-4">
        <h2 className="heading-gradient text-[13px] font-bold tracking-tight">
          Recent Orders
        </h2>
        <Link
          to="/orders"
          className="flex items-center gap-1 text-[12px] font-semibold text-blue-400 hover:text-blue-300 transition-colors min-h-[44px] px-2"
        >
          View All
          <ArrowRightIcon className="h-3 w-3" />
        </Link>
      </div>

      {/* Content */}
      {loading ? (
        <div className="divide-y dashboard-divider">
          {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : !orders || orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="glass w-12 h-12 rounded-xl flex items-center justify-center mb-3">
            <ClipboardDocumentListIcon className="h-6 w-6 text-gray-600" />
          </div>
          <p className="text-[13px] font-semibold text-gray-400">No orders yet today</p>
          <p className="text-[12px] text-gray-600 mt-1">Orders will appear here as they come in</p>
        </div>
      ) : (
        <div className="divide-y dashboard-divider">
          {orders.slice(0, 10).map((order, i) => {
            const customerName = order.customer
              ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
              : 'Unknown Customer';
            const relativeTime = formatDistanceToNow(new Date(order.createdAt), { addSuffix: true });

            return (
              <motion.button
                key={order.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => void navigate(`/orders/${order.id}`)}
                className="dashboard-row-hover w-full flex items-center gap-3 py-3.5 px-5 text-left min-h-[56px] group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-gray-300 truncate tracking-tight">{order.orderNumber}</p>
                  <p className="text-[11.5px] text-gray-600 truncate mt-0.5">{customerName}</p>
                </div>
                <StatusBadge status={order.status} size="sm" />
                <p className="text-[11px] text-gray-700 whitespace-nowrap flex-shrink-0 hidden sm:block">
                  {relativeTime}
                </p>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
