import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { settingsApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const ROLES = [
  { value: 'STAFF', label: 'Staff', description: 'Can view and manage orders, inventory' },
  { value: 'MANAGER', label: 'Manager', description: 'All Staff permissions plus reports, settings' },
  { value: 'OWNER', label: 'Owner / Admin', description: 'Full access to all features and billing' },
];

export function AddEditUserPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const isNew = !id;

  const { data: users = [] } = useQuery({
    queryKey: ['settings', 'users'],
    queryFn: () => settingsApi.getUsers(),
    select: (r) => r.data,
  });

  const existingUser = id ? users.find((u) => u.id === id) : undefined;

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'STAFF',
    isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (existingUser) {
      setForm({
        firstName: existingUser.firstName,
        lastName: existingUser.lastName,
        email: existingUser.email,
        role: existingUser.role,
        isActive: existingUser.isActive,
      });
    }
  }, [existingUser]);

  const inviteMutation = useMutation({
    mutationFn: () =>
      settingsApi.inviteUser({ email: form.email, firstName: form.firstName, lastName: form.lastName, role: form.role }),
    onSuccess: () => {
      toast.success('Invitation sent');
      void qc.invalidateQueries({ queryKey: ['settings', 'users'] });
      navigate('/settings');
    },
    onError: () => toast.error('Failed to send invitation'),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      settingsApi.updateUser(id!, { firstName: form.firstName, lastName: form.lastName, role: form.role, isActive: form.isActive }),
    onSuccess: () => {
      toast.success('User updated');
      void qc.invalidateQueries({ queryKey: ['settings', 'users'] });
      navigate('/settings');
    },
    onError: () => toast.error('Failed to update user'),
  });

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim()) e.lastName = 'Last name is required';
    if (!form.email.trim()) {
      e.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = 'Enter a valid email address';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    if (isNew) {
      inviteMutation.mutate();
    } else {
      updateMutation.mutate();
    }
  }

  const isMe = currentUser?.id === id;
  const isPending = inviteMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-4 sm:p-6 max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/settings"
          className="min-h-[44px] w-11 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isNew ? 'Invite User' : 'Edit User'}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isNew ? 'Send an invitation to a new team member' : `Editing ${existingUser?.firstName ?? ''} ${existingUser?.lastName ?? ''}`}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
        {/* Name */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
            <input
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              className={clsx(
                'w-full min-h-[44px] rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
                errors.firstName ? 'border-red-300 bg-red-50' : 'border-gray-200',
              )}
            />
            {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
            <input
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              className={clsx(
                'w-full min-h-[44px] rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
                errors.lastName ? 'border-red-300 bg-red-50' : 'border-gray-200',
              )}
            />
            {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName}</p>}
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            disabled={!isNew}
            className={clsx(
              'w-full min-h-[44px] rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
              errors.email ? 'border-red-300 bg-red-50' : 'border-gray-200',
              !isNew && 'bg-gray-50 cursor-not-allowed text-gray-500',
            )}
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
          {!isNew && <p className="mt-1 text-xs text-gray-400">Email cannot be changed here — managed via Clerk account settings</p>}
        </div>

        {/* Role */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
          <div className="space-y-2">
            {ROLES.map((r) => (
              <label
                key={r.value}
                className={clsx(
                  'flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors',
                  form.role === r.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50',
                  isMe && 'cursor-not-allowed opacity-60',
                )}
              >
                <input
                  type="radio"
                  name="role"
                  value={r.value}
                  checked={form.role === r.value}
                  onChange={(e) => !isMe && setForm((f) => ({ ...f, role: e.target.value }))}
                  disabled={isMe}
                  className="mt-0.5 accent-blue-600"
                />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{r.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{r.description}</p>
                </div>
              </label>
            ))}
          </div>
          {isMe && <p className="mt-2 text-xs text-gray-400">You cannot change your own role</p>}
        </div>

        {/* Active toggle — edit only */}
        {!isNew && !isMe && (
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-900">Active</p>
              <p className="text-xs text-gray-500 mt-0.5">Inactive users cannot log in</p>
            </div>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
              className={clsx(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                form.isActive ? 'bg-blue-600' : 'bg-gray-200',
              )}
              role="switch"
              aria-checked={form.isActive}
            >
              <span className={clsx('inline-block h-4 w-4 rounded-full bg-white shadow transition-transform', form.isActive ? 'translate-x-6' : 'translate-x-1')} />
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="min-h-[44px] px-6 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? (isNew ? 'Sending…' : 'Saving…') : (isNew ? 'Send Invitation' : 'Save Changes')}
          </button>
          <Link
            to="/settings"
            className="min-h-[44px] px-6 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors flex items-center"
          >
            Cancel
          </Link>
        </div>
      </form>

      {isNew && (
        <p className="text-xs text-gray-400 text-center">
          The user will receive an email invitation to join your organization via Clerk.
        </p>
      )}
    </div>
  );
}
