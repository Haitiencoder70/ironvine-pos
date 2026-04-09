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
  PENDING: 'bg-yellow-100 text-yellow-800',
  CANCELLED: 'bg-red-100 text-red-800',
  COMPLETED: 'bg-green-100 text-green-800',
  DELIVERED: 'bg-green-100 text-green-800',
  
  // Order Statuses
  QUOTE: 'bg-gray-100 text-gray-800',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  ON_HOLD: 'bg-orange-100 text-orange-800',
  MATERIALS_ORDERED: 'bg-indigo-100 text-indigo-800',
  MATERIALS_RECEIVED: 'bg-teal-100 text-teal-800',
  IN_PRODUCTION: 'bg-purple-100 text-purple-800',
  QUALITY_CHECK: 'bg-orange-100 text-orange-800',
  READY_TO_SHIP: 'bg-emerald-100 text-emerald-800',
  SHIPPED: 'bg-cyan-100 text-cyan-800',
  
  // PO Statuses
  DRAFT: 'bg-gray-100 text-gray-800',
  SENT: 'bg-blue-100 text-blue-800',
  PARTIALLY_RECEIVED: 'bg-yellow-100 text-yellow-800',
  RECEIVED: 'bg-green-100 text-green-800',
  
  // Shipment Statuses
  LABEL_CREATED: 'bg-gray-100 text-gray-800',
  IN_TRANSIT: 'bg-blue-100 text-blue-800',
  OUT_FOR_DELIVERY: 'bg-purple-100 text-purple-800',
  EXCEPTION: 'bg-red-100 text-red-800',
};

const defaultColor = 'bg-gray-100 text-gray-800';

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
