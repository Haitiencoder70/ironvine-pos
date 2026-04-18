import React, { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { GarmentPlaceholder } from './GarmentPlaceholder';
import {
  resolveGarmentImageAsync,
  normalizeGarmentType,
  type ResolvedImage,
  type GarmentPhotoRecord,
} from '../../utils/garmentImageResolver';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SmartGarmentImageProps {
  garmentType: string;
  color: string;
  brand?: string;
  styleNumber?: string;
  view?: 'front' | 'back';
  showPrintArea?: boolean;
  printLocations?: string[];
  designOverlay?: string;
  designOverlayLocation?: string;
  /** External photo records to check before falling back to SVG */
  photoRecords?: GarmentPhotoRecord[];
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  /** Tap/click to open fullscreen viewer */
  onClick?: () => void;
  /** Show disclaimer badge when photo is for a different color */
  showDisclaimer?: boolean;
}

// ─── Size config ──────────────────────────────────────────────────────────────

const SIZE_PX: Record<NonNullable<SmartGarmentImageProps['size']>, string> = {
  xs: 'w-12 h-14',     // 48px — table rows
  sm: 'w-20 h-24',     // 80px — list items
  md: 'w-[150px] h-[175px]', // cards
  lg: 'w-[300px] h-[350px]', // product detail
  xl: 'w-[500px] h-[580px]', // full preview
};

// GarmentPlaceholder only accepts its own size tokens; map our sizes to nearest
const PLACEHOLDER_SIZE: Record<NonNullable<SmartGarmentImageProps['size']>, 'sm' | 'md' | 'lg' | 'xl'> = {
  xs: 'sm',
  sm: 'sm',
  md: 'md',
  lg: 'lg',
  xl: 'xl',
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function GarmentSkeleton({ sizeClass }: { sizeClass: string }) {
  return (
    <div className={clsx(sizeClass, 'rounded-xl bg-gray-100 animate-pulse flex items-center justify-center')}>
      <div className="w-1/2 h-3/4 bg-gray-200 rounded-lg animate-pulse" />
    </div>
  );
}

// ─── Generic placeholder ──────────────────────────────────────────────────────

function GenericPlaceholder({ sizeClass, disclaimer }: { sizeClass: string; disclaimer?: string }) {
  return (
    <div
      className={clsx(
        sizeClass,
        'rounded-xl bg-gray-100 flex flex-col items-center justify-center gap-2 text-gray-400',
      )}
    >
      <span className="text-3xl leading-none" aria-hidden>👕</span>
      {disclaimer && (
        <span className="text-[10px] text-center px-2 leading-tight">{disclaimer}</span>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SmartGarmentImage({
  garmentType,
  color,
  brand = '',
  styleNumber = '',
  view = 'front',
  showPrintArea = false,
  printLocations = [],
  designOverlay,
  designOverlayLocation,
  photoRecords = [],
  size = 'md',
  className,
  onClick,
  showDisclaimer = true,
}: SmartGarmentImageProps): React.JSX.Element {
  const [resolved, setResolved] = useState<ResolvedImage | null>(null);
  const [imgError, setImgError] = useState(false);

  const sizeClass = SIZE_PX[size];
  const placeholderSize = PLACEHOLDER_SIZE[size];

  // Resolve image whenever inputs change
  useEffect(() => {
    setResolved(null);
    setImgError(false);
    let cancelled = false;
    resolveGarmentImageAsync(garmentType, color, view, photoRecords, brand, styleNumber)
      .then((r) => { if (!cancelled) setResolved(r); })
      .catch(() => {
        if (!cancelled) setResolved({ type: 'generic', colorHex: '#cccccc', disclaimer: 'Image unavailable' });
      });
    return () => { cancelled = true; };
  }, [garmentType, color, view, brand, styleNumber, photoRecords]);

  const handleClick = useCallback(() => { onClick?.(); }, [onClick]);

  const interactiveClass = onClick
    ? 'cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all duration-150'
    : '';

  // ── Loading ────────────────────────────────────────────────────────────────
  if (!resolved) {
    return <GarmentSkeleton sizeClass={clsx(sizeClass, className)} />;
  }

  // ── Generic fallback ───────────────────────────────────────────────────────
  if (resolved.type === 'generic' || imgError) {
    return (
      <div
        className={clsx(sizeClass, className, interactiveClass)}
        onClick={handleClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => e.key === 'Enter' && handleClick() : undefined}
      >
        <GenericPlaceholder sizeClass="w-full h-full" disclaimer={resolved.disclaimer} />
      </div>
    );
  }

  // ── Real photo ─────────────────────────────────────────────────────────────
  if ((resolved.type === 'photo' || resolved.type === 'photo_different_color') && resolved.url) {
    return (
      <div
        className={clsx('relative', sizeClass, className, interactiveClass)}
        onClick={handleClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => e.key === 'Enter' && handleClick() : undefined}
      >
        <img
          src={resolved.url}
          alt={`${garmentType} in ${color}`}
          className="w-full h-full object-contain rounded-xl"
          onError={() => setImgError(true)}
          loading="lazy"
        />
        {showDisclaimer && resolved.type === 'photo_different_color' && resolved.disclaimer && (
          <div className="absolute bottom-1 left-1 right-1 bg-amber-500/90 text-white text-[9px] text-center rounded-lg px-1 py-0.5 leading-tight">
            {resolved.disclaimer}
          </div>
        )}
      </div>
    );
  }

  // ── SVG placeholder ────────────────────────────────────────────────────────
  const normType = normalizeGarmentType(garmentType);
  if (!normType) {
    return <GenericPlaceholder sizeClass={clsx(sizeClass, className)} />;
  }

  return (
    <div
      className={clsx('relative', sizeClass, className, interactiveClass)}
      onClick={handleClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && handleClick() : undefined}
      aria-label={`${garmentType} in ${color}`}
    >
      <GarmentPlaceholder
        garmentType={normType}
        color={color}
        size={placeholderSize}
        view={view}
        showPrintArea={showPrintArea}
        printLocations={printLocations}
        designOverlay={designOverlay}
        designOverlayLocation={designOverlayLocation}
        className="w-full h-full"
      />
    </div>
  );
}
