import { OrderStatus } from '../types';

export const ORDER_STATUSES: Record<OrderStatus, { label: string; description: string }> = {
  QUOTE: { label: 'Quote', description: 'Pending customer approval' },
  PENDING_APPROVAL: { label: 'Pending Approval', description: 'Awaiting customer signature/payment' },
  APPROVED: { label: 'Approved', description: 'Order officially confirmed' },
  MATERIALS_ORDERED: { label: 'Materials Ordered', description: 'Purchased blanks from vendor' },
  MATERIALS_RECEIVED: { label: 'Materials Received', description: 'Blanks in-house ready for production' },
  IN_PRODUCTION: { label: 'In Production', description: 'Actively printing/pressing' },
  QUALITY_CHECK: { label: 'Quality Check', description: 'Inspecting final garments' },
  READY_TO_SHIP: { label: 'Ready to Ship', description: 'Packed and awaiting carrier' },
  SHIPPED: { label: 'Shipped', description: 'In transit to customer' },
  DELIVERED: { label: 'Delivered', description: 'Received by customer' },
  COMPLETED: { label: 'Completed', description: 'Fully closed out' },
  ON_HOLD: { label: 'On Hold', description: 'Paused for issues' },
  CANCELLED: { label: 'Cancelled', description: 'Aborted order' },
};

export const ORDER_STATUS_LIST = Object.keys(ORDER_STATUSES) as OrderStatus[];

export const STATUS_COLORS: Record<OrderStatus, string> = {
  QUOTE: 'bg-gray-100 text-gray-700 ring-gray-300',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700 ring-yellow-300',
  APPROVED: 'bg-blue-100 text-blue-700 ring-blue-300',
  MATERIALS_ORDERED: 'bg-indigo-100 text-indigo-700 ring-indigo-300',
  MATERIALS_RECEIVED: 'bg-violet-100 text-violet-700 ring-violet-300',
  IN_PRODUCTION: 'bg-orange-100 text-orange-700 ring-orange-300',
  QUALITY_CHECK: 'bg-pink-100 text-pink-700 ring-pink-300',
  READY_TO_SHIP: 'bg-teal-100 text-teal-700 ring-teal-300',
  SHIPPED: 'bg-cyan-100 text-cyan-700 ring-cyan-300',
  DELIVERED: 'bg-green-100 text-green-700 ring-green-300',
  COMPLETED: 'bg-emerald-100 text-emerald-700 ring-emerald-300',
  CANCELLED: 'bg-red-100 text-red-700 ring-red-300',
  ON_HOLD: 'bg-amber-100 text-amber-700 ring-amber-300',
};
