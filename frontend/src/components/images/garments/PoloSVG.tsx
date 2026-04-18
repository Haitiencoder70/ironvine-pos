import React from 'react';
import type { GarmentSVGProps, PrintRegion } from './types';
import { PrintAreaOverlay } from './PrintAreaOverlay';

const VB_W = 400;
const VB_H = 460;

const FRONT_REGIONS: PrintRegion[] = [
  { name: 'Front Left Chest',  x: 26, y: 24, width: 20, height: 18 },
  { name: 'Front Right Chest', x: 54, y: 24, width: 20, height: 18 },
  { name: 'Front',             x: 26, y: 24, width: 48, height: 46 },
];

const BACK_REGIONS: PrintRegion[] = [
  { name: 'Back',      x: 26, y: 18, width: 48, height: 56 },
  { name: 'Full Back', x: 22, y: 14, width: 56, height: 64 },
];

export function PoloSVG({
  color,
  view = 'front',
  showPrintArea = false,
  activePrintLocations = [],
  designOverlay,
  designOverlayLocation = view === 'front' ? 'Front Left Chest' : 'Back',
  className,
}: GarmentSVGProps): React.JSX.Element {
  const isFront = view === 'front';
  const regions = isFront ? FRONT_REGIONS : BACK_REGIONS;
  const shade = shadeColor(color, -16);
  const highlight = shadeColor(color, 20);
  const deepShade = shadeColor(color, -36);
  const collarColor = shadeColor(color, -22);

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label={`${isFront ? 'Front' : 'Back'} view of a polo shirt`}
      role="img"
    >
      <defs>
        <filter id="polo-shadow" x="-8%" y="-4%" width="116%" height="112%">
          <feDropShadow dx="0" dy="3" stdDeviation="6" floodColor="#00000028" />
        </filter>
        <linearGradient id="polo-body-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor={shade}    />
          <stop offset="30%"  stopColor={color}    />
          <stop offset="70%"  stopColor={color}    />
          <stop offset="100%" stopColor={shade}    />
        </linearGradient>
        <linearGradient id="polo-sleeve-l" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor={highlight} />
          <stop offset="100%" stopColor={shade}     />
        </linearGradient>
        <linearGradient id="polo-sleeve-r" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor={highlight} />
          <stop offset="100%" stopColor={shade}     />
        </linearGradient>
      </defs>

      <g filter="url(#polo-shadow)">
        {/* Left sleeve — shorter than t-shirt */}
        <path
          d="M 58 86  L 18 112  L 30 162  L 68 146  L 80 104  Z"
          fill="url(#polo-sleeve-l)"
          stroke={deepShade}
          strokeWidth="1"
        />
        {/* Right sleeve */}
        <path
          d="M 342 86  L 382 112  L 370 162  L 332 146  L 320 104  Z"
          fill="url(#polo-sleeve-r)"
          stroke={deepShade}
          strokeWidth="1"
        />
        {/* Body — slightly more tapered/fitted than t-shirt */}
        <path
          d={
            isFront
              ? 'M 58 86  L 80 104  L 82 420  Q 200 432 318 420  L 320 104  L 342 86' +
                '  Q 310 68 280 62  L 214 56  L 214 44  L 200 36  L 186 44  L 186 56  L 120 62  Q 90 68 58 86  Z'
              : 'M 58 86  L 80 104  L 82 420  Q 200 432 318 420  L 320 104  L 342 86' +
                '  Q 310 68 280 62  L 200 58  L 120 62  Q 90 68 58 86  Z'
          }
          fill="url(#polo-body-grad)"
          stroke={deepShade}
          strokeWidth="1"
        />
      </g>

      {isFront && (
        <>
          {/* Collar — two-part spread collar */}
          <path
            d="M 120 62  L 186 56  L 186 44  L 200 36  L 162 32  Q 128 38 120 62  Z"
            fill={collarColor}
            stroke={deepShade}
            strokeWidth="1"
          />
          <path
            d="M 280 62  L 214 56  L 214 44  L 200 36  L 238 32  Q 272 38 280 62  Z"
            fill={collarColor}
            stroke={deepShade}
            strokeWidth="1"
          />
          {/* Collar highlight */}
          <line x1="124" y1="64" x2="186" y2="58" stroke={highlight} strokeWidth="0.8" opacity="0.5" />
          <line x1="276" y1="64" x2="214" y2="58" stroke={highlight} strokeWidth="0.8" opacity="0.5" />

          {/* Placket (button strip) */}
          <rect x="194" y="56" width="12" height="100" rx="2" fill={shade} stroke={deepShade} strokeWidth="0.8" />
          {/* Buttons */}
          {[72, 90, 108, 124].map((y) => (
            <circle key={y} cx="200" cy={y} r="2.8" fill={highlight} stroke={deepShade} strokeWidth="0.6" />
          ))}
        </>
      )}

      {!isFront && (
        /* Back collar — single piece, lower profile */
        <path
          d="M 120 62  L 200 58  L 280 62  Q 266 52 200 50  Q 134 52 120 62  Z"
          fill={collarColor}
          stroke={deepShade}
          strokeWidth="1"
        />
      )}

      {/* Sleeve hems (ribbed band) */}
      <path d="M 18 110  L 30 162  L 36 162  L 24 110  Z" fill={shade} stroke={deepShade} strokeWidth="0.6" opacity="0.6" />
      <path d="M 382 110  L 370 162  L 364 162  L 376 110  Z" fill={shade} stroke={deepShade} strokeWidth="0.6" opacity="0.6" />

      {/* Seam lines */}
      <line x1="80"  y1="104" x2="82"  y2="420" stroke={deepShade} strokeWidth="0.5" opacity="0.25" />
      <line x1="320" y1="104" x2="318" y2="420" stroke={deepShade} strokeWidth="0.5" opacity="0.25" />
      <line x1="80"  y1="104" x2="68"  y2="146" stroke={deepShade} strokeWidth="0.7" opacity="0.35" />
      <line x1="320" y1="104" x2="332" y2="146" stroke={deepShade} strokeWidth="0.7" opacity="0.35" />
      {/* Hem */}
      <line x1="82" y1="416" x2="318" y2="416" stroke={deepShade} strokeWidth="1" opacity="0.35" />

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
