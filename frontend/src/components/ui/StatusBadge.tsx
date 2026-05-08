import { forwardRef, HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { OrderStatus, PurchaseOrderStatus, ShipmentStatus } from '../../types';

export type BadgeSize = 'sm' | 'md' | 'lg';

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status: OrderStatus | PurchaseOrderStatus | ShipmentStatus | string;
  size?: BadgeSize;
}

const colorMap: Record<string, string> = {
  // Common
  PENDING: 'bg-yellow-500/15 text-yellow-300',
  CANCELLED: 'bg-red-500/15 text-red-300',
  COMPLETED: 'bg-green-500/15 text-green-300',
  DELIVERED: 'bg-green-500/15 text-green-300',

  // Order Statuses
  QUOTE: 'bg-slate-500/15 text-slate-300',
  PENDING_APPROVAL: 'bg-yellow-500/15 text-yellow-300',
  APPROVED: 'bg-blue-500/15 text-blue-300',
  ON_HOLD: 'bg-orange-500/15 text-orange-300',
  MATERIALS_ORDERED: 'bg-indigo-500/15 text-indigo-300',
  MATERIALS_RECEIVED: 'bg-teal-500/15 text-teal-300',
  IN_PRODUCTION: 'bg-purple-500/15 text-purple-300',
  QUALITY_CHECK: 'bg-orange-500/15 text-orange-300',
  READY_TO_SHIP: 'bg-emerald-500/15 text-emerald-300',
  SHIPPED: 'bg-cyan-500/15 text-cyan-300',

  // PO Statuses
  DRAFT: 'bg-slate-500/15 text-slate-300',
  SENT: 'bg-blue-500/15 text-blue-300',
  PARTIALLY_RECEIVED: 'bg-yellow-500/15 text-yellow-300',
  RECEIVED: 'bg-green-500/15 text-green-300',

  // Shipment Statuses
  LABEL_CREATED: 'bg-slate-500/15 text-slate-300',
  IN_TRANSIT: 'bg-blue-500/15 text-blue-300',
  OUT_FOR_DELIVERY: 'bg-purple-500/15 text-purple-300',
  EXCEPTION: 'bg-red-500/15 text-red-300',
};

const defaultColor = 'bg-slate-500/15 text-slate-300';

const sizeMap: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

export const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, size = 'md', className, ...props }, ref) => {
    // Normalize string to match keys
    const normalizedStatus = status?.toString().replace(/\s+/g, '_').toUpperCase() || '';
    const colorClass = colorMap[normalizedStatus] || defaultColor;

    // Convert Enum to readable text
    const displayText = normalizedStatus.replace(/_/g, ' ');

    return (
      <span
        ref={ref}
        className={twMerge(
          clsx(
            'inline-flex items-center font-medium rounded-full',
            sizeMap[size],
            colorClass,
            className
          )
        )}
        {...props}
      >
        {displayText}
      </span>
    );
  }
);

StatusBadge.displayName = 'StatusBadge';
