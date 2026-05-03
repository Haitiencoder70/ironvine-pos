import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { settingsApi } from '../../services/api';
import { useBillingUsage, useOpenPortal } from '../../hooks/useBilling';
import { UsageProgressBar } from '../../components/settings/UsageProgressBar';
import { InviteUserModal } from '../../components/settings/InviteUserModal';
import { EditUserRoleModal } from '../../components/settings/EditUserRoleModal';
import { RemoveUserModal } from '../../components/settings/RemoveUserModal';
import { UpgradePlanModal } from '../../components/settings/UpgradePlanModal';
import { AnalyticsPage } from './Analytics';
import type { OrgSettings, OrgUser } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'general' | 'branding' | 'team' | 'billing' | 'usage';

const TABS: { id: Tab; label: string }[] = [
  { id: 'general',  label: 'General' },
  { id: 'branding', label: 'Branding' },
  { id: 'team',     label: 'Team' },
  { id: 'billing',  label: 'Billing' },
  { id: 'usage',    label: 'Usage' },
];

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney',
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'MXN'];

const INDUSTRIES = [
  'T-Shirts', 'Embroidery', 'Screen Printing', 'DTG Printing',
  'Sublimation', 'Embellishments', 'Promotional Products', 'Other',
];

const ROLE_COLORS: Record<string, string> = {
  OWNER:   'bg-purple-100 text-purple-700',
  MANAGER: 'bg-blue-100 text-blue-700',
  STAFF:   'bg-gray-100 text-gray-700',
};

const PLAN_COLORS: Record<string, string> = {
  FREE:       'bg-gray-100 text-gray-700',
  STARTER:    'bg-blue-100 text-blue-700',
  PRO:        'bg-purple-100 text-purple-700',
  ENTERPRISE: 'bg-amber-100 text-amber-700',
};

// ─── Field helper ─────────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full min-h-[44px] px-3 text-sm rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-400 ${props.className ?? ''}`}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  const { children, className, ...rest } = props;
  return (
    <select
      {...rest}
      className={`w-full min-h-[44px] px-3 text-sm rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500 bg-white ${className ?? ''}`}
    >
      {children}
    </select>
  );
}

// ─── General Tab ──────────────────────────────────────────────────────────────

function GeneralTab({ settings, onSave }: { settings: OrgSettings; onSave: (d: Partial<OrgSettings>) => void }) {
  const [form, setForm] = useState({
    name: settings.name,
    currency: settings.currency,
    timezone: settings.timezone,
    orderNumberPrefix: settings.orderNumberPrefix,
    taxRate: String(settings.taxRate ?? 0),
  });

  function set(k: keyof typeof form, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  return (
    <div className="space-y-5 max-w-lg">
      <Field label="Organization Name">
        <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
      </Field>
      <Field label="Subdomain" hint="Your subdomain cannot be changed after signup. Contact support to migrate.">
        <Input value={settings.slug ?? ''} disabled />
      </Field>
      <Field label="Industry">
        <Select value={(settings as OrgSettings & { industry?: string }).industry ?? ''} onChange={(e) => onSave({ ...(settings as unknown as Record<string, unknown>), industry: e.target.value } as Partial<OrgSettings>)}>
          <option value="">Select industry…</option>
          {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
        </Select>
      </Field>
      <Field label="Timezone">
        <Select value={form.timezone} onChange={(e) => set('timezone', e.target.value)}>
          {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
        </Select>
      </Field>
      <Field label="Currency">
        <Select value={form.currency} onChange={(e) => set('currency', e.target.value)}>
          {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </Field>
      <Field label="Default Tax Rate (%)" hint="Applied to all new orders unless overridden per order.">
        <div className="relative">
          <Input
            type="number" min="0" max="100" step="0.01"
            value={form.taxRate}
            onChange={(e) => set('taxRate', e.target.value)}
            className="pr-8"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
        </div>
      </Field>
      <button
        onClick={() => onSave({ name: form.name, currency: form.currency, timezone: form.timezone, orderNumberPrefix: form.orderNumberPrefix, taxRate: parseFloat(form.taxRate) || 0 })}
        className="min-h-[44px] px-6 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
      >
        Save Changes
      </button>
    </div>
  );
}

// ─── Branding Tab ─────────────────────────────────────────────────────────────

function BrandingTab({ settings, plan }: { settings: OrgSettings; plan: string }) {
  const qc = useQueryClient();
  const logoRef = useRef<HTMLInputElement>(null);
  const isPaid = plan !== 'FREE';

  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [secondaryColor, setSecondaryColor] = useState('#7c3aed');

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const id = toast.loading('Uploading logo…');
    settingsApi.uploadLogo(file)
      .then(() => {
        void qc.invalidateQueries({ queryKey: ['settings', 'org'] });
        toast.success('Logo updated', { id });
      })
      .catch(() => toast.error('Logo upload failed', { id }));
  }

  if (!isPaid) {
    return (
      <div className="max-w-lg">
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-3">
          <div className="text-3xl">🎨</div>
          <h3 className="text-base font-semibold text-amber-900">Branding is a Starter+ feature</h3>
          <p className="text-sm text-amber-700">Upgrade to customize your logo, colors, and how your brand appears to customers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-lg">
      {/* Logo */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Logo</h3>
        <div
          onClick={() => logoRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
        >
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" className="h-16 object-contain" />
          ) : (
            <>
              <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">🖼️</div>
              <p className="text-sm text-gray-500">Drag & drop or click to upload</p>
              <p className="text-xs text-gray-400">PNG, JPG, SVG — max 2MB</p>
            </>
          )}
        </div>
        <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
        {settings.logoUrl && (
          <button className="text-xs text-gray-400 hover:text-red-500 hover:underline">Remove logo</button>
        )}
      </div>

      {/* Colors */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Brand Colors</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Primary Color">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-11 w-11 rounded-xl border border-gray-300 cursor-pointer p-1"
              />
              <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="font-mono text-xs" />
            </div>
          </Field>
          <Field label="Secondary Color">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="h-11 w-11 rounded-xl border border-gray-300 cursor-pointer p-1"
              />
              <Input value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="font-mono text-xs" />
            </div>
          </Field>
        </div>

        {/* Preview */}
        <div className="rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 text-white text-sm font-semibold" style={{ background: primaryColor }}>
            {settings.name || 'Your Organization'}
          </div>
          <div className="p-4 space-y-2 bg-white">
            <div className="h-3 rounded-full w-3/4 opacity-20" style={{ background: primaryColor }} />
            <div className="h-3 rounded-full w-1/2 opacity-10" style={{ background: secondaryColor }} />
            <button className="mt-3 min-h-[36px] px-4 rounded-lg text-white text-xs font-medium" style={{ background: secondaryColor }}>
              Sample Button
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button className="min-h-[44px] px-6 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
          Save Branding
        </button>
        <button
          onClick={() => { setPrimaryColor('#2563eb'); setSecondaryColor('#7c3aed'); }}
          className="min-h-[44px] px-4 rounded-xl border border-gray-300 text-sm text-gray-600 hover:bg-gray-50"
        >
          Restore Defaults
        </button>
      </div>
    </div>
  );
}

// ─── Team Tab ─────────────────────────────────────────────────────────────────

function TeamTab() {
  const currentUser = useAuthStore((s) => s.user);
  const { data: billing } = useBillingUsage();
  const [showInvite, setShowInvite] = useState(false);
  const [editUser, setEditUser] = useState<OrgUser | null>(null);
  const [removeUser, setRemoveUser] = useState<OrgUser | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['settings', 'users'],
    queryFn: () => settingsApi.getUsers(),
    select: (r) => r.data,
  });

  const userCount = users.length;
  const userMax = billing?.usage.users.max ?? -1;
  const atLimit = userMax !== -1 && userCount >= userMax;

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="text-sm text-gray-500">
          {userCount} member{userCount !== 1 ? 's' : ''}
          {userMax !== -1 && ` · ${userMax - userCount} slot${userMax - userCount !== 1 ? 's' : ''} remaining`}
        </div>
        <button
          onClick={() => setShowInvite(true)}
          disabled={atLimit}
          className="min-h-[44px] px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          + Invite User
        </button>
      </div>

      {atLimit && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          You've reached your user limit. Upgrade your plan to add more team members.
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse bg-gray-50 rounded-2xl" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((user) => {
            const isMe = currentUser?.id === user.id;
            return (
              <div key={user.id} className="bg-white border border-gray-100 rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-700 flex-shrink-0">
                  {user.firstName[0]}{user.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900">
                      {user.firstName} {user.lastName}
                      {isMe && <span className="ml-1 text-xs text-gray-400">(you)</span>}
                    </p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role] ?? 'bg-gray-100 text-gray-600'}`}>
                      {user.role}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{user.email}</p>
                </div>
                {!isMe && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setEditUser(user)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                      title="Edit role"
                    >
                      ✏️
                    </button>
                    {user.role !== 'OWNER' && (
                      <button
                        onClick={() => setRemoveUser(user)}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50"
                        title="Remove user"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showInvite && <InviteUserModal onClose={() => setShowInvite(false)} />}
      {editUser  && <EditUserRoleModal user={editUser} onClose={() => setEditUser(null)} />}
      {removeUser && <RemoveUserModal user={removeUser} onClose={() => setRemoveUser(null)} />}
    </div>
  );
}

// ─── Billing Tab ─────────────────────────────────────────────────────────────

function BillingTab() {
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { data: billing, isLoading } = useBillingUsage();
  const portal = useOpenPortal();

  const currentUser = useAuthStore((s) => s.user);
  const isOwner = currentUser?.role === 'OWNER';

  if (!isOwner) {
    return (
      <div className="max-w-lg p-6 bg-gray-50 border border-gray-200 rounded-2xl text-center">
        <p className="text-sm text-gray-500">Only the organization owner can manage billing.</p>
      </div>
    );
  }

  if (isLoading || !billing) {
    return <div className="space-y-4 animate-pulse max-w-lg">{[1,2,3].map((i) => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}</div>;
  }

  const PLAN_LABELS: Record<string, string> = { FREE: 'Free', STARTER: 'Starter', PRO: 'Professional', ENTERPRISE: 'Enterprise' };

  return (
    <div className="space-y-6 max-w-lg">
      {/* Current plan */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Current Plan</p>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${PLAN_COLORS[billing.plan] ?? 'bg-gray-100 text-gray-700'}`}>
            {PLAN_LABELS[billing.plan] ?? billing.plan}
          </span>
          {billing.subscriptionStatus && billing.subscriptionStatus !== 'active' && (
            <p className="text-xs text-red-600 mt-1 capitalize">{billing.subscriptionStatus.replace('_', ' ')}</p>
          )}
          {billing.trialEndsAt && new Date(billing.trialEndsAt) > new Date() && (
            <p className="text-xs text-amber-600 mt-1">
              Trial ends {new Date(billing.trialEndsAt).toLocaleDateString()}
            </p>
          )}
          {billing.subscriptionEndsAt && (
            <p className="text-xs text-red-500 mt-1">
              Access ends {new Date(billing.subscriptionEndsAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setShowUpgrade(true)}
            className="min-h-[44px] px-4 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700"
          >
            {billing.plan === 'FREE' ? 'Upgrade Plan' : 'Change Plan'}
          </button>
          {billing.plan !== 'FREE' && (
            <button
              onClick={() => portal.mutate()}
              disabled={portal.isPending}
              className="min-h-[44px] px-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50"
            >
              {portal.isPending ? 'Opening…' : 'Manage Subscription'}
            </button>
          )}
        </div>
      </div>

      {/* Usage summary */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Usage Summary</p>
        <UsageProgressBar label="Orders" current={billing.usage.orders.current} max={billing.usage.orders.max} />
        <UsageProgressBar label="Customers" current={billing.usage.customers.current} max={billing.usage.customers.max} />
        <UsageProgressBar label="Team Members" current={billing.usage.users.current} max={billing.usage.users.max} />
        <UsageProgressBar label="Inventory Items" current={billing.usage.inventoryItems.current} max={billing.usage.inventoryItems.max} />
      </div>

      {showUpgrade && <UpgradePlanModal onClose={() => setShowUpgrade(false)} />}
    </div>
  );
}

// ─── Usage Tab ────────────────────────────────────────────────────────────────

function UsageTab() {
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { data: billing, isLoading } = useBillingUsage();

  if (isLoading || !billing) {
    return <div className="space-y-4 animate-pulse max-w-lg">{[1,2,3,4].map((i) => <div key={i} className="h-10 bg-gray-100 rounded-xl" />)}</div>;
  }

  const USAGE_ITEMS: { key: keyof typeof billing.usage; label: string; unit?: string }[] = [
    { key: 'users',         label: 'Team Members' },
    { key: 'orders',        label: 'Orders This Month' },
    { key: 'inventoryItems',label: 'Inventory Items' },
    { key: 'customers',     label: 'Customers' },
  ];

  const anyNearLimit = USAGE_ITEMS.some(({ key }) => {
    const { current, max } = billing.usage[key];
    return max !== -1 && (current / max) >= 0.8;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5 max-w-lg">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900">Resource Usage</p>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_COLORS[billing.plan] ?? 'bg-gray-100 text-gray-600'}`}>
            {billing.plan}
          </span>
        </div>
        {USAGE_ITEMS.map(({ key, label, unit }) => (
          <UsageProgressBar
            key={key}
            label={label}
            current={billing.usage[key].current}
            max={billing.usage[key].max}
            unit={unit}
            onUpgrade={() => setShowUpgrade(true)}
          />
        ))}
      </div>

      {anyNearLimit && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
          <span className="text-xl flex-shrink-0">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-amber-900">You're approaching your plan limits</p>
            <p className="text-xs text-amber-700 mt-0.5">Upgrade now to avoid interruptions to your workflow.</p>
            <button
              onClick={() => setShowUpgrade(true)}
              className="mt-2 min-h-[36px] px-4 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700"
            >
              View Upgrade Options
            </button>
          </div>
        </div>
      )}

      {showUpgrade && <UpgradePlanModal onClose={() => setShowUpgrade(false)} />}

      <AnalyticsPage />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function OrganizationSettingsPage(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const qc = useQueryClient();
  const { data: billing } = useBillingUsage();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings', 'org'],
    queryFn: () => settingsApi.getOrg(),
    select: (r) => r.data,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<OrgSettings>) => settingsApi.updateOrg(data),
    onSuccess: () => {
      toast.success('Settings saved');
      void qc.invalidateQueries({ queryKey: ['settings', 'org'] });
    },
    onError: () => toast.error('Failed to save settings'),
  });

  const skeletonTabs: Tab[] = ['team', 'billing', 'usage'];
  const showSkeleton = isLoading && !skeletonTabs.includes(activeTab);

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Organization Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your organization profile, team, and subscription</p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`min-h-[44px] px-5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
              activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {showSkeleton ? (
          <div className="space-y-4 max-w-lg">
            {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-12 animate-pulse bg-gray-50 rounded-xl" />)}
          </div>
        ) : (
          <>
            {activeTab === 'general'  && settings && (
              <GeneralTab settings={settings} onSave={(d) => updateMutation.mutate(d)} />
            )}
            {activeTab === 'branding' && settings && (
              <BrandingTab settings={settings} plan={billing?.plan ?? 'FREE'} />
            )}
            {activeTab === 'team'    && <TeamTab />}
            {activeTab === 'billing' && <BillingTab />}
            {activeTab === 'usage'   && <UsageTab />}
          </>
        )}
      </div>
    </div>
  );
}
