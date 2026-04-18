import { useEffect, useCallback, useRef, useState } from 'react';
import type { Image } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ImageViewerProps {
  images: Image[];
  initialIndex?: number;
  onClose: () => void;
  onDelete?: (imageId: string) => void;
  onSetPrimary?: (imageId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ImageViewer({
  images,
  initialIndex = 0,
  onClose,
  onDelete,
  onSetPrimary,
}: ImageViewerProps) {
  const [index, setIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });

  // Touch tracking for swipe & pinch
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const lastDist = useRef<number | null>(null);

  const current = images[index];
  const canPrev = index > 0;
  const canNext = index < images.length - 1;

  const prev = useCallback(() => { if (canPrev) { setIndex((i) => i - 1); setScale(1); } }, [canPrev]);
  const next = useCallback(() => { if (canNext) { setIndex((i) => i + 1); setScale(1); } }, [canNext]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, prev, next]);

  // Prevent scroll behind overlay
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // ── Touch handlers ────────────────────────────────────────────────────────

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      lastDist.current = null;
    }
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastDist.current = Math.hypot(dx, dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastDist.current !== null) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const delta = dist / lastDist.current;
      setScale((s) => Math.min(Math.max(s * delta, 1), 5));
      lastDist.current = dist;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.changedTouches.length === 1 && lastDist.current === null) {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = e.changedTouches[0].clientY - touchStartY.current;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
        if (dx < 0) next();
        else prev();
      }
    }
    lastDist.current = null;
  };

  const handleDoubleTap = (e: React.MouseEvent) => {
    if (scale > 1) {
      setScale(1);
      setOrigin({ x: 50, y: 50 });
    } else {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const ox = ((e.clientX - rect.left) / rect.width) * 100;
      const oy = ((e.clientY - rect.top) / rect.height) * 100;
      setOrigin({ x: ox, y: oy });
      setScale(2.5);
    }
  };

  // ── Download ──────────────────────────────────────────────────────────────

  const download = () => {
    const a = document.createElement('a');
    a.href = current.url;
    a.download = current.filename;
    a.click();
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close viewer"
          className="w-11 h-11 flex items-center justify-center rounded-full bg-white/10 active:bg-white/25 text-xl"
        >
          ✕
        </button>
        <span className="text-sm font-medium opacity-80">
          {index + 1} / {images.length}
        </span>
        <div className="w-11" />
      </div>

      {/* Image area */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        {/* Prev arrow */}
        {canPrev && (
          <button
            type="button"
            onClick={prev}
            aria-label="Previous image"
            className="absolute left-2 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 active:bg-white/25 text-white text-xl"
          >
            ‹
          </button>
        )}

        <img
          key={current.id}
          src={current.url}
          alt={current.filename}
          onDoubleClick={handleDoubleTap}
          draggable={false}
          className="max-w-full max-h-full object-contain transition-transform duration-150 select-none"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: `${origin.x}% ${origin.y}%`,
          }}
        />

        {/* Next arrow */}
        {canNext && (
          <button
            type="button"
            onClick={next}
            aria-label="Next image"
            className="absolute right-2 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 active:bg-white/25 text-white text-xl"
          >
            ›
          </button>
        )}

        {/* Zoom hint */}
        {scale === 1 && (
          <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white/40 text-xs pointer-events-none select-none">
            Double-tap to zoom · Pinch to zoom
          </p>
        )}
      </div>

      {/* Dot indicators */}
      {images.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 py-2">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => { setIndex(i); setScale(1); }}
              aria-label={`Go to image ${i + 1}`}
              className={[
                'rounded-full transition-all',
                i === index ? 'w-2.5 h-2.5 bg-white' : 'w-2 h-2 bg-white/40',
              ].join(' ')}
            />
          ))}
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center justify-around px-4 py-3 border-t border-white/10 gap-2">
        <button
          type="button"
          onClick={download}
          className="flex flex-col items-center gap-0.5 text-white/80 min-w-[52px] min-h-[44px] justify-center active:opacity-60"
        >
          <span className="text-lg">⬇</span>
          <span className="text-xs">Download</span>
        </button>

        {onSetPrimary && !current.isPrimary && (
          <button
            type="button"
            onClick={() => onSetPrimary(current.id)}
            className="flex flex-col items-center gap-0.5 text-white/80 min-w-[52px] min-h-[44px] justify-center active:opacity-60"
          >
            <span className="text-lg">⭐</span>
            <span className="text-xs">Set Primary</span>
          </button>
        )}

        {current.isPrimary && (
          <div className="flex flex-col items-center gap-0.5 text-yellow-400 min-w-[52px] min-h-[44px] justify-center">
            <span className="text-lg">⭐</span>
            <span className="text-xs">Primary</span>
          </div>
        )}

        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(current.id)}
            className="flex flex-col items-center gap-0.5 text-red-400 min-w-[52px] min-h-[44px] justify-center active:opacity-60"
          >
            <span className="text-lg">🗑</span>
            <span className="text-xs">Delete</span>
          </button>
        )}
      </div>
    </div>
  );
}
