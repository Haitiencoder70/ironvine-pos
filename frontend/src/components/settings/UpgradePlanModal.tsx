import { useBillingUsage, useBillingPlans, useCreateCheckout, type BillingPlan } from '../../hooks/useBilling';

interface UpgradePlanModalProps {
  onClose: () => void;
}

const PLAN_ORDER = ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'] as const;

export function UpgradePlanModal({ onClose }: UpgradePlanModalProps): React.JSX.Element {
  const { data: billing, isLoading: billingLoading } = useBillingUsage();
  const { data: plans, isLoading: plansLoading } = useBillingPlans();
  const checkout = useCreateCheckout();

  const isLoading = billingLoading || plansLoading;
  const currentPlan = billing?.plan ?? 'FREE';
  const currentIndex = PLAN_ORDER.indexOf(currentPlan as typeof PLAN_ORDER[number]);

  // Filter to paid plans only, in display order
  const paidPlans = (plans ?? []).filter(
    (p): p is BillingPlan & { key: 'STARTER' | 'PRO' | 'ENTERPRISE' } => p.key !== 'FREE',
  );

  function handleUpgrade(plan: BillingPlan) {
    if (plan.key === 'ENTERPRISE' && !plan.stripePriceConfigured) {
      window.location.href = 'mailto:sales@printflowpos.com';
      return;
    }
    checkout.mutate(plan.key as 'STARTER' | 'PRO' | 'ENTERPRISE', { onSuccess: onClose });
  }

  function formatPrice(plan: BillingPlan): string {
    if (plan.priceCents === null) return 'Custom';
    return `$${plan.priceCents / 100}/mo`;
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
              {paidPlans.map((plan) => {
                const planIndex = PLAN_ORDER.indexOf(plan.key);
                const isCurrent = plan.key === currentPlan;
                const isDowngrade = planIndex < currentIndex;

                return (
                  <div
                    key={plan.key}
                    className={`relative rounded-2xl border p-5 flex flex-col gap-4 ${
                      plan.popular ? 'border-blue-500 ring-2 ring-blue-100' :
                      isCurrent   ? 'border-green-400 bg-green-50' :
                                    'border-gray-200'
                    }`}
                  >
                    {plan.popular && (
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
                      <p className="text-sm font-semibold text-gray-900">{plan.label}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {formatPrice(plan)}
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
                      onClick={() => handleUpgrade(plan)}
                      disabled={isCurrent || isDowngrade || checkout.isPending}
                      className={`min-h-[44px] w-full rounded-xl text-sm font-medium transition-colors ${
                        isCurrent   ? 'bg-green-100 text-green-700 cursor-default' :
                        isDowngrade ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
                        plan.popular ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50' :
                                       'border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50'
                      }`}
                    >
                      {isCurrent    ? 'Current Plan' :
                       isDowngrade  ? 'Downgrade via portal' :
                       checkout.isPending ? 'Loading…' :
                       (plan.key === 'ENTERPRISE' && !plan.stripePriceConfigured) ? 'Contact Sales' :
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
