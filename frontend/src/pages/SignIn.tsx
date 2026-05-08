import type { JSX } from 'react';
import { SignIn } from '@clerk/clerk-react';

export function SignInPage(): JSX.Element {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, rgba(18,18,36,0.96) 0%, rgba(8,8,18,0.99) 100%)',
          border: '1px solid rgba(255,107,0,0.30)',
          borderTopColor: 'rgba(255,107,0,0.55)',
          boxShadow: 'inset 0 1px 0 rgba(255,107,0,0.12), 0 24px 64px rgba(0,0,0,0.75)',
          backdropFilter: 'blur(32px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(32px) saturate(1.6)',
        }}
      >
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
              colorBackground: 'transparent',
              colorInputBackground: 'rgba(255,255,255,0.09)',
              colorInputText: '#f1f5f9',
              colorText: '#dde1ea',
              colorPrimary: '#ff6b00',
              colorNeutral: '#64748b',
              colorTextSecondary: '#94a3b8',
            },
            elements: {
              card: 'bg-transparent shadow-none border-0',
              formButtonPrimary: 'btn-primary',
              socialButtonsBlockButton: 'border border-white/25 bg-white/[0.08] hover:bg-white/[0.13] text-slate-100',
              formFieldInput: 'border-white/20 bg-white/[0.09]',
            },
          }}
        />
      </div>
    </div>
  );
}
