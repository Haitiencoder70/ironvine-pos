import { z } from 'zod';

const addressSchema = z.object({
  street: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  zip: z.string().max(20).optional(),
  country: z.string().max(2).optional(),
});

export const createCustomerSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  company: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  billing: addressSchema.optional(),
  shipping: addressSchema.optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const listCustomersQuerySchema = z.object({
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});
