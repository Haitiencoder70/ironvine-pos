import React from 'react';
import type { GarmentSVGProps, PrintRegion } from './types';
import { PrintAreaOverlay } from './PrintAreaOverlay';

const VB_W = 420;
const VB_H = 480;

const FRONT_REGIONS: PrintRegion[] = [
  { name: 'Front',             x: 26, y: 20, width: 48, height: 48 },
  { name: 'Front Left Chest',  x: 26, y: 20, width: 20, height: 17 },
  { name: 'Front Right Chest', x: 54, y: 20, width: 20, height: 17 },
  { name: 'Full Front',        x: 22, y: 15, width: 56, height: 58 },
];

const BACK_REGIONS: PrintRegion[] = [
  { name: 'Back',              x: 26, y: 18, width: 48, height: 54 },
  { name: 'Upper Back',        x: 26, y: 18, width: 48, height: 13 },
  { name: 'Full Back',         x: 22, y: 14, width: 56, height: 62 },
];

export function SweatshirtSVG({
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
  const shade = shadeColor(color, -16);
  const highlight = shadeColor(color, 20);
  const deepShade = shadeColor(color, -34);

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label={`${isFront ? 'Front' : 'Back'} view of a sweatshirt`}
      role="img"
    >
      <defs>
        <filter id="sweat-shadow" x="-8%" y="-4%" width="116%" height="112%">
          <feDropShadow dx="0" dy="3" stdDeviation="7" floodColor="#00000028" />
        </filter>
        <linearGradient id="sweat-body-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor={shade}    />
          <stop offset="28%"  stopColor={color}    />
          <stop offset="72%"  stopColor={color}    />
          <stop offset="100%" stopColor={shade}    />
        </linearGradient>
        <linearGradient id="sweat-sleeve-l" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor={highlight} />
          <stop offset="100%" stopColor={shade}     />
        </linearGradient>
        <linearGradient id="sweat-sleeve-r" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor={highlight} />
          <stop offset="100%" stopColor={shade}     />
        </linearGradient>
      </defs>

      <g filter="url(#sweat-shadow)">
        {/* Left sleeve — long, slightly boxier than t-shirt */}
        <path
          d="M 60 90  L 10 128  L 6 348  L 38 356  L 46 346  L 72 114  Z"
          fill="url(#sweat-sleeve-l)"
          stroke={deepShade}
          strokeWidth="1"
        />
        {/* Right sleeve */}
        <path
          d="M 360 90  L 410 128  L 414 348  L 382 356  L 374 346  L 348 114  Z"
          fill="url(#sweat-sleeve-r)"
          stroke={deepShade}
          strokeWidth="1"
        />
        {/* Body — boxier than t-shirt, no taper */}
        <path
          d={
            isFront
              ? 'M 60 90  L 72 114  L 72 436  Q 210 450 348 436  L 348 114  L 360 90' +
                '  Q 328 66 294 58  Q 272 44 248 40  Q 228 30 210 28  Q 192 30 172 40' +
                '  Q 148 44 126 58  Q 92 66 60 90  Z'
              : 'M 60 90  L 72 114  L 72 436  Q 210 450 348 436  L 348 114  L 360 90' +
                '  Q 328 66 294 58  L 210 54  L 126 58  Q 92 66 60 90  Z'
          }
          fill="url(#sweat-body-grad)"
          stroke={deepShade}
          strokeWidth="1"
        />
      </g>

      {/* Ribbed collar */}
      {isFront ? (
        <>
          <path
            d="M 126 58  Q 172 40 210 32  Q 248 40 294 58  Q 274 46 248 42  L 210 38  L 172 42  Q 146 46 126 58  Z"
            fill={shade}
            stroke={deepShade}
            strokeWidth="1"
          />
          {/* Collar rib lines */}
          {[0, 4, 8].map((offset) => (
            <path
              key={offset}
              d={`M ${126 + offset * 2} ${58 - offset} Q ${210} ${32 + offset * 2} ${294 - offset * 2} ${58 - offset}`}
              fill="none"
              stroke={deepShade}
              strokeWidth="0.5"
              opacity="0.3"
            />
          ))}
          <path d="M 132 60  Q 172 44 210 40  Q 248 44 288 60" fill="none" stroke={highlight} strokeWidth="1" opacity="0.5" />
        </>
      ) : (
        <path
          d="M 126 58  L 210 54  L 294 58  Q 276 50 210 48  Q 144 50 126 58  Z"
          fill={shade}
          stroke={deepShade}
          strokeWidth="1"
        />
      )}

      {/* Ribbed wrist cuffs */}
      <path d="M 6 346  L 38 356  L 40 370  L 8 360  Z" fill={shade} stroke={deepShade} strokeWidth="0.8" />
      {[2, 5, 8].map((offset) => (
        <line key={offset} x1={6 + offset * 2} y1={346 + offset} x2={38 + offset * 2} y2={356 + offset}
          stroke={deepShade} strokeWidth="0.4" opacity="0.4" />
      ))}
      <path d="M 414 346  L 382 356  L 380 370  L 412 360  Z" fill={shade} stroke={deepShade} strokeWidth="0.8" />

      {/* Ribbed hem band */}
      <path
        d="M 72 432  Q 210 446 348 432  L 348 444  Q 210 458 72 444  Z"
        fill={shade}
        stroke={deepShade}
        strokeWidth="0.8"
      />
      {[0, 3, 6].map((offset) => (
        <path key={offset}
          d={`M 72 ${432 + offset}  Q 210 ${446 + offset} 348 ${432 + offset}`}
          fill="none" stroke={deepShade} strokeWidth="0.4" opacity="0.35"
        />
      ))}

      {/* Seam lines */}
      <line x1="72" y1="114" x2="46" y2="346" stroke={deepShade} strokeWidth="0.6" opacity="0.28" />
      <line x1="348" y1="114" x2="374" y2="346" stroke={deepShade} strokeWidth="0.6" opacity="0.28" />
      <line x1="72" y1="114" x2="72" y2="436" stroke={deepShade} strokeWidth="0.5" opacity="0.22" />
      <line x1="348" y1="114" x2="348" y2="436" stroke={deepShade} strokeWidth="0.5" opacity="0.22" />

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
