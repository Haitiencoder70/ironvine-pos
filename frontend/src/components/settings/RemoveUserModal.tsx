import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { settingsApi } from '../../services/api';
import type { OrgUser } from '../../types';

interface RemoveUserModalProps {
  user: OrgUser;
  onClose: () => void;
}

export function RemoveUserModal({ user, onClose }: RemoveUserModalProps): React.JSX.Element {
  const qc = useQueryClient();
  const isOwner = user.role === 'OWNER';
  const isAdmin = user.role === 'OWNER' || user.role === 'MANAGER';

  const mutation = useMutation({
    mutationFn: () => settingsApi.removeUser(user.id),
    onSuccess: () => {
      toast.success(`${user.firstName} ${user.lastName} has been removed.`);
      void qc.invalidateQueries({ queryKey: ['settings', 'users'] });
      onClose();
    },
    onError: () => toast.error('Failed to remove user. Please try again.'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Remove Team Member</h2>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-sm font-semibold text-red-700 flex-shrink-0">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
          </div>

          {isOwner ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
              The organization owner cannot be removed. To transfer ownership, contact support.
            </div>
          ) : (
            <>
              {isAdmin && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                  <strong>Warning:</strong> You are removing a manager. Make sure responsibilities have been reassigned before proceeding.
                </div>
              )}
              <p className="text-sm text-gray-600">
                Are you sure you want to remove <strong>{user.firstName} {user.lastName}</strong> from this organization? They will lose access immediately and cannot be undone without re-inviting.
              </p>
            </>
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
                disabled={mutation.isPending}
                className="flex-1 min-h-[44px] rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {mutation.isPending ? 'Removing…' : 'Remove User'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
