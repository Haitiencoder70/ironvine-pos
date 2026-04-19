import { create } from 'zustand';

interface OfflineState {
  isOnline: boolean;
  isBackendReachable: boolean;
  queuedMutations: number;
  setOnline: (online: boolean) => void;
  setBackendReachable: (reachable: boolean) => void;
  setQueuedMutations: (count: number) => void;
}

export const useOfflineStore = create<OfflineState>((set) => ({
  isOnline: navigator.onLine,
  isBackendReachable: navigator.onLine,
  queuedMutations: 0,
  setOnline: (online) => set({ isOnline: online }),
  setBackendReachable: (reachable) => set({ isBackendReachable: reachable, isOnline: reachable }),
  setQueuedMutations: (count) => set({ queuedMutations: count }),
}));

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => useOfflineStore.getState().setOnline(true));
  window.addEventListener('offline', () => useOfflineStore.getState().setOnline(false));
}
