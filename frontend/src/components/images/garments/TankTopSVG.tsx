import React from 'react';
import type { GarmentSVGProps, PrintRegion } from './types';
import { PrintAreaOverlay } from './PrintAreaOverlay';

const VB_W = 360;
const VB_H = 460;

const FRONT_REGIONS: PrintRegion[] = [
  { name: 'Front',      x: 22, y: 22, width: 56, height: 54 },
  { name: 'Full Front', x: 18, y: 16, width: 64, height: 64 },
];

const BACK_REGIONS: PrintRegion[] = [
  { name: 'Back',      x: 22, y: 20, width: 56, height: 58 },
  { name: 'Full Back', x: 18, y: 15, width: 64, height: 66 },
];

export function TankTopSVG({
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
      aria-label={`${isFront ? 'Front' : 'Back'} view of a tank top`}
      role="img"
    >
      <defs>
        <filter id="tank-shadow" x="-8%" y="-4%" width="116%" height="112%">
          <feDropShadow dx="0" dy="3" stdDeviation="6" floodColor="#00000028" />
        </filter>
        <linearGradient id="tank-body-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor={shade}    />
          <stop offset="28%"  stopColor={color}    />
          <stop offset="72%"  stopColor={color}    />
          <stop offset="100%" stopColor={shade}    />
        </linearGradient>
      </defs>

      <g filter="url(#tank-shadow)">
        <path
          d={
            isFront
              ? // Front: scoop neck, wide armholes, shoulder straps
                'M 100 42  L 76 38  Q 44 46 36 80  Q 28 116 44 148  L 62 148' +
                '  Q 52 116 60 92  L 60 430  Q 180 442 300 430  L 300 92' +
                '  Q 308 116 298 148  L 316 148  Q 332 116 324 80  Q 316 46 284 38' +
                '  L 260 42  Q 240 28 220 24  Q 200 20 180 20  Q 160 20 140 24' +
                '  Q 120 28 100 42  Z'
              : // Back: slightly higher back neckline
                'M 104 48  L 76 42  Q 44 50 36 82  Q 28 118 44 150  L 62 150' +
                '  Q 52 118 60 94  L 60 430  Q 180 442 300 430  L 300 94' +
                '  Q 308 118 298 150  L 316 150  Q 332 118 324 82  Q 316 50 284 42' +
                '  L 256 48  Q 240 36 200 32  Q 160 36 104 48  Z'
          }
          fill="url(#tank-body-grad)"
          stroke={deepShade}
          strokeWidth="1"
        />
      </g>

      {isFront && (
        <>
          {/* Neck binding */}
          <path
            d="M 100 42  Q 140 24 180 20  Q 200 18 220 20  Q 260 24 260 42
               Q 240 30 200 28  Q 160 30 100 42  Z"
            fill={shade}
            stroke={deepShade}
            strokeWidth="0.8"
          />
          {/* Armhole binding — left */}
          <path
            d="M 76 38  Q 44 50 36 80  Q 28 116 44 148  L 50 148
               Q 36 116 44 82  Q 52 52 80 40  Z"
            fill={shade}
            stroke={deepShade}
            strokeWidth="0.8"
          />
          {/* Armhole binding — right */}
          <path
            d="M 284 38  Q 316 50 324 80  Q 332 116 316 148  L 310 148
               Q 324 116 316 82  Q 308 52 280 40  Z"
            fill={shade}
            stroke={deepShade}
            strokeWidth="0.8"
          />
          {/* Neck highlight */}
          <path d="M 106 46  Q 145 28 200 26  Q 255 28 254 46" fill="none" stroke={highlight} strokeWidth="1" opacity="0.5" />
        </>
      )}

      {!isFront && (
        <>
          {/* Back neck binding */}
          <path
            d="M 104 48  Q 160 36 200 32  Q 240 36 256 48
               Q 240 38 200 36  Q 160 38 104 48  Z"
            fill={shade}
            stroke={deepShade}
            strokeWidth="0.8"
          />
          {/* Armhole bindings */}
          <path d="M 76 42  Q 44 54 36 84  Q 28 118 44 150  L 50 150  Q 36 118 44 86  Q 52 56 80 44  Z"
            fill={shade} stroke={deepShade} strokeWidth="0.8" />
          <path d="M 284 42  Q 316 54 324 84  Q 332 118 316 150  L 310 150  Q 324 118 316 86  Q 308 56 280 44  Z"
            fill={shade} stroke={deepShade} strokeWidth="0.8" />
        </>
      )}

      {/* Side seams */}
      <line x1="60"  y1="148" x2="60"  y2="430" stroke={deepShade} strokeWidth="0.5" opacity="0.25" />
      <line x1="300" y1="148" x2="300" y2="430" stroke={deepShade} strokeWidth="0.5" opacity="0.25" />
      {/* Hem */}
      <line x1="60" y1="426" x2="300" y2="426" stroke={deepShade} strokeWidth="1" opacity="0.35" />

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
