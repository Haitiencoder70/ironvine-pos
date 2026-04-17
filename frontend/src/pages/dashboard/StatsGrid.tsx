import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShoppingCartIcon,
  WrenchScrewdriverIcon,
  TruckIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import type { DashboardStats } from '../../types';

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  accentColor: string;
  glowColor: string;
  borderAccent: string;
  onClick: () => void;
  delay?: number;
}

function StatCard({
  label, value, icon, accentColor, glowColor, borderAccent, onClick, delay = 0,
}: StatCardProps): React.JSX.Element {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.97 }}
      className="group w-full text-left rounded-2xl p-5 flex items-center gap-4 min-h-[92px] relative overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, rgba(14,14,26,0.85) 0%, rgba(8,8,18,0.92) 100%)',
        border: `1px solid ${borderAccent}`,
        borderTopColor: 'rgba(255,255,255,0.10)',
        backdropFilter: 'blur(28px) saturate(1.9)',
        WebkitBackdropFilter: 'blur(28px) saturate(1.9)',
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.07), 0 8px 32px rgba(0,0,0,0.55), 0 0 0 0.5px rgba(255,255,255,0.04), ${glowColor}`,
      }}
    >
      {/* Ambient corner glow */}
      <div
        className="absolute -top-8 -right-8 w-24 h-24 rounded-full pointer-events-none opacity-40 group-hover:opacity-70 transition-opacity duration-300"
        style={{ background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)` }}
      />

      {/* Icon */}
      <div
        className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110 relative z-10"
        style={{
          background: `rgba(${accentColor.replace(/[^\d,]/g, '').split(',').slice(0, 3).join(',')}, 0.12)`,
          border: `1px solid ${borderAccent}`,
          boxShadow: `0 0 16px ${accentColor.replace(')', ', 0.2)').replace('rgb', 'rgba')}`,
        }}
      >
        {icon}
      </div>

      {/* Content */}
      <div className="min-w-0 relative z-10">
        <p
          className="stat-number"
          style={{
            background: 'linear-gradient(145deg, #ffffff 0%, #c4ccd8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {value}
        </p>
        <p className="text-[12px] text-gray-500 mt-1 truncate font-medium tracking-wide">{label}</p>
      </div>
    </motion.button>
  );
}

function StatCardSkeleton({ delay = 0 }: { delay?: number }): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
      className="rounded-2xl p-5 flex items-center gap-4 min-h-[92px] animate-pulse"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-white/[0.06]" />
      <div className="flex-1 space-y-2.5">
        <div className="h-7 rounded-lg w-16" style={{ background: 'rgba(255,255,255,0.07)' }} />
        <div className="h-3 rounded-lg w-28" style={{ background: 'rgba(255,255,255,0.05)' }} />
      </div>
    </motion.div>
  );
}

interface StatsGridProps {
  stats: DashboardStats | undefined;
  loading: boolean;
}

export function StatsGrid({ stats, loading }: StatsGridProps): React.JSX.Element {
  const navigate = useNavigate();

  const formatCurrency = (amount: number): string =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 0.05, 0.1, 0.15].map((d, i) => <StatCardSkeleton key={i} delay={d} />)}
      </div>
    );
  }

  const cards: StatCardProps[] = [
    {
      label: 'Orders Today',
      value: String(stats?.ordersToday ?? 0),
      icon: <ShoppingCartIcon className="h-5 w-5 text-blue-400" />,
      accentColor: 'rgba(59,130,246,1)',
      glowColor: '0 0 24px rgba(59,130,246,0.12)',
      borderAccent: 'rgba(59,130,246,0.18)',
      onClick: () => void navigate('/orders'),
    },
    {
      label: 'In Production',
      value: String(stats?.inProduction ?? 0),
      icon: <WrenchScrewdriverIcon className="h-5 w-5 text-orange-400" />,
      accentColor: 'rgba(249,115,22,1)',
      glowColor: '0 0 24px rgba(249,115,22,0.10)',
      borderAccent: 'rgba(249,115,22,0.18)',
      onClick: () => void navigate('/orders?status=IN_PRODUCTION'),
    },
    {
      label: 'Ready to Ship',
      value: String(stats?.readyToShip ?? 0),
      icon: <TruckIcon className="h-5 w-5 text-emerald-400" />,
      accentColor: 'rgba(16,185,129,1)',
      glowColor: '0 0 24px rgba(16,185,129,0.10)',
      borderAccent: 'rgba(16,185,129,0.18)',
      onClick: () => void navigate('/orders?status=READY_TO_SHIP'),
    },
    {
      label: 'Revenue Today',
      value: formatCurrency(stats?.revenueToday ?? 0),
      icon: <CurrencyDollarIcon className="h-5 w-5 text-violet-400" />,
      accentColor: 'rgba(139,92,246,1)',
      glowColor: '0 0 24px rgba(139,92,246,0.10)',
      borderAccent: 'rgba(139,92,246,0.18)',
      onClick: () => void navigate('/orders'),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <StatCard key={card.label} {...card} delay={i * 0.06} />
      ))}
    </div>
  );
}
