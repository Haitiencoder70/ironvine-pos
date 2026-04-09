import { useNavigate } from 'react-router-dom';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import {
  EyeIcon,
  CalendarDaysIcon,
  CubeIcon,
  CurrencyDollarIcon,
  UserIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import { clsx } from 'clsx';
import { StatusBadge } from '../ui/StatusBadge';
import { TouchButton } from '../ui/TouchButton';
import { TouchCard } from '../ui/TouchCard';
import type { Order, OrderPriority } from '../../types';

// ─── Constants ─────────────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<OrderPriority, string> = {
  NORMAL: 'bg-gray-100 text-gray-700',
  HIGH: 'bg-amber-100 text-amber-800',
  RUSH: 'bg-red-100 text-red-800',
};

const PRIORITY_LABELS: Record<OrderPriority, string> = {
  NORMAL: 'Normal',
  HIGH: 'High',
  RUSH: '🔥 Rush',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDueDate(dateStr: string | undefined): {
  label: string;
  urgent: boolean;
  overdue: boolean;
} {
  if (!dateStr) return { label: '—', urgent: false, overdue: false };

  const date = new Date(dateStr);
  const overdue = isPast(date) && !isToday(date);
  const urgent = isToday(date) || isTomorrow(date);

  let label: string;
  if (isToday(date)) label = 'Today';
  else if (isTomorrow(date)) label = 'Tomorrow';
  else if (overdue) label = `Overdue (${format(date, 'MMM d')})`;
  else label = format(date, 'MMM d, yyyy');

  return { label, urgent, overdue };
}

// ─── Props ─────────────────────────────────────────────────────────────────────

export interface OrderRowProps {
  order: Order;
}

// ─── Desktop Table Row ─────────────────────────────────────────────────────────

export function OrderTableRow({ order }: OrderRowProps) {
  const navigate = useNavigate();
  const dueDate = formatDueDate(order.dueDate);
  const priority = order.priority as OrderPriority;

  const handleView = () => navigate(`/orders/${order.id}`);

  return (
    <tr
      onClick={handleView}
      className="group cursor-pointer hover:bg-blue-50/40 active:bg-blue-100/40 transition-colors"
      role="row"
    >
      {/* Order Number */}
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="font-semibold text-blue-600 group-hover:text-blue-700 text-sm">
          {order.orderNumber}
        </span>
      </td>

      {/* Customer */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            <UserIcon className="h-4 w-4 text-gray-500" />
          </div>
          <span className="text-sm text-gray-900 truncate max-w-[180px]">
            {order.customer
              ? `${order.customer.firstName} ${order.customer.lastName}`
              : '—'}
            {order.customer?.company && (
              <span className="block text-xs text-gray-400 truncate">
                {order.customer.company}
              </span>
            )}
          </span>
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3 whitespace-nowrap">
        <StatusBadge status={order.status} size="sm" />
      </td>

      {/* Priority */}
      <td className="px-4 py-3 whitespace-nowrap">
        <span
          className={clsx(
            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold',
            PRIORITY_STYLES[priority]
          )}
        >
          {PRIORITY_LABELS[priority]}
        </span>
      </td>

      {/* Items count */}
      <td className="px-4 py-3 whitespace-nowrap text-center">
        <span className="inline-flex items-center gap-1 text-sm text-gray-600">
          <CubeIcon className="h-4 w-4 text-gray-400" />
          {order.items.length}
        </span>
      </td>

      {/* Total */}
      <td className="px-4 py-3 whitespace-nowrap text-right">
        <span className="font-semibold text-gray-900 text-sm">
          {formatCurrency(order.total)}
        </span>
      </td>

      {/* Due Date */}
      <td className="px-4 py-3 whitespace-nowrap">
        <span
          className={clsx(
            'inline-flex items-center gap-1 text-sm',
            dueDate.overdue && 'text-red-600 font-semibold',
            dueDate.urgent && !dueDate.overdue && 'text-amber-600 font-medium',
            !dueDate.overdue && !dueDate.urgent && 'text-gray-600'
          )}
        >
          {(dueDate.overdue || dueDate.urgent) && (
            <ExclamationTriangleIcon className="h-3.5 w-3.5 flex-shrink-0" />
          )}
          {dueDate.label}
        </span>
      </td>

      {/* Created Date */}
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">
        {format(new Date(order.createdAt), 'MMM d')}
      </td>

      {/* Actions */}
      <td
        className="px-4 py-3 whitespace-nowrap text-right"
        onClick={(e) => e.stopPropagation()}
      >
        <TouchButton
          id={`order-view-${order.id}`}
          variant="ghost"
          size="sm"
          icon={<EyeIcon className="h-4 w-4" />}
          onClick={handleView}
          className="text-blue-600 hover:bg-blue-50"
        >
          View
        </TouchButton>
      </td>
    </tr>
  );
}

// ─── Mobile Card ───────────────────────────────────────────────────────────────

export function OrderMobileCard({ order }: OrderRowProps) {
  const navigate = useNavigate();
  const dueDate = formatDueDate(order.dueDate);
  const priority = order.priority as OrderPriority;

  return (
    <TouchCard
      interactive
      padding="sm"
      onClick={() => navigate(`/orders/${order.id}`)}
      className="border border-gray-100"
    >
      {/* Top row: order number + total */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-bold text-blue-600 text-base">{order.orderNumber}</p>
          <p className="text-sm text-gray-600 mt-0.5">
            {order.customer
              ? `${order.customer.firstName} ${order.customer.lastName}`
              : 'Unknown Customer'}
          </p>
          {order.customer?.company && (
            <p className="text-xs text-gray-400">{order.customer.company}</p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-bold text-gray-900">{formatCurrency(order.total)}</p>
          <span
            className={clsx(
              'inline-flex items-center mt-0.5 px-2 py-0.5 rounded-full text-xs font-semibold',
              PRIORITY_STYLES[priority]
            )}
          >
            {PRIORITY_LABELS[priority]}
          </span>
        </div>
      </div>

      {/* Status badge */}
      <div className="mb-3">
        <StatusBadge status={order.status} size="sm" />
      </div>

      {/* Meta row */}
      <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-100 pt-3">
        <span className="flex items-center gap-1">
          <CubeIcon className="h-3.5 w-3.5" />
          {order.items.length} item{order.items.length !== 1 ? 's' : ''}
        </span>

        {order.dueDate && (
          <span
            className={clsx(
              'flex items-center gap-1',
              dueDate.overdue && 'text-red-500 font-medium',
              dueDate.urgent && !dueDate.overdue && 'text-amber-500 font-medium'
            )}
          >
            <CalendarDaysIcon className="h-3.5 w-3.5" />
            Due {dueDate.label}
          </span>
        )}

        <span className="flex items-center gap-1">
          <ClockIcon className="h-3.5 w-3.5" />
          {format(new Date(order.createdAt), 'MMM d')}
        </span>
      </div>
    </TouchCard>
  );
}

// ─── Skeleton Loaders ─────────────────────────────────────────────────────────

export function OrderTableRowSkeleton() {
  return (
    <tr className="animate-pulse">
      {[140, 180, 100, 80, 60, 80, 100, 70, 60].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div
            className="h-4 bg-gray-100 rounded"
            style={{ width: `${w}px` }}
          />
        </td>
      ))}
    </tr>
  );
}

export function OrderMobileCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 animate-pulse space-y-3">
      <div className="flex justify-between">
        <div className="space-y-2">
          <div className="h-4 w-28 bg-gray-100 rounded" />
          <div className="h-3 w-36 bg-gray-100 rounded" />
        </div>
        <div className="space-y-2 text-right">
          <div className="h-4 w-16 bg-gray-100 rounded ml-auto" />
          <div className="h-3 w-12 bg-gray-100 rounded ml-auto" />
        </div>
      </div>
      <div className="h-5 w-24 bg-gray-100 rounded-full" />
      <div className="flex justify-between pt-2 border-t border-gray-100">
        <div className="h-3 w-16 bg-gray-100 rounded" />
        <div className="h-3 w-20 bg-gray-100 rounded" />
        <div className="h-3 w-14 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

// Re-export currency helper for use in the list page
export { formatCurrency, CurrencyDollarIcon };
