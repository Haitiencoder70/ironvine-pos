import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { clsx } from 'clsx';

export interface FABAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  color?: string; // Tailwind bg class, default bg-white
  textColor?: string; // Tailwind text class
}

interface FABProps {
  /** Single action — renders a simple + button */
  action?: () => void;
  /** Multiple actions — renders a speed-dial */
  actions?: FABAction[];
  className?: string;
}

/** Primary floating action button. Place inside a position:relative container or use the fixed version below. */
export function FAB({ action, actions = [], className = '' }: FABProps): React.JSX.Element {
  const [open, setOpen] = useState(false);

  const isSpeedDial = actions.length > 0;

  function handlePrimary() {
    if (isSpeedDial) {
      setOpen((o) => !o);
    } else if (action) {
      action();
    }
  }

  return (
    <div className={`flex flex-col items-end gap-3 ${className}`}>
      {/* Speed-dial action items */}
      <AnimatePresence>
        {isSpeedDial && open && actions.map((a, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.8 }}
            transition={{ delay: i * 0.05, type: 'spring', stiffness: 400, damping: 25 }}
            className="flex items-center gap-3"
          >
            <span className="bg-gray-900/80 text-white text-xs font-medium px-2.5 py-1 rounded-full shadow-lg whitespace-nowrap">
              {a.label}
            </span>
            <button
              onClick={() => { setOpen(false); a.onClick(); }}
              className={clsx(
                'w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-transform active:scale-95',
                a.color ?? 'bg-white',
                a.textColor ?? 'text-gray-900',
              )}
            >
              {a.icon}
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Main button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handlePrimary}
        className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label={isSpeedDial ? (open ? 'Close actions' : 'Open actions') : 'Primary action'}
        aria-expanded={isSpeedDial ? open : undefined}
      >
        <motion.div
          animate={{ rotate: isSpeedDial && open ? 45 : 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          {isSpeedDial && open ? <XMarkIcon className="h-6 w-6" /> : <PlusIcon className="h-6 w-6" />}
        </motion.div>
      </motion.button>
    </div>
  );
}

/** Fixed FAB pinned above the bottom nav on mobile */
export function FixedFAB({ action, actions, className }: FABProps): React.JSX.Element {
  return (
    <div className={clsx('fixed bottom-20 right-4 z-20 lg:hidden', className)}>
      <FAB action={action} actions={actions} />
    </div>
  );
}

/** Convenience: new-order FAB used on Orders list */
export function NewOrderFAB(): React.JSX.Element {
  const navigate = useNavigate();
  return (
    <FixedFAB
      actions={[
        { label: 'New Order', icon: <PlusIcon className="h-5 w-5" />, color: 'bg-blue-600', textColor: 'text-white', onClick: () => void navigate('/orders/new') },
      ]}
    />
  );
}
