import { useBillingUsage, useCreateCheckout } from '../../hooks/useBilling';

interface UpgradePlanModalProps {
  onClose: () => void;
}

type PaidPlan = 'STARTER' | 'PRO' | 'ENTERPRISE';

const PLANS: {
  key: PaidPlan;
  name: string;
  price: number | 'Custom';
  features: string[];
  highlight?: boolean;
}[] = [
  {
    key: 'STARTER',
    name: 'Starter',
    price: 29,
    features: ['3 users', '500 orders/month', '1,000 customers', 'Custom branding', 'Priority email support'],
  },
  {
    key: 'PRO',
    name: 'Professional',
    price: 79,
    highlight: true,
    features: ['10 users', 'Unlimited orders', 'Unlimited customers', 'API access', 'Phone support'],
  },
  {
    key: 'ENTERPRISE',
    name: 'Enterprise',
    price: 'Custom',
    features: ['Unlimited users', 'White-label', 'Custom domain', 'Dedicated DB', '24/7 support'],
  },
];

const PLAN_ORDER = ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'] as const;

export function UpgradePlanModal({ onClose }: UpgradePlanModalProps): React.JSX.Element {
  const { data: billing, isLoading } = useBillingUsage();
  const checkout = useCreateCheckout();

  const currentPlan = billing?.plan ?? 'FREE';
  const currentIndex = PLAN_ORDER.indexOf(currentPlan as typeof PLAN_ORDER[number]);

  function handleUpgrade(plan: PaidPlan) {
    if (plan === 'ENTERPRISE') {
      window.location.href = 'mailto:sales@yourapp.com';
      return;
    }
    checkout.mutate(plan, { onSuccess: onClose });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Upgrade Plan</h2>
            {!isLoading && billing && (
              <p className="text-xs text-gray-500 mt-0.5">
                Current plan: <span className="font-medium capitalize">{currentPlan.toLowerCase()}</span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => <div key={i} className="h-48 animate-pulse bg-gray-100 rounded-2xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {PLANS.map((plan) => {
                const planIndex = PLAN_ORDER.indexOf(plan.key);
                const isCurrent = plan.key === currentPlan;
                const isDowngrade = planIndex < currentIndex;

                return (
                  <div
                    key={plan.key}
                    className={`relative rounded-2xl border p-5 flex flex-col gap-4 ${
                      plan.highlight ? 'border-blue-500 ring-2 ring-blue-100' :
                      isCurrent     ? 'border-green-400 bg-green-50' :
                                      'border-gray-200'
                    }`}
                  >
                    {plan.highlight && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full whitespace-nowrap">
                        Most Popular
                      </span>
                    )}
                    {isCurrent && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded-full whitespace-nowrap">
                        Current
                      </span>
                    )}

                    <div>
                      <p className="text-sm font-semibold text-gray-900">{plan.name}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {plan.price === 'Custom' ? 'Custom' : `$${plan.price}/mo`}
                      </p>
                    </div>

                    <ul className="flex-1 space-y-1.5 text-xs text-gray-600">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-1.5">
                          <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                          {f}
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => handleUpgrade(plan.key)}
                      disabled={isCurrent || isDowngrade || checkout.isPending}
                      className={`min-h-[44px] w-full rounded-xl text-sm font-medium transition-colors ${
                        isCurrent   ? 'bg-green-100 text-green-700 cursor-default' :
                        isDowngrade ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
                        plan.highlight ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50' :
                                        'border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50'
                      }`}
                    >
                      {isCurrent    ? 'Current Plan' :
                       isDowngrade  ? 'Downgrade via portal' :
                       checkout.isPending ? 'Loading…' :
                       plan.key === 'ENTERPRISE' ? 'Contact Sales' :
                       'Upgrade'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-xs text-gray-400 text-center mt-4">
            Charges are prorated. Cancel or change plans anytime from the billing portal.
          </p>
        </div>
      </div>
    </div>
  );
}
