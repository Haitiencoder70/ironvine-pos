import React, { useState } from 'react';
import type { PrintRegion } from './types';
import { getContrastColor } from '../../../utils/colorMap';

interface PrintAreaOverlayProps {
  regions: PrintRegion[];
  activePrintLocations?: string[];
  garmentColor: string;
  /** ViewBox dimensions — used to convert % to absolute coords */
  vbWidth: number;
  vbHeight: number;
  /** URL of design image to overlay */
  designOverlay?: string;
  /** Which region the design goes in */
  designOverlayLocation?: string;
}

/**
 * Renders print-area indicators inside an SVG.
 * Dashed border + label for all regions; tinted fill for active ones.
 */
export function PrintAreaOverlay({
  regions,
  activePrintLocations = [],
  garmentColor,
  vbWidth,
  vbHeight,
  designOverlay,
  designOverlayLocation,
}: PrintAreaOverlayProps): React.JSX.Element {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const contrast = getContrastColor(garmentColor);
  const labelColor = contrast === '#ffffff' ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.45)';
  const borderColor = contrast === '#ffffff' ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.35)';
  const activeColor = contrast === '#ffffff' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  const hoverColor = contrast === '#ffffff' ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)';

  return (
    <>
      {regions.map((region) => {
        const x = (region.x / 100) * vbWidth;
        const y = (region.y / 100) * vbHeight;
        const w = (region.width / 100) * vbWidth;
        const h = (region.height / 100) * vbHeight;
        const isActive = activePrintLocations.includes(region.name);
        const isHovered = hoveredRegion === region.name;
        const isDesignTarget = designOverlay && designOverlayLocation === region.name;

        return (
          <g key={region.name}>
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              fill={isActive || isHovered ? (isHovered ? hoverColor : activeColor) : 'none'}
              stroke={borderColor}
              strokeWidth={1.2}
              strokeDasharray="5 3"
              rx={3}
              style={{ cursor: 'default', transition: 'fill 0.15s ease' }}
              onMouseEnter={() => setHoveredRegion(region.name)}
              onMouseLeave={() => setHoveredRegion(null)}
            />
            {/* Design overlay image */}
            {isDesignTarget && designOverlay && (
              <image
                href={designOverlay}
                x={x + 2}
                y={y + 2}
                width={w - 4}
                height={h - 4}
                preserveAspectRatio="xMidYMid meet"
                style={{ mixBlendMode: 'multiply' }}
              />
            )}
            {/* Region label — shown on hover or when active */}
            {(isHovered || isActive) && (
              <text
                x={x + w / 2}
                y={y - 4}
                textAnchor="middle"
                fontFamily="system-ui, -apple-system, sans-serif"
                fontSize={Math.min(8, w * 0.14)}
                fill={labelColor}
                letterSpacing="0.3"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {region.name.toUpperCase()}
              </text>
            )}
          </g>
        );
      })}
    </>
  );
}
