import type { JSX } from 'react';
import { SignIn } from '@clerk/clerk-react';

export function SignInPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <SignIn
        routing="path"
        path="/sign-in"
        fallbackRedirectUrl="/signup"
        signUpUrl="/signup"
        appearance={{
          layout: {
            logoImageUrl: '/printflow-logo-horizontal.svg',
            logoLinkUrl: '/',
          },
          elements: {
            formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 min-h-[44px]',
            card: 'shadow-lg rounded-2xl',
          },
        }}
      />
    </div>
  );
}
