import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

interface InviteDetails {
  email: string;
  role: string;
  organization: { name: string; slug: string };
  expiresAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner',
  MANAGER: 'Manager',
  STAFF: 'Staff',
};

export function InviteAcceptPage(): JSX.Element {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const isTokenReady = useAuthStore((s) => s.isTokenReady);

  const token = searchParams.get('token');
  const [details, setDetails] = useState<InviteDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch public invite details (no auth required)
  useEffect(() => {
    if (!token) {
      setError('Invalid invite link — no token found.');
      setLoadingDetails(false);
      return;
    }
    api.get<{ data: InviteDetails }>(`/organization/invites/${token}`)
      .then((r) => setDetails(r.data.data))
      .catch((err: { response?: { data?: { message?: string } } }) => {
        setError(err.response?.data?.message ?? 'This invite link is invalid or has expired.');
      })
      .finally(() => setLoadingDetails(false));
  }, [token]);

  // Auto-accept once the user is signed in and the API token is ready
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !isTokenReady || !user || !details || !token || accepting || error) return;

    setAccepting(true);
    api.post('/organization/invites/accept', {
      token,
      firstName: user.firstName || 'User',
      lastName:  user.lastName  || '',
      avatarUrl: user.imageUrl  || undefined,
    })
      .then(() => {
        // Full reload so Clerk re-initialises with the new org context
        window.location.href = '/dashboard';
      })
      .catch((err: { response?: { data?: { message?: string } } }) => {
        setError(err.response?.data?.message ?? 'Failed to accept the invitation. Please try again.');
        setAccepting(false);
      });
  }, [isLoaded, isSignedIn, isTokenReady, user, details, token, accepting, error]);

  const handleSignIn = (): void => {
    const redirectUrl = encodeURIComponent(`/invite/accept?token=${token}`);
    navigate(`/sign-in?redirect_url=${redirectUrl}`);
  };

  // ── Spinner states ────────────────────────────────────────────────────────
  if (loadingDetails || !isLoaded || (isSignedIn && !error && !accepting === false) || accepting) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
        {accepting && <p className="text-sm text-gray-500">Accepting your invitation…</p>}
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invitation Error</h1>
          <p className="text-gray-600 text-sm">{error}</p>
          <p className="mt-4 text-sm text-gray-400">
            Contact your organization owner to request a new invite.
          </p>
        </div>
      </div>
    );
  }

  // ── Signed in but waiting for token (rare edge case) ─────────────────────
  if (isSignedIn && !isTokenReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  // ── Not signed in — show invite card ─────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">You're Invited!</h1>
          {details && (
            <p className="mt-2 text-gray-600">
              Join <strong>{details.organization.name}</strong> as a{' '}
              <strong>{ROLE_LABELS[details.role] ?? details.role}</strong>.
            </p>
          )}
        </div>

        <button
          onClick={handleSignIn}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl min-h-[44px] px-6 transition-colors"
        >
          Sign In to Accept Invitation
        </button>

        <p className="mt-4 text-center text-sm text-gray-500">
          Don't have an account? You can create one after clicking above.
        </p>

        {details && (
          <p className="mt-3 text-center text-xs text-gray-400">
            Invite expires {new Date(details.expiresAt).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}
