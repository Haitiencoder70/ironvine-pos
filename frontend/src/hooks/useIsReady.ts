/**
 * Returns true once the Clerk auth token has been fetched and stored in the
 * API module. Use this as the `enabled` condition for React Query hooks so
 * they don't fire unauthenticated requests on first render and cache empty/401
 * results that then persist for the full stale window.
 */
import { useAuthStore } from '../store/authStore';

export function useIsReady(): boolean {
  return useAuthStore((s) => s.isTokenReady);
}
