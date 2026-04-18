import React from 'react';
import type { GarmentSVGProps, PrintRegion } from './types';
import { PrintAreaOverlay } from './PrintAreaOverlay';

const VB_W = 420;
const VB_H = 480;

const FRONT_REGIONS: PrintRegion[] = [
  { name: 'Front',             x: 26, y: 20, width: 48, height: 50 },
  { name: 'Front Left Chest',  x: 26, y: 20, width: 20, height: 17 },
  { name: 'Front Right Chest', x: 54, y: 20, width: 20, height: 17 },
  { name: 'Full Front',        x: 22, y: 15, width: 56, height: 60 },
  { name: 'Left Sleeve',       x: 2,  y: 25, width: 12, height: 40 },
  { name: 'Right Sleeve',      x: 86, y: 25, width: 12, height: 40 },
];

const BACK_REGIONS: PrintRegion[] = [
  { name: 'Back',              x: 26, y: 18, width: 48, height: 55 },
  { name: 'Upper Back',        x: 26, y: 18, width: 48, height: 13 },
  { name: 'Full Back',         x: 22, y: 14, width: 56, height: 64 },
  { name: 'Left Sleeve',       x: 2,  y: 25, width: 12, height: 40 },
  { name: 'Right Sleeve',      x: 86, y: 25, width: 12, height: 40 },
];

export function LongSleeveSVG({
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
  const shade = shadeColor(color, -18);
  const highlight = shadeColor(color, 22);
  const deepShade = shadeColor(color, -36);

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label={`${isFront ? 'Front' : 'Back'} view of a long sleeve shirt`}
      role="img"
    >
      <defs>
        <filter id="ls-shadow" x="-8%" y="-4%" width="116%" height="112%">
          <feDropShadow dx="0" dy="3" stdDeviation="6" floodColor="#00000028" />
        </filter>
        <linearGradient id="ls-body-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor={shade}    />
          <stop offset="28%"  stopColor={color}    />
          <stop offset="72%"  stopColor={color}    />
          <stop offset="100%" stopColor={shade}    />
        </linearGradient>
        <linearGradient id="ls-sleeve-l" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor={highlight} />
          <stop offset="100%" stopColor={shade}     />
        </linearGradient>
        <linearGradient id="ls-sleeve-r" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor={highlight} />
          <stop offset="100%" stopColor={shade}     />
        </linearGradient>
      </defs>

      <g filter="url(#ls-shadow)">
        {/* Left sleeve — full length */}
        <path
          d="M 56 84  L 8 118  L 4 350  L 36 356  L 44 348  L 68 110  Z"
          fill="url(#ls-sleeve-l)"
          stroke={deepShade}
          strokeWidth="1"
        />
        {/* Right sleeve — full length */}
        <path
          d="M 364 84  L 412 118  L 416 350  L 384 356  L 376 348  L 352 110  Z"
          fill="url(#ls-sleeve-r)"
          stroke={deepShade}
          strokeWidth="1"
        />
        {/* Main body */}
        <path
          d={
            isFront
              ? 'M 56 84  L 68 110  L 68 440  Q 210 452 352 440  L 352 110  L 364 84' +
                '  Q 334 62 296 56  Q 274 42 250 38  L 250 36  Q 230 28 210 28  Q 190 28 170 36  L 170 38' +
                '  Q 146 42 124 56  Q 86 62 56 84  Z'
              : 'M 56 84  L 68 110  L 68 440  Q 210 452 352 440  L 352 110  L 364 84' +
                '  Q 334 62 296 56  L 210 52  L 124 56  Q 86 62 56 84  Z'
          }
          fill="url(#ls-body-grad)"
          stroke={deepShade}
          strokeWidth="1"
        />
      </g>

      {isFront && (
        <>
          {/* Crew neck ribbing */}
          <path
            d="M 124 56  Q 170 38 210 32  Q 250 38 296 56  Q 278 44 250 40  L 210 36  L 170 40  Q 142 44 124 56  Z"
            fill={shade}
            stroke={deepShade}
            strokeWidth="0.8"
          />
          <path d="M 130 59  Q 170 42 210 38  Q 250 42 290 59" fill="none" stroke={highlight} strokeWidth="1" opacity="0.5" />
        </>
      )}

      {!isFront && (
        <path
          d="M 124 56  L 210 52  L 296 56  Q 278 48 210 46  Q 142 48 124 56  Z"
          fill={shade}
          stroke={deepShade}
          strokeWidth="0.8"
        />
      )}

      {/* Wrist cuffs */}
      <path d="M 4 348  L 36 356  L 38 368  L 6 360  Z" fill={shade} stroke={deepShade} strokeWidth="0.8" />
      <path d="M 416 348  L 384 356  L 382 368  L 414 360  Z" fill={shade} stroke={deepShade} strokeWidth="0.8" />

      {/* Seam lines */}
      <line x1="68" y1="110" x2="44" y2="348" stroke={deepShade} strokeWidth="0.7" opacity="0.3" />
      <line x1="352" y1="110" x2="376" y2="348" stroke={deepShade} strokeWidth="0.7" opacity="0.3" />
      <line x1="68" y1="110" x2="68" y2="440" stroke={deepShade} strokeWidth="0.5" opacity="0.25" />
      <line x1="352" y1="110" x2="352" y2="440" stroke={deepShade} strokeWidth="0.5" opacity="0.25" />
      <line x1="68" y1="436" x2="352" y2="436" stroke={deepShade} strokeWidth="1" opacity="0.35" />

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

function shadeColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
