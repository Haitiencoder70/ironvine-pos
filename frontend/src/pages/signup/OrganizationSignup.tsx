import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SignUp, useAuth, useClerk } from '@clerk/clerk-react';
import { getAppUrl } from '../../utils/tenant';
import { z } from 'zod';
import { PlanCard } from '../../components/signup/PlanCard';
import { SubdomainChecker } from '../../components/signup/SubdomainChecker';
import { organizationApi } from '../../services/organizationApi';
import { getApiError } from '../../lib/api';
import { useBillingPlans } from '@/hooks/useBilling';

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
            i + 1 === current ? 'w-8 bg-[#ff6b00]' : i + 1 < current ? 'w-2 bg-[#ff9a4d]' : 'w-2 bg-white/20'
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
      <label className="block text-sm font-medium text-slate-300">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full min-h-[44px] px-3 text-sm text-slate-100 placeholder:text-slate-500 bg-white/[0.06] rounded-xl border border-white/10 outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/30 ${props.className ?? ''}`}
    />
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function OrganizationSignup(): React.JSX.Element {
  const [searchParams] = useSearchParams();
  const { isLoaded, isSignedIn } = useAuth();
  const { setActive } = useClerk();
  const { data: plans, isLoading: plansLoading, isError: plansError } = useBillingPlans();
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
      .then(async (org) => {
        if (org?.subdomain) {
          await setActive({ organization: org.clerkOrgId });
          window.location.href = `${getAppUrl(org.subdomain)}/dashboard`;
        } else {
          setCheckingExistingOrg(false);
        }
      })
      .catch(() => setCheckingExistingOrg(false));
  }, [isLoaded, isSignedIn, setActive]);

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
        const subdomain = result.slug ?? form.slug;
        window.location.href = `${getAppUrl(subdomain)}/dashboard`;
      }
    } catch (err: unknown) {
      const msg = getApiError(err);
      setErrors({ submit: msg });
    } finally {
      setSubmitting(false);
    }
  }

  // While Clerk is loading or we're checking for an existing org, show a spinner
  if (!isLoaded || isSsoCallback || checkingExistingOrg) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 rounded-full border-2 border-[#ff6b00] border-t-transparent animate-spin" />
      </div>
    );
  }

  // Signed-out users should see the actual sign-up widget. After account
  // creation Clerk returns here, then the organization setup wizard renders.
  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div
          className="w-full max-w-md rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, rgba(18,18,36,0.96) 0%, rgba(8,8,18,0.99) 100%)',
            border: '1px solid rgba(255,107,0,0.30)',
            borderTopColor: 'rgba(255,107,0,0.55)',
            boxShadow: 'inset 0 1px 0 rgba(255,107,0,0.12), 0 24px 64px rgba(0,0,0,0.75)',
            backdropFilter: 'blur(32px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(32px) saturate(1.6)',
          }}
        >
          <SignUp
            routing="path"
            path="/signup"
            signInUrl="/sign-in"
            forceRedirectUrl="/signup"
            fallbackRedirectUrl="/signup"
            appearance={{
              layout: {
                logoImageUrl: '/printflow-logo-horizontal.svg',
                logoLinkUrl: '/',
              },
              variables: {
                colorBackground: 'transparent',
                colorInputBackground: 'rgba(255,255,255,0.09)',
                colorInputText: '#f1f5f9',
                colorText: '#dde1ea',
                colorPrimary: '#ff6b00',
                colorNeutral: '#64748b',
                colorTextSecondary: '#94a3b8',
              },
              elements: {
                card: 'bg-transparent shadow-none border-0',
                formButtonPrimary: 'btn-primary',
                socialButtonsBlockButton: 'border border-white/25 bg-white/[0.08] hover:bg-white/[0.13] text-slate-100',
                formFieldInput: 'border-white/20 bg-white/[0.09]',
              },
            }}
          />
        </div>
      </div>
    );
  }

  const STEP_TITLES = ['Organization Details', 'Choose Plan', 'Payment'];
  const totalSteps = form.plan === 'FREE' ? 2 : 3;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-2xl font-bold text-slate-100">PrintFlow POS</span>
          <p className="text-sm text-slate-500 mt-1">Create your organization</p>
        </div>

        <div className="card-cinema rounded-2xl p-8 space-y-6">
          <StepIndicator current={step} total={totalSteps} />

          <div>
            <h2 className="text-lg font-semibold text-slate-100">{STEP_TITLES[step - 1]}</h2>
            <p className="text-sm text-slate-500">Step {step} of {totalSteps}</p>
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
                  className="w-full min-h-[44px] px-3 text-sm text-slate-100 rounded-xl border border-white/10 outline-none focus:ring-2 focus:ring-orange-500/50 bg-white/[0.06]"
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
                <div className="inline-flex bg-white/[0.04] rounded-xl p-1 gap-1">
                  {(['monthly', 'yearly'] as const).map((c) => (
                    <button
                      key={c}
                      onClick={() => set('cycle', c)}
                      className={`min-h-[36px] px-4 rounded-lg text-sm font-medium capitalize transition-colors ${
                        form.cycle === c ? 'bg-white/10 text-slate-100' : 'text-slate-400'
                      }`}
                    >
                      {c}{c === 'yearly' && <span className="ml-1 text-xs text-green-600">-20%</span>}
                    </button>
                  ))}
                </div>
              </div>

              {plansLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-white/10 p-6 animate-pulse">
                      <div className="h-4 w-24 rounded bg-white/10 mb-3" />
                      <div className="h-8 w-20 rounded bg-white/10 mb-5" />
                      <div className="space-y-2 mb-5">
                        {Array.from({ length: 4 }).map((_, j) => (
                          <div key={j} className="h-3 rounded bg-white/10" />
                        ))}
                      </div>
                      <div className="h-11 rounded-xl bg-white/10" />
                    </div>
                  ))}
                </div>
              ) : plansError ? (
                <p className="text-sm text-slate-500 text-center">Could not load plans — please refresh.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(plans ?? []).map((plan) => (
                    <PlanCard
                      key={plan.key}
                      name={plan.label}
                      price={plan.priceCents ?? ('Custom' as const)}
                      features={plan.features}
                      popular={plan.popular}
                      selected={form.plan === plan.key}
                      billingCycle={form.cycle}
                      ctaLabel={getPlanSelectLabel(plan.key, form.plan === plan.key)}
                      ctaVariant={form.plan === plan.key ? 'disabled' : 'primary'}
                      onSelect={() => {
                        if (plan.key === 'ENTERPRISE') {
                          window.location.href = 'mailto:sales@printflowpos.com';
                          return;
                        }
                        set('plan', plan.key);
                      }}
                    />
                  ))}
                </div>
              )}
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
                className="min-h-[44px] px-5 flex-1 rounded-xl border border-white/10 text-sm font-medium text-slate-300 hover:bg-white/[0.06] disabled:opacity-50"
              >
                Back
              </button>
            )}
            {step < totalSteps ? (
              <button
                onClick={nextStep}
                className="min-h-[44px] flex-1 rounded-xl bg-[#ff6b00] text-white text-sm font-medium hover:bg-[#e55f00]"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="min-h-[44px] flex-1 rounded-xl bg-[#ff6b00] text-white text-sm font-medium hover:bg-[#e55f00] disabled:opacity-50"
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
