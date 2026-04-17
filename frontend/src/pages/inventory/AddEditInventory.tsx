import { useEffect, useState } from 'react';
import { useNavigate, useParams, useBlocker } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useConfirm } from '../../hooks/useConfirm';
import { z } from 'zod';
import {
  ChevronLeftIcon,
  CheckCircleIcon,
  CubeIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { TouchButton } from '../../components/ui/TouchButton';
import { TouchInput } from '../../components/ui/TouchInput';
import { Modal } from '../../components/ui/Modal';
import { MaterialSelector } from '../../components/materials/MaterialSelector';
import { useInventoryItem, useCreateInventoryItem, useUpdateInventoryItem } from '../../hooks/useInventory';
import type { MaterialItem } from '../../components/materials/MaterialSelector';
import type { JSX } from 'react';

// ─── Schema ───────────────────────────────────────────────────────────────────

const addEditSchema = z.object({
  sku: z.string().max(100).optional(),
  name: z.string().min(1, 'Item name is required').max(200),
  category: z.string().max(100),
  brand: z.string().max(100).optional(),
  size: z.string().max(50).optional(),
  color: z.string().max(50).optional(),
  quantityOnHand: z.number({ invalid_type_error: 'Required' }).int().nonnegative('Must be 0 or more').optional(),
  reorderPoint: z.number({ invalid_type_error: 'Required' }).int().nonnegative('Must be 0 or more').optional(),
  reorderQuantity: z.number({ invalid_type_error: 'Required' }).int().positive('Must be greater than 0').optional(),
  costPrice: z.number({ invalid_type_error: 'Required' }).nonnegative('Must be 0 or more'),
  notes: z.string().max(1000).optional(),
});

type FormValues = z.infer<typeof addEditSchema>;

// ─── Component ─────────────────────────────────────────────────────────────────

export function AddEditInventoryPage(): JSX.Element {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const { data, isLoading: isFetchingItem } = useInventoryItem(id ?? '');
  const itemData = data?.data;

  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem();
  const isSubmitting = createItem.isPending || updateItem.isPending;

  const [showMaterialModal, setShowMaterialModal] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(addEditSchema),
    defaultValues: {
      sku: '',
      name: '',
      category: 'BLANK_SHIRTS',
      brand: '',
      size: '',
      color: '',
      quantityOnHand: 0,
      reorderPoint: 5,
      reorderQuantity: 10,
      costPrice: 0,
      notes: '',
    },
  });

  useEffect(() => {
    if (isEditing && itemData) {
      reset({
        sku: itemData.sku,
        name: itemData.name,
        category: itemData.category,
        brand: itemData.brand ?? '',
        size: itemData.size ?? '',
        color: itemData.color ?? '',
        quantityOnHand: itemData.quantityOnHand,
        reorderPoint: itemData.reorderPoint,
        reorderQuantity: itemData.reorderQuantity,
        costPrice: itemData.costPrice,
        notes: itemData.notes ?? '',
      });
    }
  }, [isEditing, itemData, reset]);

  const selectedCategory = watch('category');

  const { confirm } = useConfirm();
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && !isSubmitting && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      confirm({
        title: 'Unsaved Changes',
        description: 'You have unsaved changes. Are you sure you want to leave this page?',
        confirmText: 'Leave Page',
        variant: 'danger',
      }).then((ok) => {
        if (ok) blocker.proceed();
        else blocker.reset();
      });
    }
  }, [blocker, confirm]);

  // Map MaterialSelector category values → Prisma InventoryCategory enum values
  const MATERIAL_TO_INVENTORY_CATEGORY: Record<string, string> = {
    BLANK_GARMENT: 'BLANK_SHIRTS',
    DTF_TRANSFER:  'DTF_TRANSFERS',
    HTV_VINYL:     'VINYL',
    SUPPLIES:      'OTHER',
  };

  const handleMaterialSelect = (item: MaterialItem): void => {
    const inventoryCategory = MATERIAL_TO_INVENTORY_CATEGORY[item.category] ?? item.category;
    setValue('name', item.description, { shouldDirty: true });
    setValue('category', inventoryCategory, { shouldDirty: true });
    setValue('brand', item.brand ?? item.htvBrand ?? '', { shouldDirty: true });
    setValue('size', item.size ?? item.rollSize ?? item.variant ?? '', { shouldDirty: true });
    setValue('color', item.color ?? item.htvColor ?? '', { shouldDirty: true });
    setValue('costPrice', item.unitPrice ?? 0, { shouldDirty: true });
    setShowMaterialModal(false);
  };

  const onSubmit = async (data: FormValues) => {
    try {
      const payload = {
        ...data,
        sku: data.sku || undefined,
        brand: data.brand || undefined,
        size: data.size || undefined,
        color: data.color || undefined,
        notes: data.notes || undefined,
      };

      if (isEditing && id) {
        await updateItem.mutateAsync({ id, data: payload });
        navigate(`/inventory/${id}`);
      } else {
        const res = await createItem.mutateAsync(payload);
        navigate(`/inventory/${res.data.id}`);
      }
    } catch {
    }
  };

  if (isEditing && isFetchingItem) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto animate-pulse space-y-6">
        <div className="h-8 w-48 bg-gray-100 rounded" />
        <div className="h-96 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            {isEditing ? 'Edit Inventory Item' : 'Add Inventory Item'}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {isEditing ? `Updating ${itemData?.name}` : 'Create a new stock item'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <CubeIcon className="h-5 w-5 text-gray-500" />
              Core Details
            </h2>
            <TouchButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowMaterialModal(true)}
              icon={<PlusIcon className="h-4 w-4" />}
            >
              Use Catalog
            </TouchButton>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <TouchInput
                label="Item Name *"
                placeholder="Next Level 3600 Classic T-Shirt"
                error={errors.name?.message}
                {...register('name')}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Category *</label>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className={clsx(
                      'w-full min-h-[44px] rounded-xl border bg-white px-4 py-2 text-base shadow-sm appearance-none cursor-pointer',
                      errors.category ? 'border-red-400' : 'border-gray-300 hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none'
                    )}
                  >
                    <option value="">Select Category...</option>
                    <option value="BLANK_SHIRTS">Blank Garments</option>
                    <option value="DTF_TRANSFERS">DTF Transfers</option>
                    <option value="VINYL">HTV Vinyl</option>
                    <option value="INK">Ink</option>
                    <option value="PACKAGING">Packaging</option>
                    <option value="EMBROIDERY_THREAD">Embroidery Thread</option>
                    <option value="OTHER">Supplies / Other</option>
                  </select>
                )}
              />
              {errors.category && <p className="text-xs text-red-500">{errors.category.message}</p>}
            </div>
            <TouchInput
              label="SKU"
              placeholder="Leave blank to auto-generate"
              error={errors.sku?.message}
              {...register('sku')}
            />
          </div>
        </div>

        {/* ── Category-specific attribute fields ── */}
        {selectedCategory === 'BLANK_SHIRTS' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Garment Attributes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <TouchInput
                label="Brand"
                placeholder="Next Level, Gildan…"
                error={errors.brand?.message}
                {...register('brand')}
              />
              <TouchInput
                label="Size"
                placeholder="S, M, L, XL, 2XL…"
                error={errors.size?.message}
                {...register('size')}
              />
              <TouchInput
                label="Color"
                placeholder="Heather Grey"
                error={errors.color?.message}
                {...register('color')}
              />
            </div>
          </div>
        )}

        {selectedCategory === 'DTF_TRANSFERS' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">DTF Transfer Attributes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <TouchInput
                label="Film Type"
                placeholder="Matte, Gloss…"
                error={errors.brand?.message}
                {...register('brand')}
              />
              <TouchInput
                label="Sheet Dimensions"
                placeholder='11"×17", Gang Sheet…'
                error={errors.size?.message}
                {...register('size')}
              />
              <TouchInput
                label="Finish"
                placeholder="Soft, Standard…"
                error={errors.color?.message}
                {...register('color')}
              />
            </div>
          </div>
        )}

        {selectedCategory === 'VINYL' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">HTV Vinyl Attributes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <TouchInput
                label="Brand"
                placeholder="Siser, Cricut…"
                error={errors.brand?.message}
                {...register('brand')}
              />
              <TouchInput
                label="Roll Size"
                placeholder='12"×5yd, 15"×10yd…'
                error={errors.size?.message}
                {...register('size')}
              />
              <TouchInput
                label="Color"
                placeholder="Black, White, Red…"
                error={errors.color?.message}
                {...register('color')}
              />
            </div>
          </div>
        )}

        {(selectedCategory === 'OTHER' || selectedCategory === 'SUPPLIES' || selectedCategory === 'INK' || selectedCategory === 'PACKAGING' || selectedCategory === 'EMBROIDERY_THREAD') && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Supply Attributes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <TouchInput
                label="Supplier / Brand"
                placeholder="Stahls, Hirsch…"
                error={errors.brand?.message}
                {...register('brand')}
              />
              <TouchInput
                label="Package Size / Unit"
                placeholder="Roll, Box of 100…"
                error={errors.size?.message}
                {...register('size')}
              />
              <TouchInput
                label="Color / Type"
                placeholder="Black, Standard…"
                error={errors.color?.message}
                {...register('color')}
              />
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Stock & Cost</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <TouchInput
              label="Initial Qty"
              type="number"
              min="0"
              error={errors.quantityOnHand?.message}
              disabled={isEditing}
              {...register('quantityOnHand', { valueAsNumber: true })}
            />
            <TouchInput
              label="Unit Cost ($)"
              type="number"
              step="0.01"
              min="0"
              error={errors.costPrice?.message}
              {...register('costPrice', { valueAsNumber: true })}
            />
            <TouchInput
              label="Reorder At"
              type="number"
              min="0"
              error={errors.reorderPoint?.message}
              {...register('reorderPoint', { valueAsNumber: true })}
            />
            <TouchInput
              label="Reorder Qty"
              type="number"
              min="1"
              error={errors.reorderQuantity?.message}
              {...register('reorderQuantity', { valueAsNumber: true })}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Internal Notes</label>
            <textarea
              rows={3}
              placeholder="Supplier references, location bin #..."
              {...register('notes')}
              className={clsx(
                'w-full rounded-xl border bg-white px-4 py-2 text-base shadow-sm resize-none',
                errors.notes ? 'border-red-400' : 'border-gray-300 hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none'
              )}
            />
            {errors.notes && <p className="text-xs text-red-500">{errors.notes.message}</p>}
          </div>
        </div>

        <div className="flex gap-4 border-t border-gray-200 pt-6">
          <TouchButton
            type="button"
            variant="secondary"
            size="lg"
            onClick={() => navigate(-1)}
            disabled={isSubmitting}
          >
            Cancel
          </TouchButton>
          <TouchButton
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={isSubmitting}
            icon={<CheckCircleIcon className="h-5 w-5" />}
          >
            {isEditing ? 'Save Changes' : 'Create Item'}
          </TouchButton>
        </div>
      </form>

      <Modal
        open={showMaterialModal}
        onClose={() => setShowMaterialModal(false)}
        title="Select Catalog Item"
        size="lg"
      >
        <MaterialSelector
          context="inventory"
          onAddItem={handleMaterialSelect}
          onCancel={() => setShowMaterialModal(false)}
        />
      </Modal>
    </div>
  );
}
