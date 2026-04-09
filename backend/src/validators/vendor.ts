import { z } from 'zod';

export const createVendorSchema = z.object({
  name: z.string().min(1).max(200),
  contactName: z.string().max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  website: z.string().url().optional(),
  notes: z.string().max(2000).optional(),
  categories: z.array(z.string().min(1).max(100)).optional(),
  paymentTerms: z.string().max(200).optional(),
  leadTimeDays: z.number().int().positive().max(365).optional(),
});

export const updateVendorSchema = createVendorSchema
  .partial()
  .extend({ isActive: z.boolean().optional() });

export const listVendorsQuerySchema = z.object({
  search: z.string().max(100).optional(),
  activeOnly: z
    .string()
    .transform((v) => v !== 'false')
    .optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});
