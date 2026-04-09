import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  auth: {
    userId: string;
    orgId: string;
    orgRole: string;
  };
}

export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  code?: string;
  statusCode: number;
}

export const SUBSCRIPTION_LIMITS = {
  FREE:       { maxUsers: 1,  maxOrders: 100,  maxInventoryItems: 500  },
  PRO:        { maxUsers: 10, maxOrders: 5000, maxInventoryItems: 5000 },
  ENTERPRISE: { maxUsers: -1, maxOrders: -1,   maxInventoryItems: -1   },
} as const;
