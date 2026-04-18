import { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ChevronLeftIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  TagIcon,
  CubeIcon,
  CurrencyDollarIcon,
  BeakerIcon,
  WrenchScrewdriverIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import {
  useProduct,
  useProducts,
  PRODUCT_CATEGORIES,
  GARMENT_TYPES,
  PRINT_METHODS,
  PRINT_LOCATIONS,
  BRANDS,
  SIZES,
  type ProductFormData,
} from '../../hooks/useProducts';
import { TouchButton } from '../../components/ui/TouchButton';
import { TouchCard } from '../../components/ui/TouchCard';
import { TouchInput } from '../../components/ui/TouchInput';
import type { JSX } from 'react';

// ─── Schema ───────────────────────────────────────────────────────────────────

const priceTierSchema = z.object({
  minQty:    z.number().int().min(1),
  maxQty:    z.number().int().min(1).nullable(),
  unitPrice: z.number().min(0),
});

const sizeUpchargeSchema = z.object({
  size:      z.string().min(1),
  upcharge:  z.number().min(0),
});

const materialCostSchema = z.object({
  id:            z.string(),
  material:      z.string().min(1, 'Material name required'),
  qtyPerUnit:    z.number().min(0),
  estimatedCost: z.number().min(0),
});

const addOnSchema = z.object({
  id:       z.string(),
  name:     z.string().min(1, 'Add-on name required'),
  price:    z.number().min(0),
  isActive: z.boolean(),
});

const productFormSchema = z.object({
  name:                       z.string().min(1, 'Product name is required').max(200),
  description:                z.string().max(1000).optional().default(''),
  sku:                        z.string().max(100).optional().default(''),
  category:                   z.string().min(1, 'Category is required'),
  garmentType:                z.string().min(1, 'Garment type is required'),
  printMethod:                z.string().min(1, 'Print method is required'),
  printLocations:             z.array(z.string()).min(1, 'Select at least one location'),
  maxPrintLocations:          z.number().int().min(1).default(1),
  availableBrands:            z.array(z.string()),
  availableSizes:             z.array(z.string()).min(1, 'Select at least one size'),
  basePrice:                  z.number().min(0, 'Base price required'),
  priceTiers:                 z.array(priceTierSchema).min(1, 'At least one price tier is required'),
  sizeUpcharges:              z.array(sizeUpchargeSchema),
  materialCosts:              z.array(materialCostSchema),
  addOns:                     z.array(addOnSchema),
  estimatedProductionMinutes: z.number().int().min(0).default(5),
  difficulty:                 z.enum(['EASY', 'MEDIUM', 'COMPLEX']).default('EASY'),
  productionNotes:            z.string().max(1000).optional().default(''),
  isActive:                   z.boolean().default(true),
  isFeatured:                 z.boolean().default(false),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }): JSX.Element {
  return (
    <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3 mb-5">
      <span className="text-gray-400">{icon}</span>
      {title}
    </h2>
  );
}

// Multi-select toggle button group
function ToggleGroup({
  options,
  selected,
  onChange,
  multi = true,
}: {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  multi?: boolean;
}): JSX.Element {
  const toggle = (val: string) => {
    if (multi) {
      onChange(selected.includes(val) ? selected.filter(s => s !== val) : [...selected, val]);
    } else {
      onChange(selected[0] === val ? [] : [val]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={clsx(
            'px-4 py-2 rounded-xl text-sm font-semibold border transition-all min-h-[44px]',
            selected.includes(opt)
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AddEditProductPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const { product, isLoading: isLoadingProduct } = useProduct(id ?? '');
  const { createProduct, updateProduct } = useProducts();

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    mode: 'onBlur',
    defaultValues: {
      name: '',
      description: '',
      sku: '',
      category: '',
      garmentType: 'T-Shirt',
      printMethod: 'DTF',
      printLocations: ['Front'],
      maxPrintLocations: 1,
      availableBrands: ['Gildan', 'Bella+Canvas', 'Next Level'],
      availableSizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
      basePrice: 18,
      priceTiers: [
        { minQty: 1,   maxQty: 11,  unitPrice: 18 },
        { minQty: 12,  maxQty: 24,  unitPrice: 16 },
        { minQty: 25,  maxQty: 49,  unitPrice: 15 },
        { minQty: 50,  maxQty: 99,  unitPrice: 13 },
        { minQty: 100, maxQty: null, unitPrice: 11 },
      ],
      sizeUpcharges: [
        { size: '2XL', upcharge: 2 },
        { size: '3XL', upcharge: 3 },
        { size: '4XL', upcharge: 4 },
      ],
      materialCosts: [],
      addOns: [],
      estimatedProductionMinutes: 5,
      difficulty: 'EASY',
      productionNotes: '',
      isActive: true,
      isFeatured: false,
    },
  });

  // Field arrays
  const tierArray = useFieldArray({ control, name: 'priceTiers' });
  const sizeUCArray = useFieldArray({ control, name: 'sizeUpcharges' });
  const materialArray = useFieldArray({ control, name: 'materialCosts' });
  const addOnArray = useFieldArray({ control, name: 'addOns' });

  // Load existing product into form
  useEffect(() => {
    if (isEdit && product) {
      reset({
        name:                       product.name,
        description:                product.description,
        sku:                        product.sku,
        category:                   product.category,
        garmentType:                product.garmentType,
        printMethod:                product.printMethod,
        printLocations:             product.printLocations,
        maxPrintLocations:          product.maxPrintLocations,
        availableBrands:            product.availableBrands,
        availableSizes:             product.availableSizes,
        basePrice:                  product.basePrice,
        priceTiers:                 product.priceTiers,
        sizeUpcharges:              product.sizeUpcharges,
        materialCosts:              product.materialCosts,
        addOns:                     product.addOns,
        estimatedProductionMinutes: product.estimatedProductionMinutes,
        difficulty:                 product.difficulty,
        productionNotes:            product.productionNotes,
        isActive:                   product.isActive,
        isFeatured:                 product.isFeatured,
      });
    }
  }, [isEdit, product, reset]);

  const watchedPrintLocations = watch('printLocations');
  const watchedBrands = watch('availableBrands');
  const watchedSizes = watch('availableSizes');
  const watchedGarment = watch('garmentType');
  const watchedMethod = watch('printMethod');
  const watchedDifficulty = watch('difficulty');
  const watchedMaterials = watch('materialCosts');
  const totalCost = watchedMaterials.reduce((sum, m) => sum + (m.qtyPerUnit ?? 0) * (m.estimatedCost ?? 0), 0);
  const watchedBasePrice = watch('basePrice');
  const baseProfit = watchedBasePrice - totalCost;
  const baseMargin = watchedBasePrice > 0 ? (baseProfit / watchedBasePrice) * 100 : 0;

  const onSubmit = useCallback(async (data: ProductFormValues) => {
    const payload: ProductFormData = {
      name:                       data.name,
      description:                data.description ?? '',
      sku:                        data.sku ?? '',
      category:                   data.category,
      garmentType:                data.garmentType,
      printMethod:                data.printMethod,
      printLocations:             data.printLocations,
      maxPrintLocations:          data.maxPrintLocations,
      availableBrands:            data.availableBrands,
      availableSizes:             data.availableSizes,
      basePrice:                  data.basePrice,
      priceTiers:                 data.priceTiers,
      sizeUpcharges:              data.sizeUpcharges,
      materialCosts:              data.materialCosts,
      addOns:                     data.addOns,
      estimatedProductionMinutes: data.estimatedProductionMinutes,
      difficulty:                 data.difficulty,
      productionNotes:            data.productionNotes ?? '',
      isActive:                   data.isActive,
      isFeatured:                 data.isFeatured,
    };

    if (isEdit && id) {
      updateProduct(id, payload);
      navigate(`/products/${id}`);
    } else {
      const created = createProduct(payload);
      navigate(`/products/${created.id}`);
    }
  }, [isEdit, id, createProduct, updateProduct, navigate]);

  if (isEdit && isLoadingProduct) {
    return (
      <div className="p-6 max-w-4xl mx-auto animate-pulse space-y-4">
        <div className="h-8 bg-gray-100 rounded-xl w-48" />
        <div className="h-64 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 pb-32">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center justify-center min-h-[44px] -ml-2 px-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Product' : 'New Product'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isEdit ? 'Update product info and pricing' : 'Add a product to your catalog'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">

        {/* ── BASIC INFO ── */}
        <TouchCard padding="lg" className="border border-gray-200 shadow-sm">
          <SectionHeader icon={<TagIcon className="h-5 w-5" />} title="Basic Info" />
          <div className="space-y-4">
            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Category <span className="text-red-500">*</span>
              </label>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className={clsx(
                      'w-full min-h-[44px] rounded-xl border px-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer',
                      errors.category ? 'border-red-400' : 'border-gray-200'
                    )}
                  >
                    <option value="">Select category...</option>
                    {PRODUCT_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                )}
              />
              {errors.category && <p className="mt-1 text-xs text-red-500">{errors.category.message}</p>}
            </div>

            <TouchInput
              label="Product Name"
              placeholder="e.g. DTF T-Shirt - Front Print"
              required
              {...register('name')}
              error={errors.name?.message}
            />

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
              <textarea
                {...register('description')}
                placeholder="What is this product? Include key details..."
                rows={3}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <TouchInput
              label="SKU (optional)"
              placeholder="e.g. DTF-TEE-FRONT"
              {...register('sku')}
            />
          </div>
        </TouchCard>

        {/* ── GARMENT & PRINT ── */}
        <TouchCard padding="lg" className="border border-gray-200 shadow-sm">
          <SectionHeader icon={<CubeIcon className="h-5 w-5" />} title="Garment & Print" />
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Garment Type <span className="text-red-500">*</span>
              </label>
              <ToggleGroup
                options={GARMENT_TYPES}
                selected={[watchedGarment]}
                multi={false}
                onChange={([v]) => setValue('garmentType', v ?? 'T-Shirt', { shouldValidate: true })}
              />
              {errors.garmentType && <p className="mt-1 text-xs text-red-500">{errors.garmentType.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Print Method <span className="text-red-500">*</span>
              </label>
              <ToggleGroup
                options={PRINT_METHODS}
                selected={[watchedMethod]}
                multi={false}
                onChange={([v]) => setValue('printMethod', v ?? 'DTF', { shouldValidate: true })}
              />
              {errors.printMethod && <p className="mt-1 text-xs text-red-500">{errors.printMethod.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Print Locations Included <span className="text-red-500">*</span>
              </label>
              <ToggleGroup
                options={PRINT_LOCATIONS}
                selected={watchedPrintLocations}
                onChange={v => setValue('printLocations', v, { shouldValidate: true })}
              />
              {errors.printLocations && <p className="mt-1 text-xs text-red-500">{errors.printLocations.message}</p>}
            </div>

            <div className="max-w-xs">
              <TouchInput
                label="Max Print Locations Allowed"
                type="number"
                {...register('maxPrintLocations', { valueAsNumber: true })}
                error={errors.maxPrintLocations?.message}
              />
            </div>
          </div>
        </TouchCard>

        {/* ── AVAILABLE OPTIONS ── */}
        <TouchCard padding="lg" className="border border-gray-200 shadow-sm">
          <SectionHeader icon={<CubeIcon className="h-5 w-5" />} title="Available Options" />
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Available Brands</label>
              <ToggleGroup
                options={BRANDS}
                selected={watchedBrands}
                onChange={v => setValue('availableBrands', v, { shouldValidate: true })}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Available Sizes <span className="text-red-500">*</span>
              </label>
              <ToggleGroup
                options={SIZES}
                selected={watchedSizes}
                onChange={v => setValue('availableSizes', v, { shouldValidate: true })}
              />
              {errors.availableSizes && <p className="mt-1 text-xs text-red-500">{errors.availableSizes.message}</p>}
            </div>
          </div>
        </TouchCard>

        {/* ── PRICING ── */}
        <TouchCard padding="lg" className="border border-gray-200 shadow-sm">
          <SectionHeader icon={<CurrencyDollarIcon className="h-5 w-5" />} title="Pricing" />
          <div className="space-y-6">

            {/* Base Price */}
            <div className="max-w-xs">
              <TouchInput
                label="Base Price ($)"
                type="number"
                step="0.01"
                required
                {...register('basePrice', { valueAsNumber: true })}
                error={errors.basePrice?.message}
              />
            </div>

            {/* Size Upcharges */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-700">Size Upcharges</p>
                <button
                  type="button"
                  onClick={() => sizeUCArray.append({ size: '', upcharge: 0 })}
                  className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-semibold min-h-[36px] px-3 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <PlusIcon className="h-4 w-4" /> Add Size Upcharge
                </button>
              </div>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold">Size</th>
                      <th className="text-left px-4 py-3 font-semibold">Extra Charge ($)</th>
                      <th className="px-4 py-3 w-12" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sizeUCArray.fields.length === 0 && (
                      <tr>
                        <td colSpan={3} className="text-center text-gray-400 py-4 text-sm italic">
                          No size upcharges — all sizes same price
                        </td>
                      </tr>
                    )}
                    {sizeUCArray.fields.map((field, i) => (
                      <tr key={field.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <select
                            {...register(`sizeUpcharges.${i}.size`)}
                            className="w-full min-h-[44px] rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                          >
                            <option value="">Size...</option>
                            {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            {...register(`sizeUpcharges.${i}.upcharge`, { valueAsNumber: true })}
                            className="w-full min-h-[44px] rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => sizeUCArray.remove(i)}
                            className="p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center mx-auto"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quantity Price Tiers */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-700">Quantity Price Tiers</p>
                <button
                  type="button"
                  onClick={() => tierArray.append({ minQty: 1, maxQty: null, unitPrice: 0 })}
                  className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-semibold min-h-[36px] px-3 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <PlusIcon className="h-4 w-4" /> Add Price Tier
                </button>
              </div>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold">Min Qty</th>
                      <th className="text-left px-4 py-3 font-semibold">Max Qty</th>
                      <th className="text-left px-4 py-3 font-semibold">Unit Price ($)</th>
                      <th className="px-4 py-3 w-12" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {tierArray.fields.map((field, i) => (
                      <tr key={field.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min="1"
                            {...register(`priceTiers.${i}.minQty`, { valueAsNumber: true })}
                            className="w-full min-h-[44px] rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min="1"
                            placeholder="∞"
                            {...register(`priceTiers.${i}.maxQty`, {
                              setValueAs: v => v === '' || v === null ? null : parseInt(v),
                            })}
                            className="w-full min-h-[44px] rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            {...register(`priceTiers.${i}.unitPrice`, { valueAsNumber: true })}
                            className="w-full min-h-[44px] rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => tierArray.remove(i)}
                            className="p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center mx-auto"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {tierArray.fields.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center text-gray-400 py-4 text-sm italic">
                          No price tiers — base price applies to all quantities
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {errors.priceTiers && (
                <p className="mt-1.5 text-xs text-red-500">{errors.priceTiers.message}</p>
              )}
            </div>
          </div>
        </TouchCard>

        {/* ── MATERIAL COSTS ── */}
        <TouchCard padding="lg" className="border border-gray-200 shadow-sm">
          <SectionHeader icon={<BeakerIcon className="h-5 w-5" />} title="Material Costs (for profit tracking)" />
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Material</th>
                  <th className="text-left px-4 py-3 font-semibold w-28">Qty/Unit</th>
                  <th className="text-left px-4 py-3 font-semibold w-32">Est. Cost ($)</th>
                  <th className="px-4 py-3 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {materialArray.fields.map((field, i) => (
                  <tr key={field.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        placeholder="e.g. Blank T-Shirt"
                        {...register(`materialCosts.${i}.material`)}
                        className="w-full min-h-[44px] rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        {...register(`materialCosts.${i}.qtyPerUnit`, { valueAsNumber: true })}
                        className="w-full min-h-[44px] rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        {...register(`materialCosts.${i}.estimatedCost`, { valueAsNumber: true })}
                        className="w-full min-h-[44px] rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => materialArray.remove(i)}
                        className="p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center mx-auto"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {materialArray.fields.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-gray-400 py-4 text-sm italic">
                      No materials added — profit tracking unavailable
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalCost > 0 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-wrap items-center gap-4 text-sm">
              <div>
                <span className="text-gray-500">Total cost/unit: </span>
                <span className="font-black text-gray-900">${totalCost.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-500">Profit at base price: </span>
                <span className={clsx('font-black', baseProfit >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                  ${baseProfit.toFixed(2)} ({baseMargin.toFixed(1)}%)
                </span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => materialArray.append({ id: generateId(), material: '', qtyPerUnit: 1, estimatedCost: 0 })}
            className="mt-4 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-semibold min-h-[44px] px-3 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <PlusIcon className="h-4 w-4" /> Add Material
          </button>
        </TouchCard>

        {/* ── ADD-ONS ── */}
        <TouchCard padding="lg" className="border border-gray-200 shadow-sm">
          <SectionHeader icon={<WrenchScrewdriverIcon className="h-5 w-5" />} title="Add-Ons" />
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Name</th>
                  <th className="text-left px-4 py-3 font-semibold w-32">Price ($)</th>
                  <th className="text-center px-4 py-3 font-semibold w-24">Active</th>
                  <th className="px-4 py-3 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {addOnArray.fields.map((field, i) => {
                  const isActive = watch(`addOns.${i}.isActive`);
                  return (
                    <tr key={field.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          placeholder="e.g. Rush Order"
                          {...register(`addOns.${i}.name`)}
                          className="w-full min-h-[44px] rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          {...register(`addOns.${i}.price`, { valueAsNumber: true })}
                          className="w-full min-h-[44px] rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Controller
                          name={`addOns.${i}.isActive`}
                          control={control}
                          render={({ field: f }) => (
                            <button
                              type="button"
                              onClick={() => f.onChange(!f.value)}
                              className={clsx(
                                'w-12 h-6 rounded-full border-2 relative transition-all min-h-[36px] min-w-[36px] mx-auto flex items-center',
                                isActive ? 'bg-emerald-500 border-emerald-500' : 'bg-gray-200 border-gray-200'
                              )}
                              aria-label="Toggle active"
                            >
                              <span className={clsx(
                                'absolute h-4 w-4 bg-white rounded-full shadow transition-all',
                                isActive ? 'left-6' : 'left-1'
                              )} />
                            </button>
                          )}
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => addOnArray.remove(i)}
                          className="p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center mx-auto"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {addOnArray.fields.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-gray-400 py-4 text-sm italic">
                      No add-ons configured
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={() => addOnArray.append({ id: generateId(), name: '', price: 0, isActive: true })}
            className="mt-4 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-semibold min-h-[44px] px-3 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <PlusIcon className="h-4 w-4" /> Add Add-On
          </button>
        </TouchCard>

        {/* ── PRODUCTION ── */}
        <TouchCard padding="lg" className="border border-gray-200 shadow-sm">
          <SectionHeader icon={<Cog6ToothIcon className="h-5 w-5" />} title="Production" />
          <div className="space-y-4">
            <div className="max-w-xs">
              <TouchInput
                label="Est. Production Time (minutes/unit)"
                type="number"
                min="0"
                {...register('estimatedProductionMinutes', { valueAsNumber: true })}
                error={errors.estimatedProductionMinutes?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Difficulty Level</label>
              <ToggleGroup
                options={['EASY', 'MEDIUM', 'COMPLEX']}
                selected={[watchedDifficulty]}
                multi={false}
                onChange={([v]) => setValue('difficulty', (v as 'EASY' | 'MEDIUM' | 'COMPLEX') ?? 'EASY')}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Production Notes</label>
              <textarea
                {...register('productionNotes')}
                placeholder="Press settings, special instructions, warnings..."
                rows={3}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </TouchCard>

        {/* ── STATUS ── */}
        <TouchCard padding="lg" className="border border-gray-200 shadow-sm">
          <SectionHeader icon={<CheckCircleIcon className="h-5 w-5" />} title="Status" />
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div>
                <p className="font-bold text-gray-900">Active</p>
                <p className="text-xs text-gray-500">Inactive products won't appear in new orders</p>
              </div>
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <TouchButton
                    type="button"
                    variant={field.value ? 'success' : 'secondary'}
                    size="sm"
                    onClick={() => field.onChange(!field.value)}
                  >
                    {field.value ? 'Active' : 'Inactive'}
                  </TouchButton>
                )}
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div>
                <p className="font-bold text-gray-900">Featured</p>
                <p className="text-xs text-gray-500">Show with a star badge in listings</p>
              </div>
              <Controller
                name="isFeatured"
                control={control}
                render={({ field }) => (
                  <TouchButton
                    type="button"
                    variant={field.value ? 'warning' : 'secondary'}
                    size="sm"
                    onClick={() => field.onChange(!field.value)}
                  >
                    {field.value ? '★ Featured' : 'Not Featured'}
                  </TouchButton>
                )}
              />
            </div>
          </div>
        </TouchCard>

        {/* ── Fixed bottom actions ── */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 z-20 lg:pl-72">
          <div className="max-w-4xl mx-auto flex gap-3">
            <TouchButton
              type="button"
              variant="secondary"
              size="lg"
              fullWidth
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
              {isEdit ? 'Save Changes' : 'Create Product'}
            </TouchButton>
          </div>
        </div>
      </form>
    </div>
  );
}
