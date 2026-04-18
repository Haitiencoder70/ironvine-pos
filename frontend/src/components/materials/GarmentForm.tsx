import { clsx } from 'clsx';
import {
  getBrands,
  getStylesByBrand,
  getColorsByBrandAndStyle,
  getSizesByBrandAndStyle,
  generateGarmentDescription
} from '../../constants/productCatalog';
import { useForm, Controller } from 'react-hook-form';
import { CascadingSelect } from './CascadingSelect';
import { SizeGrid } from './SizeGrid';
import { DescriptionPreview } from './DescriptionPreview';
import { TouchButton } from '../ui/TouchButton';
import type { MaterialItem } from './MaterialSelector';

interface GarmentFormValues {
  brand: string;
  styleNumber: string;
  color: string;
  sizeType: 'single' | 'multiple';
  size: string;
  sizeBreakdown: Record<string, number>;
  quantity: number;
}

interface GarmentFormProps {
  onAdd: (item: MaterialItem) => void;
  onCancel: () => void;
  defaultValues?: Partial<GarmentFormValues>;
}

export function GarmentForm({ onAdd, onCancel, defaultValues }: GarmentFormProps) {
  const { control, watch, setValue, handleSubmit, formState: { errors } } = useForm<GarmentFormValues>({
    defaultValues: {
      brand: '',
      styleNumber: '',
      color: '',
      sizeType: 'single' as const,
      size: '',
      sizeBreakdown: {},
      quantity: 1,
      ...defaultValues,
    },
  });

  const brand = watch('brand');
  const styleNumber = watch('styleNumber');
  const sizeType = watch('sizeType');
  const color = watch('color');
  const size = watch('size');
  const sizeBreakdown = watch('sizeBreakdown');
  const quantity = watch('quantity');

  const availableBrands = getBrands();
  const availableStyles = brand ? getStylesByBrand(brand) : [];
  const availableColors = (brand && styleNumber) ? getColorsByBrandAndStyle(brand, styleNumber) : [];
  const availableSizes = (brand && styleNumber) ? getSizesByBrandAndStyle(brand, styleNumber) : [];

  const currentStyle = availableStyles.find(s => s.styleNumber === styleNumber);

  const totalQty = sizeType === 'single'
    ? quantity
    : Object.values(sizeBreakdown).reduce((a: number, b: number) => a + b, 0);

  const description = generateGarmentDescription(
    brand,
    styleNumber,
    color,
    sizeType === 'single' ? size : 'Mixed',
    totalQty
  );

  const onSubmit = (_data: GarmentFormValues): void => {
    onAdd({
      category: 'BLANK_GARMENT',
      description,
      brand,
      styleNumber,
      styleName: currentStyle?.styleName,
      productType: currentStyle?.productType,
      sleeveType: currentStyle?.sleeveType,
      fabric: currentStyle?.fabric,
      weight: currentStyle?.weight,
      color,
      size: sizeType === 'single' ? size : 'Mixed',
      sizeBreakdown: sizeType === 'multiple' ? sizeBreakdown : undefined,
      quantity: totalQty,
      unitPrice: currentStyle?.avgCost ?? 0,
      totalPrice: totalQty * (currentStyle?.avgCost ?? 0),
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
      <div className="grid grid-cols-1 gap-4">
        <Controller
          name="brand"
          control={control}
          render={({ field }) => (
            <CascadingSelect
              label="Brand"
              value={field.value}
              options={availableBrands}
              onChange={(val) => {
                setValue('brand', val);
                setValue('styleNumber', '');
                setValue('color', '');
                setValue('size', '');
              }}
              placeholder="Select Brand..."
              error={errors.brand?.message as string}
            />
          )}
        />

        <Controller
          name="styleNumber"
          control={control}
          render={({ field }) => (
            <CascadingSelect
              label="Style"
              value={field.value}
              options={availableStyles.map(s => s.styleNumber)}
              onChange={(val) => {
                setValue('styleNumber', val);
                setValue('color', '');
                setValue('size', '');
              }}
              disabled={!brand}
              placeholder="Select Style..."
              error={errors.styleNumber?.message as string}
            />
          )}
        />

        {currentStyle && (
          <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-gray-400">Type</span>
              <span className="text-sm font-medium text-gray-700">{currentStyle.productType}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-gray-400">Sleeve</span>
              <span className="text-sm font-medium text-gray-700">{currentStyle.sleeveType}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-gray-400">Fabric</span>
              <span className="text-sm font-medium text-gray-700">{currentStyle.fabric}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-gray-400">Weight</span>
              <span className="text-sm font-medium text-gray-700">{currentStyle.weight}</span>
            </div>
          </div>
        )}

        <Controller
          name="color"
          control={control}
          render={({ field }) => (
            <CascadingSelect
              label="Color"
              value={field.value}
              options={availableColors}
              onChange={(val) => setValue('color', val)}
              disabled={!styleNumber}
              placeholder="Select Color..."
              error={errors.color?.message as string}
            />
          )}
        />

        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">Size Selection</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setValue('sizeType', 'single')}
              className={clsx(
                'flex-1 py-2 rounded-lg text-sm font-medium border transition-all',
                sizeType === 'single' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'
              )}
            >
              Single Size
            </button>
            <button
              type="button"
              onClick={() => setValue('sizeType', 'multiple')}
              className={clsx(
                'flex-1 py-2 rounded-lg text-sm font-medium border transition-all',
                sizeType === 'multiple' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'
              )}
            >
              Multiple Sizes
            </button>
          </div>

          {sizeType === 'single' ? (
            <div className="grid grid-cols-2 gap-4">
              <Controller
                name="size"
                control={control}
                render={({ field }) => (
                  <CascadingSelect
                    label="Size"
                    value={field.value}
                    options={availableSizes}
                    onChange={(val) => setValue('size', val)}
                    disabled={!styleNumber}
                    placeholder="Select Size..."
                  />
                )}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Quantity</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setValue('quantity', parseInt(e.target.value) || 0)}
                  className="w-full min-h-[48px] rounded-xl border border-gray-300 px-4 py-2 text-base outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          ) : (
            <SizeGrid
              sizes={availableSizes}
              values={sizeBreakdown}
              onChange={(size, qty) => {
                setValue('sizeBreakdown', { ...sizeBreakdown, [size]: qty });
              }}
            />
          )}
        </div>

        <div className="flex justify-between items-center p-3 bg-blue-50 rounded-xl border border-blue-100">
          <div>
            <p className="text-xs text-blue-600 font-bold uppercase">Unit Cost</p>
            <p className="text-lg font-bold text-blue-900">${(currentStyle?.avgCost || 0).toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-blue-600 font-bold uppercase">Line Total</p>
            <p className="text-xl font-bold text-blue-900">${(totalQty * (currentStyle?.avgCost || 0)).toFixed(2)}</p>
          </div>
        </div>

        <DescriptionPreview description={description} />
      </div>

      <div className="flex gap-3 pt-4">
        <TouchButton variant="secondary" fullWidth onClick={onCancel}>Cancel</TouchButton>
        <TouchButton variant="primary" fullWidth type="submit">Add to Order ✓</TouchButton>
      </div>
    </form>
  );
}
