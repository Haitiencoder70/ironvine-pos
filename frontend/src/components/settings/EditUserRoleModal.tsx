import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { settingsApi } from '../../services/api';
import type { OrgUser } from '../../types';

interface EditUserRoleModalProps {
  user: OrgUser;
  onClose: () => void;
}

type Role = 'STAFF' | 'MANAGER' | 'OWNER';

const ROLE_INFO: Record<Role, { label: string; description: string; color: string }> = {
  STAFF: {
    label: 'Staff',
    description: 'View and manage orders, customers, and inventory.',
    color: 'bg-gray-100 text-gray-700',
  },
  MANAGER: {
    label: 'Manager',
    description: 'All Staff permissions plus reports, POs, and team management.',
    color: 'bg-blue-100 text-blue-700',
  },
  OWNER: {
    label: 'Owner / Admin',
    description: 'Full access including billing and organization settings.',
    color: 'bg-purple-100 text-purple-700',
  },
};

export function EditUserRoleModal({ user, onClose }: EditUserRoleModalProps): React.JSX.Element {
  const qc = useQueryClient();
  const [role, setRole] = useState<Role>(user.role as Role);

  const isOwner = user.role === 'OWNER';
  const unchanged = role === user.role;

  const mutation = useMutation({
    mutationFn: () => settingsApi.updateUser(user.id, { role }),
    onSuccess: () => {
      toast.success(`${user.firstName}'s role updated to ${ROLE_INFO[role].label}`);
      void qc.invalidateQueries({ queryKey: ['settings', 'users'] });
      onClose();
    },
    onError: () => toast.error('Failed to update role. Please try again.'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Edit Role</h2>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-700 flex-shrink-0">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
          </div>

          {isOwner ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              The organization owner's role cannot be changed. To transfer ownership, contact support.
            </div>
          ) : (
            <div className="space-y-2">
              {(Object.entries(ROLE_INFO) as [Role, typeof ROLE_INFO[Role]][]).map(([r, info]) => (
                <label
                  key={r}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    role === r ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r}
                    checked={role === r}
                    onChange={() => setRole(r)}
                    className="mt-0.5 accent-blue-600"
                  />
                  <div>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${info.color}`}>
                      {info.label}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">{info.description}</p>
                  </div>
                </label>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 min-h-[44px] rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            {!isOwner && (
              <button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending || unchanged}
                className="flex-1 min-h-[44px] rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {mutation.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
