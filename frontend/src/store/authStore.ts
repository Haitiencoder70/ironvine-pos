import { create } from 'zustand';
import { User, Organization } from '../types';

interface AuthState {
  user: User | null;
  organization: Organization | null;
  setUser: (user: User | null) => void;
  setOrganization: (org: Organization | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  organization: null,
  setUser: (user) => set({ user }),
  setOrganization: (org) => set({ organization: org }),
}));
