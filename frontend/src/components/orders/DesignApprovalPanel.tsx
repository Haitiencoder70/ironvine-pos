import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { clsx } from 'clsx';
import { orderApi } from '../../services/api';
import { orderKeys } from '../../hooks/useOrders';
import type { Order } from '../../types';

interface DesignApprovalPanelProps {
  order: Order;
}

export function DesignApprovalPanel({ order }: DesignApprovalPanelProps) {
  const qc = useQueryClient();

  const requestMutation = useMutation({
    mutationFn: () => orderApi.requestApproval(order.id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: orderKeys.detail(order.id) });
      toast.success('Approval request sent');
    },
    onError: () => toast.error('Failed to send approval request'),
  });

  const approveMutation = useMutation({
    mutationFn: () => orderApi.approveDesign(order.id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: orderKeys.detail(order.id) });
      toast.success('Design approved');
    },
    onError: () => toast.error('Failed to approve design'),
  });

  const isApproved = order.designApproved;
  const isPending = !isApproved && order.designApprovedAt === null && order.designApprovedBy === null;

  return (
    <div
      className={clsx(
        'rounded-lg border p-3 flex items-center justify-between gap-3',
        isApproved
          ? 'bg-green-50 border-green-200'
          : 'bg-yellow-50 border-yellow-200',
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        {isApproved ? (
          <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
        ) : (
          <ClockIcon className="h-5 w-5 text-yellow-600 flex-shrink-0" />
        )}
        <div className="min-w-0">
          <p className={clsx('text-sm font-medium', isApproved ? 'text-green-800' : 'text-yellow-800')}>
            {isApproved ? 'Design Approved' : 'Awaiting Design Approval'}
          </p>
          {isApproved && order.designApprovedAt && (
            <p className="text-xs text-green-600 truncate">
              Approved {new Date(order.designApprovedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-2 flex-shrink-0">
        {isApproved ? (
          <button
            onClick={() => requestMutation.mutate()}
            disabled={requestMutation.isPending}
            className="text-xs px-3 py-1.5 rounded border border-yellow-300 bg-white text-yellow-700 hover:bg-yellow-50 disabled:opacity-50 min-h-[36px]"
          >
            Request Re-approval
          </button>
        ) : (
          <>
            {isPending && (
              <button
                onClick={() => requestMutation.mutate()}
                disabled={requestMutation.isPending}
                className="text-xs px-3 py-1.5 rounded border border-yellow-300 bg-white text-yellow-700 hover:bg-yellow-50 disabled:opacity-50 min-h-[36px]"
              >
                {requestMutation.isPending ? 'Sending…' : 'Request Approval'}
              </button>
            )}
            <button
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
              className="text-xs px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 min-h-[36px]"
            >
              {approveMutation.isPending ? 'Approving…' : 'Approve Design'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
