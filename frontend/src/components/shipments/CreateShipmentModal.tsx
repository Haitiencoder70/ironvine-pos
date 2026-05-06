import { useCallback, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TruckIcon, CheckCircleIcon, MapPinIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { Modal } from '../ui/Modal';
import { TouchButton } from '../ui/TouchButton';
import { TouchInput } from '../ui/TouchInput';
import { useCreateShipment } from '../../hooks/useShipments';
import { useUpdateOrderStatus } from '../../hooks/useOrders';
import type { Order, ShipmentCarrier } from '../../types';

// ─── Schema ───────────────────────────────────────────────────────────────────

const createShipmentSchema = z.object({
  carrier: z.string().min(1, 'Carrier is required'),
  trackingNumber: z.string().max(100).optional(),
  estimatedDelivery: z.string().optional(),
  sendTrackingEmail: z.boolean().default(false),
  shippingStreet: z.string().optional(),
  shippingCity: z.string().optional(),
  shippingState: z.string().optional(),
  shippingZip: z.string().optional(),
  shippingCost: z.number({ invalid_type_error: 'Required' }).min(0).optional(),
  notes: z.string().max(1000).optional(),
}).superRefine((data, ctx) => {
  if (data.sendTrackingEmail && !data.trackingNumber?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['trackingNumber'],
      message: 'Tracking number is required before emailing the customer',
    });
  }
});

type CreateShipmentValues = z.infer<typeof createShipmentSchema>;

const CARRIERS: ShipmentCarrier[] = ['USPS', 'UPS', 'FEDEX', 'DHL', 'OTHER'];

// ─── Component ─────────────────────────────────────────────────────────────────

export interface CreateShipmentModalProps {
  open: boolean;
  onClose: () => void;
  order: Order | null;
}

export function CreateShipmentModal({ open, onClose, order }: CreateShipmentModalProps) {
  const createShipment = useCreateShipment();
  const updateOrder = useUpdateOrderStatus();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateShipmentValues>({
    resolver: zodResolver(createShipmentSchema),
  });

  useEffect(() => {
    if (open && order) {
      reset({
        carrier: 'UPS',
        trackingNumber: '',
        estimatedDelivery: '',
        sendTrackingEmail: false,
        shippingStreet: order.customer?.shippingStreet || order.customer?.billingStreet || '',
        shippingCity: order.customer?.shippingCity || order.customer?.billingCity || '',
        shippingState: order.customer?.shippingState || order.customer?.billingState || '',
        shippingZip: order.customer?.shippingZip || order.customer?.billingZip || '',
        shippingCost: 0,
        notes: '',
      });
    }
  }, [open, order, reset]);

  const onSubmit = async (data: CreateShipmentValues) => {
    if (!order) return;
    const shouldSendTrackingEmail = Boolean(order.customer?.email) && data.sendTrackingEmail;
    try {
      // 1. Create the shipment
      await createShipment.mutateAsync({
        orderId: order.id,
        status: 'PENDING',
        ...data,
        trackingNumber: data.trackingNumber || undefined,
        estimatedDelivery: data.estimatedDelivery ? new Date(data.estimatedDelivery).toISOString() : undefined,
        sendTrackingEmail: shouldSendTrackingEmail,
      });
      // 2. Automatically advance the order workflow to SHIPPED or similar if acceptable, 
      // The prompt asks for DELIVERED -> COMPLETED prompt, but making it LABEL_CREATED / SHIPPED could be done natively.
      // Usually, just creating the dispatch moves the workflow step down.
      await updateOrder.mutateAsync({ 
        id: order.id, 
        newStatus: 'SHIPPED', 
        notes: `Shipment Manifest Generated via ${data.carrier}` 
      });

      onClose();
    } catch {
      // toast handles the error visually
    }
  };

  const handleClose = useCallback(() => {
    if (!createShipment.isPending) {
      onClose();
    }
  }, [createShipment.isPending, onClose]);

  if (!order) return null;
  const customerEmail = order.customer?.email;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={
        <span className="flex items-center gap-2">
          <TruckIcon className="h-5 w-5 text-blue-600" />
          Create Shipping Manifest
        </span>
      }
      description={`Configuring outbound logistics for Job: ${order.orderNumber}`}
      size="lg"
      closeOnOverlayClick={!createShipment.isPending}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-2">
        
        {/* Carrier Details */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
             <TruckIcon className="h-4 w-4 text-gray-500" /> Shipping Provider
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              label="Estimated Cost ($)"
              type="number"
              step="0.01"
              min="0"
              {...register('shippingCost', { valueAsNumber: true })}
              error={errors.shippingCost?.message}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
          </div>
        </div>

        <label
          className={clsx(
            'flex items-start gap-3 rounded-xl border p-4 min-h-[44px]',
            customerEmail ? 'cursor-pointer border-blue-100 bg-blue-50 text-blue-950' : 'border-gray-200 bg-gray-50 text-gray-500',
          )}
        >
          <input
            type="checkbox"
            {...register('sendTrackingEmail')}
            disabled={!customerEmail}
            className="mt-1 h-5 w-5 rounded border-blue-300 text-blue-600 focus:ring-blue-500 disabled:border-gray-300 disabled:bg-gray-100"
          />
          <span>
            <span className="flex items-center gap-2 text-sm font-semibold">
              <EnvelopeIcon className="h-4 w-4" />
              Email tracking to customer
            </span>
            <span className="mt-1 block text-xs leading-5">
              {customerEmail ? `Send tracking details to ${customerEmail}.` : 'Add a customer email before sending tracking updates.'}
            </span>
          </span>
        </label>

        {/* Destination Mapping */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
           <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
             <MapPinIcon className="h-4 w-4 text-gray-500" /> Destination Overrides
           </h3>
           <p className="text-xs text-gray-500 mb-4">Target pre-filled from customer profile. Edit if printing a custom manifest target.</p>
           
           <div className="space-y-4">
             <TouchInput
               label="Street Address"
               {...register('shippingStreet')}
             />
             <div className="grid grid-cols-12 gap-3">
               <div className="col-span-12 md:col-span-5">
                 <TouchInput label="City" {...register('shippingCity')} />
               </div>
               <div className="col-span-6 md:col-span-4">
                 <TouchInput label="State" {...register('shippingState')} />
               </div>
               <div className="col-span-6 md:col-span-3">
                 <TouchInput label="ZIP" {...register('shippingZip')} />
               </div>
             </div>
           </div>
        </div>

        <TouchInput
          label="Shipping Notes / Instructions"
          {...register('notes')}
        />

        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <TouchButton
            type="button"
            variant="secondary"
            size="lg"
            fullWidth
            onClick={handleClose}
            disabled={createShipment.isPending}
          >
            Cancel
          </TouchButton>
          <TouchButton
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={createShipment.isPending}
            icon={<CheckCircleIcon className="h-5 w-5" />}
          >
            Generate Label & Dispatch
          </TouchButton>
        </div>
      </form>
    </Modal>
  );
}
