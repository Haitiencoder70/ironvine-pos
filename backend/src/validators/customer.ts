import { z } from 'zod';

// E.164 / common phone formats: +1 (512) 555-1234, 5125551234, +4412345678
const phoneRegex = /^\+?[\d\s().\-]{7,30}$/;

const addressSchema = z.object({
  street: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  zip: z.string().max(20).optional(),
  country: z.string().max(2).optional(),
});

export const createCustomerSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Enter a valid email address').optional().or(z.literal('').transform(() => undefined)),
  phone: z
    .string()
    .regex(phoneRegex, 'Enter a valid phone number')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  company: z.string().max(200).optional().or(z.literal('').transform(() => undefined)),
  notes: z.string().max(2000).optional().or(z.literal('').transform(() => undefined)),
  billing: addressSchema.optional(),
  shipping: addressSchema.optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const listCustomersQuerySchema = z.object({
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sortKey: z.enum(['createdAt', 'firstName', 'lastName', 'email', 'company']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
});
