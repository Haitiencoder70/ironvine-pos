import { env } from './src/config/env';
import { clerkMiddleware } from '@clerk/express';

console.log('ENV KEYS:');
console.log('PUB:', env.CLERK_PUBLISHABLE_KEY);
console.log('SEC:', env.CLERK_SECRET_KEY);

try {
  const middleware = clerkMiddleware({
    publishableKey: env.CLERK_PUBLISHABLE_KEY,
    secretKey: env.CLERK_SECRET_KEY,
  });
  console.log('Middleware created successfully!', !!middleware);
} catch (e: any) {
  console.error('FAILED TO CREATE MIDDLEWARE:', e.message);
}
