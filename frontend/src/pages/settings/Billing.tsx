import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useBillingUsage, useBillingPlans, useCreateCheckout, useOpenPortal } from '@/hooks/useBilling';

function badgeClass(key: string): string {
  switch (key) {
    case 'FREE':       return 'bg-slate-500/15 text-slate-300';
    case 'STARTER':    return 'bg-blue-500/15 text-blue-300';
    case 'PRO':        return 'bg-purple-500/15 text-purple-300';
    case 'ENTERPRISE': return 'bg-amber-500/15 text-amber-300';
    default:           return 'bg-slate-500/15 text-slate-300';
  }
}

function UsageBar({ label, current, max }: { label: string; current: number; max: number }) {
  const isUnlimited = max === -1;
  const pct = isUnlimited ? 0 : Math.min((current / max) * 100, 100);
  const isWarning = !isUnlimited && pct >= 80;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-slate-400">{label}</span>
        <span className={isWarning ? 'text-red-400 font-medium' : 'text-slate-500'}>
          {isUnlimited ? `${current} / ∞` : `${current} / ${max}`}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
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
  const { data: plans, isLoading: plansLoading, isError: plansError } = useBillingPlans();
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

  if (isLoading || plansLoading || !billing) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-6 bg-white/[0.04] rounded w-40" />
        <div className="h-32 bg-white/[0.04] rounded-xl" />
        <div className="h-48 bg-white/[0.04] rounded-xl" />
      </div>
    );
  }

  const currentPlan = billing.plan;
  const currentIndex = plans?.findIndex(p => p.key === currentPlan) ?? -1;
  const currentPlanData = plans?.find(p => p.key === currentPlan);
  const needsBillingSetup = currentPlan !== 'FREE' && !billing.hasStripeSubscription;

  return (
    <div className="p-6 space-y-8 max-w-3xl">
      {/* Billing not connected warning */}
      {needsBillingSetup && (
        <div className="flex items-start gap-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/25">
          <span className="text-amber-400 text-lg shrink-0 mt-0.5">⚠</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-300">Billing not connected</p>
            <p className="text-sm text-amber-400/80 mt-0.5">
              This workspace is on the {currentPlanData?.label ?? currentPlan} plan locally, but no active Stripe subscription is linked.
              Set up billing to keep access when limits apply.
            </p>
          </div>
          <button
            onClick={() => checkout.mutate(billing.plan as 'STARTER' | 'PRO')}
            disabled={checkout.isPending}
            className="min-h-[44px] px-4 text-sm font-medium text-white bg-amber-500 rounded-xl hover:bg-amber-600 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {checkout.isPending ? 'Loading…' : `Set up ${currentPlanData?.label ?? currentPlan} billing`}
          </button>
        </div>
      )}

      {/* Current plan header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Current Plan</h2>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${badgeClass(currentPlan)}`}>
              {currentPlanData?.label ?? currentPlan}
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
        {billing.hasStripeSubscription && (
          <button
            onClick={() => portal.mutate()}
            disabled={portal.isPending}
            className="min-h-[44px] px-4 text-sm font-medium text-slate-300 border border-white/10 rounded-xl hover:bg-white/5 disabled:opacity-50 whitespace-nowrap"
          >
            {portal.isPending ? 'Opening…' : 'Manage Subscription'}
          </button>
        )}
      </div>

      {/* Usage */}
      <div className="glass-panel rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Usage</h3>
        <UsageBar label="Orders" current={billing.usage.orders.current} max={billing.usage.orders.max} />
        <UsageBar label="Customers" current={billing.usage.customers.current} max={billing.usage.customers.max} />
        <UsageBar label="Team Members" current={billing.usage.users.current} max={billing.usage.users.max} />
        <UsageBar label="Inventory Items" current={billing.usage.inventoryItems.current} max={billing.usage.inventoryItems.max} />
      </div>

      {/* Plan comparison */}
      <div>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">Plans</h3>
        {plansError ? (
          <p className="text-sm text-slate-500">Could not load plan details.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(plans ?? []).map((plan, idx) => {
              const isCurrent = plan.key === currentPlan;
              const isDowngrade = idx < currentIndex;
              const isEnterprise = plan.key === 'ENTERPRISE';
              const isUpgrade = !isCurrent && !isEnterprise && !isDowngrade;
              const priceDisplay =
                plan.priceCents === null
                  ? 'Custom'
                  : plan.priceCents === 0
                  ? '$0/mo'
                  : `$${plan.priceCents / 100}/mo`;

              return (
                <div
                  key={plan.key}
                  className={`glass-panel rounded-xl border p-5 flex flex-col gap-4 ${
                    isCurrent ? 'border-blue-500/60 ring-2 ring-blue-500/20' : 'border-white/10'
                  }`}
                >
                  <div>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass(plan.key)}`}>
                      {plan.label}
                    </span>
                    <p className="text-2xl font-bold text-slate-100 mt-2">{priceDisplay}</p>
                  </div>

                  <ul className="flex-1 space-y-1.5 text-sm text-slate-400">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-1.5">
                        <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  {isCurrent && needsBillingSetup ? (
                    <button
                      onClick={() => checkout.mutate(billing.plan as 'STARTER' | 'PRO')}
                      disabled={checkout.isPending}
                      className="min-h-[44px] text-sm font-medium text-white bg-amber-500 rounded-xl hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {checkout.isPending ? 'Loading…' : 'Set up billing'}
                    </button>
                  ) : isCurrent ? (
                    <div className="min-h-[44px] flex items-center justify-center text-sm text-slate-500 border border-white/10 rounded-xl">
                      Current plan
                    </div>
                  ) : isEnterprise ? (
                    plan.stripePriceConfigured ? (
                      <button
                        onClick={() => checkout.mutate('ENTERPRISE')}
                        disabled={checkout.isPending}
                        className="min-h-[44px] text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {checkout.isPending ? 'Loading…' : 'Upgrade'}
                      </button>
                    ) : (
                      <a
                        href="mailto:sales@printflowpos.com"
                        className="min-h-[44px] flex items-center justify-center text-sm font-medium text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl hover:bg-amber-500/20"
                      >
                        Contact Sales
                      </a>
                    )
                  ) : isUpgrade ? (
                    <button
                      onClick={() => checkout.mutate(plan.key as 'STARTER' | 'PRO')}
                      disabled={checkout.isPending}
                      className="min-h-[44px] text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {checkout.isPending ? 'Loading…' : 'Upgrade'}
                    </button>
                  ) : (
                    <div className="min-h-[44px] flex items-center justify-center text-sm text-slate-500 border border-white/[0.06] rounded-xl">
                      Downgrade via portal
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <p className="text-xs text-slate-500 mt-3">
          To downgrade, click "Manage Subscription" above to access the Stripe billing portal.
        </p>
      </div>
    </div>
  );
}
