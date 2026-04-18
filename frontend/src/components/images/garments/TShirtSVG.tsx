import React from 'react';
import type { GarmentSVGProps, PrintRegion } from './types';
import { PrintAreaOverlay } from './PrintAreaOverlay';

const VB_W = 400;
const VB_H = 460;

// ─── Print Regions ────────────────────────────────────────────────────────────

const FRONT_REGIONS: PrintRegion[] = [
  { name: 'Front',            x: 26,  y: 22,  width: 48, height: 52 },
  { name: 'Front Left Chest', x: 26,  y: 22,  width: 20, height: 18 },
  { name: 'Front Right Chest',x: 54,  y: 22,  width: 20, height: 18 },
  { name: 'Full Front',       x: 22,  y: 16,  width: 56, height: 62 },
];

const BACK_REGIONS: PrintRegion[] = [
  { name: 'Back',             x: 26,  y: 18,  width: 48, height: 58 },
  { name: 'Upper Back',       x: 26,  y: 18,  width: 48, height: 14 },
  { name: 'Full Back',        x: 22,  y: 14,  width: 56, height: 66 },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function TShirtSVG({
  color,
  view = 'front',
  showPrintArea = false,
  activePrintLocations = [],
  designOverlay,
  designOverlayLocation = view === 'front' ? 'Front' : 'Back',
  className,
}: GarmentSVGProps): React.JSX.Element {
  const isFront = view === 'front';
  const regions = isFront ? FRONT_REGIONS : BACK_REGIONS;

  // Derived shading colors
  const shade = shadeColor(color, -18);
  const highlight = shadeColor(color, 22);
  const deepShade = shadeColor(color, -35);

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label={`${isFront ? 'Front' : 'Back'} view of a t-shirt`}
      role="img"
    >
      <defs>
        <filter id="tshirt-shadow" x="-8%" y="-4%" width="116%" height="112%">
          <feDropShadow dx="0" dy="3" stdDeviation="6" floodColor="#00000028" />
        </filter>
        <linearGradient id="tshirt-body-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor={shade}     stopOpacity="1" />
          <stop offset="30%"  stopColor={color}      stopOpacity="1" />
          <stop offset="70%"  stopColor={color}      stopOpacity="1" />
          <stop offset="100%" stopColor={shade}      stopOpacity="1" />
        </linearGradient>
        <linearGradient id="tshirt-sleeve-l" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor={highlight}  stopOpacity="1" />
          <stop offset="100%" stopColor={shade}      stopOpacity="1" />
        </linearGradient>
        <linearGradient id="tshirt-sleeve-r" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor={highlight}  stopOpacity="1" />
          <stop offset="100%" stopColor={shade}      stopOpacity="1" />
        </linearGradient>
      </defs>

      {/* ── Body ── */}
      <g filter="url(#tshirt-shadow)">
        {/* Left sleeve */}
        <path
          d="M 52 78  L 14 108  L 28 168  L 62 148  L 78 100  Z"
          fill="url(#tshirt-sleeve-l)"
          stroke={deepShade}
          strokeWidth="1"
        />
        {/* Right sleeve */}
        <path
          d="M 348 78  L 386 108  L 372 168  L 338 148  L 322 100  Z"
          fill="url(#tshirt-sleeve-r)"
          stroke={deepShade}
          strokeWidth="1"
        />
        {/* Main body */}
        <path
          d={
            isFront
              ? // Front: crew neck cutout
                'M 52 78  L 78 100  L 78 420  Q 200 432 322 420  L 322 100  L 348 78' +
                '  Q 318 58 280 52  Q 264 38 240 36  Q 220 30 200 30  Q 180 30 160 36' +
                '  Q 136 38 120 52  Q 82 58 52 78  Z'
              : // Back: straight neckline (no cutout visible from behind)
                'M 52 78  L 78 100  L 78 420  Q 200 432 322 420  L 322 100  L 348 78' +
                '  Q 318 64 280 58  L 200 54  L 120 58  Q 82 64 52 78  Z'
          }
          fill="url(#tshirt-body-grad)"
          stroke={deepShade}
          strokeWidth="1"
        />
      </g>

      {isFront && (
        <>
          {/* Crew neck ribbing */}
          <path
            d="M 120 58  Q 160 36 200 30  Q 240 36 280 58  Q 264 42 240 40  Q 220 35 200 35  Q 180 35 160 40  Q 136 42 120 58  Z"
            fill={shade}
            stroke={deepShade}
            strokeWidth="0.8"
          />
          {/* Collar highlight */}
          <path
            d="M 126 62  Q 163 40 200 36  Q 237 40 274 62"
            fill="none"
            stroke={highlight}
            strokeWidth="1.2"
            opacity="0.6"
          />
        </>
      )}

      {!isFront && (
        /* Back neckline ribbing */
        <path
          d="M 120 58  L 200 54  L 280 58  Q 264 50 200 48  Q 136 50 120 58  Z"
          fill={shade}
          stroke={deepShade}
          strokeWidth="0.8"
        />
      )}

      {/* Sleeve seam lines */}
      <line x1="78" y1="100" x2="62" y2="148" stroke={deepShade} strokeWidth="0.8" opacity="0.5" />
      <line x1="322" y1="100" x2="338" y2="148" stroke={deepShade} strokeWidth="0.8" opacity="0.5" />

      {/* Shoulder seam */}
      <line x1="120" y1="56" x2="78" y2="100" stroke={deepShade} strokeWidth="0.6" opacity="0.4" />
      <line x1="280" y1="56" x2="322" y2="100" stroke={deepShade} strokeWidth="0.6" opacity="0.4" />

      {/* Hem */}
      <line x1="78" y1="416" x2="322" y2="416" stroke={deepShade} strokeWidth="1" opacity="0.4" />
      {/* Sleeve hem */}
      <line x1="26" y1="166" x2="62" y2="148" stroke={deepShade} strokeWidth="1" opacity="0.4" />
      <line x1="374" y1="166" x2="338" y2="148" stroke={deepShade} strokeWidth="1" opacity="0.4" />

      {/* Side seams */}
      <line x1="78" y1="100" x2="78" y2="420" stroke={deepShade} strokeWidth="0.5" opacity="0.3" />
      <line x1="322" y1="100" x2="322" y2="420" stroke={deepShade} strokeWidth="0.5" opacity="0.3" />

      {/* Print area overlays */}
      {showPrintArea && (
        <PrintAreaOverlay
          regions={regions}
          activePrintLocations={activePrintLocations}
          garmentColor={color}
          vbWidth={VB_W}
          vbHeight={VB_H}
          designOverlay={designOverlay}
          designOverlayLocation={designOverlayLocation}
        />
      )}
    </svg>
  );
}

// ─── Color Helpers ────────────────────────────────────────────────────────────

function shadeColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
