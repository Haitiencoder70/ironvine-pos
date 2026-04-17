import { create } from 'zustand';
import { User, Organization } from '../types';

interface AuthState {
  user: User | null;
  organization: Organization | null;
  /** True once the Clerk token has been fetched and stored in the API module.
   *  All data-fetching queries should gate on this flag to prevent
   *  unauthorized 401 requests on first render. */
  isTokenReady: boolean;
  setUser: (user: User | null) => void;
  setOrganization: (org: Organization | null) => void;
  setTokenReady: (ready: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  organization: null,
  isTokenReady: false,
  setUser: (user) => set({ user }),
  setOrganization: (org) => set({ organization: org }),
  setTokenReady: (ready) => set({ isTokenReady: ready }),
}));
