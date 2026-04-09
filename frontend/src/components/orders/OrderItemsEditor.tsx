import { useCallback } from 'react';
import { useFieldArray, useFormContext, Controller } from 'react-hook-form';
import {
  PlusIcon,
  TrashIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { TouchButton } from '../ui/TouchButton';
import { TouchInput } from '../ui/TouchInput';
import type { NewOrderFormValues, OrderItemFormValues } from '../../pages/orders/NewOrder';

// ─── Constants ─────────────────────────────────────────────────────────────────

const PRODUCT_TYPES = [
  { value: 'TSHIRT', label: 'T-Shirt' },
  { value: 'HOODIE', label: 'Hoodie' },
  { value: 'POLO', label: 'Polo' },
  { value: 'TANK_TOP', label: 'Tank Top' },
  { value: 'LONG_SLEEVE', label: 'Long Sleeve' },
  { value: 'SWEATSHIRT', label: 'Sweatshirt' },
  { value: 'HAT', label: 'Hat' },
  { value: 'BAG', label: 'Bag' },
  { value: 'OTHER', label: 'Other' },
] as const;

const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'] as const;

const PRINT_METHODS = [
  { value: 'DTF', label: 'DTF (Direct to Film)' },
  { value: 'HTV', label: 'HTV (Heat Transfer Vinyl)' },
  { value: 'SCREEN_PRINT', label: 'Screen Print' },
  { value: 'EMBROIDERY', label: 'Embroidery' },
  { value: 'SUBLIMATION', label: 'Sublimation' },
  { value: 'DTG', label: 'DTG (Direct to Garment)' },
] as const;

const PRINT_LOCATIONS = [
  { value: 'FRONT', label: 'Front' },
  { value: 'BACK', label: 'Back' },
  { value: 'LEFT_SLEEVE', label: 'Left Sleeve' },
  { value: 'RIGHT_SLEEVE', label: 'Right Sleeve' },
  { value: 'FULL_PRINT', label: 'Full Print' },
] as const;

const SLEEVE_TYPES = [
  { value: 'SHORT', label: 'Short Sleeve' },
  { value: 'LONG', label: 'Long Sleeve' },
  { value: 'SLEEVELESS', label: 'Sleeveless' },
] as const;

// ─── Auto-calculate materials ─────────────────────────────────────────────────

function deriveRequiredMaterials(item: Partial<OrderItemFormValues>): string[] {
  const materials: string[] = [];
  if (!item.productType || !item.quantity) return materials;

  const qty = item.quantity;
  const label = PRODUCT_TYPES.find((p) => p.value === item.productType)?.label ?? item.productType;
  const sizeLabel = item.size ? ` (${item.size})` : '';
  const colorLabel = item.color ? ` - ${item.color}` : '';

  materials.push(`${qty}× Blank ${label}${sizeLabel}${colorLabel}`);

  if (item.printMethod === 'DTF') {
    materials.push(`${qty}× DTF Transfer (sized for ${label})`);
  } else if (item.printMethod === 'HTV') {
    const locs = item.printLocations?.length ?? 1;
    materials.push(`${qty * locs}× HTV Vinyl sheet`);
  } else if (item.printMethod === 'SCREEN_PRINT') {
    materials.push(`Ink (${item.printLocations?.length ?? 1} color screen setup)`);
  } else if (item.printMethod === 'EMBROIDERY') {
    materials.push(`Embroidery thread + backing (${item.printLocations?.length ?? 1} location)`);
  }

  return materials;
}

// ─── Currency formatter ───────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

// ─── Single Item Row ─────────────────────────────────────────────────────────

interface OrderItemRowProps {
  index: number;
  canRemove: boolean;
  onRemove: () => void;
}

function OrderItemRow({ index, canRemove, onRemove }: OrderItemRowProps) {
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = useFormContext<NewOrderFormValues>();

  const itemErrors = errors.items?.[index];
  const watchedItem = watch(`items.${index}`);
  const lineTotal = (watchedItem?.quantity ?? 0) * (watchedItem?.unitPrice ?? 0);
  const materials = deriveRequiredMaterials(watchedItem ?? {});

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4"
    >
      {/* Item header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Item #{index + 1}
        </span>
        <div className="flex items-center gap-3">
          {lineTotal > 0 && (
            <span className="text-base font-bold text-blue-600">{fmt(lineTotal)}</span>
          )}
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label="Remove item"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-red-500 hover:bg-red-50 transition-colors"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Row 1: Product type + Sleeve type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">
            Product Type <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              id={`items-${index}-productType`}
              {...register(`items.${index}.productType`)}
              className={clsx(
                'w-full min-h-[44px] rounded-xl border bg-white px-4 py-2 pr-8 text-base shadow-sm',
                'appearance-none cursor-pointer transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                itemErrors?.productType
                  ? 'border-red-400 text-red-900'
                  : 'border-gray-300 hover:border-gray-400'
              )}
            >
              <option value="">Select type…</option>
              {PRODUCT_TYPES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <ChevronDownIcon className="absolute right-3 top-3.5 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          {itemErrors?.productType && (
            <p className="text-xs text-red-500">{itemErrors.productType.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Sleeve Type</label>
          <div className="relative">
            <select
              id={`items-${index}-sleeveType`}
              {...register(`items.${index}.sleeveType`)}
              className="w-full min-h-[44px] rounded-xl border border-gray-300 bg-white px-4 py-2 pr-8 text-base shadow-sm appearance-none cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400"
            >
              <option value="">Any</option>
              {SLEEVE_TYPES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <ChevronDownIcon className="absolute right-3 top-3.5 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Row 2: Size + Color + Qty + Unit Price */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Size</label>
          <div className="relative">
            <select
              id={`items-${index}-size`}
              {...register(`items.${index}.size`)}
              className="w-full min-h-[44px] rounded-xl border border-gray-300 bg-white px-4 py-2 pr-8 text-base shadow-sm appearance-none cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400"
            >
              <option value="">Any</option>
              {SIZES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <ChevronDownIcon className="absolute right-3 top-3.5 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <TouchInput
          label="Color"
          placeholder="Black"
          {...register(`items.${index}.color`)}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">
            Qty <span className="text-red-500">*</span>
          </label>
          <input
            id={`items-${index}-quantity`}
            type="number"
            min={1}
            max={10000}
            {...register(`items.${index}.quantity`, { valueAsNumber: true })}
            className={clsx(
              'w-full min-h-[44px] rounded-xl border bg-white px-4 py-2 text-base shadow-sm transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              itemErrors?.quantity
                ? 'border-red-400 text-red-900'
                : 'border-gray-300 hover:border-gray-400'
            )}
          />
          {itemErrors?.quantity && (
            <p className="text-xs text-red-500">{itemErrors.quantity.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">
            Unit Price <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 text-base">$</span>
            <input
              id={`items-${index}-unitPrice`}
              type="number"
              min={0}
              step="0.01"
              {...register(`items.${index}.unitPrice`, { valueAsNumber: true })}
              className={clsx(
                'w-full min-h-[44px] rounded-xl border bg-white pl-7 pr-4 py-2 text-base shadow-sm transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                itemErrors?.unitPrice
                  ? 'border-red-400 text-red-900'
                  : 'border-gray-300 hover:border-gray-400'
              )}
            />
          </div>
          {itemErrors?.unitPrice && (
            <p className="text-xs text-red-500">{itemErrors.unitPrice.message}</p>
          )}
        </div>
      </div>

      {/* Row 3: Print Method */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">Print Method</label>
        <div className="relative">
          <select
            id={`items-${index}-printMethod`}
            {...register(`items.${index}.printMethod`)}
            className="w-full min-h-[44px] rounded-xl border border-gray-300 bg-white px-4 py-2 pr-8 text-base shadow-sm appearance-none cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400"
          >
            <option value="">Select method…</option>
            {PRINT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <ChevronDownIcon className="absolute right-3 top-3.5 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Row 4: Print Locations (checkboxes) */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">Print Locations</label>
        <Controller
          name={`items.${index}.printLocations`}
          control={control}
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {PRINT_LOCATIONS.map((loc) => {
                const isChecked = (field.value ?? []).includes(loc.value);
                return (
                  <label
                    key={loc.value}
                    className={clsx(
                      'flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer',
                      'min-h-[44px] text-sm font-medium transition-all duration-150 select-none',
                      isChecked
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                        : 'bg-white border-gray-300 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                    )}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={isChecked}
                      onChange={() => {
                        const current = field.value ?? [];
                        if (isChecked) {
                          field.onChange(current.filter((v) => v !== loc.value));
                        } else {
                          field.onChange([...current, loc.value]);
                        }
                      }}
                    />
                    {loc.label}
                  </label>
                );
              })}
            </div>
          )}
        />
      </div>

      {/* Row 5: Item description / notes */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">Item Notes</label>
        <textarea
          id={`items-${index}-description`}
          rows={2}
          placeholder="Special instructions for this item…"
          {...register(`items.${index}.description`)}
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-base shadow-sm transition-colors placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400 resize-none"
        />
      </div>

      {/* Required materials preview */}
      {materials.length > 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1.5">
            Estimated Materials
          </p>
          <ul className="space-y-0.5">
            {materials.map((m, i) => (
              <li key={i} className="text-sm text-amber-800 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}

// ─── OrderItemsEditor — exported component ────────────────────────────────────

export function OrderItemsEditor() {
  const { control } = useFormContext<NewOrderFormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const addItem = useCallback(() => {
    append({
      productType: '',
      size: '',
      color: '',
      sleeveType: '',
      quantity: 1,
      unitPrice: 0,
      printMethod: '',
      printLocations: [],
      description: '',
    });
  }, [append]);

  return (
    <div className="space-y-4">
      <AnimatePresence initial={false}>
        {fields.map((field, index) => (
          <OrderItemRow
            key={field.id}
            index={index}
            canRemove={fields.length > 1}
            onRemove={() => remove(index)}
          />
        ))}
      </AnimatePresence>

      <TouchButton
        id="add-order-item"
        type="button"
        variant="secondary"
        size="md"
        fullWidth
        icon={<PlusIcon className="h-5 w-5" />}
        onClick={addItem}
      >
        Add Another Item
      </TouchButton>
    </div>
  );
}
