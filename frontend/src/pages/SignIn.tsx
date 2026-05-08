import type { JSX } from 'react';
import { SignIn } from '@clerk/clerk-react';

export function SignInPage(): JSX.Element {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <SignIn
        routing="path"
        path="/sign-in"
        forceRedirectUrl="/dashboard"
        fallbackRedirectUrl="/dashboard"
        signUpUrl="/signup"
        appearance={{
          layout: {
            logoImageUrl: '/printflow-logo-horizontal.svg',
            logoLinkUrl: '/',
          },
          variables: {
            colorBackground: 'rgba(6, 6, 14, 0.95)',
            colorInputBackground: 'rgba(255,255,255,0.06)',
            colorInputText: '#f1f5f9',
            colorText: '#dde1ea',
            colorPrimary: '#3b82f6',
            colorNeutral: '#334155',
          },
          elements: {
            card: 'bg-transparent shadow-none border-0',
            formButtonPrimary: 'btn-primary',
          },
        }}
      />
    </div>
  );
}
