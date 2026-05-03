import axios from 'axios';
import { useOfflineStore } from '../store/offlineStore';
import { offlineSync } from '../services/offlineSync';

const HEARTBEAT_TIMEOUT = 3000;

// Guard to prevent multiple heartbeat loops from stacking up
// (e.g. when the TokenSync effect re-fires on org change)
let _heartbeatStarted = false;

export const heartbeatService = {
  /**
   * Verifies if the backend is actually reachable by pinging the health endpoint.
   */
  async checkReachability(): Promise<boolean> {
    try {
      // We use a separate axios instance or a raw fetch to avoid the
      // interceptors that we are currently modifying to prevent infinite loops.
      // Hit /health (not /api/health) — the health route is registered before the auth middleware
      const response = await axios.get(`${(import.meta.env['VITE_API_URL'] as string | undefined) ?? 'http://localhost:3001'}/health`, {
        timeout: HEARTBEAT_TIMEOUT,
      });

      const reachable = response.status === 200;
      useOfflineStore.getState().setBackendReachable(reachable);

      if (reachable) {
        // If we just became reachable, trigger a sync of queued mutations
        await offlineSync.sync();
      }

      return reachable;
    } catch {
      useOfflineStore.getState().setBackendReachable(false);
      return false;
    }
  },

  /**
   * Starts a periodic heartbeat loop.
   */
  startHeartbeatLoop(intervalMs: number = 30000) {
    if (_heartbeatStarted || typeof window === 'undefined') return;
    _heartbeatStarted = true;

    setInterval(async () => {
      await this.checkReachability();
    }, intervalMs);

    // Also trigger on window online event as a fast-path
    window.addEventListener('online', async () => {
      await this.checkReachability();
    });
  }
};
