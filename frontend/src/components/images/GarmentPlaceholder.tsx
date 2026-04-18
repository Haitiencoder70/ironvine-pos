import React from 'react';
import { clsx } from 'clsx';
import { getGarmentColorHex } from '../../utils/colorMap';
import { TShirtSVG } from './garments/TShirtSVG';
import { HoodieSVG } from './garments/HoodieSVG';
import { PoloSVG } from './garments/PoloSVG';
import { LongSleeveSVG } from './garments/LongSleeveSVG';
import { TankTopSVG } from './garments/TankTopSVG';
import { SweatshirtSVG } from './garments/SweatshirtSVG';

// ─── Types ────────────────────────────────────────────────────────────────────

type SupportedGarmentType =
  | 'TSHIRT'
  | 'HOODIE'
  | 'POLO'
  | 'LONG_SLEEVE'
  | 'TANK_TOP'
  | 'SWEATSHIRT';

export interface GarmentPlaceholderProps {
  garmentType: SupportedGarmentType;
  /** Color name (e.g. "Black", "Navy Blue") or hex string (#1a1a1a) */
  color: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  view?: 'front' | 'back';
  showPrintArea?: boolean;
  /** Highlight specific print regions (e.g. ['Front', 'Left Sleeve']) */
  printLocations?: string[];
  /** URL of design image to composite onto the garment */
  designOverlay?: string;
  /** Which print region the design occupies (defaults to primary region for view) */
  designOverlayLocation?: string;
  className?: string;
}

// ─── Size Map ─────────────────────────────────────────────────────────────────

const SIZE_CLASS: Record<NonNullable<GarmentPlaceholderProps['size']>, string> = {
  sm: 'w-24 h-28',
  md: 'w-40 h-48',
  lg: 'w-64 h-76',
  xl: 'w-96 h-[28rem]',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function GarmentPlaceholder({
  garmentType,
  color,
  size = 'md',
  view = 'front',
  showPrintArea = false,
  printLocations = [],
  designOverlay,
  designOverlayLocation,
  className,
}: GarmentPlaceholderProps): React.JSX.Element {
  // Accept hex directly, or convert from color name
  const hexColor = color.startsWith('#') ? color : getGarmentColorHex(color);

  const svgProps = {
    color: hexColor,
    view,
    showPrintArea: showPrintArea || printLocations.length > 0,
    activePrintLocations: printLocations,
    designOverlay,
    designOverlayLocation,
  };

  const GarmentComponent = GARMENT_COMPONENT_MAP[garmentType] ?? TShirtSVG;

  return (
    <div
      className={clsx(SIZE_CLASS[size], 'flex items-center justify-center', className)}
      role="img"
      aria-label={`${garmentType.replace('_', ' ').toLowerCase()} in ${color}`}
    >
      <GarmentComponent {...svgProps} className="w-full h-full" />
    </div>
  );
}

// ─── Garment Router ───────────────────────────────────────────────────────────

const GARMENT_COMPONENT_MAP: Record<SupportedGarmentType, React.ComponentType<import('./garments/types').GarmentSVGProps>> = {
  TSHIRT:      TShirtSVG,
  HOODIE:      HoodieSVG,
  POLO:        PoloSVG,
  LONG_SLEEVE: LongSleeveSVG,
  TANK_TOP:    TankTopSVG,
  SWEATSHIRT:  SweatshirtSVG,
};

/**
 * Returns the list of available print regions for a garment type and view.
 * Useful for building the print-location checkboxes in the order form.
 */
export function getPrintRegions(
  garmentType: SupportedGarmentType,
  view: 'front' | 'back' = 'front',
): string[] {
  const map: Record<SupportedGarmentType, { front: string[]; back: string[] }> = {
    TSHIRT: {
      front: ['Front', 'Front Left Chest', 'Front Right Chest', 'Full Front'],
      back:  ['Back', 'Upper Back', 'Full Back'],
    },
    HOODIE: {
      front: ['Front', 'Front Left Chest', 'Pocket'],
      back:  ['Back', 'Full Back'],
    },
    POLO: {
      front: ['Front Left Chest', 'Front Right Chest', 'Front'],
      back:  ['Back', 'Full Back'],
    },
    LONG_SLEEVE: {
      front: ['Front', 'Front Left Chest', 'Front Right Chest', 'Full Front', 'Left Sleeve', 'Right Sleeve'],
      back:  ['Back', 'Upper Back', 'Full Back', 'Left Sleeve', 'Right Sleeve'],
    },
    TANK_TOP: {
      front: ['Front', 'Full Front'],
      back:  ['Back', 'Full Back'],
    },
    SWEATSHIRT: {
      front: ['Front', 'Front Left Chest', 'Front Right Chest', 'Full Front'],
      back:  ['Back', 'Upper Back', 'Full Back'],
    },
  };

  return map[garmentType]?.[view] ?? [];
}
