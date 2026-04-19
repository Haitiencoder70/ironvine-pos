/**
 * Supplies Catalog
 * This catalog handles everything the business needs that isn't a garment,
 * DTF transfer, or HTV vinyl.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type SupplyUnit =
  | 'each'
  | 'pack'
  | 'roll'
  | 'box'
  | 'case'
  | 'ream'
  | 'bag'
  | 'kit'
  | 'bottle'
  | 'pack of 25'
  | 'pack of 100'
  | 'pack of 250'
  | 'roll of 500'
  | 'each (60 sheets)';

export interface SupplyVariant {
  id: string;
  label: string;
  avgCost: number;
}

export interface SupplyItem {
  id: string;
  name: string;
  description?: string;
  unit: SupplyUnit;
  variants: SupplyVariant[];
  brands?: string[];
  additionalOptions?: {
    colors?: string[];
    types?: string[];
    gripTypes?: string[];
    packSizes?: number[];
  };
}

export interface SupplyCategory {
  id: string;
  label: string;
  items: SupplyItem[];
}

// ─── Data ──────────────────────────────────────────────────────────────────

export const SUPPLIES_CATALOG: SupplyCategory[] = [
  {
    id: 'HEAT_PRESS',
    label: 'Heat Press Supplies',
    items: [
      {
        id: 'teflon-sheet',
        name: 'Teflon/PTFE Sheet',
        description: 'Reusable non-stick sheet for heat press',
        unit: 'each',
        variants: [
          { id: '15x15', label: '15"x15"', avgCost: 8.00 },
          { id: '16x20', label: '16"x20"', avgCost: 10.00 },
          { id: '16x24', label: '16"x24"', avgCost: 12.00 },
        ],
      },
      {
        id: 'parchment-paper',
        name: 'Parchment Paper',
        description: 'Disposable protective paper for heat pressing',
        unit: 'pack',
        variants: [
          { id: '12x12-100', label: '12"x12" (100 sheets)', avgCost: 8.00 },
          { id: '15x15-100', label: '15"x15" (100 sheets)', avgCost: 10.00 },
          { id: '16x20-100', label: '16"x20" (100 sheets)', avgCost: 12.00 },
          { id: '16x24-100', label: '16"x24" (100 sheets)', avgCost: 15.00 },
        ],
      },
      {
        id: 'press-pillow',
        name: 'Heat Press Pillow',
        description: 'Foam pillow for pressing over seams, zippers, buttons',
        unit: 'each',
        variants: [
          { id: '5x5', label: '5"x5"', avgCost: 8.00 },
          { id: '10x10', label: '10"x10"', avgCost: 12.00 },
          { id: '15x15', label: '15"x15"', avgCost: 18.00 },
        ],
      },
      {
        id: 'heat-tape',
        name: 'Heat Tape (Thermal Tape)',
        description: 'Heat resistant tape for holding transfers in place',
        unit: 'roll',
        variants: [
          { id: '3mm', label: '3mm x 33m', avgCost: 3.00 },
          { id: '5mm', label: '5mm x 33m', avgCost: 3.50 },
          { id: '10mm', label: '10mm x 33m', avgCost: 4.50 },
          { id: '20mm', label: '20mm x 33m', avgCost: 6.00 },
        ],
      },
    ],
  },
  {
    id: 'WEEDING_CUTTING',
    label: 'Weeding & Cutting Supplies',
    items: [
      {
        id: 'weeding-kit',
        name: 'Weeding Tool Kit',
        unit: 'kit',
        variants: [
          { id: 'basic', label: 'Basic (3 piece)', avgCost: 5.00 },
          { id: 'standard', label: 'Standard (6 piece)', avgCost: 10.00 },
          { id: 'professional', label: 'Professional (12 piece)', avgCost: 20.00 },
        ],
      },
      {
        id: 'weeding-hook',
        name: 'Weeding Hook (individual)',
        unit: 'each',
        variants: [
          { id: 'standard', label: 'Standard Hook', avgCost: 3.00 },
          { id: 'fine', label: 'Fine Point Hook', avgCost: 4.00 },
          { id: 'curved', label: 'Curved Hook', avgCost: 4.50 },
        ],
      },
      {
        id: 'cutting-mat',
        name: 'Cutting Mat',
        unit: 'each',
        variants: [
          { id: '12x12', label: '12"x12"', avgCost: 8.00 },
          { id: '12x24', label: '12"x24"', avgCost: 12.00 },
          { id: '24x36', label: '24"x36"', avgCost: 25.00 },
        ],
        brands: ['Cricut', 'Silhouette', 'Generic'],
        additionalOptions: {
          gripTypes: ['Standard Grip', 'Light Grip', 'Strong Grip', 'Fabric Grip'],
        },
      },
      {
        id: 'replacement-blades',
        name: 'Replacement Blades',
        unit: 'pack',
        variants: [
          { id: 'std', label: 'Standard Blade', avgCost: 5.00 },
          { id: 'deep', label: 'Deep Cut Blade', avgCost: 10.00 },
          { id: 'rotary', label: 'Rotary Blade', avgCost: 18.00 },
          { id: 'fine', label: 'Fine Point Blade', avgCost: 18.00 },
        ],
        brands: ['Cricut', 'Silhouette', 'Roland', 'Generic'],
        additionalOptions: {
          packSizes: [2, 5, 10],
        },
      },
      {
        id: 'transfer-tape',
        name: 'Transfer Tape (for adhesive vinyl)',
        unit: 'roll',
        variants: [
          { id: '6x25', label: '6"x25ft', avgCost: 5.00 },
          { id: '12x25', label: '12"x25ft', avgCost: 8.00 },
          { id: '12x50', label: '12"x50ft', avgCost: 14.00 },
        ],
        additionalOptions: {
          types: ['Clear', 'Paper/Grid'],
        },
      },
    ],
  },
  {
    id: 'PACKAGING_SHIPPING',
    label: 'Packaging & Shipping',
    items: [
      {
        id: 'poly-mailers',
        name: 'Poly Mailers',
        unit: 'pack of 100',
        variants: [
          { id: '6x9', label: '6"x9"', avgCost: 8.00 },
          { id: '10x13', label: '10"x13"', avgCost: 10.00 },
          { id: '12x15', label: '12"x15.5"', avgCost: 12.00 },
          { id: '14x19', label: '14.5"x19"', avgCost: 14.00 },
          { id: '19x24', label: '19"x24"', avgCost: 18.00 },
        ],
        additionalOptions: {
          colors: ['White', 'Grey', 'Black', 'Pink', 'Custom'],
        },
      },
      {
        id: 'shipping-boxes',
        name: 'Shipping Boxes (corrugated)',
        unit: 'pack of 25',
        variants: [
          { id: '10x8x4', label: '10"x8"x4"', avgCost: 15.00 },
          { id: '12x10x4', label: '12"x10"x4"', avgCost: 18.00 },
          { id: '14x10x4', label: '14"x10"x4"', avgCost: 20.00 },
          { id: '16x12x6', label: '16"x12"x6"', avgCost: 25.00 },
          { id: '18x14x6', label: '18"x14"x6"', avgCost: 30.00 },
          { id: '20x14x8', label: '20"x14"x8"', avgCost: 35.00 },
        ],
      },
      {
        id: 'tissue-paper',
        name: 'Tissue Paper',
        unit: 'pack of 100',
        variants: [
          { id: '20x30', label: '20"x30"', avgCost: 8.00 },
        ],
        additionalOptions: {
          colors: ['White', 'Black', 'Kraft', 'Pink', 'Blue', 'Custom'],
        },
      },
      {
        id: 'thank-you-stickers',
        name: 'Thank You Stickers',
        unit: 'roll of 500',
        variants: [
          { id: '1-round', label: '1" round', avgCost: 6.00 },
          { id: '1.5-round', label: '1.5" round', avgCost: 8.00 },
          { id: '2-round', label: '2" round', avgCost: 10.00 },
          { id: '1.5x2.5-rect', label: '1.5"x2.5" rectangle', avgCost: 10.00 },
        ],
        additionalOptions: {
          types: ['Standard', 'Custom Branded'],
        },
      },
      {
        id: 'clear-garment-bags',
        name: 'Clear Garment Bags',
        description: 'Clear poly bags for individual garment packaging',
        unit: 'pack of 100',
        variants: [
          { id: '9x12', label: '9"x12"', avgCost: 8.00 },
          { id: '12x15', label: '12"x15"', avgCost: 10.00 },
          { id: '14x20', label: '14"x20"', avgCost: 14.00 },
        ],
      },
      {
        id: 'packing-tape',
        name: 'Packing Tape',
        unit: 'roll',
        variants: [
          { id: '2x110', label: '2" x 110yd', avgCost: 3.00 },
        ],
        additionalOptions: {
          types: ['Clear', 'Tan', 'Branded'],
        },
      },
      {
        id: 'shipping-labels',
        name: 'Shipping Labels',
        unit: 'pack of 250',
        variants: [
          { id: '4x6', label: '4"x6"', avgCost: 12.00 },
        ],
        additionalOptions: {
          types: ['Direct Thermal', 'Laser/Inkjet'],
        },
      },
      {
        id: 'bubble-wrap',
        name: 'Bubble Wrap',
        unit: 'roll',
        variants: [
          { id: '12x30', label: '12" x 30ft', avgCost: 8.00 },
          { id: '12x65', label: '12" x 65ft', avgCost: 14.00 },
          { id: '24x30', label: '24" x 30ft', avgCost: 14.00 },
        ],
      },
    ],
  },
  {
    id: 'CLEANING_MAINTENANCE',
    label: 'Cleaning & Maintenance',
    items: [
      {
        id: 'press-cleaner',
        name: 'Heat Press Cleaner',
        unit: 'bottle',
        variants: [
          { id: '8oz', label: '8oz', avgCost: 8.00 },
          { id: '16oz', label: '16oz', avgCost: 14.00 },
        ],
      },
      {
        id: 'lint-roller',
        name: 'Lint Roller',
        description: 'Remove lint/debris before pressing',
        unit: 'each (60 sheets)',
        variants: [
          { id: 'std', label: 'Standard', avgCost: 3.00 },
        ],
      },
      {
        id: 'pretreat-solution',
        name: 'Pre-Treat Solution (for DTG)',
        unit: 'bottle',
        variants: [
          { id: '32oz', label: '32oz', avgCost: 25.00 },
          { id: '1gal', label: '1 gallon', avgCost: 65.00 },
        ],
      },
    ],
  },
  {
    id: 'GARMENT_EXTRAS',
    label: 'Garment Extras',
    items: [
      {
        id: 'blank-hats',
        name: 'Blank Hats/Caps',
        unit: 'each',
        variants: [
          { id: 'snapback', label: 'Snapback', avgCost: 3.00 },
          { id: 'dad-hat', label: 'Dad Hat', avgCost: 4.00 },
          { id: 'trucker', label: 'Trucker', avgCost: 4.50 },
          { id: 'fitted', label: 'Fitted', avgCost: 5.00 },
          { id: 'beanie', label: 'Beanie', avgCost: 3.50 },
        ],
        additionalOptions: {
          colors: ['Black', 'White', 'Navy', 'Grey', 'Red', 'Camo'],
          types: ['One Size', 'S/M', 'L/XL'], // Using types for sizes here as it's a variant
        },
      },
      {
        id: 'blank-totes',
        name: 'Blank Tote Bags',
        unit: 'each',
        variants: [
          { id: 'std-canvas', label: 'Standard Canvas', avgCost: 2.00 },
          { id: 'heavy-canvas', label: 'Heavy Canvas', avgCost: 3.50 },
          { id: 'non-woven', label: 'Non-Woven', avgCost: 1.00 },
        ],
        additionalOptions: {
          colors: ['Natural', 'Black', 'White', 'Navy', 'Red'],
          types: ['Standard 15"x16"'],
        },
      },
    ],
  },
];

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Returns all supply sub-category labels
 */
export function getSupplyCategories(): string[] {
  return SUPPLIES_CATALOG.map(cat => cat.label);
}

/**
 * Returns items for a specific sub-category
 */
export function getItemsByCategory(categoryLabel: string): SupplyItem[] {
  const cat = SUPPLIES_CATALOG.find(c => c.label === categoryLabel);
  return cat ? cat.items : [];
}

/**
 * Returns available variants for a specific supply item
 */
export function getVariantsForItem(itemId: string): SupplyVariant[] {
  for (const cat of SUPPLIES_CATALOG) {
    const item = cat.items.find(i => i.id === itemId);
    if (item) return item.variants;
  }
  return [];
}

/**
 * Generates a full descriptive string for the supply item
 */
export function generateSupplyDescription(
  item: SupplyItem,
  variant: SupplyVariant,
  quantity: number,
  options: { color?: string; type?: string } = {}
): string {
  const colorPart = options.color ? ` - ${options.color}` : '';
  const typePart = options.type ? ` - ${options.type}` : '';

  return `${quantity}x ${item.name} ${variant.label}${colorPart}${typePart} - ${item.unit}`;
}
