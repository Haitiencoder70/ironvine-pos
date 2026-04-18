import axios from 'axios';
import { openDB } from 'idb';
import { useOfflineStore } from '../store/offlineStore';
import { getApiToken } from '../lib/api';
import toast from 'react-hot-toast';

const DB_NAME = 'ironvine-pos-offline';
const STORE_NAME = 'mutation-queue';
const DB_VERSION = 1;
const BASE_URL = (import.meta.env['VITE_API_URL'] as string | undefined) ?? 'http://localhost:3001';

export interface QueuedMutation {
  id: string;
  url: string;
  method: string;
  data: unknown;
  timestamp: number;
  retryCount: number;
}

async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
}

export const offlineSync = {
  /**
   * Queue a mutation for later synchronization.
   */
  async enqueue(url: string, method: string, data: unknown): Promise<void> {
    const db = await initDB();
    const id = crypto.randomUUID();

    const mutation: QueuedMutation = {
      id,
      url,
      method,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    };

    await db.put(STORE_NAME, mutation);
    useOfflineStore.getState().setQueuedMutations(await this.getQueueLength());
  },

  /**
   * Get the current number of queued mutations.
   */
  async getQueueLength(): Promise<number> {
    const db = await initDB();
    const count = await db.count(STORE_NAME);
    return count;
  },

  /**
   * Process the mutation queue.
   */
  async sync(): Promise<void> {
    if (!navigator.onLine) {
      console.debug('[offlineSync] Sync aborted: navigator.onLine is false');
      return;
    }

    const db = await initDB();
    const queue = await db.getAll(STORE_NAME);

    if (queue.length === 0) return;

    console.debug(`[offlineSync] Attempting to sync ${queue.length} mutations...`);

    // Sort by timestamp to preserve order of operations
    const sortedQueue = queue.sort((a: QueuedMutation, b: QueuedMutation) => a.timestamp - b.timestamp);

    for (const mutation of sortedQueue) {
      try {
        // CRITICAL: Use a clean axios instance instead of the 'api' instance
        // to avoid the interceptor that re-enqueues failed requests.
        const token = getApiToken();

        await axios({
          baseURL: BASE_URL,
          url: mutation.url,
          method: mutation.method,
          data: mutation.data,
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
        });

        // Success: Remove from queue
        await db.delete(STORE_NAME, mutation.id);
        console.debug(`[offlineSync] Successfully synced mutation ${mutation.id}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[offlineSync] Sync failed for mutation ${mutation.id}:`, message);

        // Increment retry count
        const updated = { ...mutation, retryCount: mutation.retryCount + 1 };
        await db.put(STORE_NAME, updated);

        if (updated.retryCount >= 5) {
          console.error(`[offlineSync] Mutation ${mutation.id} failed too many times. Removing from queue.`);
          await db.delete(STORE_NAME, mutation.id);
        }
      }
    }

    useOfflineStore.getState().setQueuedMutations(await this.getQueueLength());

    if (queue.length > 0 && (await db.count(STORE_NAME)) === 0) {
      toast.success('Offline changes synchronized successfully!');
    }
  },

  /**
   * Clear the queue (e.g., on logout)
   */
  async clearQueue(): Promise<void> {
    const db = await initDB();
    await db.clear(STORE_NAME);
    useOfflineStore.getState().setQueuedMutations(0);
  }
};

// Listen for online event to trigger sync automatically
if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    console.debug('[offlineSync] Window online event detected. Triggering sync...');
    // setOnline(true) is handled by offlineStore.ts — avoid double-calling
    await offlineSync.sync();
  });
}
