import { useCallback, useEffect } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ClockIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { Modal } from '../ui/Modal';
import { TouchButton } from '../ui/TouchButton';
import { TouchInput } from '../ui/TouchInput';
import { useUpdateShipmentStatus } from '../../hooks/useShipments';
import { useUpdateOrderStatus } from '../../hooks/useOrders';
import type { Shipment, ShipmentStatus } from '../../types';

// ─── Schema ───────────────────────────────────────────────────────────────────

const STATUSES: { value: ShipmentStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending Processing' },
  { value: 'LABEL_CREATED', label: 'Label Created' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { value: 'DELIVERED', label: 'Delivered Successfully' },
  { value: 'EXCEPTION', label: 'Issue / Exception' },
];

const updateStatusSchema = z.object({
  status: z.string().min(1, 'Status is required'),
  notes: z.string().max(1000).optional(),
  markOrderCompletedIfDelivered: z.boolean().default(true),
});

type UpdateStatusValues = z.infer<typeof updateStatusSchema>;

// ─── Component ─────────────────────────────────────────────────────────────────

export interface UpdateShipmentStatusModalProps {
  open: boolean;
  onClose: () => void;
  shipment: Shipment | undefined;
}

export function UpdateShipmentStatusModal({ open, onClose, shipment }: UpdateShipmentStatusModalProps) {
  const updateShipmentStatus = useUpdateShipmentStatus();
  const updateOrder = useUpdateOrderStatus();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<UpdateStatusValues>({
    resolver: zodResolver(updateStatusSchema),
    defaultValues: { markOrderCompletedIfDelivered: true }
  });

  const selectedStatus = useWatch({ control, name: 'status' });
  const isSelectedDelivered = selectedStatus === 'DELIVERED';

  useEffect(() => {
    if (open && shipment) {
      reset({
        status: shipment.status,
        notes: '',
        markOrderCompletedIfDelivered: true,
      });
    }
  }, [open, shipment, reset]);

  const onSubmit = async (data: UpdateStatusValues) => {
    if (!shipment) return;
    try {
      // 1. Mutate tracking status natively
      await updateShipmentStatus.mutateAsync({
        id: shipment.id,
        newStatus: data.status as ShipmentStatus,
      });
      
      // 2. Intercept logic: If marking as Delivered and they agreed to cascading completion
      if (data.status === 'DELIVERED' && data.markOrderCompletedIfDelivered && shipment.orderId) {
         await updateOrder.mutateAsync({
           id: shipment.orderId,
           newStatus: 'COMPLETED',
           notes: 'Auto-completed via shipment delivery verification.'
         });
      }

      onClose();
    } catch {
      // Handled globally
    }
  };

  const handleClose = useCallback(() => {
    if (!updateShipmentStatus.isPending) onClose();
  }, [updateShipmentStatus.isPending, onClose]);

  if (!shipment) return null;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={
        <span className="flex items-center gap-2">
          <ClockIcon className="h-5 w-5 text-blue-600" />
          Update Progress
        </span>
      }
      description="Record a manual carrier event or tracking exception."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
        <div className="flex flex-col gap-1.5">
           <label className="text-sm font-medium text-gray-700">New Status</label>
           <Controller
             name="status"
             control={control}
             render={({ field }) => (
               <select
                 {...field}
                 className={clsx(
                   'w-full min-h-[44px] rounded-xl border bg-white px-4 py-2 text-base shadow-sm appearance-none cursor-pointer',
                   errors.status ? 'border-red-400' : 'border-gray-300 hover:border-gray-400 focus:ring-2 focus:ring-blue-500'
                 )}
               >
                 {STATUSES.map((st) => <option key={st.value} value={st.value}>{st.label}</option>)}
               </select>
             )}
           />
           {errors.status && <p className="text-xs text-red-500">{errors.status.message}</p>}
        </div>

        {isSelectedDelivered && (
           <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3 mt-2 animate-in fade-in slide-in-from-top-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-blue-900 leading-snug">Cascade Workflow Update</p>
                <p className="text-xs text-blue-700 mt-1">If enabled, the parent Customer Order will be automatically marked as COMPLETED.</p>
                <label className="flex items-center gap-2 mt-3 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('markOrderCompletedIfDelivered')}
                    className="h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500 bg-white"
                  />
                  <span className="text-sm font-semibold text-blue-900">Mark Order Completed</span>
                </label>
              </div>
           </div>
        )}

        <TouchInput
          label="Internal Notes"
          placeholder="e.g. Left at side door..."
          {...register('notes')}
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <TouchButton type="button" variant="secondary" onClick={handleClose} disabled={updateShipmentStatus.isPending}>
            Cancel
          </TouchButton>
          <TouchButton type="submit" variant="primary" loading={updateShipmentStatus.isPending} icon={<CheckCircleIcon className="w-5 h-5"/>}>
            Update Status
          </TouchButton>
        </div>
      </form>
    </Modal>
  );
}
