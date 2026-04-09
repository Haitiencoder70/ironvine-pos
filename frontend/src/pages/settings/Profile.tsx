import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser, useClerk } from '@clerk/clerk-react';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon, CameraIcon } from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { settingsApi } from '../../services/api';

export function ProfilePage(): React.JSX.Element {
  const { user: clerkUser, isLoaded } = useUser();
  const { openUserProfile } = useClerk();
  const qc = useQueryClient();

  const [firstName, setFirstName] = useState(clerkUser?.firstName ?? '');
  const [lastName, setLastName] = useState(clerkUser?.lastName ?? '');
  const [errors, setErrors] = useState<{ firstName?: string; lastName?: string }>({});
  const avatarRef = useRef<HTMLInputElement>(null);

  // Sync initial values once Clerk user loads
  if (isLoaded && clerkUser && firstName === '' && clerkUser.firstName) {
    setFirstName(clerkUser.firstName);
    setLastName(clerkUser.lastName ?? '');
  }

  const updateMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string }) => {
      // Update Clerk directly for display name
      await clerkUser?.update({ firstName: data.firstName, lastName: data.lastName });
      // Sync to our DB
      await settingsApi.updateProfile({ firstName: data.firstName, lastName: data.lastName });
    },
    onSuccess: () => {
      toast.success('Profile updated');
      void qc.invalidateQueries({ queryKey: ['settings', 'users'] });
    },
    onError: () => toast.error('Failed to update profile'),
  });

  const avatarMutation = useMutation({
    mutationFn: async (file: File) => {
      await clerkUser?.setProfileImage({ file });
    },
    onSuccess: () => toast.success('Avatar updated'),
    onError: () => toast.error('Failed to upload avatar'),
  });

  function validate(): boolean {
    const e: typeof errors = {};
    if (!firstName.trim()) e.firstName = 'First name is required';
    if (!lastName.trim()) e.lastName = 'Last name is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    updateMutation.mutate({ firstName: firstName.trim(), lastName: lastName.trim() });
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    avatarMutation.mutate(file);
  }

  if (!isLoaded) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <div className="h-64 animate-pulse bg-gray-50 rounded-2xl" />
      </div>
    );
  }

  const displayName = `${firstName || clerkUser?.firstName || ''} ${lastName || clerkUser?.lastName || ''}`.trim();
  const initials = `${(clerkUser?.firstName ?? 'U')[0]}${(clerkUser?.lastName ?? '')[0] ?? ''}`.toUpperCase();

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
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-sm text-gray-500 mt-0.5">Update your personal information</p>
        </div>
      </div>

      {/* Avatar Section */}
      <div className="bg-white rounded-2xl shadow-sm p-6 flex items-center gap-5">
        <div className="relative flex-shrink-0">
          {clerkUser?.imageUrl ? (
            <img
              src={clerkUser.imageUrl}
              alt={displayName}
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-700">
              {initials}
            </div>
          )}
          <button
            onClick={() => avatarRef.current?.click()}
            disabled={avatarMutation.isPending}
            className="absolute -bottom-1 -right-1 w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
            title="Change avatar"
          >
            <CameraIcon className="h-4 w-4 text-gray-600" />
          </button>
          <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-900">{displayName || 'Your Name'}</p>
          <p className="text-sm text-gray-500">{clerkUser?.primaryEmailAddress?.emailAddress}</p>
          <p className="text-xs text-gray-400 mt-1 capitalize">
            {clerkUser?.organizationMemberships?.[0]?.role?.replace('org:', '') ?? 'Member'}
          </p>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
        <h2 className="text-base font-semibold text-gray-900">Personal Information</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
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
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={clsx(
                'w-full min-h-[44px] rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
                errors.lastName ? 'border-red-300 bg-red-50' : 'border-gray-200',
              )}
            />
            {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
          <input
            value={clerkUser?.primaryEmailAddress?.emailAddress ?? ''}
            disabled
            className="w-full min-h-[44px] rounded-xl border border-gray-200 px-4 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
          />
          <p className="mt-1 text-xs text-gray-400">
            Manage email and password in{' '}
            <button
              type="button"
              onClick={() => openUserProfile()}
              className="text-blue-600 hover:underline"
            >
              account settings
            </button>
          </p>
        </div>

        <button
          type="submit"
          disabled={updateMutation.isPending}
          className="min-h-[44px] px-6 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
        </button>
      </form>

      {/* Account Security */}
      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Account Security</h2>
        <p className="text-sm text-gray-500">
          Password, two-factor authentication, and connected accounts are managed through your Clerk account profile.
        </p>
        <button
          onClick={() => openUserProfile()}
          className="min-h-[44px] px-5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Open Account Settings
        </button>
      </div>
    </div>
  );
}
