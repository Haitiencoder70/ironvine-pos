import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Clerk — tests don't have a real Clerk instance
vi.mock('@clerk/clerk-react', () => ({
  useAuth:         () => ({ isSignedIn: true, getToken: async () => 'test-token' }),
  useUser:         () => ({ user: { id: 'user_test', primaryEmailAddress: { emailAddress: 'test@test.com' } } }),
  useOrganization: () => ({ organization: { id: 'org_test', name: 'Test Org', slug: 'testorg', publicMetadata: { plan: 'PRO' } } }),
  ClerkProvider:   ({ children }: { children: React.ReactNode }) => children,
  SignIn:          () => null,
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), loading: vi.fn() },
  toast:   { success: vi.fn(), error: vi.fn(), loading: vi.fn() },
  Toaster: () => null,
}));

// Stub framer-motion to plain HTML elements — avoids animation warnings in tests
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return {
    ...actual,
    motion: new Proxy({} as any, {
      get: (_target, prop) => prop === 'button' || prop === 'div' || prop === 'span'
        ? prop
        : (actual.motion as any)[prop],
    }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});
