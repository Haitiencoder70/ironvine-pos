import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  PlusCircleIcon,
  UserPlusIcon,
  DocumentPlusIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/outline';

interface ActionCardProps {
  label: string;
  icon: React.ReactNode;
  accentRgb: string;
  delay: number;
  onClick: () => void;
}

function ActionCard({ label, icon, accentRgb, delay, onClick }: ActionCardProps): React.JSX.Element {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.96 }}
      className="group flex flex-col items-center justify-center gap-3 rounded-2xl p-5 min-h-[108px] w-full relative overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, rgba(14,14,26,0.80) 0%, rgba(8,8,18,0.90) 100%)',
        border: `1px solid rgba(${accentRgb}, 0.14)`,
        borderTopColor: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(24px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 28px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.03)`,
      }}
    >
      {/* Radial glow behind icon */}
      <div
        className="absolute top-1 right-1 w-20 h-20 rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `radial-gradient(circle, rgba(${accentRgb}, 0.14) 0%, transparent 70%)` }}
      />

      {/* Hover border accent */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `linear-gradient(160deg, rgba(${accentRgb}, 0.06) 0%, transparent 60%)`,
          boxShadow: `inset 0 0 0 1px rgba(${accentRgb}, 0.20)`,
        }}
      />

      {/* Icon */}
      <div className="relative z-10 transition-transform duration-200 group-hover:scale-110 group-hover:-translate-y-0.5">
        {icon}
      </div>

      {/* Label */}
      <span className="relative z-10 text-[12.5px] font-semibold text-gray-400 group-hover:text-gray-200 transition-colors duration-150 tracking-wide">
        {label}
      </span>
    </motion.button>
  );
}

export function QuickActions(): React.JSX.Element {
  const navigate = useNavigate();

  const actions: ActionCardProps[] = [
    {
      label: 'New Order',
      icon: <PlusCircleIcon className="h-8 w-8 text-blue-400" />,
      accentRgb: '59,130,246',
      delay: 0,
      onClick: () => void navigate('/orders/new'),
    },
    {
      label: 'Add Customer',
      icon: <UserPlusIcon className="h-8 w-8 text-emerald-400" />,
      accentRgb: '16,185,129',
      delay: 0.04,
      onClick: () => void navigate('/customers/new'),
    },
    {
      label: 'Create PO',
      icon: <DocumentPlusIcon className="h-8 w-8 text-violet-400" />,
      accentRgb: '139,92,246',
      delay: 0.08,
      onClick: () => void navigate('/purchase-orders/new'),
    },
    {
      label: 'Check Inventory',
      icon: <ArchiveBoxIcon className="h-8 w-8 text-amber-400" />,
      accentRgb: '251,191,36',
      delay: 0.12,
      onClick: () => void navigate('/inventory'),
    },
  ];

  return (
    <div className="space-y-3">
      <p className="section-label px-0.5">Quick Actions</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {actions.map((action) => (
          <ActionCard key={action.label} {...action} />
        ))}
      </div>
    </div>
  );
}
