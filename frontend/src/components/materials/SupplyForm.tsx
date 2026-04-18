import { useForm, Controller } from 'react-hook-form';
import {
  getSupplyCategories,
  getItemsByCategory,
  getVariantsForItem,
  generateSupplyDescription,
} from '../../constants/suppliesCatalog';
import { CascadingSelect } from './CascadingSelect';
import { DescriptionPreview } from './DescriptionPreview';
import { TouchButton } from '../ui/TouchButton';
import type { MaterialItem } from './MaterialSelector';

interface SupplyFormValues {
  supplyCategory: string;
  itemId: string;
  variantId: string;
  color: string;
  type: string;
  quantity: number;
}

interface SupplyFormProps {
  onAdd: (item: MaterialItem) => void;
  onCancel: () => void;
  defaultValues?: Partial<SupplyFormValues>;
}

export function SupplyForm({ onAdd, onCancel, defaultValues }: SupplyFormProps) {
  const { control, watch, setValue, handleSubmit } = useForm<SupplyFormValues>({
    defaultValues: {
      supplyCategory: '',
      itemId: '',
      variantId: '',
      color: '',
      type: '',
      quantity: 1,
      ...defaultValues,
    },
  });

  const supplyCategory = watch('supplyCategory');
  const itemId = watch('itemId');
  const variantId = watch('variantId');
  const color = watch('color');
  const type = watch('type');
  const quantity = watch('quantity');

  const categories = getSupplyCategories();
  const items = supplyCategory ? getItemsByCategory(supplyCategory) : [];
  const variants = itemId ? getVariantsForItem(itemId) : [];

  const selectedItem = items.find(i => i.id === itemId);
  const selectedVariant = variants.find(v => v.id === variantId);

  const unitPrice = selectedVariant?.avgCost || 0;
  const totalPrice = quantity * unitPrice;

  const description = (selectedItem && selectedVariant)
    ? generateSupplyDescription(selectedItem, selectedVariant, quantity, { color, type })
    : '';

  const onSubmit = (_data: SupplyFormValues): void => {
    onAdd({
      category: 'SUPPLIES',
      description,
      supplyCategory,
      itemName: selectedItem?.name,
      variant: selectedVariant?.label,
      unit: selectedItem?.unit,
      quantity,
      unitPrice,
      totalPrice,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
      <Controller
        name="supplyCategory"
        control={control}
        render={({ field }) => (
          <CascadingSelect
            label="Supply Category"
            value={field.value}
            options={categories}
            onChange={(val) => {
              setValue('supplyCategory', val);
              setValue('itemId', '');
              setValue('variantId', '');
            }}
            placeholder="Select Category..."
          />
        )}
      />

      <Controller
        name="itemId"
        control={control}
        render={({ field }) => (
          <CascadingSelect
            label="Item"
            value={field.value}
            options={items.map(i => i.name)}
            onChange={(val) => {
              const item = items.find(i => i.name === val);
              setValue('itemId', item?.id || '');
              setValue('variantId', '');
            }}
            disabled={!supplyCategory}
            placeholder="Select Item..."
          />
        )}
      />

      <Controller
        name="variantId"
        control={control}
        render={({ field }) => (
          <CascadingSelect
            label="Variant/Size"
            value={field.value}
            options={variants.map(v => v.label)}
            onChange={(val) => {
              const variant = variants.find(v => v.label === val);
              setValue('variantId', variant?.id || '');
            }}
            disabled={!itemId}
            placeholder="Select Variant..."
          />
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Color (Optional)</label>
          <input
            type="text"
            value={color}
            onChange={(e) => setValue('color', e.target.value)}
            placeholder="e.g. White"
            className="w-full min-h-[48px] rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Type (Optional)</label>
          <input
            type="text"
            value={type}
            onChange={(e) => setValue('type', e.target.value)}
            placeholder="e.g. Standard"
            className="w-full min-h-[48px] rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">Quantity</label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={quantity}
            onChange={(e) => setValue('quantity', parseInt(e.target.value) || 0)}
            className="flex-1 min-h-[48px] rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-500 min-w-[80px]">
            {selectedItem?.unit || 'units'}
          </span>
        </div>
      </div>

      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-xl border border-blue-100">
        <div>
          <p className="text-xs text-blue-600 font-bold uppercase">Unit Cost</p>
          <p className="text-lg font-bold text-blue-900">${unitPrice.toFixed(2)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-blue-600 font-bold uppercase">Line Total</p>
          <p className="text-xl font-bold text-blue-900">${totalPrice.toFixed(2)}</p>
        </div>
      </div>

      <DescriptionPreview description={description} />

      <div className="flex gap-3 pt-4">
        <TouchButton variant="secondary" fullWidth onClick={onCancel}>Cancel</TouchButton>
        <TouchButton variant="primary" fullWidth type="submit">Add to Order ✓</TouchButton>
      </div>
    </form>
  );
}
