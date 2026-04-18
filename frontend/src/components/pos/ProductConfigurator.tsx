import { useState, useCallback } from 'react';
import {
  getBrands,
  getStylesByBrand,
  getColorsByBrandAndStyle,
  getSizesByBrandAndStyle,
  generateGarmentDescription
} from '../../constants/productCatalog';
import { Modal } from '../ui/Modal';
import { TouchButton } from '../ui/TouchButton';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { clsx } from 'clsx';

interface ProductConfiguratorProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (config: {
    name: string;
    sku: string;
    color: string;
    size: string;
    costPrice: number;
  }) => void;
}

export function ProductConfigurator({ isOpen, onClose, onConfirm }: ProductConfiguratorProps) {
  const [brand, setBrand] = useState('');
  const [styleId, setStyleId] = useState('');
  const [color, setColor] = useState('');
  const [size, setSize] = useState('');

  const availableBrands = getBrands();
  const availableStyles = brand ? getStylesByBrand(brand) : [];
  const availableColors = (brand && styleId) ? getColorsByBrandAndStyle(brand, styleId) : [];
  const availableSizes = (brand && styleId) ? getSizesByBrandAndStyle(brand, styleId) : [];

  const handleBrandChange = (val: string) => {
    setBrand(val);
    setStyleId('');
    setColor('');
    setSize('');
  };

  const handleStyleChange = (val: string) => {
    setStyleId(val);
    setColor('');
    setSize('');
  };

  const handleConfirm = () => {
    if (!brand || !styleId || !color || !size) return;

    const style = availableStyles.find(s => s.styleNumber === styleId);
    if (!style) return;

    onConfirm({
      name: `${brand} ${style.styleName}`,
      sku: `${brand.substring(0,3)}-${style.styleNumber}-${color.substring(0,3)}-${size}`,
      color,
      size,
      costPrice: style.avgCost,
    });

    // Reset for next time
    setBrand('');
    setStyleId('');
    setColor('');
    setSize('');
    onClose();
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Configure Blank Garment"
      description="Select the specific brand, style, color, and size for this item."
      size="md"
    >
      <div className="space-y-6 py-4">
        {/* Brand Selection */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Brand</label>
          <div className="relative">
            <select
              value={brand}
              onChange={(e) => handleBrandChange(e.target.value)}
              className="w-full min-h-[48px] rounded-xl border border-gray-300 bg-white px-4 py-2 text-base appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Brand...</option>
              {availableBrands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <ChevronDownIcon className="absolute right-3 top-3.5 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Style Selection */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Style</label>
          <div className="relative">
            <select
              disabled={!brand}
              value={styleId}
              onChange={(e) => handleStyleChange(e.target.value)}
              className={clsx(
                "w-full min-h-[48px] rounded-xl border border-gray-300 bg-white px-4 py-2 text-base appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500",
                !brand && "opacity-50 cursor-not-allowed bg-gray-50"
              )}
            >
              <option value="">Select Style...</option>
              {availableStyles.map(s => (
                <option key={s.styleNumber} value={s.styleNumber}>
                  {s.styleNumber} - {s.styleName}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="absolute right-3 top-3.5 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Color & Size Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Color</label>
            <div className="relative">
              <select
                disabled={!styleId}
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className={clsx(
                  "w-full min-h-[48px] rounded-xl border border-gray-300 bg-white px-4 py-2 text-base appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500",
                  !styleId && "opacity-50 cursor-not-allowed bg-gray-50"
                )}
              >
                <option value="">Select Color...</option>
                {availableColors.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDownIcon className="absolute right-3 top-3.5 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Size</label>
            <div className="relative">
              <select
                disabled={!styleId}
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className={clsx(
                  "w-full min-h-[48px] rounded-xl border border-gray-300 bg-white px-4 py-2 text-base appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500",
                  !styleId && "opacity-50 cursor-not-allowed bg-gray-50"
                )}
              >
                <option value="">Select Size...</option>
                {availableSizes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDownIcon className="absolute right-3 top-3.5 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <TouchButton
            variant="secondary"
            size="md"
            fullWidth
            onClick={onClose}
          >
            Cancel
          </TouchButton>
          <TouchButton
            variant="primary"
            size="md"
            fullWidth
            disabled={!brand || !styleId || !color || !size}
            onClick={handleConfirm}
          >
            Add to Cart
          </TouchButton>
        </div>
      </div>
    </Modal>
  );
}
