/**
 * Garment Image Resolver
 *
 * Layered fallback system for garment images:
 *   1. Real photo — exact brand + style + color match
 *   2. Real photo (different color) — same brand + style, any color
 *   3. SVG placeholder — colored garment SVG generated from garment type
 *   4. Generic placeholder — unknown garment type, grey icon
 */

import type { ComponentType } from 'react';
import { getGarmentColorHex } from './colorMap';
import type { GarmentSVGProps } from '../components/images/garments/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ResolvedImageType =
  | 'photo'
  | 'photo_different_color'
  | 'svg_placeholder'
  | 'generic';

export interface ResolvedImage {
  type: ResolvedImageType;
  /** Direct URL — set for photo and photo_different_color types */
  url?: string;
  /** SVG component to render — set for svg_placeholder type */
  svgComponent?: ComponentType<GarmentSVGProps>;
  /** Props to pass to svgComponent */
  svgProps?: Partial<GarmentSVGProps> & { color: string };
  /** Human-readable note shown to staff below the image */
  disclaimer?: string;
  /** Resolved hex color for the garment */
  colorHex: string;
}

/** A GarmentImage record as stored in the DB / returned from the API */
export interface GarmentPhotoRecord {
  brand: string;
  styleNumber: string;
  color: string;
  frontUrl: string;
  backUrl?: string;
}

// ─── Garment type → SVG component map ─────────────────────────────────────────
// Lazy imports keep the resolver tree-shakeable; resolved at call time.

type SupportedGarmentKey = 'TSHIRT' | 'HOODIE' | 'POLO' | 'LONG_SLEEVE' | 'TANK_TOP' | 'SWEATSHIRT';

// These are resolved synchronously because all SVG modules are already bundled.
// We use dynamic require-style object so callers don't need to import every SVG.
let _svgMap: Record<SupportedGarmentKey, ComponentType<GarmentSVGProps>> | null = null;

async function getSvgMap(): Promise<Record<SupportedGarmentKey, ComponentType<GarmentSVGProps>>> {
  if (_svgMap) return _svgMap;
  const [
    { TShirtSVG },
    { HoodieSVG },
    { PoloSVG },
    { LongSleeveSVG },
    { TankTopSVG },
    { SweatshirtSVG },
  ] = await Promise.all([
    import('../components/images/garments/TShirtSVG'),
    import('../components/images/garments/HoodieSVG'),
    import('../components/images/garments/PoloSVG'),
    import('../components/images/garments/LongSleeveSVG'),
    import('../components/images/garments/TankTopSVG'),
    import('../components/images/garments/SweatshirtSVG'),
  ]);
  _svgMap = { TSHIRT: TShirtSVG, HOODIE: HoodieSVG, POLO: PoloSVG, LONG_SLEEVE: LongSleeveSVG, TANK_TOP: TankTopSVG, SWEATSHIRT: SweatshirtSVG };
  return _svgMap;
}

// ─── Garment type normalizer ──────────────────────────────────────────────────

const GARMENT_TYPE_ALIASES: Record<string, SupportedGarmentKey> = {
  // Product catalog values
  tshirt:       'TSHIRT',
  't-shirt':    'TSHIRT',
  'tee shirt':  'TSHIRT',
  tee:          'TSHIRT',
  hoodie:       'HOODIE',
  'zip-up':     'HOODIE',
  'zip up':     'HOODIE',
  'full zip':   'HOODIE',
  polo:         'POLO',
  'polo shirt': 'POLO',
  'long sleeve':'LONG_SLEEVE',
  'long-sleeve':'LONG_SLEEVE',
  longsleeve:   'LONG_SLEEVE',
  'tank top':   'TANK_TOP',
  'tanktop':    'TANK_TOP',
  tank:         'TANK_TOP',
  sweatshirt:   'SWEATSHIRT',
  crewneck:     'SWEATSHIRT',
  'crew neck':  'SWEATSHIRT',
  // Already-normalised keys
  tshirt_norm:  'TSHIRT',
  hoodie_norm:  'HOODIE',
  polo_norm:    'POLO',
  long_sleeve:  'LONG_SLEEVE',
  tank_top:     'TANK_TOP',
  sweatshirt_norm: 'SWEATSHIRT',
};

export function normalizeGarmentType(raw: string): SupportedGarmentKey | null {
  const key = raw.toLowerCase().replace(/_/g, ' ').trim();
  // Direct match
  if (GARMENT_TYPE_ALIASES[key]) return GARMENT_TYPE_ALIASES[key];
  // Underscore-preserved match
  const us = raw.toUpperCase();
  const supported: SupportedGarmentKey[] = ['TSHIRT', 'HOODIE', 'POLO', 'LONG_SLEEVE', 'TANK_TOP', 'SWEATSHIRT'];
  if (supported.includes(us as SupportedGarmentKey)) return us as SupportedGarmentKey;
  return null;
}

// ─── Main resolver (sync) ─────────────────────────────────────────────────────

/**
 * Synchronous resolver — returns a ResolvedImage immediately.
 * For svg_placeholder types, `svgComponent` is undefined until `resolveGarmentImageAsync` resolves.
 * Use `SmartGarmentImage` component which handles the async loading automatically.
 */
export function resolveGarmentImage(
  garmentType: string,
  color: string,
  view: 'front' | 'back' = 'front',
  photoRecords: GarmentPhotoRecord[] = [],
  brand = '',
  styleNumber = '',
): ResolvedImage {
  const colorHex = getGarmentColorHex(color) || '#cccccc';
  const colorLower = color.toLowerCase();

  // ── Priority 1: exact brand + style + color photo ─────────────────────────
  if (photoRecords.length > 0) {
    const exact = photoRecords.find(
      (r) =>
        r.brand.toLowerCase() === brand.toLowerCase() &&
        r.styleNumber.toLowerCase() === styleNumber.toLowerCase() &&
        r.color.toLowerCase() === colorLower,
    );
    if (exact) {
      const url = view === 'back' && exact.backUrl ? exact.backUrl : exact.frontUrl;
      return { type: 'photo', url, colorHex };
    }

    // ── Priority 2: same brand + style, different color ───────────────────────
    const sameStyle = photoRecords.find(
      (r) =>
        r.brand.toLowerCase() === brand.toLowerCase() &&
        r.styleNumber.toLowerCase() === styleNumber.toLowerCase(),
    );
    if (sameStyle) {
      const url = view === 'back' && sameStyle.backUrl ? sameStyle.backUrl : sameStyle.frontUrl;
      return {
        type: 'photo_different_color',
        url,
        colorHex,
        disclaimer: `Photo shows a different color — actual garment will be ${color}`,
      };
    }
  }

  // ── Priority 3: SVG placeholder ───────────────────────────────────────────
  const normalised = normalizeGarmentType(garmentType);
  if (normalised) {
    return {
      type: 'svg_placeholder',
      colorHex,
      svgProps: { color: colorHex, view },
      // svgComponent resolved asynchronously by SmartGarmentImage
    };
  }

  // ── Priority 4: generic fallback ──────────────────────────────────────────
  return {
    type: 'generic',
    colorHex: '#cccccc',
    disclaimer: 'No image available for this garment type',
  };
}

/**
 * Async variant — resolves the SVG component for svg_placeholder results.
 */
export async function resolveGarmentImageAsync(
  garmentType: string,
  color: string,
  view: 'front' | 'back' = 'front',
  photoRecords: GarmentPhotoRecord[] = [],
  brand = '',
  styleNumber = '',
): Promise<ResolvedImage> {
  const result = resolveGarmentImage(garmentType, color, view, photoRecords, brand, styleNumber);
  if (result.type !== 'svg_placeholder') return result;

  const normalised = normalizeGarmentType(garmentType)!;
  const map = await getSvgMap();
  return {
    ...result,
    svgComponent: map[normalised],
  };
}

// ─── Print area dimensions (% of SVG viewBox, matches existing SVG regions) ──

export const GARMENT_PRINT_AREAS: Record<
  SupportedGarmentKey,
  { front: Record<string, { x: number; y: number; width: number; height: number }>
    back:  Record<string, { x: number; y: number; width: number; height: number }> }
> = {
  TSHIRT: {
    front: {
      'Full Front':         { x: 22, y: 16, width: 56, height: 62 },
      'Front':              { x: 26, y: 22, width: 48, height: 52 },
      'Front Left Chest':   { x: 26, y: 22, width: 20, height: 18 },
      'Front Right Chest':  { x: 54, y: 22, width: 20, height: 18 },
    },
    back: {
      'Full Back':   { x: 22, y: 14, width: 56, height: 66 },
      'Back':        { x: 26, y: 18, width: 48, height: 58 },
      'Upper Back':  { x: 26, y: 18, width: 48, height: 14 },
    },
  },
  HOODIE: {
    front: {
      'Front':            { x: 22, y: 35, width: 56, height: 35 },
      'Front Left Chest': { x: 52, y: 32, width: 16, height: 16 },
      'Pocket':           { x: 30, y: 58, width: 40, height: 15 },
    },
    back: {
      'Back':      { x: 20, y: 25, width: 60, height: 50 },
      'Full Back': { x: 15, y: 20, width: 70, height: 55 },
    },
  },
  LONG_SLEEVE: {
    front: {
      'Front':              { x: 20, y: 25, width: 60, height: 50 },
      'Front Left Chest':   { x: 55, y: 22, width: 18, height: 18 },
      'Left Sleeve':        { x: 2,  y: 35, width: 15, height: 30 },
      'Right Sleeve':       { x: 83, y: 35, width: 15, height: 30 },
    },
    back: {
      'Back':        { x: 20, y: 20, width: 60, height: 55 },
      'Upper Back':  { x: 20, y: 14, width: 60, height: 20 },
      'Full Back':   { x: 15, y: 14, width: 70, height: 65 },
      'Left Sleeve': { x: 2,  y: 35, width: 15, height: 30 },
      'Right Sleeve':{ x: 83, y: 35, width: 15, height: 30 },
    },
  },
  POLO: {
    front: {
      'Front Left Chest': { x: 55, y: 25, width: 16, height: 16 },
      'Front':            { x: 22, y: 25, width: 56, height: 45 },
    },
    back: {
      'Back':      { x: 20, y: 20, width: 60, height: 50 },
      'Full Back': { x: 15, y: 15, width: 70, height: 60 },
    },
  },
  TANK_TOP: {
    front: {
      'Front':      { x: 22, y: 20, width: 56, height: 55 },
      'Full Front': { x: 18, y: 15, width: 64, height: 65 },
    },
    back: {
      'Back':     { x: 22, y: 15, width: 56, height: 60 },
      'Full Back':{ x: 18, y: 10, width: 64, height: 70 },
    },
  },
  SWEATSHIRT: {
    front: {
      'Front':              { x: 20, y: 25, width: 60, height: 50 },
      'Front Left Chest':   { x: 55, y: 22, width: 18, height: 18 },
      'Front Right Chest':  { x: 27, y: 22, width: 18, height: 18 },
      'Full Front':         { x: 16, y: 18, width: 68, height: 58 },
    },
    back: {
      'Back':       { x: 20, y: 20, width: 60, height: 55 },
      'Upper Back': { x: 20, y: 14, width: 60, height: 18 },
      'Full Back':  { x: 15, y: 14, width: 70, height: 65 },
    },
  },
};

/**
 * Returns print area bounds for a given garment type, view, and location name.
 * Returns null if the combination is unknown.
 */
export function getPrintAreaBounds(
  garmentType: string,
  view: 'front' | 'back',
  locationName: string,
): { x: number; y: number; width: number; height: number } | null {
  const key = normalizeGarmentType(garmentType);
  if (!key) return null;
  return GARMENT_PRINT_AREAS[key]?.[view]?.[locationName] ?? null;
}
