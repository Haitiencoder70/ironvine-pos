import { useState, useRef, useCallback } from 'react';
import type { Image } from '../../types';
import { ImageViewer } from './ImageViewer';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ImageGalleryProps {
  images: Image[];
  editable?: boolean;
  onUpload?: () => void;
  onDelete?: (imageId: string) => void;
  onSetPrimary?: (imageId: string) => void;
  onReorder?: (imageIds: string[]) => void;
  emptyMessage?: string;
  columns?: 2 | 3 | 4;
  imageSize?: 'sm' | 'md' | 'lg';
}

interface ActionMenu {
  imageId: string;
  x: number;
  y: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const colClass: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
};

const sizeClass: Record<string, string> = {
  sm: 'aspect-square',
  md: 'aspect-[4/3]',
  lg: 'aspect-video',
};

const LONG_PRESS_DELAY = 500;

// ─── Component ────────────────────────────────────────────────────────────────

export function ImageGallery({
  images,
  editable = false,
  onUpload,
  onDelete,
  onSetPrimary,
  onReorder,
  emptyMessage = 'No images yet',
  columns = 3,
  imageSize = 'sm',
}: ImageGalleryProps) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [actionMenu, setActionMenu] = useState<ActionMenu | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Long press ────────────────────────────────────────────────────────────

  const handleTouchStart = useCallback(
    (imageId: string) => (e: React.TouchEvent) => {
      if (!editable) return;
      const touch = e.touches[0];
      longPressTimer.current = setTimeout(() => {
        setActionMenu({ imageId, x: touch.clientX, y: touch.clientY });
      }, LONG_PRESS_DELAY);
    },
    [editable],
  );

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleContextMenu = useCallback(
    (imageId: string) => (e: React.MouseEvent) => {
      if (!editable) return;
      e.preventDefault();
      setActionMenu({ imageId, x: e.clientX, y: e.clientY });
    },
    [editable],
  );

  // ── Drag to reorder (desktop) ─────────────────────────────────────────────

  const handleDragStart = (imageId: string) => () => setDragId(imageId);

  const handleDragOver = (imageId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverId(imageId);
  };

  const handleDrop = (targetId: string) => () => {
    if (!dragId || dragId === targetId || !onReorder) return;
    const ids = images.map((img) => img.id);
    const fromIdx = ids.indexOf(dragId);
    const toIdx = ids.indexOf(targetId);
    const reordered = [...ids];
    reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, dragId);
    onReorder(reordered);
    setDragId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => { setDragId(null); setDragOverId(null); };

  // ── Render ────────────────────────────────────────────────────────────────

  if (!images.length && !editable) {
    return <p className="text-sm text-gray-400 text-center py-6">{emptyMessage}</p>;
  }

  return (
    <>
      <div className={`grid gap-2 ${colClass[columns]}`}>
        {images.map((img, i) => (
          <div
            key={img.id}
            draggable={editable && !!onReorder}
            onDragStart={handleDragStart(img.id)}
            onDragOver={handleDragOver(img.id)}
            onDrop={handleDrop(img.id)}
            onDragEnd={handleDragEnd}
            onTouchStart={handleTouchStart(img.id)}
            onTouchEnd={handleTouchEnd}
            onContextMenu={handleContextMenu(img.id)}
            className={[
              'relative rounded-xl overflow-hidden bg-gray-100 cursor-pointer group',
              sizeClass[imageSize],
              dragOverId === img.id ? 'ring-2 ring-blue-500' : '',
              dragId === img.id ? 'opacity-40' : '',
            ].join(' ')}
          >
            <img
              src={img.thumbnailUrl ?? img.url}
              alt={img.filename}
              className="w-full h-full object-cover"
              loading="lazy"
              onClick={() => setViewerIndex(i)}
            />

            {/* Primary star */}
            {img.isPrimary && (
              <div className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center shadow text-sm">
                ⭐
              </div>
            )}

            {/* Hover overlay (desktop) */}
            {editable && (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActionMenu({ imageId: img.id, x: e.clientX, y: e.clientY });
                  }}
                  aria-label="Image actions"
                  className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-gray-700 shadow active:bg-white"
                >
                  ⋯
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Add button */}
        {editable && onUpload && (
          <button
            type="button"
            onClick={onUpload}
            aria-label="Add image"
            className={[
              'flex flex-col items-center justify-center gap-1',
              'rounded-xl border-2 border-dashed border-gray-300',
              'bg-gray-50 hover:border-blue-400 hover:bg-blue-50/40',
              'text-gray-400 hover:text-blue-500 transition-colors cursor-pointer',
              sizeClass[imageSize],
            ].join(' ')}
          >
            <span className="text-2xl leading-none">+</span>
            <span className="text-xs font-medium">Add</span>
          </button>
        )}
      </div>

      {/* Action menu (long press / right click) */}
      {actionMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setActionMenu(null)}
          />
          <div
            className="fixed z-50 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden min-w-[180px]"
            style={{
              top: Math.min(actionMenu.y, window.innerHeight - 200),
              left: Math.min(actionMenu.x, window.innerWidth - 200),
            }}
          >
            {onSetPrimary && !images.find((i) => i.id === actionMenu.imageId)?.isPrimary && (
              <ActionItem
                label="Set as Primary"
                icon="⭐"
                onClick={() => {
                  onSetPrimary(actionMenu.imageId);
                  setActionMenu(null);
                }}
              />
            )}
            <ActionItem
              label="View Full Screen"
              icon="🔍"
              onClick={() => {
                setViewerIndex(images.findIndex((i) => i.id === actionMenu.imageId));
                setActionMenu(null);
              }}
            />
            <ActionItem
              label="Download"
              icon="⬇"
              onClick={() => {
                const img = images.find((i) => i.id === actionMenu.imageId);
                if (img) {
                  const a = document.createElement('a');
                  a.href = img.url;
                  a.download = img.filename;
                  a.click();
                }
                setActionMenu(null);
              }}
            />
            {onDelete && (
              <ActionItem
                label="Delete"
                icon="🗑"
                danger
                onClick={() => {
                  onDelete(actionMenu.imageId);
                  setActionMenu(null);
                }}
              />
            )}
          </div>
        </>
      )}

      {/* Full screen viewer */}
      {viewerIndex !== null && (
        <ImageViewer
          images={images}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
          onDelete={onDelete ? (id) => { onDelete(id); setViewerIndex(null); } : undefined}
          onSetPrimary={onSetPrimary}
        />
      )}
    </>
  );
}

// ─── Action item ──────────────────────────────────────────────────────────────

interface ActionItemProps {
  label: string;
  icon: string;
  danger?: boolean;
  onClick: () => void;
}

function ActionItem({ label, icon, danger = false, onClick }: ActionItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'w-full flex items-center gap-3 px-4 py-3 text-sm font-medium',
        'active:bg-gray-100 transition-colors text-left min-h-[48px]',
        danger ? 'text-red-600' : 'text-gray-700',
      ].join(' ')}
    >
      <span aria-hidden>{icon}</span>
      {label}
    </button>
  );
}
