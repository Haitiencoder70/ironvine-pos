import { useQuery } from '@tanstack/react-query';
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { orderApi } from '../../services/api';
import { orderKeys } from '../../hooks/useOrders';
import { TouchButton } from '../ui/TouchButton';
import type { Order, OrderStatus } from '../../types';

// ─── Workflow step definitions ─────────────────────────────────────────────────

interface WorkflowStep {
  status: OrderStatus;
  label: string;
  description: string;
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  { status: 'QUOTE', label: 'Quote Created', description: 'Initial order quote' },
  { status: 'PENDING_APPROVAL', label: 'Sent for Approval', description: 'Awaiting customer approval' },
  { status: 'APPROVED', label: 'Customer Approved', description: 'Order confirmed' },
  { status: 'MATERIALS_ORDERED', label: 'Materials Ordered', description: 'Purchase order sent to vendor' },
  { status: 'MATERIALS_RECEIVED', label: 'Materials Received', description: 'Inventory updated' },
  { status: 'IN_PRODUCTION', label: 'In Production', description: 'Printing & processing' },
  { status: 'QUALITY_CHECK', label: 'Quality Check', description: 'Final inspection' },
  { status: 'READY_TO_SHIP', label: 'Ready to Ship', description: 'Packed and labelled' },
  { status: 'SHIPPED', label: 'Shipped', description: 'In transit' },
  { status: 'DELIVERED', label: 'Delivered', description: 'Customer received' },
  { status: 'COMPLETED', label: 'Completed', description: 'Order closed' },
];

// Status index for comparison
const STATUS_ORDER: Record<OrderStatus, number> = {
  QUOTE: 0,
  PENDING_APPROVAL: 1,
  APPROVED: 2,
  MATERIALS_ORDERED: 3,
  MATERIALS_RECEIVED: 4,
  IN_PRODUCTION: 5,
  QUALITY_CHECK: 6,
  READY_TO_SHIP: 7,
  SHIPPED: 8,
  DELIVERED: 9,
  COMPLETED: 10,
  ON_HOLD: -1,
  CANCELLED: -1,
};

// ─── Next-action config ────────────────────────────────────────────────────────

interface NextAction {
  label: string;
  nextStatus: OrderStatus;
  variant: 'primary' | 'success' | 'warning';
  requiresModal?: 'materials' | 'shipment' | 'materials_po';
}

const NEXT_ACTION: Partial<Record<OrderStatus, NextAction>> = {
  QUOTE: {
    label: 'Send for Approval',
    nextStatus: 'PENDING_APPROVAL',
    variant: 'primary',
  },
  PENDING_APPROVAL: {
    label: 'Mark Approved',
    nextStatus: 'APPROVED',
    variant: 'success',
  },
  APPROVED: {
    label: 'Order Materials',
    nextStatus: 'MATERIALS_ORDERED',
    variant: 'primary',
    requiresModal: 'materials_po', // Added flag
  },
  MATERIALS_ORDERED: {
    label: 'Mark Materials Received',
    nextStatus: 'MATERIALS_RECEIVED',
    variant: 'primary',
  },
  MATERIALS_RECEIVED: {
    label: 'Start Production',
    nextStatus: 'IN_PRODUCTION',
    variant: 'success',
  },
  IN_PRODUCTION: {
    label: 'Send to Quality Check',
    nextStatus: 'QUALITY_CHECK',
    variant: 'primary',
  },
  QUALITY_CHECK: {
    label: 'Mark Ready to Ship',
    nextStatus: 'READY_TO_SHIP',
    variant: 'success',
  },
  READY_TO_SHIP: {
    label: 'Create Shipment',
    nextStatus: 'SHIPPED',
    variant: 'primary',
    requiresModal: 'shipment',
  },
  SHIPPED: {
    label: 'Mark Delivered',
    nextStatus: 'DELIVERED',
    variant: 'success',
  },
  DELIVERED: {
    label: 'Complete Order',
    nextStatus: 'COMPLETED',
    variant: 'success',
  },
};

// ─── Props ─────────────────────────────────────────────────────────────────────

export interface OrderWorkflowProps {
  order: Order;
  onAdvanceStatus: (nextStatus: OrderStatus, requiresModal?: string) => void;
  isAdvancing: boolean;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function OrderWorkflow({ order, onAdvanceStatus, isAdvancing }: OrderWorkflowProps) {
  const { data: workflowData, isLoading } = useQuery({
    queryKey: orderKeys.workflow(order.id),
    queryFn: () => orderApi.getWorkflow(order.id),
    select: (res) => res.data,
    staleTime: 30_000,
  });

  const currentIdx = STATUS_ORDER[order.status] ?? -1;
  const nextAction = NEXT_ACTION[order.status];

  const isOnHold = order.status === 'ON_HOLD';
  const isCancelled = order.status === 'CANCELLED';
  const isTerminal = order.status === 'COMPLETED' || isCancelled;

  return (
    <div className="space-y-5">
      {/* ── Next action CTA ── */}
      {nextAction && !isTerminal && !isOnHold && (
        <TouchButton
          id={`order-action-${nextAction.nextStatus}`}
          variant={nextAction.variant}
          size="lg"
          fullWidth
          loading={isAdvancing}
          onClick={() =>
            onAdvanceStatus(nextAction.nextStatus, nextAction.requiresModal)
          }
        >
          {nextAction.label}
        </TouchButton>
      )}

      {isOnHold && (
        <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-xl">
          <ExclamationCircleIcon className="h-5 w-5 text-orange-500 flex-shrink-0" />
          <p className="text-sm text-orange-700 font-medium">Order is On Hold</p>
        </div>
      )}

      {isCancelled && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
          <ExclamationCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 font-medium">Order Cancelled</p>
        </div>
      )}

      {isTerminal && order.status === 'COMPLETED' && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircleSolid className="h-5 w-5 text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-700 font-medium">Order Completed</p>
        </div>
      )}

      {/* ── Workflow timeline ── */}
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-gray-100 flex-shrink-0" />
              <div className="flex-1 space-y-1.5 py-1">
                <div className="h-3 w-28 bg-gray-100 rounded" />
                <div className="h-2.5 w-40 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="relative">
          {/* Vertical connector line */}
          <div
            className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-gray-200"
            aria-hidden="true"
          />

          <ol className="relative space-y-1">
            {WORKFLOW_STEPS.map((step) => {
              const stepIdx = STATUS_ORDER[step.status];
              const isCompleted = stepIdx < currentIdx;
              const isCurrent = step.status === order.status;
              const isFuture = stepIdx > currentIdx;

              // Get dates from workflow API if available
              const workflowStep = workflowData?.steps.find(
                (s) => s.status === step.status
              );
              const completedAt = workflowStep?.completed ? order.updatedAt : null;

              return (
                <li key={step.status} className="flex items-start gap-3 py-2 pl-0">
                  {/* Step icon */}
                  <div
                    className={clsx(
                      'relative z-10 h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0',
                      'border-2 transition-all duration-300',
                      isCompleted &&
                        'bg-blue-600 border-blue-600',
                      isCurrent &&
                        'bg-white border-blue-500 shadow-md ring-4 ring-blue-100',
                      isFuture && 'bg-white border-gray-200'
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircleIcon className="h-4 w-4 text-white" />
                    ) : isCurrent ? (
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" />
                    ) : (
                      <ClockIcon className="h-4 w-4 text-gray-300" />
                    )}
                  </div>

                  {/* Step text */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p
                      className={clsx(
                        'text-sm font-semibold',
                        isCompleted && 'text-blue-700',
                        isCurrent && 'text-gray-900',
                        isFuture && 'text-gray-400'
                      )}
                    >
                      {step.label}
                      {isCurrent && (
                        <span className="ml-2 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          Current
                        </span>
                      )}
                    </p>
                    <p
                      className={clsx(
                        'text-xs mt-0.5',
                        isFuture ? 'text-gray-300' : 'text-gray-400'
                      )}
                    >
                      {isCurrent
                        ? step.description
                        : isCompleted && completedAt
                        ? format(new Date(completedAt), 'MMM d, h:mm a')
                        : step.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
