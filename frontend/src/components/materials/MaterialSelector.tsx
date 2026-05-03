import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { GarmentForm } from './GarmentForm';
import { DTFForm } from './DTFForm';
import { HTVForm } from './HTVForm';
import { SupplyForm } from './SupplyForm';
import type { JSX } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MaterialCategory = 'BLANK_GARMENT' | 'DTF_TRANSFER' | 'HTV_VINYL' | 'SUPPLIES';

export interface MaterialItem {
  category: MaterialCategory;
  description: string;

  // Garment-specific
  brand?: string;
  styleNumber?: string;
  styleName?: string;
  productType?: string;
  sleeveType?: string;
  fabric?: string;
  weight?: string;
  fit?: string;
  color?: string;
  size?: string;
  sizeBreakdown?: Record<string, number>;

  // DTF-specific
  transferType?: string;
  sheetSize?: string;
  filmType?: string;
  finish?: string;
  whiteInkBase?: boolean;
  designsPerSheet?: number;
  designReference?: string;
  specialInstructions?: string;

  // HTV-specific
  htvBrand?: string;
  productLine?: string;
  vinylType?: string;
  htvColor?: string;
  rollSize?: string;
  pressTemp?: string;
  pressTime?: string;

  // Supply-specific
  supplyCategory?: string;
  itemName?: string;
  variant?: string;
  unit?: string;

  // Common
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface MaterialSelectorProps {
  context: 'order' | 'purchase-order' | 'inventory';
  defaultCategory?: MaterialCategory;
  defaultValues?: {
    productType?: string;
    brand?: string;
    style?: string;
    color?: string;
    size?: string;
    quantity?: number;
    printMethod?: string;
  };
  linkedOrder?: {
    id: string;
    orderNumber: string;
    items: unknown[];
  };
  onAddItem: (item: MaterialItem) => void;
  onCancel: () => void;
}

// ─── Category metadata ────────────────────────────────────────────────────────

interface CategoryMeta {
  id: MaterialCategory;
  emoji: string;
  title: string;
  subtitle: string;
}

const CATEGORIES: CategoryMeta[] = [
  {
    id: 'BLANK_GARMENT',
    emoji: '🎽',
    title: 'BLANK GARMENTS',
    subtitle: 'T-Shirts, Hoodies, Polos, Tanks, etc',
  },
  {
    id: 'DTF_TRANSFER',
    emoji: '🖨️',
    title: 'DTF TRANSFERS',
    subtitle: 'Gang Sheets, Single Transfers',
  },
  {
    id: 'HTV_VINYL',
    emoji: '✂️',
    title: 'HTV VINYL',
    subtitle: 'Siser, StarCraft, Glitter, Metallic',
  },
  {
    id: 'SUPPLIES',
    emoji: '📦',
    title: 'SUPPLIES',
    subtitle: 'Packaging, Press Supplies, Tools',
  },
];

const CATEGORY_LABELS: Record<MaterialCategory, string> = {
  BLANK_GARMENT: 'Blank Garments',
  DTF_TRANSFER: 'DTF Transfers',
  HTV_VINYL: 'HTV Vinyl',
  SUPPLIES: 'Supplies',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function MaterialSelector({
  defaultCategory,
  defaultValues,
  onAddItem,
  onCancel,
}: MaterialSelectorProps): JSX.Element {
  const [selectedCategory, setSelectedCategory] = useState<MaterialCategory | null>(
    defaultCategory ?? null
  );

  const handleAdd = (item: MaterialItem) => {
    onAddItem(item);
  };

  const handleBack = () => {
    setSelectedCategory(null);
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {/* ── Step 1: Category picker ── */}
        {!selectedCategory && (
          <motion.div
            key="picker"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.18 }}
          >
            <div className="grid grid-cols-2 gap-4">
              {CATEGORIES.map((cat) => (
                <CategoryButton
                  key={cat.id}
                  category={cat}
                  onSelect={() => setSelectedCategory(cat.id)}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Step 2: Category-specific form ── */}
        {selectedCategory && (
          <motion.div
            key={selectedCategory}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.18 }}
          >
            {/* Breadcrumb header */}
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                aria-label="Back to categories"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                  Category
                </p>
                <p className="text-base font-bold text-gray-900">
                  {CATEGORY_LABELS[selectedCategory]}
                </p>
              </div>
            </div>

            {/* Render the correct isolated form — NO cross-contamination */}
            {selectedCategory === 'BLANK_GARMENT' && (
              <GarmentForm
                onAdd={handleAdd}
                onCancel={onCancel}
                defaultValues={defaultValues}
              />
            )}

            {selectedCategory === 'DTF_TRANSFER' && (
              <DTFForm
                onAdd={handleAdd}
                onCancel={onCancel}
              />
            )}

            {selectedCategory === 'HTV_VINYL' && (
              <HTVForm
                onAdd={handleAdd}
                onCancel={onCancel}
              />
            )}

            {selectedCategory === 'SUPPLIES' && (
              <SupplyForm
                onAdd={handleAdd}
                onCancel={onCancel}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── CategoryButton ───────────────────────────────────────────────────────────

interface CategoryButtonProps {
  category: CategoryMeta;
  onSelect: () => void;
}

function CategoryButton({ category, onSelect }: CategoryButtonProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        'flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border-2',
        'min-h-[140px] text-center transition-all duration-150 select-none',
        'border-gray-200 bg-white hover:border-blue-500 hover:bg-blue-50',
        'active:scale-95 active:border-blue-600',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
      )}
    >
      <span className="text-4xl leading-none" role="img" aria-hidden="true">
        {category.emoji}
      </span>
      <span className="text-sm font-bold text-gray-900 leading-tight">
        {category.title}
      </span>
      <span className="text-xs text-gray-500 leading-snug">
        {category.subtitle}
      </span>
    </button>
  );
}
