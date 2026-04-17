import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useBillingUsage, useCreateCheckout, useOpenPortal } from '@/hooks/useBilling';

const PLAN_ORDER = ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'] as const;
type Plan = typeof PLAN_ORDER[number];

const PLAN_DETAILS: Record<Plan, {
  label: string;
  price: string;
  badgeClass: string;
  features: string[];
}> = {
  FREE: {
    label: 'Free',
    price: '$0/mo',
    badgeClass: 'bg-gray-100 text-gray-700',
    features: ['1 user', '100 orders/mo', '100 customers', '500 inventory items', 'Community support'],
  },
  STARTER: {
    label: 'Starter',
    price: '$29/mo',
    badgeClass: 'bg-blue-100 text-blue-700',
    features: ['3 users', '1,000 orders/mo', '500 customers', '2,000 inventory items', 'Email support'],
  },
  PRO: {
    label: 'Pro',
    price: '$79/mo',
    badgeClass: 'bg-purple-100 text-purple-700',
    features: ['10 users', '5,000 orders/mo', '2,000 customers', '5,000 inventory items', 'Priority support'],
  },
  ENTERPRISE: {
    label: 'Enterprise',
    price: 'Custom',
    badgeClass: 'bg-amber-100 text-amber-700',
    features: ['Unlimited users', 'Unlimited orders', 'Unlimited customers', 'Unlimited inventory', 'Dedicated support'],
  },
};

function UsageBar({ label, current, max }: { label: string; current: number; max: number }) {
  const isUnlimited = max === -1;
  const pct = isUnlimited ? 0 : Math.min((current / max) * 100, 100);
  const isWarning = !isUnlimited && pct >= 80;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className={isWarning ? 'text-red-600 font-medium' : 'text-gray-500'}>
          {isUnlimited ? `${current} / ∞` : `${current} / ${max}`}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isWarning ? 'bg-red-500' : 'bg-blue-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function BillingTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: billing, isLoading } = useBillingUsage();
  const checkout = useCreateCheckout();
  const portal = useOpenPortal();

  useEffect(() => {
    const status = searchParams.get('billing');
    if (status === 'success') {
      toast.success('Your plan has been updated!');
      setSearchParams({});
    } else if (status === 'canceled') {
      toast('Checkout canceled.', { icon: 'ℹ️' });
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  if (isLoading || !billing) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-6 bg-gray-100 rounded w-40" />
        <div className="h-32 bg-gray-100 rounded-xl" />
        <div className="h-48 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  const currentPlan = billing.plan;
  const currentIndex = PLAN_ORDER.indexOf(currentPlan);

  return (
    <div className="p-6 space-y-8 max-w-3xl">
      {/* Current plan header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Current Plan</h2>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${PLAN_DETAILS[currentPlan].badgeClass}`}>
              {PLAN_DETAILS[currentPlan].label}
            </span>
            {billing.subscriptionStatus && billing.subscriptionStatus !== 'active' && (
              <span className="text-sm text-red-600 capitalize font-medium">
                {billing.subscriptionStatus.replace('_', ' ')}
              </span>
            )}
          </div>
          {billing.trialEndsAt && new Date(billing.trialEndsAt) > new Date() && (
            <p className="text-sm text-amber-600 mt-1">
              Trial ends {new Date(billing.trialEndsAt).toLocaleDateString()}
            </p>
          )}
          {billing.subscriptionEndsAt && (
            <p className="text-sm text-red-600 mt-1">
              Access ends {new Date(billing.subscriptionEndsAt).toLocaleDateString()}
            </p>
          )}
        </div>
        {currentPlan !== 'FREE' && (
          <button
            onClick={() => portal.mutate()}
            disabled={portal.isPending}
            className="min-h-[44px] px-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap"
          >
            {portal.isPending ? 'Opening…' : 'Manage Subscription'}
          </button>
        )}
      </div>

      {/* Usage */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Usage</h3>
        <UsageBar label="Orders" current={billing.usage.orders.current} max={billing.usage.orders.max} />
        <UsageBar label="Customers" current={billing.usage.customers.current} max={billing.usage.customers.max} />
        <UsageBar label="Team Members" current={billing.usage.users.current} max={billing.usage.users.max} />
        <UsageBar label="Inventory Items" current={billing.usage.inventoryItems.current} max={billing.usage.inventoryItems.max} />
      </div>

      {/* Plan comparison */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Plans</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLAN_ORDER.map((plan, idx) => {
            const details = PLAN_DETAILS[plan];
            const isCurrent = plan === currentPlan;
            const isDowngrade = idx < currentIndex;
            const isEnterprise = plan === 'ENTERPRISE';
            const isUpgrade = !isCurrent && !isEnterprise && !isDowngrade;

            return (
              <div
                key={plan}
                className={`rounded-xl border p-5 flex flex-col gap-4 ${
                  isCurrent ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
                }`}
              >
                <div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${details.badgeClass}`}>
                    {details.label}
                  </span>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{details.price}</p>
                </div>

                <ul className="flex-1 space-y-1.5 text-sm text-gray-600">
                  {details.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5">
                      <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div className="min-h-[44px] flex items-center justify-center text-sm text-gray-400 border border-gray-200 rounded-xl">
                    Current plan
                  </div>
                ) : isEnterprise ? (
                  <a
                    href="mailto:sales@yourapp.com"
                    className="min-h-[44px] flex items-center justify-center text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100"
                  >
                    Contact Sales
                  </a>
                ) : isUpgrade ? (
                  <button
                    onClick={() => checkout.mutate(plan as 'STARTER' | 'PRO')}
                    disabled={checkout.isPending}
                    className="min-h-[44px] text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {checkout.isPending ? 'Loading…' : 'Upgrade'}
                  </button>
                ) : (
                  <div className="min-h-[44px] flex items-center justify-center text-sm text-gray-400 border border-gray-100 rounded-xl">
                    Downgrade via portal
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-3">
          To downgrade, click "Manage Subscription" above to access the Stripe billing portal.
        </p>
      </div>
    </div>
  );
}
