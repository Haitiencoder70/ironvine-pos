import { useForm, Controller } from 'react-hook-form';
import {
  getHTVBrands,
  getProductLinesByBrand,
  getColorsByProductLine,
  getSizesByProductLine,
  getProductLineDetails,
  generateHTVDescription
} from '../../constants/htvCatalog';
import { CascadingSelect } from './CascadingSelect';
import { DescriptionPreview } from './DescriptionPreview';
import { TouchButton } from '../ui/TouchButton';
import type { MaterialItem } from './MaterialSelector';

interface HTVFormValues {
  brand: string;
  productLine: string;
  color: string;
  size: string;
  quantity: number;
}

interface HTVFormProps {
  onAdd: (item: MaterialItem) => void;
  onCancel: () => void;
  defaultValues?: Partial<HTVFormValues>;
}

export function HTVForm({ onAdd, onCancel, defaultValues }: HTVFormProps) {
  const { control, watch, setValue, handleSubmit } = useForm<HTVFormValues>({
    defaultValues: {
      brand: '',
      productLine: '',
      color: '',
      size: '',
      quantity: 1,
      ...defaultValues,
    },
  });

  const brand = watch('brand');
  const productLine = watch('productLine');
  const color = watch('color');
  const size = watch('size');
  const quantity = watch('quantity');

  const availableBrands = getHTVBrands();
  const availableLines = brand ? getProductLinesByBrand(brand) : [];
  const availableColors = (brand && productLine) ? getColorsByProductLine(brand, productLine) : [];
  const availableSizes = (brand && productLine) ? getSizesByProductLine(brand, productLine) : [];
  const details = (brand && productLine) ? getProductLineDetails(brand, productLine) : null;

  const unitPrice = details?.sizes.find(s => s.name === size)?.avgCost || 0;
  const totalPrice = quantity * unitPrice;

  const description = generateHTVDescription(brand, productLine, color, size, quantity);

  const onSubmit = (): void => {
    onAdd({
      category: 'HTV_VINYL',
      description,
      htvBrand: brand,
      productLine,
      vinylType: details?.vinylType,
      htvColor: color,
      rollSize: size,
      pressTemp: details?.pressTemp,
      pressTime: details?.pressTime,
      quantity,
      unitPrice,
      totalPrice,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
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
              setValue('productLine', '');
              setValue('color', '');
              setValue('size', '');
            }}
            placeholder="Select Brand..."
          />
        )}
      />

      <Controller
        name="productLine"
        control={control}
        render={({ field }) => (
          <CascadingSelect
            label="Product Line"
            value={field.value}
            options={availableLines}
            onChange={(val) => {
              setValue('productLine', val);
              setValue('color', '');
              setValue('size', '');
            }}
            disabled={!brand}
            placeholder="Select Product..."
          />
        )}
      />

      {details && (
        <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-gray-400">Vinyl Type</span>
            <span className="text-sm font-medium text-gray-700">{details.vinylType}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-gray-400">Press Temp</span>
            <span className="text-sm font-medium text-gray-700">{details.pressTemp || 'N/A'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-gray-400">Press Time</span>
            <span className="text-sm font-medium text-gray-700">{details.pressTime || 'N/A'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-gray-400">Best For</span>
            <span className="text-sm font-medium text-gray-700 truncate">{details.description}</span>
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
            disabled={!productLine}
            placeholder="Select Color..."
          />
        )}
      />

      <Controller
        name="size"
        control={control}
        render={({ field }) => (
          <CascadingSelect
            label="Size"
            value={field.value}
            options={availableSizes.map(s => s.name)}
            onChange={(val) => setValue('size', val)}
            disabled={!productLine}
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
          className="w-full min-h-[48px] rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
        />
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
