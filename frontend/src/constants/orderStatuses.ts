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
