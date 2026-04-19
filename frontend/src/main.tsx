import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env['VITE_SENTRY_DSN'] as string | undefined,
  environment: import.meta.env.MODE,
  tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
  enabled: !!import.meta.env['VITE_SENTRY_DSN'],
  integrations: [
    Sentry.browserTracingIntegration(),
  ],
});

import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider, useAuth, useOrganization } from '@clerk/clerk-react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import { App } from './App';
import { queryClient } from './lib/queryClient';
import { setApiToken } from './lib/api';
import { AuthSync } from './components/auth/AuthSync';
import { getCurrentSubdomain } from './utils/tenant';
import { IntercomWidget } from './components/support/IntercomWidget';
import { heartbeatService } from './services/heartbeatService';
import { useAuthStore } from './store/authStore';
import './index.css';

const PUBLISHABLE_KEY = import.meta.env['VITE_CLERK_PUBLISHABLE_KEY'] as string | undefined;

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY environment variable');
}

function TokenSync(): null {
  const { getToken } = useAuth();
  const { organization } = useOrganization();

  React.useEffect(() => {
    // Only start heartbeat on org subdomains — not on the marketing landing page
    if (getCurrentSubdomain()) {
      heartbeatService.startHeartbeatLoop();
    }
  }, []);

  React.useEffect(() => {
    const syncToken = async (): Promise<void> => {
      const token = await getToken();
      setApiToken(token);
      // Mark token as ready on the first successful retrieval so all
      // React Query hooks can fire. Without this gate they fire immediately
      // on mount without an auth token and get cached 401 empty results.
      if (token) {
        useAuthStore.getState().setTokenReady(true);
      }
    };

    void syncToken();
    const interval = setInterval(() => { void syncToken(); }, 55 * 1000);
    return () => clearInterval(interval);
    // Re-sync whenever the active org changes so the token always carries org_id
  }, [getToken, organization?.id]);

  return null;
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <QueryClientProvider client={queryClient}>
        <TokenSync />
        <AuthSync />
        <IntercomWidget />
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { borderRadius: '12px', minHeight: '44px' },
          }}
        />
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ClerkProvider>
  </React.StrictMode>,
);
