import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  CLERK_SECRET_KEY: z.string().min(1, 'CLERK_SECRET_KEY is required').transform(s => s.replace(/^"|"$/g, '').trim()),
  CLERK_PUBLISHABLE_KEY: z.string().min(1, 'CLERK_PUBLISHABLE_KEY is required').transform(s => s.replace(/^"|"$/g, '').trim()),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_STARTER: z.string().optional(),
  STRIPE_PRICE_PRO: z.string().optional(),
  STRIPE_PRICE_ENTERPRISE: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  CORS_ORIGINS: z.string().default('http://localhost:5173,https://pos.adequatemedia.net'),
});

function parseEnv(): z.infer<typeof envSchema> {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const missing = result.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${missing}`);
  }

  return result.data;
}

export const env = parseEnv();

// Mutate process.env directly so external libraries like clerkMiddleware
// that read directly from process.env get the cleaned/unquoted versions.
process.env.CLERK_SECRET_KEY = env.CLERK_SECRET_KEY;
process.env.CLERK_PUBLISHABLE_KEY = env.CLERK_PUBLISHABLE_KEY;

export type Env = typeof env;
