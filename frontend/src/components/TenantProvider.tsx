import { createContext, useContext, useEffect, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Organization } from '../types';
import { useAuthStore } from '../store/authStore';
import { organizationApi } from '../services/organizationApi';
import { getCurrentSubdomain } from '../utils/tenant';

interface TenantContextValue {
  organization: Organization | null;
  subdomain: string | null;
  isLoading: boolean;
  error: string | null;
}

const TenantContext = createContext<TenantContextValue>({
  organization: null,
  subdomain: null,
  isLoading: false,
  error: null,
});

export function useTenant(): TenantContextValue {
  return useContext(TenantContext);
}

interface TenantProviderProps {
  children: React.ReactNode;
}

export function TenantProvider({ children }: TenantProviderProps): React.JSX.Element {
  const { isSignedIn, isLoaded } = useAuth();
  const { organization, isOrgLoading, orgError, isTokenReady } = useAuthStore();
  const { setOrganization, setOrgLoading, setOrgError } = useAuthStore();
  const subdomain = getCurrentSubdomain();
  // Track whether a fetch is already in-flight so re-renders don't double-fire.
  const fetchingRef = useRef(false);

  useEffect(() => {
    // Only fetch org when: Clerk is loaded, user is signed in, token is ready, on a subdomain
    if (!isLoaded || !isSignedIn || !isTokenReady || !subdomain) return;
    // Use the store value directly via getState() so the effect doesn't re-run
    // when organization changes — that would cancel an in-flight request.
    if (useAuthStore.getState().organization) return;
    if (fetchingRef.current) return; // already in-flight

    fetchingRef.current = true;

    async function loadOrg() {
      setOrgLoading(true);
      setOrgError(null);
      try {
        const data = await organizationApi.getOrganization();

        // Verify the loaded org matches the subdomain the user navigated to
        if (data.slug !== subdomain) {
          setOrgError(
            `This organization (${subdomain}) doesn't match your account. ` +
            `Redirecting to your organization…`,
          );
          // Give the error a moment to render, then redirect
          setTimeout(() => {
            window.location.href = `${window.location.protocol}//${data.slug}.${window.location.hostname.split('.').slice(-2).join('.')}`;
          }, 2500);
          return;
        }

        setOrganization(data as unknown as import('../types').Organization);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load organization';
        setOrgError(msg);
      } finally {
        setOrgLoading(false);
        fetchingRef.current = false;
      }
    }

    void loadOrg();
  }, [isLoaded, isSignedIn, isTokenReady, subdomain, setOrganization, setOrgLoading, setOrgError]);

  // On a subdomain: show loading / error states before rendering the app
  if (subdomain && isSignedIn && isLoaded) {
    if (isOrgLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center space-y-3">
            <div className="h-10 w-10 mx-auto rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
            <p className="text-sm text-gray-500">Loading your organization…</p>
          </div>
        </div>
      );
    }

    if (orgError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 px-6">
          <div className="max-w-sm text-center space-y-4">
            <div className="text-4xl">⚠️</div>
            <h2 className="text-lg font-semibold text-gray-900">Organization not found</h2>
            <p className="text-sm text-gray-500">{orgError}</p>
            <a
              href="/"
              className="inline-block min-h-[44px] px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700"
            >
              Go Home
            </a>
          </div>
        </div>
      );
    }
  }

  return (
    <TenantContext.Provider value={{ organization, subdomain, isLoading: isOrgLoading, error: orgError }}>
      {children}
    </TenantContext.Provider>
  );
}
