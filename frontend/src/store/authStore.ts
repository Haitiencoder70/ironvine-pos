import { create } from 'zustand';
import { User, Organization } from '../types';

interface AuthState {
  user: User | null;
  organization: Organization | null;
  /** True once the Clerk token has been fetched and stored in the API module. */
  isTokenReady: boolean;
  /** True while the org is being loaded on init. */
  isOrgLoading: boolean;
  /** Error from org verification (e.g. org not found, user doesn't belong). */
  orgError: string | null;
  setUser: (user: User | null) => void;
  setOrganization: (org: Organization | null) => void;
  setTokenReady: (ready: boolean) => void;
  setOrgLoading: (loading: boolean) => void;
  setOrgError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  organization: null,
  isTokenReady: false,
  isOrgLoading: false,
  orgError: null,
  setUser: (user) => set({ user }),
  setOrganization: (org) => set({ organization: org }),
  setTokenReady: (ready) => set({ isTokenReady: ready }),
  setOrgLoading: (loading) => set({ isOrgLoading: loading }),
  setOrgError: (error) => set({ orgError: error }),
}));
