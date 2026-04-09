import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';

export type SnapPoint = 'half' | 'full' | 'closed';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  /** Which snap points are available. Default: ['full'] */
  snapPoints?: Exclude<SnapPoint, 'closed'>[];
  /** Initial snap point when opened. Default: first in snapPoints */
  initialSnap?: Exclude<SnapPoint, 'closed'>;
  title?: string;
  children: React.ReactNode;
}

const SNAP_RATIOS: Record<Exclude<SnapPoint, 'closed'>, number> = {
  half: 0.5,
  full: 0.92,
};

const DRAG_CLOSE_THRESHOLD = 0.25; // fraction of sheet height before snapping closed

export function BottomSheet({
  open,
  onClose,
  snapPoints = ['full'],
  initialSnap,
  title,
  children,
}: BottomSheetProps): React.JSX.Element {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragY = useMotionValue(0);
  const opacity = useTransform(dragY, [0, 300], [1, 0]);
  const initial = initialSnap ?? snapPoints[0];

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const heightVh = `${Math.round(SNAP_RATIOS[initial] * 100)}dvh`;

  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
      const sheetHeight = sheetRef.current?.offsetHeight ?? 400;
      const threshold = sheetHeight * DRAG_CLOSE_THRESHOLD;
      if (info.offset.y > threshold || info.velocity.y > 500) {
        onClose();
      }
      dragY.set(0);
    },
    [onClose, dragY],
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="bs-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ opacity }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Sheet */}
          <motion.div
            key="bs-sheet"
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            style={{ y: dragY, height: heightVh }}
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-white rounded-t-3xl shadow-2xl will-change-transform overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            {/* Drag handle */}
            <div className="flex-shrink-0 flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Title */}
            {title && (
              <div className="flex-shrink-0 px-5 pb-3 pt-1 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900">{title}</h2>
              </div>
            )}

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
