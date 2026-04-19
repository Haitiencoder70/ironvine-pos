import { useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AdjustmentsHorizontalIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { Modal } from '../ui/Modal';
import { TouchButton } from '../ui/TouchButton';
import { useAdjustStock } from '../../hooks/useInventory';
import type { InventoryItem } from '../../types';

// ─── Schema & Types ───────────────────────────────────────────────────────────

const STOCK_MOVEMENT_TYPES = ['IN', 'OUT', 'ADJUSTMENT'] as const;

export const adjustStockFormSchema = z.object({
  type: z.enum(STOCK_MOVEMENT_TYPES),
  quantityDelta: z
    .number({ invalid_type_error: 'Enter a valid number' })
    .refine((n) => n !== 0, 'Quantity cannot be zero'),
  reason: z.string().min(1, 'Reason is required').max(500),
});

export type AdjustStockFormValues = z.infer<typeof adjustStockFormSchema>;

export interface StockAdjustmentModalProps {
  open: boolean;
  onClose: () => void;
  item: InventoryItem | null;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function StockAdjustmentModal({ open, onClose, item }: StockAdjustmentModalProps) {
  const adjustStock = useAdjustStock();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<AdjustStockFormValues>({
    resolver: zodResolver(adjustStockFormSchema),
    defaultValues: {
      type: 'IN',
      quantityDelta: 0,
      reason: '',
    },
  });

  const watchType = watch('type');
  const watchQty = watch('quantityDelta');

  // Preview next quantity based on input
  // If OUT, calculate as negative. If type=ADJUSTMENT, we let the user define positive or negative delta.
  const previewQuantity = (() => {
    if (!item) return 0;
    const current = item.quantityAvailable;
    let delta = watchQty || 0;
    
    // OUT is always negative delta
    if (watchType === 'OUT' && delta > 0) delta = -delta;
    // IN is always positive delta
    if (watchType === 'IN' && delta < 0) delta = Math.abs(delta);

    return current + delta;
  })();

  const onSubmit = handleSubmit(async (data) => {
    if (!item) return;

    let finalDelta = data.quantityDelta;
    if (data.type === 'OUT' && finalDelta > 0) finalDelta = -finalDelta;
    if (data.type === 'IN' && finalDelta < 0) finalDelta = Math.abs(finalDelta);

    try {
      await adjustStock.mutateAsync({
        id: item.id,
        type: data.type,
        quantityDelta: finalDelta,
        reason: data.reason,
      });
      reset();
      onClose();
    } catch {
      // toast error handled in hook
    }
  });

  const handleClose = useCallback(() => {
    if (!adjustStock.isPending) {
      reset();
      onClose();
    }
  }, [adjustStock.isPending, reset, onClose]);

  if (!item) return null;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={
        <span className="flex items-center gap-2">
          <AdjustmentsHorizontalIcon className="h-5 w-5 text-orange-500" />
          Adjust Stock
        </span>
      }
      description={`Update inventory for ${item.name}`}
      size="sm"
      closeOnOverlayClick={!adjustStock.isPending}
    >
      <form onSubmit={onSubmit} className="space-y-5 pt-2">
        {/* Current State */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Current Available</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{item.quantityAvailable}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Reserved</p>
            <p className="text-base text-gray-600 font-medium">{item.quantityReserved}</p>
          </div>
        </div>

        {/* Adjustment Type Segmented Control */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Movement Type</label>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                {STOCK_MOVEMENT_TYPES.map((type) => (
                  <label
                    key={type}
                    className={clsx(
                      'flex-1 text-center py-2 text-sm font-semibold rounded-lg cursor-pointer transition-all',
                      field.value === type
                        ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                        : 'text-gray-500 hover:text-gray-700'
                    )}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      {...field}
                      value={type}
                      checked={field.value === type}
                      onChange={() => field.onChange(type)}
                    />
                    {type}
                  </label>
                ))}
              </div>
            )}
          />
        </div>

        {/* Quantity */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Quantity Change</label>
          <Controller
            name="quantityDelta"
            control={control}
            render={({ field }) => (
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  className={clsx(
                    'w-full min-h-[44px] rounded-xl border px-3 py-2 text-base text-right font-bold shadow-sm',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                    watchType === 'IN' ? 'text-green-600' : watchType === 'OUT' ? 'text-red-600' : 'text-orange-600',
                    errors.quantityDelta ? 'border-red-400 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                  )}
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">
                  {watchType === 'IN' ? '+' : watchType === 'OUT' ? '-' : '±'} UNITS
                </span>
              </div>
            )}
          />
          {errors.quantityDelta && <p className="text-xs text-red-500">{errors.quantityDelta.message}</p>}
        </div>

        {/* New Preview */}
        <div className={clsx(
          'p-3 rounded-xl border flex items-center justify-between',
          previewQuantity < 0 ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
        )}>
          <span className="text-sm font-medium text-gray-700">New Available Quantity</span>
          <span className={clsx('text-lg font-bold', previewQuantity < 0 ? 'text-red-700' : 'text-blue-700')}>
            {previewQuantity}
          </span>
        </div>
        {previewQuantity < 0 && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <ExclamationTriangleIcon className="h-4 w-4" /> Available quantity will become negative.
          </p>
        )}

        {/* Reason */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Reason</label>
          <Controller
            name="reason"
            control={control}
            render={({ field }) => (
              <textarea
                {...field}
                rows={2}
                placeholder="Why is stock changing?"
                className={clsx(
                  'w-full rounded-xl border bg-white px-4 py-2 text-base shadow-sm transition-colors placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none',
                  errors.reason ? 'border-red-400' : 'border-gray-300 hover:border-gray-400'
                )}
              />
            )}
          />
          {errors.reason && <p className="text-xs text-red-500">{errors.reason.message}</p>}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <TouchButton
            type="button"
            variant="secondary"
            size="md"
            fullWidth
            onClick={handleClose}
            disabled={adjustStock.isPending}
          >
            Cancel
          </TouchButton>
          <TouchButton
            id="adjust-stock-confirm"
            type="submit"
            variant="primary"
            size="md"
            fullWidth
            loading={adjustStock.isPending}
          >
            Confirm
          </TouchButton>
        </div>
      </form>
    </Modal>
  );
}
