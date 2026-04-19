import { WifiIcon } from '@heroicons/react/24/outline';
import { useOfflineStore } from '../../store/offlineStore';
import type { JSX } from 'react';

export function OfflineBanner(): JSX.Element | null {
  const isOnline = useOfflineStore((s) => s.isOnline);
  const queuedMutations = useOfflineStore((s) => s.queuedMutations);

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white py-2 px-4 text-center text-sm font-medium flex items-center justify-center gap-2 min-h-[44px]">
      <WifiIcon className="w-4 h-4 flex-shrink-0" />
      <span>
        You're offline. Changes will sync when you reconnect.
        {queuedMutations > 0 && ` (${queuedMutations} pending)`}
      </span>
    </div>
  );
}
