import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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

const step2Schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName:  z.string().min(1, 'Last name is required'),
  email:     z.string().email('Enter a valid email'),
  password:  z.string().min(8, 'Password must be at least 8 characters'),
  confirm:   z.string(),
}).refine((d) => d.password === d.confirm, {
  message: 'Passwords do not match',
  path: ['confirm'],
});

// ─── Types ───────────────────────────────────────────────────────────────────

type PlanKey = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';

interface FormState {
  // Step 1
  name: string;
  slug: string;
  industry: string;
  // Step 2
  firstName: string;
  lastName:  string;
  email:     string;
  password:  string;
  confirm:   string;
  // Step 3
  plan: PlanKey;
  cycle: 'monthly' | 'yearly';
}

const INITIAL: FormState = {
  name: '', slug: '', industry: '',
  firstName: '', lastName: '', email: '', password: '', confirm: '',
  plan: 'FREE', cycle: 'monthly',
};

const INDUSTRIES = [
  'T-Shirts', 'Embroidery', 'Screen Printing', 'DTG Printing',
  'Sublimation', 'Embellishments', 'Promotional Products', 'Other',
];

const PLANS = [
  {
    key: 'FREE' as const,
    name: 'Free',
    price: 0 as const,
    features: ['1 user', '50 orders/month', '100 customers', '200 inventory items', 'Email support'],
  },
  {
    key: 'STARTER' as const,
    name: 'Starter',
    price: 29 as const,
    features: ['3 users', '500 orders/month', 'Custom branding', 'Advanced reports', '14-day free trial'],
  },
  {
    key: 'PROFESSIONAL' as const,
    name: 'Professional',
    price: 79 as const,
    popular: true,
    features: ['10 users', 'Unlimited orders', 'API access', 'Phone support', '14-day free trial'],
  },
  {
    key: 'ENTERPRISE' as const,
    name: 'Enterprise',
    price: 'Custom' as const,
    features: ['Unlimited users', 'White-label', 'Custom domain', 'Dedicated support'],
  },
] as const;

// ─── Password strength ────────────────────────────────────────────────────────

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const levels = [
    { label: '', color: 'bg-gray-200' },
    { label: 'Weak', color: 'bg-red-400' },
    { label: 'Fair', color: 'bg-amber-400' },
    { label: 'Good', color: 'bg-blue-400' },
    { label: 'Strong', color: 'bg-green-500' },
    { label: 'Very Strong', color: 'bg-green-600' },
  ];
  return { score, ...levels[score] };
}

// ─── Step indicators ─────────────────────────────────────────────────────────

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
      className={`w-full min-h-[44px] px-3 text-sm rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${props.className ?? ''}`}
    />
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function OrganizationSignup(): React.JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>({
    ...INITIAL,
    plan: (searchParams.get('plan') as PlanKey) ?? 'FREE',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => { const next = { ...e }; delete next[field]; return next; });
  }

  // Auto-generate slug from org name
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
    if (n === 2) {
      const result = step2Schema.safeParse({
        firstName: form.firstName, lastName: form.lastName,
        email: form.email, password: form.password, confirm: form.confirm,
      });
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
        ownerFirstName: form.firstName,
        ownerLastName: form.lastName,
        ownerEmail: form.email,
        plan: form.plan,
      });

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setErrors({ submit: msg });
    } finally {
      setSubmitting(false);
    }
  }

  const STEP_TITLES = ['Organization Details', 'Owner Account', 'Choose Plan', 'Payment'];
  const totalSteps = form.plan === 'FREE' ? 3 : 4;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-2xl font-bold text-gray-900">YourApp</span>
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
                  <option value="">Select industry…</option>
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </Field>
            </div>
          )}

          {/* ── Step 2: Owner Account ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="First Name" error={errors.firstName}>
                  <Input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="Jane" />
                </Field>
                <Field label="Last Name" error={errors.lastName}>
                  <Input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} placeholder="Smith" />
                </Field>
              </div>
              <Field label="Email" error={errors.email}>
                <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="jane@example.com" />
              </Field>
              <Field label="Password" error={errors.password}>
                <Input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Min 8 characters" />
                {form.password && (() => {
                  const s = passwordStrength(form.password);
                  return (
                    <div className="mt-1.5 space-y-1">
                      <div className="flex gap-1">
                        {[1,2,3,4,5].map((i) => (
                          <div key={i} className={`h-1 flex-1 rounded-full ${i <= s.score ? s.color : 'bg-gray-200'}`} />
                        ))}
                      </div>
                      {s.label && <p className="text-xs text-gray-500">{s.label}</p>}
                    </div>
                  );
                })()}
              </Field>
              <Field label="Confirm Password" error={errors.confirm}>
                <Input type="password" value={form.confirm} onChange={(e) => set('confirm', e.target.value)} placeholder="Repeat password" />
              </Field>
            </div>
          )}

          {/* ── Step 3: Choose Plan ── */}
          {step === 3 && (
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
                    ctaLabel={form.plan === plan.key ? 'Selected' : plan.key === 'FREE' ? 'Start Free' : 'Select'}
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
                  ? 'Setting up…'
                  : form.plan === 'FREE'
                  ? 'Create Organization'
                  : 'Continue to Payment'}
              </button>
            )}
          </div>

          <p className="text-center text-xs text-gray-400">
            Already have an account?{' '}
            <button onClick={() => navigate('/sign-in')} className="text-blue-600 hover:underline">
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
