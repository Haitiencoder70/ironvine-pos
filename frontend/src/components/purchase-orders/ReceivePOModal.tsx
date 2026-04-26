import { useCallback, useEffect } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CubeIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { Modal } from '../ui/Modal';
import { TouchButton } from '../ui/TouchButton';
import { TouchInput } from '../ui/TouchInput';
import { useReceivePurchaseOrder } from '../../hooks/usePurchaseOrders';
import type { PurchaseOrder } from '../../types';

// ─── Schema ───────────────────────────────────────────────────────────────────

const receiveItemSchema = z.object({
  purchaseOrderItemId: z.string(),
  inventoryItemId: z.string().optional(),
  description: z.string(), // for UI
  ordered: z.number(), // for UI
  received: z.number(), // previously received
  quantityReceived: z.number().int().min(0, 'Cannot be negative'),
  notes: z.string().max(500).optional(),
});

const receivePOSchema = z.object({
  notes: z.string().max(2000).optional(),
  items: z.array(receiveItemSchema).refine(
    (items) => items.some((item) => item.quantityReceived > 0),
    'You must receive at least 1 item'
  ),
});

type ReceivePOValues = z.infer<typeof receivePOSchema>;

// ─── Component ─────────────────────────────────────────────────────────────────

export interface ReceivePOModalProps {
  open: boolean;
  onClose: () => void;
  po: PurchaseOrder | null;
}

export function ReceivePOModal({ open, onClose, po }: ReceivePOModalProps) {
  const receivePO = useReceivePurchaseOrder();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReceivePOValues>({
    resolver: zodResolver(receivePOSchema),
    defaultValues: {
      notes: '',
      items: po?.items.map(item => ({
        purchaseOrderItemId: item.id,
        inventoryItemId: item.inventoryItemId,
        description: item.description,
        ordered: item.quantity,
        received: item.quantityRecv,
        // Default to receiving ALL remaining
        quantityReceived: Math.max(0, item.quantity - item.quantityRecv),
        notes: '',
      })) || [],
    },
  });

  const { fields } = useFieldArray({
    control,
    name: 'items',
  });

  // Re-populate form whenever the modal opens or PO data changes.
  // defaultValues only runs once on mount; if po loads after mount the form
  // starts with items:[] and onSubmit silently returns early.
  useEffect(() => {
    if (open && po) {
      reset({
        notes: '',
        items: po.items.map(item => ({
          purchaseOrderItemId: item.id,
          inventoryItemId: item.inventoryItemId,
          description: item.description,
          ordered: item.quantity,
          received: item.quantityRecv,
          quantityReceived: Math.max(0, item.quantity - item.quantityRecv),
          notes: '',
        })),
      });
    }
  }, [open, po, reset]);

  const onSubmit = async (data: ReceivePOValues) => {
    if (!po) return;

    // Filter out items where quantityReceived is 0
    const itemsToReceive = data.items
      .filter((i) => i.quantityReceived > 0)
      .map((i) => ({
        purchaseOrderItemId: i.purchaseOrderItemId,
        inventoryItemId: i.inventoryItemId,
        quantityReceived: i.quantityReceived,
        notes: i.notes,
        isAccepted: true, // Defaulting per instructions
      }));

    if (itemsToReceive.length === 0) return;

    try {
      await receivePO.mutateAsync({
        id: po.id,
        data: {
          notes: data.notes,
          items: itemsToReceive,
        },
      });
      reset();
      onClose();
    } catch {
      // toast handled
    }
  };

  const handleClose = useCallback(() => {
    if (!receivePO.isPending) {
      reset();
      onClose();
    }
  }, [receivePO.isPending, reset, onClose]);

  if (!po) return null;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={
        <span className="flex items-center gap-2">
          <CubeIcon className="h-5 w-5 text-blue-600" />
          Receive Items: {po.poNumber}
        </span>
      }
      description="Record newly arrived stock into inventory"
      size="xl"
      closeOnOverlayClick={!receivePO.isPending}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-2">

        <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
          <ExclamationTriangleIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">
            Received items will automatically be injected into your material inventory.
            If this PO is linked to a customer job, the job status will update once all materials are fulfilled.
          </p>
        </div>

        {/* Dynamic Items Array */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Line Items</h3>
          
          {fields.map((field, index) => {
            const itemError = errors.items?.[index];
            const remaining = Math.max(0, field.ordered - field.received);

            return (
              <div key={field.id} className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{field.description}</p>
                    <div className="text-xs text-gray-500 flex gap-4 mt-0.5">
                       <span>Ordered: <span className="font-bold text-gray-700">{field.ordered}</span></span>
                       <span>Previously Received: <span className="font-bold text-gray-700">{field.received}</span></span>
                       <span className="text-blue-600">Remaining to fulfill: <span className="font-bold">{remaining}</span></span>
                    </div>
                  </div>
                  
                  <div className="w-full md:w-32 flex-shrink-0">
                    <Controller
                      name={`items.${index}.quantityReceived`}
                      control={control}
                      render={({ field: inputField }) => (
                         <div className="relative">
                            <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Receiving Now</label>
                            <input
                              type="number"
                              min="0"
                              {...inputField}
                              onChange={(e) => inputField.onChange(parseInt(e.target.value) || 0)}
                              className={clsx(
                                'w-full min-h-[44px] rounded-xl border px-3 py-2 text-base text-right font-bold shadow-sm',
                                'focus:outline-none focus:ring-2 focus:ring-blue-500',
                                itemError?.quantityReceived ? 'border-red-400 bg-red-50' : 'bg-white border-gray-300'
                              )}
                            />
                         </div>
                      )}
                    />
                  </div>
                </div>
                
                {/* Warning if over-receiving */}
                <Controller
                  name={`items.${index}.quantityReceived`}
                  control={control}
                  render={({ field: watchField }) => {
                    if (watchField.value > remaining) {
                      return (
                        <p className="text-xs text-amber-600 font-medium flex items-center gap-1 mt-1">
                          <ExclamationTriangleIcon className="h-3.5 w-3.5" /> 
                          You are receiving more than the remaining order amount.
                        </p>
                      );
                    }
                    if (watchField.value === remaining && remaining > 0) {
                      return (
                         <p className="text-xs text-green-600 font-medium flex items-center gap-1 mt-1">
                           <CheckCircleIcon className="h-3.5 w-3.5" /> Exact remaining quantity
                         </p>
                      )
                    }
                    return <></>;
                  }}
                />
              </div>
            );
          })}
          
          {errors.items?.root && (
            <p className="text-sm text-red-500 font-medium py-2">{errors.items.root.message}</p>
          )}
        </div>

        {/* Global Notes */}
        <div>
          <TouchInput
            label="Receiving Notes (Optional)"
            placeholder="Boxes arrived slightly damaged..."
            {...control.register('notes')}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <TouchButton
            type="button"
            variant="secondary"
            size="lg"
            fullWidth
            onClick={handleClose}
            disabled={receivePO.isPending}
          >
            Cancel
          </TouchButton>
          <TouchButton
            type="submit"
            variant="success"
            size="lg"
            fullWidth
            loading={receivePO.isPending}
          >
            Confirm Receipt
          </TouchButton>
        </div>
      </form>
    </Modal>
  );
}
