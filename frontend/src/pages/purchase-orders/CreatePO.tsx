import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ChevronLeftIcon,
  BuildingStorefrontIcon,
  PlusCircleIcon,
  PlusIcon,
  TrashIcon,
  CubeIcon,
  DocumentTextIcon,
  ShoppingCartIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { TouchButton } from '../../components/ui/TouchButton';
import { TouchInput } from '../../components/ui/TouchInput';
import { TouchCard } from '../../components/ui/TouchCard';
import { Modal } from '../../components/ui/Modal';
import { MaterialSelector } from '../../components/materials/MaterialSelector';
import { useOrder } from '../../hooks/useOrders';
import { useVendors } from '../../hooks/useVendors';
import { useCreatePurchaseOrder } from '../../hooks/usePurchaseOrders';
import type { MaterialItem } from '../../components/materials/MaterialSelector';
import type { JSX } from 'react';

// ─── Schema ───────────────────────────────────────────────────────────────────

const poItemSchema = z.object({
  inventoryItemId: z.string().optional(),
  description: z.string().min(1, 'Description required').max(500),
  quantity: z.number({ invalid_type_error: 'Required' }).int().positive('Must be > 0'),
  unitCost: z.number({ invalid_type_error: 'Required' }).nonnegative('Must be >= 0'),
  category: z.string().optional(),
  brand: z.string().optional(),
  styleNumber: z.string().optional(),
  color: z.string().optional(),
  size: z.string().optional(),
});

const createPOFormSchema = z.object({
  vendorId: z.string().min(1, 'Select a vendor'),
  linkedOrderId: z.string().optional(),
  expectedDate: z.string().optional(),
  notes: z.string().max(2000).optional(),
  items: z.array(poItemSchema).min(1, 'Must have at least one item'),
});

type CreatePOValues = z.infer<typeof createPOFormSchema>;

// ─── Component ─────────────────────────────────────────────────────────────────

export function CreatePOPage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const linkedOrderId = searchParams.get('orderId');

  const { data: orderData, isLoading: isLoadingOrder } = useOrder(linkedOrderId ?? '');
  const { data: vendorsData, isLoading: isLoadingVendors } = useVendors({ limit: 100 });
  const vendors = vendorsData?.data?.data ?? [];

  const createPO = useCreatePurchaseOrder();

  const [showMaterialModal, setShowMaterialModal] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreatePOValues>({
    resolver: zodResolver(createPOFormSchema),
    defaultValues: {
      vendorId: '',
      linkedOrderId: linkedOrderId || undefined,
      expectedDate: '',
      notes: '',
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchedItems = watch('items');

  useEffect(() => {
    if (linkedOrderId && orderData?.data) {
      const order = orderData.data;
      setValue('linkedOrderId', order.id);

      const autoItems = order.items.flatMap(item =>
        item.requiredMaterials?.map(rm => ({
          inventoryItemId: rm.inventoryItemId,
          description: rm.description,
          quantity: rm.quantityRequired,
          unitCost: 0,
        })) || []
      );

      if (fields.length === 0 && autoItems.length > 0) {
        setValue('items', autoItems);
      }
    }
  }, [linkedOrderId, orderData, setValue, fields.length]);

  const { subtotal } = useMemo(() => {
    return watchedItems.reduce((acc, curr) => {
      const lineCost = (parseFloat(String(curr.quantity)) || 0) * (parseFloat(String(curr.unitCost)) || 0);
      return { subtotal: acc.subtotal + lineCost };
    }, { subtotal: 0 });
  }, [watchedItems]);

  const onSubmit = async (data: CreatePOValues) => {
    try {
      const payload = {
        ...data,
        expectedDate: data.expectedDate ? new Date(data.expectedDate).toISOString() : undefined,
      };
      const res = await createPO.mutateAsync(payload);
      navigate(`/purchase-orders/${res.data.id}`);
    } catch {
      // handled
    }
  };

  const handleAddItem = (item: MaterialItem): void => {
    append({
      description: item.description,
      quantity: item.quantity ?? 1,
      unitCost: item.unitPrice ?? 0,
      category: item.category,
      brand: item.brand ?? item.htvBrand,
      styleNumber: item.styleNumber,
      color: item.color ?? item.htvColor,
      size: item.size ?? item.rollSize ?? item.variant,
    });
    setShowMaterialModal(false);
  };

  const isCheckingData = (linkedOrderId && isLoadingOrder) || isLoadingVendors;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Purchase Order</h1>
          {linkedOrderId && orderData?.data ? (
            <p className="text-sm font-medium text-blue-600 mt-0.5 flex items-center gap-1.5">
              <ShoppingCartIcon className="h-4 w-4" />
              Ordering for Job: {orderData.data.orderNumber}
            </p>
          ) : (
            <p className="text-sm text-gray-500 mt-0.5">
              Drafting a new supplier order
            </p>
          )}
        </div>
      </div>

      {isCheckingData ? (
        <div className="animate-pulse space-y-4">
          <div className="h-[200px] bg-gray-100 rounded-2xl" />
          <div className="h-[400px] bg-gray-100 rounded-2xl" />
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <TouchCard padding="lg" className="border border-gray-200">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <BuildingStorefrontIcon className="h-5 w-5 text-gray-500" />
              Vendor & Fulfillment
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Select Vendor *</label>
                <Controller
                  name="vendorId"
                  control={control}
                  render={({ field }) => (
                    <div className="relative">
                      <select
                        {...field}
                        className={clsx(
                          'w-full min-h-[48px] rounded-xl border bg-white px-4 py-2 text-base shadow-sm cursor-pointer appearance-none outline-none focus:ring-2 focus:ring-blue-500',
                          errors.vendorId ? 'border-red-400 focus:border-red-500' : 'border-gray-300 hover:border-gray-400'
                        )}
                      >
                        <option value="" disabled>Select a vendor...</option>
                        {vendors.map((v) => (
                           <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                />
                {errors.vendorId && <p className="text-xs text-red-500">{errors.vendorId.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Expected Delivery</label>
                <input
                  type="date"
                  {...register('expectedDate')}
                  className="w-full min-h-[48px] rounded-xl border border-gray-300 bg-white px-4 py-2 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Vendor Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Please pack by sizes..."
                  {...register('notes')}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base shadow-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </TouchCard>

          <TouchCard padding="lg" className="border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <CubeIcon className="h-5 w-5 text-gray-500" />
                Line Items
              </h2>
            </div>
            <div className="space-y-4">
              {fields.map((field, index) => {
                const itemError = errors.items?.[index];
                const watched = watchedItems[index];
                const categoryEmoji: Record<string, string> = {
                  BLANK_GARMENT: '🎽',
                  DTF_TRANSFER: '🖨️',
                  HTV_VINYL: '✂️',
                  SUPPLIES: '📦',
                };
                const emoji = watched?.category ? (categoryEmoji[watched.category] ?? '📋') : '📋';
                const lineCost = (parseFloat(String(watched?.quantity)) || 0) * (parseFloat(String(watched?.unitCost)) || 0);

                return (
                  <div key={field.id} className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                    {/* Header row */}
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0 mt-0.5" role="img" aria-hidden="true">{emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 leading-snug">
                          {watched?.description || `Item #${index + 1}`}
                        </p>
                        {lineCost > 0 && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {watched?.quantity} × {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(String(watched?.unitCost)) || 0)}
                            {' = '}
                            <span className="font-semibold text-gray-700">
                              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(lineCost)}
                            </span>
                          </p>
                        )}
                        {linkedOrderId && orderData?.data && (
                          <p className="text-xs text-blue-600 mt-0.5">For Order: {orderData.data.orderNumber}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors flex-shrink-0"
                        aria-label="Remove item"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Editable qty + cost */}
                    <div className="grid grid-cols-2 gap-3">
                      <TouchInput
                        label="Quantity"
                        type="number"
                        inputMode="numeric"
                        min="1"
                        error={itemError?.quantity?.message}
                        {...register(`items.${index}.quantity` as const, { valueAsNumber: true })}
                      />
                      <TouchInput
                        label="Unit Cost ($)"
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        error={itemError?.unitCost?.message}
                        {...register(`items.${index}.unitCost` as const, { valueAsNumber: true })}
                      />
                    </div>

                    {/* Description override */}
                    <TouchInput
                      label="Description"
                      error={itemError?.description?.message}
                      {...register(`items.${index}.description` as const)}
                    />
                  </div>
                );
              })}
              {fields.length === 0 && (
                <div className="p-6 border-2 border-dashed border-gray-200 rounded-xl text-center">
                  <p className="text-gray-500 text-sm">No items added to this PO yet.</p>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3">
                <TouchButton
                  type="button"
                  variant="primary"
                  size="md"
                  className="flex-1"
                  onClick={() => setShowMaterialModal(true)}
                  icon={<PlusCircleIcon className="h-5 w-5" />}
                >
                  Add Catalog Item
                </TouchButton>
                <TouchButton
                  type="button"
                  variant="secondary"
                  size="md"
                  className="flex-1"
                  onClick={() => append({ description: '', quantity: 1, unitCost: 0 })}
                  icon={<PlusIcon className="h-5 w-5" />}
                >
                  Add Custom Item
                </TouchButton>
              </div>
            </div>
          </TouchCard>

          <div className="flex justify-end p-4">
            <div className="w-full md:w-64 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
               <div className="flex justify-between items-center text-sm text-gray-500 mb-2">
                 <span>Subtotal</span>
                 <span className="font-mono text-gray-900">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(subtotal)}</span>
               </div>
               <div className="pt-2 border-t border-gray-100 flex justify-between items-center font-bold text-gray-900 text-lg">
                 <span>Estimated Total</span>
                 <span className="font-mono">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(subtotal)}</span>
               </div>
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
            <div className="max-w-5xl mx-auto flex gap-4">
              <TouchButton
                type="button"
                variant="secondary"
                size="lg"
                fullWidth
                onClick={() => navigate(-1)}
                disabled={createPO.isPending}
              >
                Cancel
              </TouchButton>
              <TouchButton
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={createPO.isPending}
                icon={<DocumentTextIcon className="h-5 w-5" />}
              >
                Save Draft PO
              </TouchButton>
            </div>
          </div>
        </form>
      )}

      <Modal
        open={showMaterialModal}
        onClose={() => setShowMaterialModal(false)}
        title="Select Material"
        size="lg"
      >
        <MaterialSelector
          context="purchase-order"
          onAddItem={handleAddItem}
          onCancel={() => setShowMaterialModal(false)}
        />
      </Modal>
    </div>
  );
}
