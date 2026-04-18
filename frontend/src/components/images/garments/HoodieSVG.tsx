import React from 'react';
import type { GarmentSVGProps, PrintRegion } from './types';
import { PrintAreaOverlay } from './PrintAreaOverlay';

const VB_W = 400;
const VB_H = 480;

const FRONT_REGIONS: PrintRegion[] = [
  { name: 'Front',            x: 28,  y: 26,  width: 44, height: 36 },
  { name: 'Front Left Chest', x: 28,  y: 26,  width: 18, height: 16 },
  { name: 'Pocket',           x: 26,  y: 66,  width: 48, height: 16 },
];

const BACK_REGIONS: PrintRegion[] = [
  { name: 'Back',             x: 26,  y: 22,  width: 48, height: 54 },
  { name: 'Full Back',        x: 22,  y: 16,  width: 56, height: 64 },
];

export function HoodieSVG({
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
  const highlight = shadeColor(color, 20);
  const deepShade = shadeColor(color, -38);
  const pocketShade = shadeColor(color, -12);

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label={`${isFront ? 'Front' : 'Back'} view of a hoodie`}
      role="img"
    >
      <defs>
        <filter id="hoodie-shadow" x="-8%" y="-4%" width="116%" height="112%">
          <feDropShadow dx="0" dy="3" stdDeviation="7" floodColor="#00000028" />
        </filter>
        <linearGradient id="hoodie-body-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor={shade}    />
          <stop offset="28%"  stopColor={color}    />
          <stop offset="72%"  stopColor={color}    />
          <stop offset="100%" stopColor={shade}    />
        </linearGradient>
        <linearGradient id="hoodie-hood-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor={highlight} />
          <stop offset="100%" stopColor={shade}     />
        </linearGradient>
        <linearGradient id="hoodie-sleeve-l" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor={highlight} />
          <stop offset="100%" stopColor={shade}     />
        </linearGradient>
        <linearGradient id="hoodie-sleeve-r" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor={highlight} />
          <stop offset="100%" stopColor={shade}     />
        </linearGradient>
      </defs>

      <g filter="url(#hoodie-shadow)">
        {/* Left sleeve */}
        <path
          d="M 56 100  L 10 140  L 20 310  L 52 316  L 62 308  L 76 120  Z"
          fill="url(#hoodie-sleeve-l)"
          stroke={deepShade}
          strokeWidth="1"
        />
        {/* Right sleeve */}
        <path
          d="M 344 100  L 390 140  L 380 310  L 348 316  L 338 308  L 324 120  Z"
          fill="url(#hoodie-sleeve-r)"
          stroke={deepShade}
          strokeWidth="1"
        />
        {/* Body */}
        <path
          d="M 56 100  L 76 120  L 76 440  Q 200 454 324 440  L 324 120  L 344 100
             Q 310 82 280 76  L 248 72  L 248 60  Q 224 20 200 16  Q 176 20 152 60
             L 152 72  L 120 76  Q 90 82 56 100  Z"
          fill="url(#hoodie-body-grad)"
          stroke={deepShade}
          strokeWidth="1"
        />
        {/* Hood */}
        {isFront && (
          <path
            d="M 152 72  L 152 60  Q 176 20 200 16  Q 224 20 248 60  L 248 72
               Q 230 58 200 56  Q 170 58 152 72  Z"
            fill="url(#hoodie-hood-grad)"
            stroke={deepShade}
            strokeWidth="1"
          />
        )}
        {!isFront && (
          /* Back: hood visible as bulk behind neck */
          <path
            d="M 148 76  Q 170 48 200 44  Q 230 48 252 76
               Q 240 66 200 64  Q 160 66 148 76  Z"
            fill={highlight}
            stroke={deepShade}
            strokeWidth="1"
          />
        )}
      </g>

      {isFront && (
        <>
          {/* Hood inner lining suggestion */}
          <path
            d="M 158 80  Q 178 68 200 66  Q 222 68 242 80"
            fill="none"
            stroke={shade}
            strokeWidth="2"
            opacity="0.6"
          />
          {/* Drawstring casing */}
          <path
            d="M 158 84  Q 180 78 200 77  Q 220 78 242 84"
            fill="none"
            stroke={deepShade}
            strokeWidth="1.5"
            strokeDasharray="3 2"
            opacity="0.5"
          />
          {/* Left drawstring */}
          <path d="M 178 84  L 172 180  L 174 190" fill="none" stroke={deepShade} strokeWidth="1" opacity="0.5" />
          {/* Right drawstring */}
          <path d="M 222 84  L 228 180  L 226 190" fill="none" stroke={deepShade} strokeWidth="1" opacity="0.5" />
          {/* Drawstring tips */}
          <circle cx="174" cy="193" r="2.5" fill={deepShade} opacity="0.5" />
          <circle cx="226" cy="193" r="2.5" fill={deepShade} opacity="0.5" />

          {/* Kangaroo pocket */}
          <path
            d="M 112 316  Q 112 360 200 364  Q 288 360 288 316  L 288 308  Q 200 318 112 308  Z"
            fill={pocketShade}
            stroke={deepShade}
            strokeWidth="1"
          />
          {/* Pocket seam */}
          <path
            d="M 112 308  Q 200 318 288 308"
            fill="none"
            stroke={deepShade}
            strokeWidth="1.2"
            opacity="0.5"
          />
          {/* Pocket center seam */}
          <line x1="200" y1="316" x2="200" y2="363" stroke={deepShade} strokeWidth="0.8" opacity="0.35" />
        </>
      )}

      {/* Ribbed cuffs */}
      {[
        // Left cuff
        { x1: 20, y1: 308, x2: 52, y2: 316, x3: 52, y3: 328, x4: 16, y4: 320 },
        // Right cuff
        { x1: 380, y1: 308, x2: 348, y2: 316, x3: 348, y3: 328, x4: 384, y4: 320 },
      ].map((c, i) => (
        <path
          key={i}
          d={`M ${c.x1} ${c.y1}  L ${c.x2} ${c.y2}  L ${c.x3} ${c.y3}  L ${c.x4} ${c.y4}  Z`}
          fill={shade}
          stroke={deepShade}
          strokeWidth="0.8"
        />
      ))}
      {/* Ribbed hem */}
      <path
        d="M 76 436  Q 200 450 324 436  L 324 446  Q 200 460 76 446  Z"
        fill={shade}
        stroke={deepShade}
        strokeWidth="0.8"
      />

      {/* Seam lines */}
      <line x1="76" y1="120" x2="62" y2="308" stroke={deepShade} strokeWidth="0.6" opacity="0.3" />
      <line x1="324" y1="120" x2="338" y2="308" stroke={deepShade} strokeWidth="0.6" opacity="0.3" />
      <line x1="76" y1="120" x2="76" y2="440" stroke={deepShade} strokeWidth="0.5" opacity="0.25" />
      <line x1="324" y1="120" x2="324" y2="440" stroke={deepShade} strokeWidth="0.5" opacity="0.25" />

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
