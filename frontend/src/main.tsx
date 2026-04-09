import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider, useAuth } from '@clerk/clerk-react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import { App } from './App';
import { queryClient } from './lib/queryClient';
import { setApiToken } from './lib/api';
import { AuthSync } from './components/auth/AuthSync';
import './index.css';

const PUBLISHABLE_KEY = import.meta.env['VITE_CLERK_PUBLISHABLE_KEY'] as string | undefined;

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY environment variable');
}

function TokenSync(): null {
  const { getToken } = useAuth();

  React.useEffect(() => {
    const syncToken = async (): Promise<void> => {
      const token = await getToken();
      setApiToken(token);
    };

    void syncToken();
    const interval = setInterval(() => { void syncToken(); }, 55 * 1000);
    return () => clearInterval(interval);
  }, [getToken]);

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
