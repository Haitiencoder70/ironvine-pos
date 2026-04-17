import { z } from 'zod';

export const checkoutSchema = z.object({
  plan: z.enum(['STARTER', 'PRO', 'ENTERPRISE']),
  returnUrl: z.string().url().optional(),
});

export const portalSchema = z.object({
  returnUrl: z.string().url().optional(),
});
