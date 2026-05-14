import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { useBillingPlans, type BillingPlan } from '@/hooks/useBilling';

const FAQS = [
  {
    q: 'Can I change plans later?',
    a: 'Yes. Upgrade or downgrade at any time from your billing settings. Charges are prorated.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Every account starts with a 14-day free trial. Pick Starter or Pro when you are ready to continue.',
  },
  {
    q: 'What happens when I hit a limit?',
    a: 'You will be notified and can upgrade immediately. Existing data is never deleted.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Cancel from the billing portal. You retain access until the period ends.',
  },
];

function getPricingCtaLabel(planKey: BillingPlan['key'], isSignedIn: boolean | undefined): string {
  if (isSignedIn && planKey !== 'ENTERPRISE') return 'Go to dashboard';
  if (planKey === 'FREE') return 'Start 14-Day Trial';
  if (planKey === 'STARTER') return 'Choose Starter';
  if (planKey === 'PRO') return 'Choose Pro';
  return 'Contact Sales';
}

export function PricingPage(): React.JSX.Element {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const { data: plans, isLoading: plansLoading, isError: plansError } = useBillingPlans();

  const accountCtaPath = isSignedIn ? '/dashboard' : '/signup';

  function getDisplayPrice(priceCents: number | null): string {
    if (priceCents === null) return 'Custom';
    if (priceCents === 0) return 'Free trial';
    return `$${priceCents / 100}/mo`;
  }

  function handleSelect(planKey: string) {
    if (planKey === 'ENTERPRISE') {
      window.location.href = 'mailto:sales@printflowpos.com';
      return;
    }
    navigate(`/signup?plan=${planKey}`);
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#f5f5f5]">

      {/* NAV */}
      <header className="fixed inset-x-0 top-0 z-30 border-b border-[#1a1a1a] bg-[#0f0f0f]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="min-h-[44px] rounded-xl px-1"
          >
            <img src="/printflow-logo-horizontal-white.png" alt="PrintFlow POS" className="h-9 w-auto" />
          </button>
          <nav className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/pricing')}
              className="hidden min-h-[44px] rounded-xl px-4 text-sm font-medium text-[#ff6b00] sm:inline-flex sm:items-center"
            >
              Pricing
            </button>
            <button
              type="button"
              onClick={() => navigate(isSignedIn ? '/dashboard' : '/sign-in')}
              className="min-h-[44px] rounded-xl px-4 text-sm font-medium text-[#777777] hover:text-[#f5f5f5]"
            >
              {isSignedIn ? 'Dashboard' : 'Sign in'}
            </button>
            <button
              type="button"
              onClick={() => navigate(accountCtaPath)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#ff6b00] px-4 text-sm font-semibold text-white hover:bg-[#e55f00]"
            >
              {isSignedIn ? 'Go to dashboard' : 'Start 14-day trial'}
              <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </header>

      <main className="pt-20">

        {/* HERO */}
        <section className="px-4 pb-12 pt-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[3px] text-[#ff6b00]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ff6b00]" />
              Pricing
            </div>
            <h1 className="text-[38px] font-extrabold leading-none tracking-[-1.5px] text-[#f5f5f5] sm:text-[50px] sm:tracking-[-2px]">
              Simple, transparent pricing
            </h1>
            <p className="mx-auto mt-5 max-w-[480px] text-[15px] leading-relaxed text-[#777777] sm:text-[17px]">
              Start with a free 14-day trial. Upgrade when you're ready.
            </p>

            <p className="mt-6 text-[13px] text-[#555555]">
              Yearly billing coming soon.
            </p>
          </div>
        </section>

        {/* PLAN CARDS */}
        <section className="px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            {/* pt-6 gives clearance for the absolute "Most Popular" badge */}
            <div className="grid grid-cols-1 gap-5 pt-6 sm:grid-cols-2 lg:grid-cols-4">
              {plansLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-[#1e1e1e] bg-[#141414] p-6 animate-pulse">
                    <div className="h-4 w-24 rounded bg-[#222] mb-4" />
                    <div className="h-8 w-20 rounded bg-[#222] mb-6" />
                    <div className="space-y-3 mb-6">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <div key={j} className="h-3 rounded bg-[#222]" />
                      ))}
                    </div>
                    <div className="h-11 rounded-xl bg-[#222]" />
                  </div>
                ))
              ) : plansError ? (
                <p className="col-span-4 text-center text-sm text-[#555555]">Pricing unavailable — please refresh.</p>
              ) : (
                (plans ?? []).map((plan) => {
                  const popular = plan.popular;
                  const displayPrice = getDisplayPrice(plan.priceCents);
                  const ctaLabel = getPricingCtaLabel(plan.key, isSignedIn);

                  return (
                    <div
                      key={plan.key}
                      className={`relative flex flex-col rounded-2xl border p-6 transition-colors ${
                        popular
                          ? 'border-[#ff6b00] bg-[#141414]'
                          : 'border-[#1e1e1e] bg-[#141414] hover:border-[#2e2e2e]'
                      }`}
                    >
                      {popular && (
                        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#ff6b00] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                          Most Popular
                        </span>
                      )}

                      {/* Price block — fixed min-height keeps cards aligned across the row */}
                      <div className="mb-5 min-h-[72px]">
                        <h3 className="text-[14px] font-semibold uppercase tracking-[2px] text-[#666666]">{plan.label}</h3>
                        <p className="mt-2 text-[34px] font-extrabold leading-none tracking-tight text-[#f5f5f5]">{displayPrice}</p>
                      </div>

                      {/* Feature list — flex-1 pushes button to the bottom */}
                      <ul className="mb-6 flex-1 space-y-2.5">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-start gap-2.5 text-[13px] leading-snug text-[#888888]">
                            <span className="mt-px shrink-0 text-[#ff6b00]">✓</span>
                            {f}
                          </li>
                        ))}
                      </ul>

                      <button
                        type="button"
                        onClick={() => handleSelect(plan.key)}
                        className={`min-h-[44px] w-full rounded-xl text-sm font-semibold transition-colors ${
                          popular
                            ? 'bg-[#ff6b00] text-white hover:bg-[#e55f00]'
                            : 'border border-[#2a2a2a] text-[#888888] hover:border-[#444444] hover:text-[#f5f5f5]'
                        }`}
                      >
                        {ctaLabel}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <p className="mt-8 text-center text-[13px] text-[#444444]">
              All plans include SSL, automatic backups, and 99.9% uptime SLA.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <div className="border-t border-[#1a1a1a]" />
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl">
            <p className="mb-3 border-l-2 border-[#ff6b00] pl-3 text-[11px] font-semibold uppercase tracking-[4px] text-[#ff6b00]">
              FAQ
            </p>
            <h2 className="mb-10 text-[26px] font-extrabold tracking-[-0.5px]">
              Frequently asked questions
            </h2>
            <div className="space-y-8">
              {FAQS.map(({ q, a }) => (
                <div key={q}>
                  <h3 className="text-[15px] font-semibold text-[#f5f5f5]">{q}</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-[#666666]">{a}</p>
                </div>
              ))}
            </div>
            <div className="mt-14 text-center">
              <p className="text-[14px] text-[#555555]">Enterprise or custom needs?</p>
              <a
                href="mailto:sales@printflowpos.com"
                className="mt-3 inline-flex min-h-[44px] items-center rounded-xl border border-[#2a2a2a] px-6 text-sm font-semibold text-[#888888] hover:border-[#444444] hover:text-[#f5f5f5]"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#1a1a1a] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <button type="button" onClick={() => navigate('/')} className="min-h-[44px]">
            <img
              src="/printflow-logo-horizontal-white.png"
              alt="PrintFlow POS"
              className="h-7 w-auto opacity-40"
            />
          </button>
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="min-h-[44px] text-[13px] text-[#555555] hover:text-[#f5f5f5]"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => navigate('/pricing')}
              className="min-h-[44px] text-[13px] text-[#ff6b00]"
            >
              Pricing
            </button>
            {(['Privacy', 'Terms'] as const).map((label) => (
              <span key={label} className="flex min-h-[44px] items-center text-[13px] text-[#555555]">
                {label}
              </span>
            ))}
          </nav>
          <p className="text-[12px] text-[#444444]">
            &copy; {new Date().getFullYear()} PrintFlow. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}
