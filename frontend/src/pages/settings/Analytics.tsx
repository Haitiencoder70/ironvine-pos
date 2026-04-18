import { useMemo } from 'react';
import { BarChart2, ShoppingCart, Users, Package, UserPlus } from 'lucide-react';
import { useCurrentPeriodUsage, PeriodUsage } from '../../hooks/useAnalytics';
import { useBillingUsage } from '../../hooks/useBilling';
import { UsageChart } from '../../components/analytics/UsageChart';

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  total: number;
  limit: number | null;
  color: string;
  usage: PeriodUsage | undefined;
}

function MetricCard({ icon, label, total, limit, color, usage }: MetricCardProps) {
  const pct = limit && limit > 0 ? Math.min(100, Math.round((total / limit) * 100)) : null;
  const barColor =
    pct == null ? '#2563eb' : pct >= 90 ? '#ef4444' : pct >= 75 ? '#f59e0b' : '#22c55e';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-700 font-medium">
          <span className="text-gray-400">{icon}</span>
          {label}
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-gray-900">{total.toLocaleString()}</span>
          {limit != null && limit > 0 && (
            <span className="text-sm text-gray-400 ml-1">/ {limit.toLocaleString()}</span>
          )}
        </div>
      </div>

      {pct != null && (
        <div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: barColor }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">{pct}% of plan limit used this month</p>
        </div>
      )}

      {usage && usage.daily.length > 0 ? (
        <UsageChart data={usage.daily} label={label} color={color} limit={limit ?? undefined} />
      ) : (
        <div className="h-48 flex items-center justify-center text-sm text-gray-400 bg-gray-50 rounded-lg">
          No activity this month
        </div>
      )}
    </div>
  );
}

export function AnalyticsPage() {
  const { data: events, isLoading: eventsLoading } = useCurrentPeriodUsage();
  const { data: billing, isLoading: billingLoading } = useBillingUsage();

  const byType = useMemo(() => {
    if (!events) return {};
    return Object.fromEntries(events.map((e) => [e.metricType, e]));
  }, [events]);

  const isLoading = eventsLoading || billingLoading;

  const month = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const metrics: {
    key: string;
    label: string;
    icon: React.ReactNode;
    color: string;
    limit: number | null;
  }[] = [
    {
      key: 'order_created',
      label: 'Orders',
      icon: <ShoppingCart size={16} />,
      color: '#2563eb',
      limit: billing?.usage.orders.max ?? null,
    },
    {
      key: 'customer_added',
      label: 'Customers',
      icon: <Users size={16} />,
      color: '#7c3aed',
      limit: billing?.usage.customers.max ?? null,
    },
    {
      key: 'inventory_added',
      label: 'Inventory Items',
      icon: <Package size={16} />,
      color: '#059669',
      limit: billing?.usage.inventoryItems.max ?? null,
    },
    {
      key: 'user_invited',
      label: 'Users Invited',
      icon: <UserPlus size={16} />,
      color: '#d97706',
      limit: billing?.usage.users.max ?? null,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart2 className="text-blue-600" size={22} />
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Usage Analytics</h2>
          <p className="text-sm text-gray-500">{month} — activity tracked since you started using Ironvine</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 h-64 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {metrics.map((m) => {
            const usage = byType[m.key];
            return (
              <MetricCard
                key={m.key}
                icon={m.icon}
                label={m.label}
                total={usage?.total ?? 0}
                limit={m.limit && m.limit > 0 ? m.limit : null}
                color={m.color}
                usage={usage}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
