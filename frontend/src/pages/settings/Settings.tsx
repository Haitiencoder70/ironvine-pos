import { useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  BuildingOfficeIcon,
  UsersIcon,
  CalculatorIcon,
  BellIcon,
  PuzzlePieceIcon,
  CreditCardIcon,
  PencilIcon,
  TrashIcon,
  UserPlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  PaintBrushIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { settingsApi } from '../../services/api';
import { BillingTab } from './Billing';
import { BrandingSettings } from './BrandingSettings';
import { RolesPermissionsTab } from './RolesPermissions';
import { useAuthStore } from '../../store/authStore';
import type { OrgSettings, OrgUser, NotificationSettings } from '../../types';

// ─── Tab definition ───────────────────────────────────────────────────────────

type Tab = 'general' | 'users' | 'roles' | 'tax' | 'notifications' | 'integrations' | 'branding' | 'billing' | 'modules';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: 'General', icon: <BuildingOfficeIcon className="h-5 w-5" /> },
  { id: 'users', label: 'Users', icon: <UsersIcon className="h-5 w-5" /> },
  { id: 'billing', label: 'Billing', icon: <CreditCardIcon className="h-5 w-5" /> },
  { id: 'roles', label: 'Roles & Permissions', icon: <ShieldCheckIcon className="h-5 w-5" /> },
  { id: 'tax', label: 'Tax & Pricing', icon: <CalculatorIcon className="h-5 w-5" /> },
  { id: 'notifications', label: 'Notifications', icon: <BellIcon className="h-5 w-5" /> },
  { id: 'integrations', label: 'Integrations', icon: <PuzzlePieceIcon className="h-5 w-5" /> },
  { id: 'branding', label: 'Branding', icon: <PaintBrushIcon className="h-5 w-5" /> },
  { id: 'modules', label: 'Advanced Modules', icon: <PuzzlePieceIcon className="h-5 w-5" /> },
];

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney',
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'MXN'];

const ROLE_COLORS: Record<string, string> = {
  OWNER: 'bg-purple-500/15 text-purple-300',
  MANAGER: 'bg-orange-500/15 text-orange-300',
  STAFF: 'bg-slate-500/15 text-slate-300',
};

// ─── General Tab ──────────────────────────────────────────────────────────────

function GeneralTab({ settings, onSave }: { settings: OrgSettings; onSave: (data: Partial<OrgSettings>) => void }) {
  const [form, setForm] = useState({
    name: settings.name,
    orderNumberPrefix: settings.orderNumberPrefix,
    currency: settings.currency,
    timezone: settings.timezone,
  });
  const logoRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const toastId = toast.loading('Uploading logo…');
    settingsApi.uploadLogo(file)
      .then((res) => {
        void qc.invalidateQueries({ queryKey: ['settings', 'org'] });
        toast.success('Logo updated', { id: toastId });
        onSave({ logoUrl: res.data.logoUrl });
      })
      .catch(() => toast.error('Logo upload failed', { id: toastId }));
  }

  return (
    <div className="space-y-6 max-w-xl">
      {/* Logo */}
      <div>
        <label className="block text-sm font-medium text-secondary mb-2">Business Logo</label>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <BuildingOfficeIcon className="h-8 w-8 text-slate-500" />
            )}
          </div>
          <button
            onClick={() => logoRef.current?.click()}
            className="min-h-[44px] px-4 rounded-xl border border-white/10 text-sm font-medium text-secondary hover:bg-white/5 transition-colors"
          >
            Upload Logo
          </button>
          <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
        </div>
      </div>

      {/* Business Name */}
      <div>
        <label className="block text-sm font-medium text-secondary mb-1.5">Business Name</label>
        <input
          value={form.name}
          onChange={field('name')}
          className="w-full min-h-[44px] rounded-xl border border-white/10 bg-white/5 text-slate-100 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/30"
        />
      </div>

      {/* Order Number Prefix */}
      <div>
        <label className="block text-sm font-medium text-secondary mb-1.5">Order Number Prefix</label>
        <input
          value={form.orderNumberPrefix}
          onChange={field('orderNumberPrefix')}
          maxLength={6}
          className="w-full min-h-[44px] rounded-xl border border-white/10 bg-white/5 text-slate-100 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/30"
          placeholder="ORD"
        />
        <p className="mt-1 text-xs text-muted">Orders will be numbered like {form.orderNumberPrefix || 'ORD'}-202401-0001</p>
      </div>

      {/* Currency */}
      <div>
        <label className="block text-sm font-medium text-secondary mb-1.5">Currency</label>
        <select
          value={form.currency}
          onChange={field('currency')}
          className="w-full min-h-[44px] rounded-xl border border-white/10 bg-white/5 text-slate-100 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
        >
          {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Timezone */}
      <div>
        <label className="block text-sm font-medium text-secondary mb-1.5">Time Zone</label>
        <select
          value={form.timezone}
          onChange={field('timezone')}
          className="w-full min-h-[44px] rounded-xl border border-white/10 bg-white/5 text-slate-100 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
        >
          {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
        </select>
      </div>

      <button
        onClick={() => onSave(form)}
        className="min-h-[44px] px-6 rounded-xl bg-[#ff6b00] text-white text-sm font-semibold hover:bg-[#e55f00] transition-colors"
      >
        Save Changes
      </button>
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

function UsersTab() {
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', firstName: '', lastName: '', role: 'STAFF' });
  const [inviteError, setInviteError] = useState('');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['settings', 'users'],
    queryFn: () => settingsApi.getUsers(),
    select: (r) => r.data,
  });

  const inviteMutation = useMutation({
    mutationFn: () => settingsApi.inviteUser(inviteForm),
    onSuccess: () => {
      toast.success('Invitation sent');
      void qc.invalidateQueries({ queryKey: ['settings', 'users'] });
      setShowInvite(false);
      setInviteForm({ email: '', firstName: '', lastName: '', role: 'STAFF' });
      setInviteError('');
    },
    onError: () => setInviteError('Failed to send invitation. Please try again.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { role?: string; isActive?: boolean } }) =>
      settingsApi.updateUser(id, data),
    onSuccess: () => {
      toast.success('User updated');
      void qc.invalidateQueries({ queryKey: ['settings', 'users'] });
    },
    onError: () => toast.error('Failed to update user'),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => settingsApi.removeUser(id),
    onSuccess: () => {
      toast.success('User removed');
      void qc.invalidateQueries({ queryKey: ['settings', 'users'] });
    },
    onError: () => toast.error('Failed to remove user'),
  });

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteForm.email || !inviteForm.firstName || !inviteForm.lastName) {
      setInviteError('All fields are required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteForm.email)) {
      setInviteError('Enter a valid email address');
      return;
    }
    inviteMutation.mutate();
  }

  function confirmRemove(user: OrgUser) {
    if (!window.confirm(`Remove ${user.firstName} ${user.lastName}? This cannot be undone.`)) return;
    removeMutation.mutate(user.id);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-secondary">{users.length} team member{users.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setShowInvite(true)}
          className="min-h-[44px] px-4 rounded-xl bg-[#ff6b00] text-white text-sm font-semibold hover:bg-[#e55f00] transition-colors flex items-center gap-2"
        >
          <UserPlusIcon className="h-4 w-4" />
          Invite User
        </button>
      </div>

      {/* Invite Form */}
      {showInvite && (
        <div className="glass-panel border-orange-500/20 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-100">Invite New Team Member</h3>
          <form onSubmit={handleInvite} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                placeholder="First name"
                value={inviteForm.firstName}
                onChange={(e) => setInviteForm((f) => ({ ...f, firstName: e.target.value }))}
                className="min-h-[44px] rounded-xl border border-white/10 bg-white/5 text-slate-100 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder:text-slate-500"
              />
              <input
                placeholder="Last name"
                value={inviteForm.lastName}
                onChange={(e) => setInviteForm((f) => ({ ...f, lastName: e.target.value }))}
                className="min-h-[44px] rounded-xl border border-white/10 bg-white/5 text-slate-100 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder:text-slate-500"
              />
            </div>
            <input
              type="email"
              placeholder="Email address"
              value={inviteForm.email}
              onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full min-h-[44px] rounded-xl border border-white/10 bg-white/5 text-slate-100 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder:text-slate-500"
            />
            <select
              value={inviteForm.role}
              onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value }))}
              className="w-full min-h-[44px] rounded-xl border border-white/10 bg-white/5 text-slate-100 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            >
              <option value="STAFF">Staff</option>
              <option value="MANAGER">Manager</option>
              <option value="OWNER">Owner / Admin</option>
            </select>
            {inviteError && <p className="text-xs text-red-400">{inviteError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={inviteMutation.isPending}
                className="min-h-[44px] px-5 rounded-xl bg-[#ff6b00] text-white text-sm font-semibold hover:bg-[#e55f00] disabled:opacity-50 transition-colors"
              >
                {inviteMutation.isPending ? 'Sending…' : 'Send Invite'}
              </button>
              <button
                type="button"
                onClick={() => { setShowInvite(false); setInviteError(''); }}
                className="min-h-[44px] px-5 rounded-xl border border-white/10 text-secondary text-sm font-medium hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 animate-pulse bg-white/5 rounded-lg" />)}
          </div>
        ) : users.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">No users yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Name</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden sm:table-cell">Email</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Role</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((user) => {
                const isMe = currentUser?.id === user.id;
                return (
                  <tr key={user.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-orange-500/15 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-orange-300">
                          {user.firstName[0]}{user.lastName[0]}
                        </div>
                        <span className="font-medium text-slate-100">
                          {user.firstName} {user.lastName}
                          {isMe && <span className="ml-1.5 text-xs text-muted">(you)</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-secondary hidden sm:table-cell">{user.email}</td>
                    <td className="px-5 py-3">
                      {isMe ? (
                        <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', ROLE_COLORS[user.role] ?? 'bg-slate-500/15 text-slate-300')}>
                          {user.role}
                        </span>
                      ) : (
                        <select
                          value={user.role}
                          onChange={(e) => updateMutation.mutate({ id: user.id, data: { role: e.target.value } })}
                          className={clsx('rounded-lg border-0 text-xs font-medium px-2 py-1 min-h-[32px] focus:outline-none focus:ring-2 focus:ring-orange-500/50 cursor-pointer', ROLE_COLORS[user.role] ?? 'bg-slate-500/15 text-slate-300')}
                        >
                          <option value="STAFF">STAFF</option>
                          <option value="MANAGER">MANAGER</option>
                          <option value="OWNER">OWNER</option>
                        </select>
                      )}
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell">
                      <button
                        onClick={() => !isMe && updateMutation.mutate({ id: user.id, data: { isActive: !user.isActive } })}
                        disabled={isMe}
                        className="flex items-center gap-1.5 text-xs font-medium disabled:cursor-not-allowed"
                      >
                        {user.isActive
                          ? <><CheckCircleIcon className="h-4 w-4 text-green-500" /><span className="text-green-400">Active</span></>
                          : <><XCircleIcon className="h-4 w-4 text-red-400" /><span className="text-red-400">Inactive</span></>}
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Link
                          to={`/settings/users/${user.id}`}
                          className="min-h-[36px] w-9 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
                          title="Edit"
                        >
                          <PencilIcon className="h-4 w-4 text-slate-400" />
                        </Link>
                        {!isMe && (
                          <button
                            onClick={() => confirmRemove(user)}
                            className="min-h-[36px] w-9 flex items-center justify-center rounded-lg hover:bg-red-500/10 transition-colors"
                            title="Remove"
                          >
                            <TrashIcon className="h-4 w-4 text-red-400" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Tax & Pricing Tab ────────────────────────────────────────────────────────

function TaxTab({ settings, onSave }: { settings: OrgSettings; onSave: (data: Partial<OrgSettings>) => void }) {
  const [taxRate, setTaxRate] = useState(String(settings.taxRate ?? 0));
  const [taxInclusive, setTaxInclusive] = useState(false);
  const [markup, setMarkup] = useState('30');

  const taxRateNum = parseFloat(taxRate);
  const taxValid = !isNaN(taxRateNum) && taxRateNum >= 0 && taxRateNum <= 100;

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <label className="block text-sm font-medium text-secondary mb-1.5">Default Tax Rate (%)</label>
        <div className="relative">
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={taxRate}
            onChange={(e) => setTaxRate(e.target.value)}
            className={clsx(
              'w-full min-h-[44px] rounded-xl border text-slate-100 px-4 pr-10 text-sm focus:outline-none focus:ring-2',
              taxValid ? 'border-white/10 bg-white/5 focus:ring-orange-500/50' : 'border-red-500/60 bg-red-500/10 focus:ring-red-500/60',
            )}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">%</span>
        </div>
        {!taxValid && <p className="mt-1 text-xs text-red-400">Enter a value between 0 and 100</p>}
        <p className="mt-1 text-xs text-muted">Applied to all new orders unless overridden</p>
      </div>

      <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
        <div>
          <p className="text-sm font-medium text-slate-100">Tax included in prices</p>
          <p className="text-xs text-secondary mt-0.5">Display prices with tax already included</p>
        </div>
        <button
          onClick={() => setTaxInclusive((v) => !v)}
          className={clsx(
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/50',
            taxInclusive ? 'bg-[#ff6b00]' : 'bg-white/20',
          )}
          role="switch"
          aria-checked={taxInclusive}
        >
          <span className={clsx('inline-block h-4 w-4 rounded-full bg-white shadow transition-transform', taxInclusive ? 'translate-x-6' : 'translate-x-1')} />
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-secondary mb-1.5">Default Markup (%)</label>
        <div className="relative">
          <input
            type="number"
            min="0"
            step="1"
            value={markup}
            onChange={(e) => setMarkup(e.target.value)}
            className="w-full min-h-[44px] rounded-xl border border-white/10 bg-white/5 text-slate-100 px-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">%</span>
        </div>
        <p className="mt-1 text-xs text-muted">Suggested markup over cost when creating quotes</p>
      </div>

      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
        <p className="text-sm font-medium text-amber-300">Pricing Tiers</p>
        <p className="text-xs text-amber-400 mt-1">Volume pricing tiers (e.g. 1–11 shirts, 12–23, 24+) are configured per product type and coming in a future update.</p>
      </div>

      <button
        onClick={() => {
          if (!taxValid) return;
          onSave({ taxRate: taxRateNum });
        }}
        disabled={!taxValid}
        className="min-h-[44px] px-6 rounded-xl bg-[#ff6b00] text-white text-sm font-semibold hover:bg-[#e55f00] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Save Changes
      </button>
    </div>
  );
}

// ─── Notifications Tab ────────────────────────────────────────────────────────

function NotificationsTab() {
  const qc = useQueryClient();

  const { data: notifs, isLoading } = useQuery({
    queryKey: ['settings', 'notifications'],
    queryFn: () => settingsApi.getNotifications(),
    select: (r) => r.data,
  });

  const mutation = useMutation({
    mutationFn: (data: Partial<NotificationSettings>) => settingsApi.updateNotifications(data),
    onSuccess: () => {
      toast.success('Notifications saved');
      void qc.invalidateQueries({ queryKey: ['settings', 'notifications'] });
    },
    onError: () => toast.error('Failed to save'),
  });

  const [recipientInput, setRecipientInput] = useState('');

  if (isLoading || !notifs) return <div className="h-48 animate-pulse bg-white/5 rounded-2xl" />;

  const toggles: { key: keyof NotificationSettings; label: string; description: string }[] = [
    { key: 'newOrderEmail', label: 'New order received', description: 'Email when a new order is created' },
    { key: 'orderStatusEmail', label: 'Order status changes', description: 'Email when an order moves to a new status' },
    { key: 'lowStockEmail', label: 'Low stock alerts', description: 'Email when inventory drops below reorder point' },
    { key: 'poReceivedEmail', label: 'Purchase order received', description: 'Email when a PO is fully received' },
    { key: 'shipmentDeliveredEmail', label: 'Shipment delivered', description: 'Email when a shipment is marked delivered' },
  ];

  function addRecipient() {
    const email = recipientInput.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    if (notifs!.recipients.includes(email)) return;
    mutation.mutate({ recipients: [...notifs!.recipients, email] });
    setRecipientInput('');
  }

  function removeRecipient(email: string) {
    mutation.mutate({ recipients: notifs!.recipients.filter((r) => r !== email) });
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div className="glass-panel rounded-2xl divide-y divide-white/10 overflow-hidden">
        {toggles.map(({ key, label, description }) => (
          <div key={key} className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-sm font-medium text-slate-100">{label}</p>
              <p className="text-xs text-secondary mt-0.5">{description}</p>
            </div>
            <button
              onClick={() => mutation.mutate({ [key]: !notifs[key] })}
              className={clsx(
                'relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/50',
                notifs[key] ? 'bg-[#ff6b00]' : 'bg-white/20',
              )}
              role="switch"
              aria-checked={!!notifs[key]}
            >
              <span className={clsx('inline-block h-4 w-4 rounded-full bg-white shadow transition-transform', notifs[key] ? 'translate-x-6' : 'translate-x-1')} />
            </button>
          </div>
        ))}
      </div>

      {/* Recipients */}
      <div>
        <label className="block text-sm font-medium text-secondary mb-2">Email Recipients</label>
        <div className="flex gap-2 mb-3">
          <input
            type="email"
            placeholder="Add email address…"
            value={recipientInput}
            onChange={(e) => setRecipientInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRecipient(); } }}
            className="flex-1 min-h-[44px] rounded-xl border border-white/10 bg-white/5 text-slate-100 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder:text-slate-500"
          />
          <button
            onClick={addRecipient}
            className="min-h-[44px] px-4 rounded-xl bg-[#ff6b00] text-white text-sm font-semibold hover:bg-[#e55f00] transition-colors"
          >
            Add
          </button>
        </div>
        {notifs.recipients.length === 0 ? (
          <p className="text-xs text-muted">No recipients — notifications will be sent to the account owner only.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {notifs.recipients.map((r) => (
              <span key={r} className="inline-flex items-center gap-1.5 bg-orange-500/15 text-orange-300 text-xs font-medium px-3 py-1.5 rounded-full">
                {r}
                <button onClick={() => removeRecipient(r)} className="hover:text-red-400 transition-colors">×</button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Integrations Tab ─────────────────────────────────────────────────────────

function IntegrationsTab() {
  const integrations = [
    { name: 'QuickBooks', category: 'Accounting', description: 'Sync invoices and payments automatically', logo: '📊', status: 'coming_soon' },
    { name: 'Xero', category: 'Accounting', description: 'Export orders to Xero for bookkeeping', logo: '📒', status: 'coming_soon' },
    { name: 'SendGrid', category: 'Email', description: 'Transactional email for order confirmations', logo: '✉️', status: 'coming_soon' },
    { name: 'Twilio', category: 'SMS', description: 'Send SMS updates to customers', logo: '💬', status: 'coming_soon' },
    { name: 'UPS API', category: 'Shipping', description: 'Real-time shipping rates and label printing', logo: '📦', status: 'coming_soon' },
    { name: 'FedEx API', category: 'Shipping', description: 'FedEx shipping rates and tracking', logo: '🚚', status: 'coming_soon' },
    { name: 'Stripe', category: 'Payments', description: 'Accept card payments and subscriptions', logo: '💳', status: 'coming_soon' },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-secondary">Integrations are coming in a future update. Connect your tools to automate your workflow.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {integrations.map((int) => (
          <div key={int.name} className="glass-panel rounded-2xl p-5 flex items-start gap-4">
            <span className="text-2xl flex-shrink-0">{int.logo}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-100">{int.name}</p>
                <span className="text-xs bg-slate-500/15 text-slate-400 px-2 py-0.5 rounded-full">{int.category}</span>
              </div>
              <p className="text-xs text-secondary mt-1">{int.description}</p>
            </div>
            <span className="text-xs bg-amber-500/15 text-amber-300 px-2 py-1 rounded-full font-medium flex-shrink-0">Soon</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Modules Tab ──────────────────────────────────────────────────────────────

function ModulesTab({ settings, onSave }: { settings: OrgSettings; onSave: (data: Partial<OrgSettings>) => void }) {
  const modules = [
    { id: 'BARCODE', name: 'Barcode & QR Integration', description: 'Enable USB scanning and QR code labels.' },
    { id: 'EMAIL', name: 'Email Automation', description: 'Trigger automatic status emails via Resend.' },
    { id: 'SMS', name: 'SMS Notifications', description: 'Send text alerts to customers for pickup and shipping.' },
    { id: 'ADVANCED_SEARCH', name: 'Advanced Global Search', description: 'Deep search across all entities fields.' },
    { id: 'BULK_OPS', name: 'Bulk Operations', description: 'Update and export orders and inventory in bulk.' },
    { id: 'CALENDAR', name: 'Calendar Scheduling', description: 'Visual production schedule and drag-and-drop calendar.' },
    { id: 'CUSTOMER_PORTAL', name: 'Customer Portal', description: 'Allow customers to log in and track their orders.' },
    { id: 'VENDOR_PORTAL', name: 'Vendor Portal', description: 'Allow vendors to drop off PO fulfillment automatically.' },
    { id: 'ACCOUNTING', name: 'Accounting Sync', description: 'QuickBooks boundary export enabled.' },
    { id: 'MULTI_LOCATION', name: 'Multi-Location Support', description: 'Stock transferring across separate warehouses.' },
  ];

  const enabled = new Set(settings.enabledModules || []);

  function toggleModule(id: string) {
    const next = new Set(enabled);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSave({ enabledModules: Array.from(next) });
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <p className="text-sm text-secondary mb-4">Toggle advanced enterprise capabilities on or off for your organization.</p>
      <div className="grid gap-3">
        {modules.map((mod) => {
          const isOn = enabled.has(mod.id);
          return (
            <div key={mod.id} className="glass-panel rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-100">{mod.name}</p>
                <p className="text-xs text-secondary mt-0.5">{mod.description}</p>
              </div>
              <button
                onClick={() => toggleModule(mod.id)}
                className={clsx(
                  'relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/50',
                  isOn ? 'bg-[#ff6b00]' : 'bg-white/20',
                )}
                role="switch"
                aria-checked={isOn}
              >
                <span className={clsx('inline-block h-4 w-4 rounded-full bg-white shadow transition-transform', isOn ? 'translate-x-6' : 'translate-x-1')} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────

export function SettingsPage({ initialTab }: { initialTab?: Tab } = {}): React.JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (initialTab) return initialTab;
    const p = searchParams.get('tab') as Tab;
    return TABS.some(t => t.id === p) ? p : 'general';
  });
  const qc = useQueryClient();

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  }

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

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
          <p className="text-sm text-secondary mt-0.5">Manage your organization and preferences</p>
        </div>
        <Link
          to="/settings/profile"
          className="min-h-[44px] px-4 rounded-xl glass-panel text-secondary text-sm font-medium hover:text-slate-100 transition-colors flex items-center gap-2"
        >
          My Profile
        </Link>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-white/5 border border-white/10 rounded-2xl p-1 overflow-x-auto [&::-webkit-scrollbar]:h-0 scrollbar-none">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={clsx(
              'flex items-center gap-2 min-h-[44px] px-4 rounded-xl text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0',
              activeTab === tab.id
                ? 'bg-white/10 text-slate-100'
                : 'text-slate-400 hover:text-slate-200',
            )}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {isLoading && activeTab !== 'users' && activeTab !== 'roles' && activeTab !== 'notifications' && activeTab !== 'integrations' && activeTab !== 'billing' && activeTab !== 'branding' && activeTab !== 'modules' ? (
          <div className="space-y-4 max-w-xl">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 animate-pulse bg-white/5 rounded-xl" />)}
          </div>
        ) : (
          <>
            {activeTab === 'general' && settings && (
              <GeneralTab settings={settings} onSave={(data) => updateMutation.mutate(data)} />
            )}
            {activeTab === 'users' && <UsersTab />}
            {activeTab === 'roles' && <RolesPermissionsTab />}
            {activeTab === 'tax' && settings && (
              <TaxTab settings={settings} onSave={(data) => updateMutation.mutate(data)} />
            )}
            {activeTab === 'notifications' && <NotificationsTab />}
            {activeTab === 'integrations' && <IntegrationsTab />}
            {activeTab === 'branding' && <BrandingSettings />}
            {activeTab === 'billing' && <BillingTab />}
            {activeTab === 'modules' && settings && (
              <ModulesTab settings={settings} onSave={(data) => updateMutation.mutate(data)} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
