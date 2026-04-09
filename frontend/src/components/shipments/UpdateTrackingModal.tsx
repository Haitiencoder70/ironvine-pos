import { useCallback, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TruckIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { Modal } from '../ui/Modal';
import { TouchButton } from '../ui/TouchButton';
import { TouchInput } from '../ui/TouchInput';
import { useUpdateTracking } from '../../hooks/useShipments';
import type { Shipment, ShipmentCarrier } from '../../types';

// ─── Schema ───────────────────────────────────────────────────────────────────

const updateTrackingSchema = z.object({
  carrier: z.string().min(1, 'Carrier is required'),
  trackingNumber: z.string().min(1, 'Tracking number required').max(100),
  estimatedDelivery: z.string().optional(),
});

type UpdateTrackingValues = z.infer<typeof updateTrackingSchema>;

const CARRIERS: ShipmentCarrier[] = ['USPS', 'UPS', 'FEDEX', 'DHL', 'OTHER'];

// ─── Component ─────────────────────────────────────────────────────────────────

export interface UpdateTrackingModalProps {
  open: boolean;
  onClose: () => void;
  shipment: Shipment | undefined;
}

export function UpdateTrackingModal({ open, onClose, shipment }: UpdateTrackingModalProps) {
  const updateTracking = useUpdateTracking();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<UpdateTrackingValues>({
    resolver: zodResolver(updateTrackingSchema),
  });

  useEffect(() => {
    if (open && shipment) {
      reset({
        carrier: shipment.carrier || 'UPS',
        trackingNumber: shipment.trackingNumber || '',
        estimatedDelivery: shipment.estimatedDelivery ? new Date(shipment.estimatedDelivery).toISOString().split('T')[0] : '',
      });
    }
  }, [open, shipment, reset]);

  const onSubmit = async (data: UpdateTrackingValues) => {
    if (!shipment) return;
    try {
      await updateTracking.mutateAsync({
        id: shipment.id,
        payload: {
          carrier: data.carrier as ShipmentCarrier,
          trackingNumber: data.trackingNumber,
          estimatedDelivery: data.estimatedDelivery ? new Date(data.estimatedDelivery).toISOString() : undefined,
        }
      });
      onClose();
    } catch {
      // handled globally via toast
    }
  };

  const handleClose = useCallback(() => {
    if (!updateTracking.isPending) onClose();
  }, [updateTracking.isPending, onClose]);

  if (!shipment) return null;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Update Tracking Info"
      description="Attach a carrier tracking number to this shipment"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
        <div className="flex flex-col gap-1.5">
           <label className="text-sm font-medium text-gray-700">Select Carrier</label>
           <Controller
             name="carrier"
             control={control}
             render={({ field }) => (
               <select
                 {...field}
                 className={clsx(
                   'w-full min-h-[44px] rounded-xl border bg-white px-4 py-2 text-base shadow-sm appearance-none cursor-pointer',
                   errors.carrier ? 'border-red-400' : 'border-gray-300 hover:border-gray-400 focus:ring-2 focus:ring-blue-500'
                 )}
               >
                 {CARRIERS.map((c) => <option key={c} value={c}>{c}</option>)}
               </select>
             )}
           />
           {errors.carrier && <p className="text-xs text-red-500">{errors.carrier.message}</p>}
        </div>

        <TouchInput
          label="Tracking Number"
          icon={<TruckIcon className="w-5 h-5" />}
          {...register('trackingNumber')}
          error={errors.trackingNumber?.message}
        />

        <TouchInput
          label="Estimated Delivery Date"
          type="date"
          {...register('estimatedDelivery')}
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <TouchButton type="button" variant="secondary" onClick={handleClose} disabled={updateTracking.isPending}>
            Cancel
          </TouchButton>
          <TouchButton type="submit" variant="primary" loading={updateTracking.isPending} icon={<CheckCircleIcon className="w-5 h-5"/>}>
            Save Tracking
          </TouchButton>
        </div>
      </form>
    </Modal>
  );
}
