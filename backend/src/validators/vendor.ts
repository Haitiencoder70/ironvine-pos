import { z } from 'zod';

const phoneRegex = /^\+?[\d\s().\-]{7,30}$/;

export const createVendorSchema = z.object({
  name: z.string().min(1, 'Company name is required').max(200),
  contactName: z.string().max(100).optional(),
  email: z
    .string()
    .email('Enter a valid email address')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .regex(phoneRegex, 'Enter a valid phone number')
    .optional()
    .or(z.literal('')),
  website: z
    .string()
    .url('Enter a valid URL (https://...)')
    .optional()
    .or(z.literal('')),
  notes: z.string().max(2000).optional(),
  categories: z.array(z.string().min(1).max(100)).optional(),
  paymentTerms: z.string().max(200).optional(),
  leadTimeDays: z
    .number({ invalid_type_error: 'Must be a number' })
    .int()
    .positive('Must be at least 1 day')
    .max(365, 'Cannot exceed 365 days')
    .optional(),
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
