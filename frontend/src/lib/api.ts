import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';
import { useOfflineStore } from '../store/offlineStore';
import { offlineSync } from '../services/offlineSync';
import { getCurrentSubdomain } from '../utils/tenant';

// Callback set by UpgradeModal wiring in App.tsx to avoid circular imports
let onPlanLimitExceeded: ((message?: string) => void) | null = null;
export function setUpgradeModalHandler(fn: (message?: string) => void): void {
  onPlanLimitExceeded = fn;
}

const BASE_URL = (import.meta.env['VITE_API_URL'] as string | undefined) ?? 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: 8000,
});

let clerkToken: string | null = null;

export function setApiToken(token: string | null): void {
  clerkToken = token;
}

export function getApiToken(): string | null {
  return clerkToken;
}

// ── Interceptors ─────────────────────────────────────────────────────────────

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (clerkToken) {
    config.headers['Authorization'] = `Bearer ${clerkToken}`;
  }
  const subdomain = getCurrentSubdomain();
  if (subdomain) {
    config.headers['X-Organization-Slug'] = subdomain;
  }
  return config;
});

// Simple debounce tracker for error toasts so we don't spam the user
// if 5 requests fail at the exact same moment.
let lastToastTime = 0;
const TOAST_COOLDOWN_MS = 2000;

api.interceptors.response.use(
  (response) => {
    // Restore online state if a request succeeds (backend is reachable again)
    if (!useOfflineStore.getState().isOnline) {
      useOfflineStore.getState().setOnline(true);
    }
    useOfflineStore.getState().setBackendReachable(true);
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config;
    
    // 1. Network / Offline Detection
    if (!navigator.onLine || error.message === 'Network Error') {
      const now = Date.now();

      // If browser says we are online but axios says 'Network Error',
      // verify actual reachability before showing the "Offline" toast.
      if (navigator.onLine && error.message === 'Network Error') {
        const { heartbeatService } = await import('../services/heartbeatService');
        const isReachable = await heartbeatService.checkReachability();

        if (isReachable) {
          // Backend is actually reachable; this was a transient error or a different issue.
          // Skip the offline toast and let it fall through to general error handling.
          return Promise.reject(error);
        }
      }

      if (now - lastToastTime > TOAST_COOLDOWN_MS) {
        toast.error("You're currently offline. Changes will sync when reconnected.", { id: 'offline-toast' });
        lastToastTime = now;
      }
      useOfflineStore.getState().setOnline(false);

      // Only queue mutations (POST, PUT, PATCH, DELETE)
      const method = config?.method?.toLowerCase();
      if (method && ['post', 'put', 'patch', 'delete'].includes(method)) {
        // Avoid queuing the same request multiple times if it's a retry
        const url = config?.url || '';
        const data = config?.data;
        await offlineSync.enqueue(url, method, data);
      }

      return Promise.reject(error);
    }

    // 2. Retry Logic for GET requests
    // (We only retry GETs because mutations might not be idempotent)
    const MAX_RETRIES = 1;
    // We attach __retryCount to the config to track it across interceptor runs
    const customConfig = config as InternalAxiosRequestConfig & { __retryCount?: number };
    
    if (config?.method?.toLowerCase() === 'get' && error.response?.status && error.response.status >= 500) {
      customConfig.__retryCount = customConfig.__retryCount || 0;
      
      if (customConfig.__retryCount < MAX_RETRIES) {
        customConfig.__retryCount += 1;
        
        // Exponential backoff: 1s, then 2s
        const backoff = Math.pow(2, customConfig.__retryCount - 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, backoff));
        
        return api(customConfig);
      }
    }

    // 3. User Feedback for Errors
    const now = Date.now();
    if (now - lastToastTime > TOAST_COOLDOWN_MS) {
      if (error.response) {
        const data = error.response.data as { error?: string, code?: string, details?: unknown };

        if (error.response.status === 402) {
          const limitMsg = data.error ?? "You've reached a limit on your current plan.";
          if (onPlanLimitExceeded) {
            onPlanLimitExceeded(limitMsg);
          } else {
            toast.error(limitMsg, { id: 'api-plan-limit' });
          }
          return Promise.reject(error);
        } else if (error.response.status === 400 && data.code === 'VALIDATION_ERROR') {
          toast.error('Please check your inputs for errors.', { id: 'api-validation' });
        } else if (error.response.status === 401 || error.response.status === 403) {
          toast.error(`Auth Error: ${data.code} - ${data.error}`, { id: 'api-auth', duration: 8000 });
        } else if (error.response.status === 409) {
          toast.error(data.error || 'A record with this information already exists.', { id: 'api-conflict' });
        } else if (error.response.status === 404) {
          toast.error(data.error || 'The requested item could not be found.', { id: 'api-not-found' });
        } else {
          // For 500s and other general errors, we use a specific ID to group them
          toast.error(data.error || 'An unexpected error occurred.', { id: 'api-general' });
        }
      } else if (error.request) {
        toast.error('Could not connect to the server. Please try again.', { id: 'api-timeout' });
      } else {
        toast.error('An error occurred. Please try again.', { id: 'api-fatal' });
      }
      lastToastTime = now;
    }

    return Promise.reject(error);
  },
);

// ── Settings / Audit Log API ──────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  entityLabel: string | null;
  description: string;
  metadata: Record<string, unknown> | null;
  performedBy: string;
  ipAddress: string | null;
  organizationId: string;
  createdAt: string;
}

export interface AuditLogResponse {
  data: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}

export const settingsApi = {
  getAuditLog: async (page = 1, limit = 20): Promise<AuditLogResponse> => {
    const res = await api.get<AuditLogResponse>('/audit-log', { params: { page, limit } });
    return res.data;
  },
};

// Helper exposed for catch blocks inside components/hooks if needed
export function getApiError(e: unknown): string {
  if (axios.isAxiosError(e) && e.response?.data?.error) {
    return e.response.data.error;
  }
  if (e instanceof Error) return e.message;
  return 'An unknown error occurred';
}
