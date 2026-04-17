import { useNavigate } from 'react-router-dom';
import { useBillingUsage, useCreateCheckout, useOpenPortal } from '../hooks/useBilling';

interface UpgradeModalProps {
  onClose: () => void;
  /** Optional context message, e.g. "You've reached your order limit." */
  message?: string;
}

const PLAN_ORDER = ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'] as const;
type Plan = typeof PLAN_ORDER[number];

const PLAN_LABELS: Record<Plan, string> = {
  FREE: 'Free',
  STARTER: 'Starter — $29/mo',
  PRO: 'Professional — $79/mo',
  ENTERPRISE: 'Enterprise — Custom',
};

const USAGE_LABELS: Record<string, string> = {
  orders: 'Orders',
  customers: 'Customers',
  users: 'Team Members',
  inventoryItems: 'Inventory Items',
};

function UsageBar({ label, current, max }: { label: string; current: number; max: number }) {
  const unlimited = max === -1;
  const pct = unlimited ? 0 : Math.min((current / max) * 100, 100);
  const isFull = !unlimited && pct >= 100;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-600">{label}</span>
        <span className={isFull ? 'text-red-600 font-semibold' : 'text-gray-500'}>
          {unlimited ? `${current} / ∞` : `${current} / ${max}`}
        </span>
      </div>
      {!unlimited && (
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${isFull ? 'bg-red-500' : pct >= 80 ? 'bg-amber-400' : 'bg-blue-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function UpgradeModal({ onClose, message }: UpgradeModalProps): React.JSX.Element {
  const navigate = useNavigate();
  const { data: billing, isLoading } = useBillingUsage();
  const checkout = useCreateCheckout();
  const portal = useOpenPortal();

  const currentPlan = (billing?.plan ?? 'FREE') as Plan;
  const currentIndex = PLAN_ORDER.indexOf(currentPlan);

  function handleUpgrade(plan: 'STARTER' | 'PRO') {
    checkout.mutate(plan, { onSuccess: onClose });
  }

  function handlePortal() {
    portal.mutate(undefined, { onSuccess: onClose });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">Upgrade Your Plan</h2>
              <p className="text-sm text-blue-100 mt-0.5">
                {message ?? "You've reached a limit on your current plan."}
              </p>
            </div>
            <button
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-blue-200 hover:text-white hover:bg-white/10"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Current usage */}
          {isLoading ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-4 bg-gray-100 rounded" />)}
            </div>
          ) : billing ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Current Usage</p>
              {Object.entries(billing.usage).map(([key, val]) => (
                <UsageBar
                  key={key}
                  label={USAGE_LABELS[key] ?? key}
                  current={val.current}
                  max={val.max}
                />
              ))}
            </div>
          ) : null}

          {/* Upgrade options */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Available Plans</p>
            {PLAN_ORDER.filter((p) => PLAN_ORDER.indexOf(p) > currentIndex && p !== 'ENTERPRISE').map((plan) => (
              <button
                key={plan}
                onClick={() => handleUpgrade(plan as 'STARTER' | 'PRO')}
                disabled={checkout.isPending}
                className="w-full min-h-[48px] px-4 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 transition-colors"
              >
                <span className="text-sm font-medium text-blue-900">{PLAN_LABELS[plan]}</span>
                <span className="text-xs text-blue-600">
                  {checkout.isPending ? 'Loading…' : 'Upgrade →'}
                </span>
              </button>
            ))}
            <a
              href="mailto:sales@yourapp.com"
              className="w-full min-h-[48px] px-4 flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700">{PLAN_LABELS.ENTERPRISE}</span>
              <span className="text-xs text-gray-500">Contact Sales →</span>
            </a>
          </div>

          {/* Manage existing subscription */}
          {currentPlan !== 'FREE' && (
            <button
              onClick={handlePortal}
              disabled={portal.isPending}
              className="w-full min-h-[44px] text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              {portal.isPending ? 'Opening portal…' : 'Manage current subscription →'}
            </button>
          )}

          {/* View pricing page */}
          <button
            onClick={() => { navigate('/pricing'); onClose(); }}
            className="w-full text-center text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Compare all plans
          </button>
        </div>
      </div>
    </div>
  );
}
