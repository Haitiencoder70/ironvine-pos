/**
 * DTF (Direct to Film) Transfer Catalog
 * This catalog handles the specifications, pricing, and logic for ordering
 * pre-printed DTF transfers from vendors.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type DTFTransferType = 'single' | 'gang-sheet';
export type DTFFilmType = 'Hot Peel' | 'Cold Peel' | 'Warm Peel';
export type DTFFinish = 'Matte' | 'Glossy' | 'Semi-Gloss';

export interface DTFSize {
  label: string;
  width: number;
  height: number;
  avgCost: number;
  isCustom: boolean;
}

export interface DTFFilmOption {
  description: string;
  pressTemp: string;
  pressTime: string;
  bestFor: string;
  notes: string;
}

export interface DTFFinishOption {
  description: string;
  bestFor: string;
}

export interface DTFConfig {
  transferType: DTFTransferType;
  sheetSize: string; // Label from DTFSize
  width?: number;    // For custom sizes
  height?: number;   // For custom sizes
  filmType: DTFFilmType;
  finish: DTFFinish;
  whiteInkBase: 'Yes' | 'No' | 'Auto-detect';
  designReference: string;
  quantity: number;
  designsPerSheet?: number; // For gang sheets
  specialInstructions?: string;
  rushProduction: boolean;
}

// ─── Data ──────────────────────────────────────────────────────────────────

export const DTF_SINGLE_SIZES: DTFSize[] = [
  { label: '3" x 3"', width: 3, height: 3, avgCost: 1.00, isCustom: false },
  { label: '4" x 4"', width: 4, height: 4, avgCost: 1.50, isCustom: false },
  { label: '5" x 5"', width: 5, height: 5, avgCost: 2.00, isCustom: false },
  { label: '6" x 6"', width: 6, height: 6, avgCost: 2.50, isCustom: false },
  { label: '8" x 8"', width: 8, height: 8, avgCost: 3.00, isCustom: false },
  { label: '8" x 10"', width: 8, height: 10, avgCost: 3.50, isCustom: false },
  { label: '10" x 10"', width: 10, height: 10, avgCost: 4.00, isCustom: false },
  { label: '10" x 12"', width: 10, height: 12, avgCost: 5.00, isCustom: false },
  { label: '12" x 12"', width: 12, height: 12, avgCost: 5.50, isCustom: false },
  { label: '12" x 14"', width: 12, height: 14, avgCost: 6.00, isCustom: false },
  { label: '12" x 16"', width: 12, height: 16, avgCost: 7.00, isCustom: false },
  { label: '14" x 16"', width: 14, height: 16, avgCost: 8.00, isCustom: false },
  { label: '16" x 20"', width: 16, height: 20, avgCost: 10.00, isCustom: false },
  { label: 'Custom Size', width: 0, height: 0, avgCost: 0, isCustom: true },
];

export const DTF_GANG_SIZES: DTFSize[] = [
  { label: '22" x 24"', width: 22, height: 24, avgCost: 12.00, isCustom: false },
  { label: '22" x 44"', width: 22, height: 44, avgCost: 20.00, isCustom: false },
  { label: '22" x 60"', width: 22, height: 60, avgCost: 30.00, isCustom: false },
  { label: '22" x 72"', width: 22, height: 72, avgCost: 35.00, isCustom: false },
  { label: '22" x 96"', width: 22, height: 96, avgCost: 45.00, isCustom: false },
  { label: '22" x 120"', width: 22, height: 120, avgCost: 55.00, isCustom: false },
  { label: '24" x 24"', width: 24, height: 24, avgCost: 13.00, isCustom: false },
  { label: '24" x 60"', width: 24, height: 60, avgCost: 32.00, isCustom: false },
  { label: '24" x 96"', width: 24, height: 96, avgCost: 48.00, isCustom: false },
  { label: '24" x 120"', width: 24, height: 120, avgCost: 60.00, isCustom: false },
  { label: 'Custom Size', width: 0, height: 0, avgCost: 0, isCustom: true },
];

export const FILM_TYPES: Record<DTFFilmType, DTFFilmOption> = {
  'Hot Peel': {
    description: 'Peel transfer film immediately after heat press while still hot',
    pressTemp: '300-320°F',
    pressTime: '10-15 seconds',
    bestFor: 'Cotton, polyester, blends',
    notes: 'Most common. Fastest workflow.',
  },
  'Cold Peel': {
    description: 'Wait for transfer to cool completely before peeling',
    pressTemp: '300-320°F',
    pressTime: '15-20 seconds',
    bestFor: 'Detailed designs, photographs, fine text',
    notes: 'Better color accuracy. Takes longer per shirt.',
  },
  'Warm Peel': {
    description: 'Peel when transfer is warm but not hot',
    pressTemp: '300-320°F',
    pressTime: '12-15 seconds',
    bestFor: 'General purpose, good balance',
    notes: 'Good middle ground between hot and cold peel.',
  },
};

export const FINISH_OPTIONS: Record<DTFFinish, DTFFinishOption> = {
  'Matte': {
    description: 'Flat, no-shine finish. Looks like part of the fabric.',
    bestFor: 'Everyday wear, vintage look, text-heavy designs',
  },
  'Glossy': {
    description: 'Shiny, vibrant finish. Colors pop.',
    bestFor: 'Photos, bright designs, premium look',
  },
  'Semi-Gloss': {
    description: 'Subtle sheen. Between matte and glossy.',
    bestFor: 'General purpose, balanced appearance',
  },
};

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Returns available sizes based on transfer type
 */
export function getDTFSizes(transferType: DTFTransferType): DTFSize[] {
  return transferType === 'single' ? DTF_SINGLE_SIZES : DTF_GANG_SIZES;
}

/**
 * Calculates custom price per square inch
 */
export function calculateCustomPrice(width: number, height: number, type: DTFTransferType): number {
  const sqIn = width * height;
  const rate = type === 'single' ? 0.08 : 0.06;
  return sqIn * rate;
}

/**
 * Calculates how many designs fit on a sheet based on dimensions
 */
export function calculateDesignsPerSheet(
  designWidth: number,
  designHeight: number,
  sheetWidth: number,
  sheetHeight: number
): number {
  if (designWidth <= 0 || designHeight <= 0) return 0;

  // Try two orientations: normal and rotated 90 degrees
  const calcFit = (dw: number, dh: number) => {
    const cols = Math.floor(sheetWidth / dw);
    const rows = Math.floor(sheetHeight / dh);
    return cols * rows;
  };

  const normalFit = calcFit(designWidth, designHeight);
  const rotatedFit = calcFit(designHeight, designWidth);

  return Math.max(normalFit, rotatedFit);
}

/**
 * Estimates total sheets needed to cover a specific quantity of designs
 */
export function estimateSheetsNeeded(totalQuantity: number, designsPerSheet: number): number {
  if (designsPerSheet <= 0) return 0;
  return Math.ceil(totalQuantity / designsPerSheet);
}

/**
 * Automatically determines if white ink base is needed based on garment color
 */
export function needsWhiteBase(garmentColor: string): 'Yes' | 'No' {
  const darkColors = [
    'Black', 'Navy', 'Dark Heather', 'Charcoal', 'Forest Green', 'Maroon',
    'Royal', 'True Royal', 'Military Green', 'Indigo', 'Midnight Navy',
    'Dark Grey', 'Oxblood', 'Wine'
  ];

  const color = garmentColor.trim();
  const isDark = darkColors.some(dc =>
    color.toLowerCase().includes(dc.toLowerCase())
  );

  return isDark ? 'Yes' : 'No';
}

/**
 * Generates a full descriptive string for the DTF order
 */
export function generateDTFDescription(config: DTFConfig): string {
  const {
    transferType,
    sheetSize,
    filmType,
    finish,
    whiteInkBase,
    designReference,
    quantity,
    designsPerSheet
  } = config;

  const typeLabel = transferType === 'single' ? 'Single Transfer' : 'Gang Sheet';
  const base = `DTF ${typeLabel} ${sheetSize} - ${filmType} - ${finish}`;
  const whiteBaseLabel = whiteInkBase !== 'Auto-detect' ? ` - ${whiteInkBase === 'Yes' ? 'White Ink Base' : 'No White Base'}` : '';

  if (transferType === 'single') {
    return `${quantity}x ${base}${whiteBaseLabel} - ${designReference}`;
  } else {
    const designCount = designsPerSheet ? ` - ${designsPerSheet} designs per sheet` : '';
    const totalCount = designsPerSheet ? ` (${quantity * designsPerSheet} total)` : '';
    return `${quantity}x ${base}${whiteBaseLabel}${designCount} - ${designReference}${totalCount}`;
  }
}
