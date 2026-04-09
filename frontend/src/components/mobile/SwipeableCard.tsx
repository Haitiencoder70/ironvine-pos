import { motion, useMotionValue, useTransform } from 'framer-motion';

export interface SwipeAction {
  label: string;
  icon: React.ReactNode;
  color: string; // Tailwind bg class e.g. 'bg-red-500'
  textColor?: string; // Tailwind text class, default 'text-white'
  onAction: () => void;
}

interface SwipeableCardProps {
  /** Actions revealed on left swipe (→ left, shows on right side) */
  rightActions?: SwipeAction[];
  /** Actions revealed on right swipe (→ right, shows on left side) */
  leftActions?: SwipeAction[];
  children: React.ReactNode;
  className?: string;
}

const ACTION_WIDTH = 72; // px per action slot
const SWIPE_THRESHOLD = 60; // px before snap

export function SwipeableCard({
  rightActions = [],
  leftActions = [],
  children,
  className = '',
}: SwipeableCardProps): React.JSX.Element {
  const x = useMotionValue(0);
  const constraintLeft = -(rightActions.length * ACTION_WIDTH);
  const constraintRight = leftActions.length * ACTION_WIDTH;

  // Opacity of right action strip
  const rightStripOpacity = useTransform(x, [constraintLeft, constraintLeft / 2, 0], [1, 0.8, 0]);
  const leftStripOpacity  = useTransform(x, [0, constraintRight / 2, constraintRight], [0, 0.8, 1]);

  function handleDragEnd(_: unknown, info: { offset: { x: number }; velocity: { x: number } }) {
    const vx = info.velocity.x;
    const ox = info.offset.x;

    // Fast swipe left → snap to show right actions
    if ((vx < -500 || ox < -SWIPE_THRESHOLD) && rightActions.length > 0) {
      x.set(constraintLeft);
      return;
    }
    // Fast swipe right → snap to show left actions
    if ((vx > 500 || ox > SWIPE_THRESHOLD) && leftActions.length > 0) {
      x.set(constraintRight);
      return;
    }
    // Otherwise reset
    x.set(0);
  }

  function closeSwipe() {
    x.set(0);
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Left action strip (swipe right to reveal) */}
      {leftActions.length > 0 && (
        <motion.div
          style={{ opacity: leftStripOpacity, width: constraintRight }}
          className="absolute inset-y-0 left-0 flex"
        >
          {leftActions.map((action, i) => (
            <button
              key={i}
              onClick={() => { closeSwipe(); action.onAction(); }}
              className={`flex flex-col items-center justify-center flex-1 gap-1 min-h-[44px] ${action.color} ${action.textColor ?? 'text-white'}`}
            >
              <span className="text-lg">{action.icon}</span>
              <span className="text-xs font-medium">{action.label}</span>
            </button>
          ))}
        </motion.div>
      )}

      {/* Right action strip (swipe left to reveal) */}
      {rightActions.length > 0 && (
        <motion.div
          style={{ opacity: rightStripOpacity, width: Math.abs(constraintLeft) }}
          className="absolute inset-y-0 right-0 flex"
        >
          {rightActions.map((action, i) => (
            <button
              key={i}
              onClick={() => { closeSwipe(); action.onAction(); }}
              className={`flex flex-col items-center justify-center flex-1 gap-1 min-h-[44px] ${action.color} ${action.textColor ?? 'text-white'}`}
            >
              <span className="text-lg">{action.icon}</span>
              <span className="text-xs font-medium">{action.label}</span>
            </button>
          ))}
        </motion.div>
      )}

      {/* Draggable card content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: constraintLeft, right: constraintRight }}
        dragElastic={0.1}
        style={{ x }}
        onDragEnd={handleDragEnd}
        className="relative bg-white will-change-transform touch-pan-y"
        onClick={() => {
          // If card is open (swiped), close it on tap
          if (x.get() !== 0) closeSwipe();
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

// ─── Convenience: swipe-to-delete wrapper ─────────────────────────────────────

interface SwipeToDeleteProps {
  onDelete: () => void;
  confirmMessage?: string;
  children: React.ReactNode;
  className?: string;
}

export function SwipeToDelete({ onDelete, confirmMessage, children, className }: SwipeToDeleteProps): React.JSX.Element {
  const handleDelete = () => {
    if (confirmMessage) {
      if (!window.confirm(confirmMessage)) return;
    }
    onDelete();
  };

  return (
    <SwipeableCard
      rightActions={[{
        label: 'Delete',
        icon: '🗑️',
        color: 'bg-red-500',
        onAction: handleDelete,
      }]}
      className={className}
    >
      {children}
    </SwipeableCard>
  );
}
