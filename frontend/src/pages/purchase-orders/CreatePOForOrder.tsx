import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ChevronLeftIcon,
  BuildingStorefrontIcon,
  PlusCircleIcon,
  TrashIcon,
  CubeIcon,
  DocumentTextIcon,
  ShoppingCartIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { TouchButton } from '../../components/ui/TouchButton';
import { TouchInput } from '../../components/ui/TouchInput';
import { TouchCard } from '../../components/ui/TouchCard';
import { useOrder } from '../../hooks/useOrders';
import { useVendors } from '../../hooks/useVendors';
import { useCreatePurchaseOrder } from '../../hooks/usePurchaseOrders';
import type { JSX } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type PoolItem = {
  inventoryItemId?: string;
  description: string;
  quantity: number;
  unitCost: number;
  materialCategory?: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Maps vendor display category strings (stored in Vendor.categories) to the
// InventoryCategory enum values used on InventoryItem.category in the DB.
const VENDOR_CAT_TO_INVENTORY: Record<string, string[]> = {
  Garments:  ['BLANK_SHIRTS'],
  DTF:       ['DTF_TRANSFERS'],
  HTV:       ['VINYL'],
  Inks:      ['INK'],
  Supplies:  ['INK', 'PACKAGING', 'OTHER'],
  Other:     ['OTHER', 'PACKAGING', 'EMBROIDERY_THREAD'],
};

// Normalizes MaterialSelector category values (used in ProductOrderConfigurator)
// to InventoryCategory enum values (used in the DB and in VENDOR_CAT_TO_INVENTORY).
const MATERIAL_CAT_NORMALIZE: Record<string, string> = {
  BLANK_GARMENT: 'BLANK_SHIRTS',
  DTF_TRANSFER:  'DTF_TRANSFERS',
  HTV_VINYL:     'VINYL',
  INK:           'INK',
  PACKAGING:     'PACKAGING',
  SUPPLIES:      'OTHER',
};

function normalizeMaterialCategory(cat: string | undefined): string | undefined {
  if (!cat) return undefined;
  return MATERIAL_CAT_NORMALIZE[cat] ?? cat;
}

function expandVendorCategories(vendorCategories: string[]): string[] {
  return vendorCategories.flatMap(cat => VENDOR_CAT_TO_INVENTORY[cat] ?? [cat]);
}

// Infers InventoryCategory enum value from plain-text material description.
function inferCategory(description: string): string | undefined {
  const d = description.toLowerCase();
  if (d.includes('dtf') || d.includes('gang sheet') || d.includes('transfer')) return 'DTF_TRANSFERS';
  if (d.includes('htv') || d.includes('vinyl')) return 'VINYL';
  if (
    d.includes('shirt') || d.includes('tee') || d.includes('hoodie') ||
    d.includes('polo') || d.includes('sweatshirt') || d.includes('blank') ||
    d.includes('gildan') || d.includes('comfort colors') || d.includes('next level')
  ) return 'BLANK_SHIRTS';
  if (d.includes('ink') || d.includes('powder')) return 'INK';
  if (d.includes('packaging') || d.includes('bag') || d.includes('box')) return 'PACKAGING';
  return undefined;
}

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

  // Full set of materials from the order — never mutated after init
  const [materialPool, setMaterialPool] = useState<PoolItem[]>([]);
  const poolInitialized = useRef(false);

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

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const watchedItems = watch('items');
  const selectedVendorId = watch('vendorId');

  // ── Step 1: Build material pool from order (once) ─────────────────────────
  useEffect(() => {
    if (!linkedOrderId || !orderData?.data || poolInitialized.current) return;
    poolInitialized.current = true;

    const order = orderData.data;
    setValue('linkedOrderId', order.id);

    // Strategy 1: requiredMaterials saved at order creation
    const fromRequired = order.items.flatMap(item =>
      item.requiredMaterials.map(rm => ({
        inventoryItemId: rm.inventoryItemId,
        description: rm.description,
        quantity: Number(rm.quantityRequired),
        unitCost: 0,
        materialCategory: rm.inventoryItem?.category
          ?? normalizeMaterialCategory(rm.attributes?.materialCategory as string | undefined)
          ?? inferCategory(rm.description),
      }))
    );

    if (fromRequired.length > 0) {
      setMaterialPool(fromRequired);
      return;
    }

    // Strategy 2 (fallback): derive from order item attributes
    const fromAttributes = order.items.flatMap(item => {
      const attrs = item.attributes ?? {};
      const brand = typeof attrs['brand'] === 'string' ? attrs['brand'] : '';
      const color = typeof attrs['color'] === 'string' ? attrs['color'] : '';
      const sizes = Array.isArray(attrs['sizes'])
        ? (attrs['sizes'] as { size: string; qty: number }[])
        : [];
      const productLabel = item.productType.replace(/_/g, ' ');

      if (sizes.length > 1) {
        return sizes
          .filter(s => s.qty > 0)
          .map(s => {
            const desc = [brand, color, productLabel, s.size].filter(Boolean).join(' ');
            return { description: desc, quantity: s.qty, unitCost: 0, materialCategory: inferCategory(desc) };
          });
      }

      const sizeLabel = sizes[0]?.size ?? (typeof attrs['size'] === 'string' ? attrs['size'] : '');
      const desc =
        [brand, color, productLabel, sizeLabel].filter(Boolean).join(' ') ||
        `${item.quantity}× ${productLabel}`;
      return [{ description: desc, quantity: item.quantity, unitCost: 0, materialCategory: inferCategory(desc) }];
    });

    if (fromAttributes.length > 0) {
      setMaterialPool(fromAttributes);
    }
  }, [linkedOrderId, orderData, setValue]);

  // ── Step 2: Filter pool by selected vendor ────────────────────────────────
  useEffect(() => {
    if (materialPool.length === 0) return;

    // null inventoryItemId (from Prisma nullable field) must become undefined
    // so Zod's z.string().optional() doesn't reject it on submit.
    const toFormItems = (items: PoolItem[]) =>
      items.map(item => ({
        inventoryItemId: item.inventoryItemId ?? undefined,
        description: item.description,
        quantity: item.quantity,
        unitCost: item.unitCost,
      }));

    if (!selectedVendorId) {
      setValue('items', toFormItems(materialPool));
      return;
    }

    const vendor = vendors.find(v => v.id === selectedVendorId);
    if (!vendor || vendor.categories.length === 0) {
      setValue('items', toFormItems(materialPool));
      return;
    }

    const inventoryCats = expandVendorCategories(vendor.categories);
    const matched = materialPool.filter(
      item => !item.materialCategory || inventoryCats.includes(item.materialCategory)
    );
    setValue('items', toFormItems(matched));
  }, [selectedVendorId, vendors, materialPool, setValue]);

  // Items that belong to a different vendor (not shown in this PO)
  const deferredItems = useMemo(() => {
    if (!selectedVendorId || materialPool.length === 0) return [];
    const vendor = vendors.find(v => v.id === selectedVendorId);
    if (!vendor || vendor.categories.length === 0) return [];
    const inventoryCats = expandVendorCategories(vendor.categories);
    return materialPool.filter(
      item => item.materialCategory && !inventoryCats.includes(item.materialCategory)
    );
  }, [selectedVendorId, vendors, materialPool]);

  const selectedVendor = useMemo(
    () => vendors.find(v => v.id === selectedVendorId),
    [selectedVendorId, vendors],
  );
  const vendorHasNoCategories = !!selectedVendorId && !!selectedVendor && selectedVendor.categories.length === 0;

  const { subtotal } = useMemo(
    () =>
      watchedItems.reduce(
        (acc, curr) => ({
          subtotal:
            acc.subtotal +
            (parseFloat(String(curr.quantity)) || 0) * (parseFloat(String(curr.unitCost)) || 0),
        }),
        { subtotal: 0 }
      ),
    [watchedItems]
  );

  const onSubmit = async (data: CreatePOValues) => {
    try {
      const payload = {
        ...data,
        expectedDate: data.expectedDate ? new Date(data.expectedDate).toISOString() : undefined,
      };
      const res = await createPO.mutateAsync(payload);
      navigate(`/purchase-orders/${res.data.id}`);
    } catch {
      // handled by mutation
    }
  };

  const isCheckingData = (linkedOrderId && isLoadingOrder) || isLoadingVendors;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 pb-24">
      {/* Header */}
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
            <p className="text-sm text-gray-500 mt-0.5">Drafting a new supplier order</p>
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

          {/* Vendor & Fulfillment */}
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
                          errors.vendorId
                            ? 'border-red-400 focus:border-red-500'
                            : 'border-gray-300 hover:border-gray-400'
                        )}
                      >
                        <option value="" disabled>Select a vendor...</option>
                        {vendors.map(v => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                />
                {errors.vendorId && (
                  <p className="text-xs text-red-500">{errors.vendorId.message}</p>
                )}
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
                <label className="text-sm font-medium text-gray-700 block mb-1.5">
                  Vendor Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Please pack by sizes..."
                  {...register('notes')}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base shadow-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </TouchCard>

          {/* Deferred items notice */}
          {deferredItems.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  {deferredItems.length} item{deferredItems.length !== 1 ? 's' : ''} not included — different vendor
                </p>
                <ul className="mt-1.5 space-y-0.5">
                  {deferredItems.map((item, i) => (
                    <li key={i} className="text-sm text-amber-700">• {item.description}</li>
                  ))}
                </ul>
                <p className="text-xs text-amber-600 mt-2">
                  After saving this PO, come back and create a separate PO for these items.
                </p>
              </div>
            </div>
          )}

          {/* No-category vendor warning */}
          {vendorHasNoCategories && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex gap-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-800">
                  {selectedVendor!.name} has no supply categories configured — showing all materials
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  To auto-filter materials by vendor, go to Vendors and set what this vendor supplies (e.g. Blank Garments, DTF Transfers).
                </p>
              </div>
            </div>
          )}

          {/* Line Items */}
          <TouchCard padding="lg" className="border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <CubeIcon className="h-5 w-5 text-gray-500" />
                Line Items
                {selectedVendorId && materialPool.length > 0 && (
                  <span className="text-xs font-normal text-gray-400 ml-1">
                    ({fields.length} of {materialPool.length} materials)
                  </span>
                )}
              </h2>
            </div>

            <div className="space-y-4">
              {fields.map((field, index) => {
                const itemError = errors.items?.[index];
                return (
                  <div
                    key={field.id}
                    className="p-4 bg-gray-50 border border-gray-200 rounded-xl relative group"
                  >
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="absolute -right-2 -top-2 bg-white border border-gray-200 rounded-full p-1.5 text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 shadow-sm transition-all"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      <div className="md:col-span-6">
                        <TouchInput
                          label="Item Description"
                          placeholder="Cotton Thread Spool RED"
                          error={itemError?.description?.message}
                          {...register(`items.${index}.description` as const)}
                        />
                      </div>
                      <div className="md:col-span-3">
                        <TouchInput
                          label="Quantity"
                          type="number"
                          min="1"
                          error={itemError?.quantity?.message}
                          {...register(`items.${index}.quantity` as const, { valueAsNumber: true })}
                        />
                      </div>
                      <div className="md:col-span-3">
                        <TouchInput
                          label="Unit Cost ($)"
                          type="number"
                          step="0.01"
                          min="0"
                          error={itemError?.unitCost?.message}
                          {...register(`items.${index}.unitCost` as const, { valueAsNumber: true })}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              {fields.length === 0 && (
                <div className="p-6 border-2 border-dashed border-gray-200 rounded-xl text-center">
                  <p className="text-gray-500 text-sm">
                    {linkedOrderId
                      ? 'Select a vendor above to load materials for this order.'
                      : 'No items added to this PO yet.'}
                  </p>
                </div>
              )}

              {errors.items?.root && (
                <p className="text-sm text-red-500 font-medium">{errors.items.root.message}</p>
              )}

              <TouchButton
                type="button"
                variant="secondary"
                size="md"
                onClick={() => append({ description: '', quantity: 1, unitCost: 0 })}
                icon={<PlusCircleIcon className="h-5 w-5" />}
              >
                Add Custom Item
              </TouchButton>
            </div>
          </TouchCard>

          {/* Subtotal */}
          <div className="flex justify-end p-4">
            <div className="w-full md:w-64 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center text-sm text-gray-500 mb-2">
                <span>Subtotal</span>
                <span className="font-mono text-gray-900">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(subtotal)}
                </span>
              </div>
              <div className="pt-2 border-t border-gray-100 flex justify-between items-center font-bold text-gray-900 text-lg">
                <span>Estimated Total</span>
                <span className="font-mono">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(subtotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Fixed Action Bar */}
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
    </div>
  );
}
