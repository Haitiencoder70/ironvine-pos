import { useNavigate } from 'react-router-dom';
import {
  ShoppingCartIcon,
  WrenchScrewdriverIcon,
  TruckIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import type { DashboardStats } from '../../types';

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  onClick: () => void;
}

function StatCard({ label, value, icon, iconBg, onClick }: StatCardProps): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4 w-full text-left hover:shadow-md active:scale-[0.98] transition-all duration-150 min-h-[88px]"
    >
      <div className={clsx('flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center', iconBg)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
        <p className="text-sm text-gray-500 mt-1 truncate">{label}</p>
      </div>
    </button>
  );
}

function StatCardSkeleton(): React.JSX.Element {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4 min-h-[88px] animate-pulse">
      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gray-100" />
      <div className="flex-1 space-y-2">
        <div className="h-7 bg-gray-100 rounded w-16" />
        <div className="h-4 bg-gray-100 rounded w-28" />
      </div>
    </div>
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
        {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
    );
  }

  const cards = [
    {
      label: 'Orders Today',
      value: String(stats?.ordersToday ?? 0),
      icon: <ShoppingCartIcon className="h-6 w-6 text-blue-600" />,
      iconBg: 'bg-blue-50',
      onClick: () => void navigate('/orders'),
    },
    {
      label: 'In Production',
      value: String(stats?.inProduction ?? 0),
      icon: <WrenchScrewdriverIcon className="h-6 w-6 text-orange-600" />,
      iconBg: 'bg-orange-50',
      onClick: () => void navigate('/orders?status=IN_PRODUCTION'),
    },
    {
      label: 'Ready to Ship',
      value: String(stats?.readyToShip ?? 0),
      icon: <TruckIcon className="h-6 w-6 text-green-600" />,
      iconBg: 'bg-green-50',
      onClick: () => void navigate('/orders?status=READY_TO_SHIP'),
    },
    {
      label: 'Revenue Today',
      value: formatCurrency(stats?.revenueToday ?? 0),
      icon: <CurrencyDollarIcon className="h-6 w-6 text-purple-600" />,
      iconBg: 'bg-purple-50',
      onClick: () => void navigate('/orders'),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <StatCard key={card.label} {...card} />
      ))}
    </div>
  );
}
