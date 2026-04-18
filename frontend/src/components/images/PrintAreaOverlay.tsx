/**
 * PrintAreaOverlay
 *
 * A positioned HTML overlay (not SVG) that renders print-area rectangles
 * over any garment image — real photo or SVG placeholder.
 *
 * Each print location is shown as a dashed rectangle with a label.
 * Locations can be tapped to select/deselect them.
 *
 * Usage:
 *   <div className="relative">
 *     <SmartGarmentImage ... />
 *     <PrintAreaOverlay
 *       garmentType="TSHIRT"
 *       view="front"
 *       activeLocations={["Front"]}
 *       onToggle={(loc) => ...}
 *     />
 *   </div>
 */

import { useState } from 'react';
import { clsx } from 'clsx';
import {
  GARMENT_PRINT_AREAS,
  normalizeGarmentType,
} from '../../utils/garmentImageResolver';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PrintAreaOverlayProps {
  garmentType: string;
  view?: 'front' | 'back';
  /** Currently active (selected) print locations */
  activeLocations?: string[];
  /** Called when user taps a location to toggle it */
  onToggle?: (locationName: string) => void;
  /** If true, renders labels. Default true. */
  showLabels?: boolean;
  /** If true, only render the active locations (hide the rest). Default false. */
  onlyActive?: boolean;
  /** Optional: show physical size label (e.g. "10\" × 12\"") */
  showDimensions?: boolean;
  /** Container is this many px wide — used to compute label font size */
  containerWidthPx?: number;
  className?: string;
}

// ─── Color scheme per print location index ────────────────────────────────────

const LOCATION_COLORS = [
  { border: '#3b82f6', bg: 'rgba(59,130,246,0.12)', label: '#1d4ed8' }, // blue
  { border: '#10b981', bg: 'rgba(16,185,129,0.12)', label: '#047857' }, // green
  { border: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: '#b45309' }, // amber
  { border: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', label: '#6d28d9' }, // purple
  { border: '#ec4899', bg: 'rgba(236,72,153,0.12)', label: '#be185d' }, // pink
  { border: '#06b6d4', bg: 'rgba(6,182,212,0.12)',  label: '#0e7490' }, // cyan
];

function getColor(index: number) {
  return LOCATION_COLORS[index % LOCATION_COLORS.length]!;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PrintAreaOverlay({
  garmentType,
  view = 'front',
  activeLocations = [],
  onToggle,
  showLabels = true,
  onlyActive = false,
  containerWidthPx = 200,
  className,
}: PrintAreaOverlayProps): React.JSX.Element | null {
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);

  const normType = normalizeGarmentType(garmentType);
  if (!normType) return null;

  const regions = GARMENT_PRINT_AREAS[normType]?.[view];
  if (!regions) return null;

  const allLocations = Object.keys(regions);
  const visibleLocations = onlyActive
    ? allLocations.filter((loc) => activeLocations.includes(loc))
    : allLocations;

  const baseFontPx = Math.max(8, Math.min(11, containerWidthPx * 0.055));

  return (
    <div
      className={clsx('absolute inset-0 pointer-events-none', className)}
      aria-hidden="true"
    >
      {visibleLocations.map((locationName, i) => {
        const bounds = regions[locationName];
        if (!bounds) return null;

        const isActive = activeLocations.includes(locationName);
        const isHovered = hoveredLocation === locationName;
        const colorScheme = getColor(i);

        const style: React.CSSProperties = {
          position: 'absolute',
          left:   `${bounds.x}%`,
          top:    `${bounds.y}%`,
          width:  `${bounds.width}%`,
          height: `${bounds.height}%`,
          border: `1.5px dashed ${colorScheme.border}`,
          backgroundColor: (isActive || isHovered) ? colorScheme.bg : 'transparent',
          borderRadius: '4px',
          pointerEvents: onToggle ? 'auto' : 'none',
          cursor: onToggle ? 'pointer' : 'default',
          transition: 'background-color 0.15s ease, border-color 0.15s ease',
          boxSizing: 'border-box',
          opacity: onlyActive ? 1 : (isActive || isHovered ? 1 : 0.5),
        };

        return (
          <div
            key={locationName}
            style={style}
            onClick={() => onToggle?.(locationName)}
            onMouseEnter={() => setHoveredLocation(locationName)}
            onMouseLeave={() => setHoveredLocation(null)}
            onTouchStart={() => setHoveredLocation(locationName)}
            onTouchEnd={() => setHoveredLocation(null)}
            title={locationName}
          >
            {showLabels && (isActive || isHovered) && (
              <LocationLabel
                name={locationName}
                color={colorScheme.label}
                fontPx={baseFontPx}
                isActive={isActive}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Label ────────────────────────────────────────────────────────────────────

interface LocationLabelProps {
  name: string;
  color: string;
  fontPx: number;
  isActive: boolean;
}

function LocationLabel({ name, color, fontPx, isActive }: LocationLabelProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: '-1.6em',
        left: '50%',
        transform: 'translateX(-50%)',
        whiteSpace: 'nowrap',
        fontSize: `${fontPx}px`,
        fontWeight: isActive ? 700 : 500,
        color,
        lineHeight: 1.2,
        letterSpacing: '0.02em',
        pointerEvents: 'none',
        userSelect: 'none',
        textShadow: '0 0 3px white, 0 0 6px white',
      }}
    >
      {name}
      {isActive && (
        <span style={{ marginLeft: '3px', fontSize: `${fontPx * 0.85}px` }}>✓</span>
      )}
    </div>
  );
}

// ─── Compact dot indicator (for table/card contexts) ──────────────────────────

/**
 * Renders small colored dots for each active print location.
 * Use in tight spaces where the full overlay can't fit.
 */
export function PrintLocationDots({ locations }: { locations: string[] }): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-1">
      {locations.map((loc, i) => {
        const c = getColor(i);
        return (
          <span
            key={loc}
            title={loc}
            className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: c.bg, color: c.label, border: `1px solid ${c.border}` }}
          >
            {loc}
          </span>
        );
      })}
    </div>
  );
}
