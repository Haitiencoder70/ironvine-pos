import { z } from 'zod';

const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color (e.g. #2563eb)')
  .optional()
  .or(z.literal('').transform(() => undefined));

export const saveBrandingSchema = z.object({
  primaryColor:     hexColorSchema,
  secondaryColor:   hexColorSchema,
  emailFromName:    z.string().max(100).optional().or(z.literal('').transform(() => undefined)),
  emailFromAddress: z.string().email('Must be a valid email address').optional().or(z.literal('').transform(() => undefined)),
  customCSS:        z.string().max(50000, 'Custom CSS cannot exceed 50,000 characters').optional().or(z.literal('').transform(() => undefined)),
  customDomain:     z.string().max(253).optional().or(z.literal('').transform(() => undefined)),
});

export type SaveBrandingInput = z.infer<typeof saveBrandingSchema>;
