import { Outlet } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import { useAuthStore } from '../../store/authStore';
import type { User } from '../../types';

interface ProtectedRouteProps {
  allowedRoles?: User['role'][];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps): React.JSX.Element {
  const user = useAuthStore((s) => s.user);

  // Role check — only runs when user is loaded and allowedRoles is specified
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900">Access Denied</h2>
          <p className="mt-2 text-gray-500">
            You don&apos;t have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SignedIn>
        <Outlet />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
