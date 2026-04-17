import { Resend } from 'resend';
import { env } from '../config/env';

export const resend = new Resend(env.RESEND_API_KEY ?? '');

export const DEFAULT_FROM_ADDRESS = 'YourApp <noreply@yourapp.com>';
export const FROM_ADDRESS = DEFAULT_FROM_ADDRESS; // backwards-compat alias
export const SUPPORT_EMAIL = 'support@yourapp.com';
export const APP_URL = env.FRONTEND_URL;

/**
 * Returns a Resend-compatible "From" string for the given org.
 * Falls back to the platform default if the org hasn't configured branding.
 */
export function getFromAddress(org: {
  emailFromName?: string | null;
  emailFromAddress?: string | null;
}): string {
  if (org.emailFromName && org.emailFromAddress) {
    return `${org.emailFromName} <${org.emailFromAddress}>`;
  }
  return DEFAULT_FROM_ADDRESS;
}
