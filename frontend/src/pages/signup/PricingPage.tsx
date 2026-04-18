import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlanCard } from '../../components/signup/PlanCard';

const PLANS = [
  {
    key: 'FREE' as const,
    name: 'Free',
    price: 0 as const,
    features: [
      '1 user',
      '50 orders/month',
      '100 customers',
      '200 inventory items',
      'Email support',
    ],
  },
  {
    key: 'STARTER' as const,
    name: 'Starter',
    price: 29 as const,
    features: [
      'Everything in Free',
      '3 users',
      '500 orders/month',
      '1,000 customers',
      'Custom branding',
      'Advanced reports',
      'Priority email support',
      '14-day free trial',
    ],
  },
  {
    key: 'PROFESSIONAL' as const,
    name: 'Professional',
    price: 79 as const,
    popular: true,
    features: [
      'Everything in Starter',
      '10 users',
      'Unlimited orders',
      'Unlimited customers',
      'API access',
      'Bulk operations',
      'Email automation',
      'Phone support',
      '14-day free trial',
    ],
  },
  {
    key: 'ENTERPRISE' as const,
    name: 'Enterprise',
    price: 'Custom' as const,
    features: [
      'Everything in Professional',
      'Unlimited users',
      'White-label',
      'Custom domain',
      'Dedicated database',
      '24/7 priority support',
      'Custom integrations',
      'SLA guarantee',
    ],
  },
] as const;

const FAQS = [
  {
    q: 'Can I change plans later?',
    a: 'Yes. Upgrade or downgrade at any time from your billing settings. Charges are prorated.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Paid plans include a 14-day free trial — no credit card required to start.',
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

export function PricingPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');

  function handleSelect(planKey: string) {
    if (planKey === 'ENTERPRISE') {
      window.location.href = 'mailto:sales@yourapp.com';
      return;
    }
    navigate(`/signup?plan=${planKey}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <span className="text-lg font-bold text-gray-900">YourApp</span>
        <button
          onClick={() => navigate('/sign-in')}
          className="min-h-[44px] px-4 text-sm text-gray-600 hover:text-gray-900"
        >
          Sign in
        </button>
      </div>

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-6 pt-14 pb-10 text-center">
        <h1 className="text-4xl font-bold text-gray-900">Simple, transparent pricing</h1>
        <p className="mt-3 text-lg text-gray-500">Start free. Upgrade when you need more.</p>

        {/* Billing cycle toggle */}
        <div className="inline-flex items-center mt-8 bg-gray-100 rounded-xl p-1 gap-1">
          {(['monthly', 'yearly'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCycle(c)}
              className={`min-h-[40px] px-5 rounded-lg text-sm font-medium transition-colors capitalize ${
                cycle === c ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {c}
              {c === 'yearly' && (
                <span className="ml-1.5 text-xs text-green-600 font-semibold">Save 20%</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Plan cards */}
      <div className="max-w-5xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.key}
              name={plan.name}
              price={plan.price}
              features={plan.features}
              popular={'popular' in plan ? plan.popular : false}
              billingCycle={cycle}
              ctaLabel={
                plan.key === 'FREE'
                  ? 'Start Free'
                  : plan.key === 'ENTERPRISE'
                  ? 'Contact Sales'
                  : 'Start Free Trial'
              }
              onSelect={() => handleSelect(plan.key)}
            />
          ))}
        </div>

        {/* Feature comparison note */}
        <p className="text-center text-sm text-gray-400 mt-8">
          All plans include SSL, automatic backups, and 99.9% uptime SLA.
        </p>
      </div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Frequently Asked Questions</h2>
        <div className="space-y-6">
          {FAQS.map(({ q, a }) => (
            <div key={q}>
              <h3 className="text-base font-semibold text-gray-900">{q}</h3>
              <p className="mt-1 text-sm text-gray-500">{a}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">Enterprise or custom needs?</p>
          <a
            href="mailto:sales@yourapp.com"
            className="mt-2 inline-block min-h-[44px] px-6 py-3 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800"
          >
            Contact Sales
          </a>
        </div>
      </div>
    </div>
  );
}
