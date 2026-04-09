import { useNavigate, Link } from 'react-router-dom';
import { ClipboardDocumentListIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { StatusBadge } from '../../components/ui/StatusBadge';
import type { Order } from '../../types';

interface RecentOrdersProps {
  orders: Order[] | undefined;
  loading: boolean;
}

function SkeletonRow(): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 py-3 px-4 animate-pulse">
      <div className="flex-1 space-y-1.5">
        <div className="h-4 bg-gray-100 rounded w-24" />
        <div className="h-3 bg-gray-100 rounded w-32" />
      </div>
      <div className="h-6 bg-gray-100 rounded-full w-20" />
      <div className="h-3 bg-gray-100 rounded w-16" />
    </div>
  );
}

export function RecentOrders({ orders, loading }: RecentOrdersProps): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">Recent Orders</h2>
        <Link
          to="/orders"
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors min-h-[44px] px-2"
        >
          View All
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Content */}
      {loading ? (
        <div className="divide-y divide-gray-50">
          {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : !orders || orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <ClipboardDocumentListIcon className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No orders yet today</p>
          <p className="text-sm text-gray-400 mt-1">Orders will appear here as they come in</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {orders.slice(0, 10).map((order) => {
            const customerName = order.customer
              ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
              : 'Unknown Customer';
            const relativeTime = formatDistanceToNow(new Date(order.createdAt), { addSuffix: true });

            return (
              <button
                key={order.id}
                onClick={() => void navigate(`/orders/${order.id}`)}
                className="w-full flex items-center gap-3 py-3 px-4 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left min-h-[56px]"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{order.orderNumber}</p>
                  <p className="text-xs text-gray-500 truncate">{customerName}</p>
                </div>
                <StatusBadge status={order.status} size="sm" />
                <p className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0 hidden sm:block">
                  {relativeTime}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
