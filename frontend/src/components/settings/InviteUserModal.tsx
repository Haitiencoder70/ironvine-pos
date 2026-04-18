import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { settingsApi } from '../../services/api';

interface InviteUserModalProps {
  onClose: () => void;
}

type Role = 'STAFF' | 'MANAGER' | 'OWNER';

const ROLE_INFO: Record<Role, { label: string; description: string }> = {
  STAFF: {
    label: 'Staff',
    description: 'Can view and manage orders, customers, and inventory. Cannot change settings.',
  },
  MANAGER: {
    label: 'Manager',
    description: 'All Staff permissions plus reports, purchase orders, and user management.',
  },
  OWNER: {
    label: 'Owner / Admin',
    description: 'Full access including billing, settings, and organization management.',
  },
};

export function InviteUserModal({ onClose }: InviteUserModalProps): React.JSX.Element {
  const qc = useQueryClient();
  const [form, setForm] = useState({ email: '', firstName: '', lastName: '', role: 'STAFF' as Role });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => settingsApi.inviteUser(form),
    onSuccess: () => {
      toast.success(`Invitation sent to ${form.email}`);
      void qc.invalidateQueries({ queryKey: ['settings', 'users'] });
      onClose();
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to send invitation.';
      setError(msg);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('First and last name are required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Enter a valid email address.');
      return;
    }
    mutation.mutate();
  }

  function set(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setError('');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Invite Team Member</h2>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">First Name</label>
              <input
                value={form.firstName}
                onChange={(e) => set('firstName', e.target.value)}
                placeholder="Jane"
                className="w-full min-h-[44px] px-3 text-sm rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
              <input
                value={form.lastName}
                onChange={(e) => set('lastName', e.target.value)}
                placeholder="Smith"
                className="w-full min-h-[44px] px-3 text-sm rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email Address</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="jane@example.com"
              className="w-full min-h-[44px] px-3 text-sm rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Role</label>
            <div className="space-y-2">
              {(Object.entries(ROLE_INFO) as [Role, typeof ROLE_INFO[Role]][]).map(([role, info]) => (
                <label
                  key={role}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    form.role === role ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={role}
                    checked={form.role === role}
                    onChange={() => set('role', role)}
                    className="mt-0.5 accent-blue-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{info.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{info.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[44px] rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 min-h-[44px] rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {mutation.isPending ? 'Sending…' : 'Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
