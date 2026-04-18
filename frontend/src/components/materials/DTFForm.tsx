import { clsx } from 'clsx';
import { useForm, Controller } from 'react-hook-form';
import {
  getDTFSizes,
  calculateCustomPrice,
  generateDTFDescription,
  FILM_TYPES,
  FINISH_OPTIONS,
  type DTFTransferType,
  type DTFFilmType,
  type DTFFinish,
} from '../../constants/dtfCatalog';
import { CascadingSelect } from './CascadingSelect';
import { DescriptionPreview } from './DescriptionPreview';
import { TouchButton } from '../ui/TouchButton';
import type { MaterialItem } from './MaterialSelector';

interface DTFFormValues {
  transferType: DTFTransferType;
  sheetSize: string;
  width: number;
  height: number;
  filmType: DTFFilmType;
  finish: DTFFinish;
  whiteInkBase: 'Yes' | 'No' | 'Auto-detect';
  designReference: string;
  quantity: number;
  designsPerSheet: number;
  specialInstructions: string;
}

interface DTFFormProps {
  onAdd: (item: MaterialItem) => void;
  onCancel: () => void;
  defaultValues?: Partial<DTFFormValues>;
}

export function DTFForm({ onAdd, onCancel, defaultValues }: DTFFormProps) {
  const { control, watch, setValue, handleSubmit } = useForm<DTFFormValues>({
    defaultValues: {
      transferType: 'single' as DTFTransferType,
      sheetSize: '',
      width: 0,
      height: 0,
      filmType: 'Hot Peel' as DTFFilmType,
      finish: 'Matte' as DTFFinish,
      whiteInkBase: 'Yes' as const,
      designReference: '',
      quantity: 1,
      designsPerSheet: 1,
      specialInstructions: '',
      ...defaultValues,
    },
  });

  const transferType = watch('transferType');
  const sheetSize = watch('sheetSize');
  const width = watch('width');
  const height = watch('height');
  const filmType = watch('filmType');
  const finish = watch('finish');
  const whiteInkBase = watch('whiteInkBase');
  const designReference = watch('designReference');
  const quantity = watch('quantity');
  const designsPerSheet = watch('designsPerSheet');

  const availableSizes = getDTFSizes(transferType);
  const selectedSizeObj = availableSizes.find(s => s.label === sheetSize);

  const unitPrice = selectedSizeObj?.isCustom
    ? calculateCustomPrice(width || 0, height || 0, transferType)
    : (selectedSizeObj?.avgCost || 0);

  const totalPrice = quantity * unitPrice;

  const description = generateDTFDescription({
    transferType,
    sheetSize,
    filmType,
    finish,
    whiteInkBase: whiteInkBase === 'Yes' ? 'Yes' : whiteInkBase === 'No' ? 'No' : 'Auto-detect',
    designReference,
    quantity,
    designsPerSheet,
    rushProduction: false,
  });

  const onSubmit = (data: DTFFormValues): void => {
    onAdd({
      category: 'DTF_TRANSFER',
      description,
      transferType: data.transferType,
      sheetSize: data.sheetSize,
      filmType: data.filmType,
      finish: data.finish,
      whiteInkBase: data.whiteInkBase === 'Yes' ? true : data.whiteInkBase === 'No' ? false : undefined,
      designReference: data.designReference,
      designsPerSheet: data.designsPerSheet,
      specialInstructions: data.specialInstructions,
      quantity: data.quantity,
      unitPrice,
      totalPrice,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
      <div className="flex gap-3">
        {(['single', 'gang-sheet'] as const).map(type => (
          <button
            key={type}
            type="button"
            onClick={() => setValue('transferType', type)}
            className={clsx(
              'flex-1 py-2 rounded-lg text-sm font-medium border transition-all',
              transferType === type ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'
            )}
          >
            {type === 'single' ? 'Single Transfer' : 'Gang Sheet'}
          </button>
        ))}
      </div>

      <Controller
        name="sheetSize"
        control={control}
        render={({ field }) => (
          <CascadingSelect
            label="Sheet Size"
            value={field.value}
            options={availableSizes.map(s => s.label)}
            onChange={(val) => setValue('sheetSize', val)}
            placeholder="Select Size..."
          />
        )}
      />

      {selectedSizeObj?.isCustom && (
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Width (in)</label>
            <input
              type="number"
              value={width}
              onChange={(e) => setValue('width', parseFloat(e.target.value) || 0)}
              className="w-full min-h-[48px] rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Height (in)</label>
            <input
              type="number"
              value={height}
              onChange={(e) => setValue('height', parseFloat(e.target.value) || 0)}
              className="w-full min-h-[48px] rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-700">Film Type</label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(FILM_TYPES) as Array<keyof typeof FILM_TYPES>).map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setValue('filmType', type)}
              className={clsx(
                'px-4 py-2 rounded-lg text-xs font-medium border transition-all',
                filmType === type ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'
              )}
            >
              {type}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 italic">{FILM_TYPES[filmType as keyof typeof FILM_TYPES]?.description}</p>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-700">Finish</label>
        <div className="flex gap-2">
          {(Object.keys(FINISH_OPTIONS) as Array<keyof typeof FINISH_OPTIONS>).map(finish => (
            <button
              key={finish}
              type="button"
              onClick={() => setValue('finish', finish)}
              className={clsx(
                'flex-1 py-2 rounded-lg text-sm font-medium border transition-all',
                finish === finish ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'
              )}
            >
              {finish}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        {(['Yes', 'No', 'Auto-detect'] as const).map(option => (
          <button
            key={option}
            type="button"
            onClick={() => setValue('whiteInkBase', option)}
            className={clsx(
              'flex-1 py-2 rounded-lg text-sm font-medium border transition-all',
              whiteInkBase === option ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'
            )}
          >
            {option}
          </button>
        ))}
      </div>

      {transferType === 'gang-sheet' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Designs Per Sheet</label>
            <input
              type="number"
              value={designsPerSheet}
              onChange={(e) => setValue('designsPerSheet', parseInt(e.target.value) || 0)}
              className="w-full min-h-[48px] rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Total Transfers</label>
            <input
              type="number"
              value={quantity * designsPerSheet}
              readOnly
              className="w-full min-h-[48px] rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 outline-none"
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">Design Reference</label>
        <input
          type="text"
          value={designReference}
          onChange={(e) => setValue('designReference', e.target.value)}
          placeholder="e.g. VBS 2024 Logo - Order #0003"
          className="w-full min-h-[48px] rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

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
