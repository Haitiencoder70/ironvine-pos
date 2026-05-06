import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import {
  BeakerIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { Modal } from '../ui/Modal';
import { TouchButton } from '../ui/TouchButton';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orderApi } from '../../services/api';
import { orderKeys } from '../../hooks/useOrders';
import { inventoryKeys } from '../../hooks/useInventory';
import type { OrderItem } from '../../types';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface MaterialEntry {
  inventoryItemId: string;
  description: string;
  quantityRequired: number;
  quantityUnit: string;
  quantityUsed: number;
}

const useMaterialsSchema = z.object({
  entries: z.array(
    z.object({
      inventoryItemId: z.string(),
      description: z.string(),
      quantityRequired: z.coerce.number(),
      quantityUnit: z.string(),
      quantityUsed: z
        .coerce
        .number({ invalid_type_error: 'Enter a valid amount' })
        .positive('Must be greater than 0'),
    })
  ),
  notes: z.string().max(500).optional(),
});

type UseMaterialsFormValues = z.infer<typeof useMaterialsSchema>;

function getUseMaterialsErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { error?: string } } }).response;
    if (response?.data?.error) return response.data.error;
  }
  if (error instanceof Error) return error.message;
  return 'Failed to record materials. Please try again.';
}

export interface UseMaterialsModalProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  items: OrderItem[];
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function UseMaterialsModal({
  open,
  onClose,
  orderId,
  orderNumber,
  items,
}: UseMaterialsModalProps) {
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Build flat material entry list from all items' requiredMaterials
  const allMaterials = useMemo<MaterialEntry[]>(
    () =>
      items.flatMap((item) =>
        item.requiredMaterials.map((rm) => ({
          inventoryItemId: rm.inventoryItemId ?? '',
          description: rm.description,
          quantityRequired: Number(rm.quantityRequired),
          quantityUnit: rm.quantityUnit,
          quantityUsed: Number(rm.quantityRequired),
        }))
      ),
    [items],
  );

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UseMaterialsFormValues>({
    resolver: zodResolver(useMaterialsSchema),
    defaultValues: {
      entries: allMaterials,
      notes: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    reset({
      entries: allMaterials,
      notes: '',
    });
  }, [allMaterials, open, reset]);

  const useMaterialsMutation = useMutation({
    mutationFn: (data: UseMaterialsFormValues) => {
      const materials = data.entries
        .filter((e) => e.inventoryItemId)
        .map((e) => ({
          inventoryItemId: e.inventoryItemId,
          quantityUsed: e.quantityUsed,
        }));

      if (materials.length === 0) {
        throw new Error('No materials are linked to inventory yet. Receive all purchase orders first.');
      }

      return orderApi.useMaterials(orderId, materials);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
      void queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.lowStock() });
      toast.success('Materials recorded and inventory updated');
      reset();
      onClose();
    },
    onError: (error) => {
      const message = getUseMaterialsErrorMessage(error);
      setSubmitError(message);
      toast.error(message);
    },
  });

  const onSubmit = handleSubmit((data) => {
    setSubmitError(null);
    useMaterialsMutation.mutate(data);
  }, (formErrors) => {
    const entryErrors = Array.isArray(formErrors.entries) ? formErrors.entries : [];
    const firstEntryError = entryErrors.find((entry) => entry?.quantityUsed || entry?.quantityRequired);
    const message =
      firstEntryError?.quantityUsed?.message ??
      firstEntryError?.quantityRequired?.message ??
      'Check material quantities before confirming usage.';
    setSubmitError(message);
  });

  const handleClose = useCallback(() => {
    if (!useMaterialsMutation.isPending) {
      reset();
      onClose();
    }
  }, [useMaterialsMutation.isPending, reset, onClose]);

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={
        <span className="flex items-center gap-2">
          <BeakerIcon className="h-5 w-5 text-purple-600" />
          Use Materials
        </span>
      }
      description={`Recording material usage for order ${orderNumber}`}
      size="lg"
      closeOnOverlayClick={!useMaterialsMutation.isPending}
    >
      {allMaterials.length === 0 ? (
        <div className="py-8 text-center">
          <CheckCircleIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            No required materials are listed for the items in this order.
          </p>
          <TouchButton
            variant="secondary"
            size="md"
            className="mt-4"
            onClick={handleClose}
          >
            Close
          </TouchButton>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          {/* Warning */}
          <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
            <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">
              This will deduct the entered quantities from your inventory. This action
              cannot be undone automatically.
            </p>
          </div>

          {/* Material rows */}
          <div className="space-y-3">
            {allMaterials.map((mat, idx) => {
              const entryError = errors.entries?.[idx]?.quantityUsed;
              return (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200"
                >
                  {/* Material info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {mat.description}
                    </p>
                    <p className="text-xs text-gray-400">
                      Required: {mat.quantityRequired} {mat.quantityUnit}
                      {!mat.inventoryItemId && (
                        <span className="ml-2 text-amber-600">(no inventory item linked)</span>
                      )}
                    </p>
                  </div>

                  {/* Quantity input */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <Controller
                        name={`entries.${idx}.quantityUsed`}
                        control={control}
                        render={({ field }) => (
                          <input
                            type="number"
                            step="0.01"
                            min={0.01}
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            disabled={!mat.inventoryItemId}
                            className={clsx(
                              'w-24 min-h-[44px] rounded-xl border px-3 py-2 text-base text-right shadow-sm',
                              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                              entryError
                                ? 'border-red-400 bg-red-50'
                                : 'border-gray-300 bg-white hover:border-gray-400',
                              !mat.inventoryItemId && 'opacity-50 cursor-not-allowed'
                            )}
                          />
                        )}
                      />
                      <span className="text-sm text-gray-500 min-w-[30px]">
                        {mat.quantityUnit}
                      </span>
                    </div>
                    {entryError && (
                      <p className="text-xs text-red-500">{entryError.message}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {submitError && (
            <p className="text-sm text-red-500 font-medium">{submitError}</p>
          )}

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Notes (optional)</label>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <textarea
                  {...field}
                  rows={2}
                  placeholder="Any notes about material usage…"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-base shadow-sm transition-colors placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              )}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <TouchButton
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              onClick={handleClose}
              disabled={useMaterialsMutation.isPending}
            >
              Cancel
            </TouchButton>
            <TouchButton
              id="use-materials-confirm"
              type="button"
              variant="primary"
              size="md"
              fullWidth
              loading={useMaterialsMutation.isPending}
              onClick={() => void onSubmit()}
            >
              Confirm Usage
            </TouchButton>
          </div>
        </form>
      )}
    </Modal>
  );
}
