import { useState } from 'react';
import { usePlanLimits } from '../hooks/usePlanLimits';
import { formatCount, getPercentage } from '../utils/formatUsage';
import type { LimitType } from '../hooks/usePlanLimits';

const LIMIT_LABELS: Record<LimitType, string> = {
  orders:         'orders this month',
  customers:      'customers',
  users:          'team members',
  inventoryItems: 'inventory items',
};

export function PlanLimitBanner(): React.JSX.Element | null {
  const { billing, limitStatuses, showUpgradeModal } = usePlanLimits();
  const [dismissed, setDismissed] = useState<LimitType | null>(null);

  if (!billing || !limitStatuses) return null;

  // Find the worst-status limit that hasn't been dismissed
  const priority: LimitType[] = ['orders', 'customers', 'users', 'inventoryItems'];
  const shouldShowLimit = (key: LimitType, status: 'critical' | 'warning'): boolean => {
    if (dismissed === key || limitStatuses[key] !== status) return false;
    if (key !== 'users') return true;

    const { current, max } = billing.usage.users;
    if (max === -1) return false;

    // A Free workspace naturally has 1 owner out of 1 allowed user. Do not
    // show a permanent red banner for the normal owner-only state; invite flows
    // still block additional users through usePlanLimits.canAddUser().
    return current > max;
  };

  const critical = priority.find(
    (k) => shouldShowLimit(k, 'critical'),
  );
  const warning = priority.find(
    (k) => shouldShowLimit(k, 'warning'),
  );

  const active = critical ?? warning;
  if (!active) return null;

  const isCritical = limitStatuses[active] === 'critical';
  const { current, max } = billing.usage[active];
  const pct = getPercentage(current, max);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 text-sm flex-wrap ${
        isCritical
          ? 'bg-red-600 text-white'
          : 'bg-amber-50 text-amber-900 border-b border-amber-200'
      }`}
    >
      <span className="flex-shrink-0 text-base">{isCritical ? '🚫' : '⚠️'}</span>

      <span className="flex-1 min-w-0">
        {isCritical
          ? `You've reached your limit of ${max.toLocaleString()} ${LIMIT_LABELS[active]}.`
          : `You're using ${pct}% of your ${LIMIT_LABELS[active]} limit (${formatCount(current, max)}).`
        }
      </span>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => {
            showUpgradeModal(
              isCritical
                ? `You've reached your limit of ${max.toLocaleString()} ${LIMIT_LABELS[active]}.`
                : `You're at ${pct}% of your ${LIMIT_LABELS[active]} limit.`,
            );
          }}
          className={`min-h-[32px] px-3 rounded-lg text-xs font-semibold transition-colors ${
            isCritical
              ? 'bg-white text-red-600 hover:bg-red-50'
              : 'bg-amber-600 text-white hover:bg-amber-700'
          }`}
        >
          Upgrade
        </button>
        <button
          onClick={() => setDismissed(active)}
          className={`min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg text-xs transition-colors ${
            isCritical ? 'hover:bg-red-700 text-red-200' : 'hover:bg-amber-100 text-amber-600'
          }`}
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
