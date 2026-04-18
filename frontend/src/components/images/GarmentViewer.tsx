import React, { useState, useCallback, useRef } from 'react';
import { clsx } from 'clsx';
import {
  ArrowsPointingOutIcon,
  ArrowDownTrayIcon,
  ArrowUturnLeftIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { GarmentPlaceholder, getPrintRegions } from './GarmentPlaceholder';
import { getGarmentColorHex, isDarkGarment } from '../../utils/colorMap';

// ─── Types ────────────────────────────────────────────────────────────────────

type SupportedGarmentType =
  | 'TSHIRT'
  | 'HOODIE'
  | 'POLO'
  | 'LONG_SLEEVE'
  | 'TANK_TOP'
  | 'SWEATSHIRT';

export interface GarmentViewerProps {
  garmentType: SupportedGarmentType;
  color: string;
  /** Initially shown view */
  defaultView?: 'front' | 'back';
  /** Which print locations are part of this order */
  printLocations?: string[];
  /** Design image URLs keyed by print location name */
  designImages?: Record<string, string>;
  size?: 'md' | 'lg' | 'xl';
  /** Show the download mockup button */
  allowDownload?: boolean;
  className?: string;
}

// ─── Size Config ─────────────────────────────────────────────────────────────

const VIEWER_SIZE: Record<NonNullable<GarmentViewerProps['size']>, string> = {
  md: 'w-64',
  lg: 'w-80',
  xl: 'w-96',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function GarmentViewer({
  garmentType,
  color,
  defaultView = 'front',
  printLocations = [],
  designImages = {},
  size = 'lg',
  allowDownload = false,
  className,
}: GarmentViewerProps): React.JSX.Element {
  const [view, setView] = useState<'front' | 'back'>(defaultView);
  const [zoomed, setZoomed] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; dist: number } | null>(null);
  const [scale, setScale] = useState(1);
  const svgContainerRef = useRef<HTMLDivElement>(null);

  const hexColor = color.startsWith('#') ? color : getGarmentColorHex(color);
  const dark = isDarkGarment(color);

  // Which print locations are visible on the current view
  const viewRegions = getPrintRegions(garmentType, view);
  const activeInView = printLocations.filter((loc) => viewRegions.includes(loc));

  // Active design overlay for this view (use first matching print location)
  const activeDesign = activeInView.find((loc) => designImages[loc]) ?? null;
  const designOverlay = activeDesign ? designImages[activeDesign] : undefined;

  // ── Touch pinch-to-zoom ────────────────────────────────────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0]!.clientX - e.touches[1]!.clientX;
      const dy = e.touches[0]!.clientY - e.touches[1]!.clientY;
      setTouchStart({
        x: (e.touches[0]!.clientX + e.touches[1]!.clientX) / 2,
        y: (e.touches[0]!.clientY + e.touches[1]!.clientY) / 2,
        dist: Math.sqrt(dx * dx + dy * dy),
      });
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2 && touchStart) {
        const dx = e.touches[0]!.clientX - e.touches[1]!.clientX;
        const dy = e.touches[0]!.clientY - e.touches[1]!.clientY;
        const newDist = Math.sqrt(dx * dx + dy * dy);
        const ratio = newDist / touchStart.dist;
        setScale(Math.min(3, Math.max(1, ratio)));
      }
    },
    [touchStart],
  );

  const handleTouchEnd = useCallback(() => {
    setTouchStart(null);
    if (scale < 1.1) setScale(1);
  }, [scale]);

  // ── Download ──────────────────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    const svgEl = svgContainerRef.current?.querySelector('svg');
    if (!svgEl) return;
    const serialized = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([serialized], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mockup-${garmentType.toLowerCase()}-${color.replace(/\s+/g, '-').toLowerCase()}-${view}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [garmentType, color, view]);

  // ── Garment size prop ─────────────────────────────────────────────────────
  const garmentSize = size === 'md' ? 'lg' : 'xl';

  return (
    <div className={clsx('flex flex-col items-center gap-3', VIEWER_SIZE[size], className)}>
      {/* ── Front/Back Toggle ─── */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200 bg-gray-50 self-stretch">
        {(['front', 'back'] as const).map((v) => {
          const available = getPrintRegions(garmentType, v).some((r) =>
            printLocations.includes(r),
          );
          return (
            <button
              key={v}
              onClick={() => setView(v)}
              className={clsx(
                'flex-1 py-2 text-sm font-medium capitalize transition-colors min-h-[44px]',
                view === v
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100',
              )}
              aria-pressed={view === v}
            >
              {v}
              {available && (
                <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-current opacity-70 align-middle" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Garment Preview ─── */}
      <div
        ref={svgContainerRef}
        className={clsx(
          'relative w-full rounded-2xl overflow-hidden select-none',
          'bg-gradient-to-b from-gray-50 to-gray-100',
          zoomed && 'cursor-zoom-out',
          !zoomed && 'cursor-zoom-in',
        )}
        style={{
          aspectRatio: '4 / 5',
          transition: 'box-shadow 0.15s ease',
          boxShadow: zoomed ? '0 8px 32px rgba(0,0,0,0.18)' : '0 2px 8px rgba(0,0,0,0.08)',
        }}
        onClick={() => { if (scale === 1) setZoomed((z) => !z); }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="w-full h-full flex items-center justify-center p-4"
          style={{
            transform: `scale(${zoomed ? 1.6 : 1} ) scale(${scale})`,
            transformOrigin: 'center center',
            transition: scale === 1 ? 'transform 0.2s ease' : 'none',
          }}
        >
          <GarmentPlaceholder
            garmentType={garmentType}
            color={hexColor}
            size={garmentSize}
            view={view}
            showPrintArea={printLocations.length > 0}
            printLocations={activeInView}
            designOverlay={designOverlay}
            designOverlayLocation={activeDesign ?? undefined}
            className="w-full h-full"
          />
        </div>

        {/* Color chip + name badge */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-sm">
          <span
            className="w-3 h-3 rounded-full border border-gray-200 flex-shrink-0"
            style={{ backgroundColor: hexColor }}
          />
          <span className="text-xs font-medium text-gray-700 leading-none">{color}</span>
          {dark && (
            <span className="text-xs text-gray-400 leading-none">(dark)</span>
          )}
        </div>

        {/* Zoom indicator */}
        <button
          onClick={(e) => { e.stopPropagation(); setZoomed((z) => !z); setScale(1); }}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/80 text-gray-500 hover:bg-white hover:text-gray-700 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
          aria-label={zoomed ? 'Zoom out' : 'Zoom in'}
        >
          {zoomed
            ? <ArrowUturnLeftIcon className="h-4 w-4" />
            : <ArrowsPointingOutIcon className="h-4 w-4" />}
        </button>
      </div>

      {/* ── Print Location Chips ─── */}
      {printLocations.length > 0 && (
        <div className="w-full">
          <p className="text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Print Locations</p>
          <div className="flex flex-wrap gap-1.5">
            {printLocations.map((loc) => {
              const inCurrentView = viewRegions.includes(loc);
              return (
                <span
                  key={loc}
                  className={clsx(
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
                    inCurrentView
                      ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                      : 'bg-gray-100 text-gray-500',
                  )}
                >
                  {inCurrentView && <CheckCircleIcon className="h-3 w-3" />}
                  {loc}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Design images list ─── */}
      {Object.keys(designImages).length > 0 && (
        <div className="w-full">
          <p className="text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Design Files</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(designImages).map(([loc, url]) => (
              <div
                key={loc}
                className="flex items-center gap-1.5 bg-green-50 text-green-700 rounded-lg px-2.5 py-1.5 text-xs font-medium ring-1 ring-green-200"
              >
                <img src={url} alt={loc} className="w-5 h-5 rounded object-cover" />
                {loc}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Download Button ─── */}
      {allowDownload && (
        <button
          onClick={handleDownload}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors min-h-[44px]"
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          Download Mockup
        </button>
      )}
    </div>
  );
}
