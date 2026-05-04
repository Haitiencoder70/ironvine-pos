import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SignUp, useAuth, useClerk } from '@clerk/clerk-react';
import { getAppUrl } from '../../utils/tenant';
import { z } from 'zod';
import { PlanCard } from '../../components/signup/PlanCard';
import { SubdomainChecker } from '../../components/signup/SubdomainChecker';
import { organizationApi } from '../../services/organizationApi';

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const step1Schema = z.object({
  name: z.string().min(2, 'Organization name is required'),
  slug: z.string().min(3, 'Must be at least 3 characters').regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens'),
  industry: z.string().min(1, 'Please select an industry'),
});

// ─── Types ───────────────────────────────────────────────────────────────────

type PlanKey = 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';

interface FormState {
  // Step 1
  name: string;
  slug: string;
  industry: string;
  plan: PlanKey;
  cycle: 'monthly' | 'yearly';
}

const INITIAL: FormState = {
  name: '', slug: '', industry: '',
  plan: 'FREE', cycle: 'monthly',
};

const INDUSTRIES = [
  'T-Shirts', 'Embroidery', 'Screen Printing', 'DTG Printing',
  'Sublimation', 'Embellishments', 'Promotional Products', 'Other',
];

const PLANS = [
  {
    key: 'FREE' as const,
    name: 'Free Trial',
    price: 0 as const,
    features: ['14-day free trial', '1 user', '50 orders/month', '100 customers', '200 inventory items', 'Email support'],
  },
  {
    key: 'STARTER' as const,
    name: 'Starter',
    price: 29 as const,
    features: ['3 users', '500 orders/month', 'Custom branding', 'Advanced reports', 'Priority email support'],
  },
  {
    key: 'PRO' as const,
    name: 'Pro',
    price: 79 as const,
    popular: true,
    features: ['10 users', 'Unlimited orders', 'API access', 'Bulk operations', 'Phone support'],
  },
  {
    key: 'ENTERPRISE' as const,
    name: 'Enterprise',
    price: 'Custom' as const,
    features: ['Unlimited users', 'White-label', 'Custom domain', 'Dedicated support'],
  },
] as const;

// ─── Step indicators ─────────────────────────────────────────────────────────

const PLAN_KEYS: PlanKey[] = ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'];

function normalizePlan(plan: string | null): PlanKey {
  return PLAN_KEYS.includes(plan as PlanKey) ? (plan as PlanKey) : 'FREE';
}

function getPlanSelectLabel(planKey: PlanKey, selected: boolean): string {
  if (selected) return 'Selected';
  if (planKey === 'FREE') return 'Start Free Trial';
  if (planKey === 'STARTER') return 'Select Starter';
  if (planKey === 'PRO') return 'Select Pro';
  return 'Contact Sales';
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 justify-center">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all ${
            i + 1 === current ? 'w-8 bg-blue-600' : i + 1 < current ? 'w-2 bg-blue-300' : 'w-2 bg-gray-200'
          }`}
        />
      ))}
    </div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full min-h-[44px] px-3 text-sm text-gray-900 placeholder-gray-400 bg-white rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${props.className ?? ''}`}
    />
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function OrganizationSignup(): React.JSX.Element {
  const [searchParams] = useSearchParams();
  const { isLoaded, isSignedIn } = useAuth();
  const { setActive } = useClerk();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>({
    ...INITIAL,
    plan: normalizePlan(searchParams.get('plan')),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [checkingExistingOrg, setCheckingExistingOrg] = useState(true);

  // If the user already has an org, send them straight to their dashboard.
  useEffect(() => {
    if (!isLoaded || !isSignedIn) { setCheckingExistingOrg(false); return; }
    organizationApi.findMine()
      .then((org) => {
        if (org?.subdomain) {
          window.location.href = `${getAppUrl(org.subdomain)}/dashboard`;
        } else {
          setCheckingExistingOrg(false);
        }
      })
      .catch(() => setCheckingExistingOrg(false));
  }, [isLoaded, isSignedIn]);

  // Detect if we're in the middle of a Clerk SSO callback — the URL will contain
  // '__clerk_status' or 'rotating_token_nonce' query params while Clerk is
  // finishing the OAuth handshake. We must NOT redirect during that window or
  // we create a double-encoded redirect_url loop.
  const isSsoCallback = typeof window !== 'undefined' &&
    (window.location.search.includes('__clerk') ||
     window.location.search.includes('rotating_token') ||
     window.location.pathname.includes('sso-callback') ||
     window.location.hash.includes('__clerk'));

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => { const next = { ...e }; delete next[field]; return next; });
  }

  function handleNameChange(value: string) {
    set('name', value);
    if (!form.slug || form.slug === slugify(form.name)) {
      set('slug', slugify(value));
    }
  }

  function slugify(s: string) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function validateStep(n: number): boolean {
    if (n === 1) {
      const result = step1Schema.safeParse({ name: form.name, slug: form.slug, industry: form.industry });
      if (!result.success) {
        const errs: Record<string, string> = {};
        result.error.issues.forEach((i) => { errs[i.path[0] as string] = i.message; });
        setErrors(errs);
        return false;
      }
    }
    return true;
  }

  function nextStep() {
    if (!validateStep(step)) return;
    setStep((s) => s + 1);
  }

  async function handleSubmit() {
    if (!validateStep(step)) return;
    setSubmitting(true);
    try {
      const result = await organizationApi.createOrganization({
        name: form.name,
        slug: form.slug,
        industry: form.industry,
        plan: form.plan,
      });

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        if (result.clerkOrgId) {
          await setActive({ organization: result.clerkOrgId });
        }
        const domain = import.meta.env.VITE_APP_DOMAIN;
        const subdomain = result.slug ?? form.slug;
        const appUrl = domain
          ? `https://${subdomain}.${domain}/dashboard`
          : `http://${subdomain}.localhost:5173/dashboard`;
        window.location.href = appUrl;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setErrors({ submit: msg });
    } finally {
      setSubmitting(false);
    }
  }

  // While Clerk is loading or we're checking for an existing org, show a spinner
  if (!isLoaded || isSsoCallback || checkingExistingOrg) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  // Signed-out users should see the actual sign-up widget. After account
  // creation Clerk returns here, then the organization setup wizard renders.
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <SignUp
          routing="path"
          path="/signup"
          signInUrl="/sign-in"
          fallbackRedirectUrl="/signup"
          appearance={{
            layout: {
              logoImageUrl: '/printflow-logo-horizontal.svg',
              logoLinkUrl: '/',
            },
            elements: {
              formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 min-h-[44px]',
              card: 'shadow-lg rounded-2xl',
            },
          }}
        />
      </div>
    );
  }

  const STEP_TITLES = ['Organization Details', 'Choose Plan', 'Payment'];
  const totalSteps = form.plan === 'FREE' ? 2 : 3;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-2xl font-bold text-gray-900">PrintFlow POS</span>
          <p className="text-sm text-gray-500 mt-1">Create your organization</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
          <StepIndicator current={step} total={totalSteps} />

          <div>
            <h2 className="text-lg font-semibold text-gray-900">{STEP_TITLES[step - 1]}</h2>
            <p className="text-sm text-gray-500">Step {step} of {totalSteps}</p>
          </div>

          {/* ── Step 1: Org Details ── */}
          {step === 1 && (
            <div className="space-y-4">
              <Field label="Organization Name" error={errors.name}>
                <Input
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Acme T-Shirts"
                />
              </Field>

              <SubdomainChecker
                value={form.slug}
                onChange={(v) => set('slug', v)}
                error={errors.slug}
              />

              <Field label="Industry" error={errors.industry}>
                <select
                  value={form.industry}
                  onChange={(e) => set('industry', e.target.value)}
                  className="w-full min-h-[44px] px-3 text-sm rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select industry...</option>
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </Field>
            </div>
          )}

          {/* ── Step 2: Choose Plan ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="inline-flex bg-gray-100 rounded-xl p-1 gap-1">
                  {(['monthly', 'yearly'] as const).map((c) => (
                    <button
                      key={c}
                      onClick={() => set('cycle', c)}
                      className={`min-h-[36px] px-4 rounded-lg text-sm font-medium capitalize transition-colors ${
                        form.cycle === c ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                      }`}
                    >
                      {c}{c === 'yearly' && <span className="ml-1 text-xs text-green-600">-20%</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {PLANS.map((plan) => (
                  <PlanCard
                    key={plan.key}
                    name={plan.name}
                    price={plan.price}
                    features={plan.features}
                    popular={'popular' in plan ? plan.popular : false}
                    selected={form.plan === plan.key}
                    billingCycle={form.cycle}
                    ctaLabel={getPlanSelectLabel(plan.key, form.plan === plan.key)}
                    ctaVariant={form.plan === plan.key ? 'disabled' : 'primary'}
                    onSelect={() => set('plan', plan.key)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Error ── */}
          {errors.submit && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {errors.submit}
            </p>
          )}

          {/* ── Actions ── */}
          <div className="flex gap-3 pt-2">
            {step > 1 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                disabled={submitting}
                className="min-h-[44px] px-5 flex-1 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Back
              </button>
            )}
            {step < totalSteps ? (
              <button
                onClick={nextStep}
                className="min-h-[44px] flex-1 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="min-h-[44px] flex-1 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting
                  ? 'Setting up...'
                  : form.plan === 'FREE'
                  ? 'Create Organization'
                  : 'Continue to Payment'}
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
